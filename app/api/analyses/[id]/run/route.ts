import { getDB } from '@/lib/db';
import { spawn } from 'child_process';
import type {
  PerspectiveKey,
  PerspectiveResult,
  RiskLevel,
  Recommendation,
  Guideline,
  AnalysisWithMerchant,
} from '@/types/index';

const PERSPECTIVE_TITLES: Record<PerspectiveKey, string> = {
  identity: '신원 확인',
  industry: '업종 위험도',
  reputation: '평판 조회',
  documents: '서류 정합성',
};

const PERSPECTIVE_KEYS: PerspectiveKey[] = ['identity', 'industry', 'reputation', 'documents'];

// 코드 내 기본 지침 (DB에 없을 때 사용)
const DEFAULT_GUIDELINES: Record<string, string> = {
  identity:
    '대표자 및 실소유자의 신원을 확인합니다. 금융범죄, 사기, 횡령 등 형사 처벌 이력, 행정처분 이력, 신용정보를 검토하세요.',
  industry:
    '가맹점 업종의 위험도를 평가합니다. 저위험: 소매, 교육, 의료. 중위험: C2C 중개, 중고차. 고위험: 대부업, 성인 콘텐츠, 경품/도박.',
  reputation:
    '온라인 평판과 민원 이력을 검토합니다. 민원 월 5건 미만이면 저위험, 5~20건이면 중위험, 20건 초과이면 고위험.',
  documents:
    '제출 서류의 유효성과 완전성을 검토합니다. 필수 서류(사업자등록증, 통장사본, 신분증)가 모두 제출됐는지 확인하세요.',
  judgment:
    '4개 관점 결과를 종합하세요. 하나라도 high면 거절, high 없고 medium 있으면 추가 소명, 모두 low면 승인.',
};

function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const claude = spawn('claude', ['-p', prompt], { stdio: ['pipe', 'pipe', 'pipe'] });
    claude.stdin?.end();
    let output = '';
    claude.stdout?.on('data', (chunk) => {
      output += chunk.toString();
    });
    claude.on('close', (code) => {
      if (code === 0) resolve(output.trim());
      else reject(new Error(`claude 종료 코드: ${code}`));
    });
  });
}

function parseClaudeJson(raw: string): { findings: string; risk_level: RiskLevel } | null {
  // 1차: JSON.parse 시도
  try {
    const parsed = JSON.parse(raw) as { findings?: string; risk_level?: string };
    if (parsed.findings && parsed.risk_level) {
      return {
        findings: parsed.findings,
        risk_level: parsed.risk_level as RiskLevel,
      };
    }
  } catch {
    // 파싱 실패 시 정규식으로 재시도
  }

  // 2차: 정규식으로 JSON 블록 추출
  const match = raw.match(/\{[\s\S]*?"findings"\s*:\s*"([\s\S]*?)"[\s\S]*?"risk_level"\s*:\s*"(low|medium|high)"[\s\S]*?\}/);
  if (match) {
    return {
      findings: match[1],
      risk_level: match[2] as RiskLevel,
    };
  }

  // findings가 뒤에 오는 경우도 처리
  const match2 = raw.match(/\{[\s\S]*?"risk_level"\s*:\s*"(low|medium|high)"[\s\S]*?"findings"\s*:\s*"([\s\S]*?)"[\s\S]*?\}/);
  if (match2) {
    return {
      findings: match2[2],
      risk_level: match2[1] as RiskLevel,
    };
  }

  return null;
}

function buildPerspectivePrompt(
  key: PerspectiveKey,
  merchant: AnalysisWithMerchant,
  guidelineContent: string
): string {
  const titleMap: Record<PerspectiveKey, string> = {
    identity: '신원확인',
    industry: '업종 위험도',
    reputation: '평판 조회',
    documents: '서류 정합성',
  };

  return `당신은 PG사 컴플라이언스 심사 전문가입니다.
아래 가맹점 정보와 심사 지침을 바탕으로 ${titleMap[key]} 관점에서 위험도를 평가하세요.

[가맹점 정보]
상호명: ${merchant.merchant_name}
사업자번호: ${merchant.business_number}
대표자명: ${merchant.representative ?? '미기재'}
업종: ${merchant.merchant_category}
주소: ${merchant.address ?? '미기재'}
제출서류: ${merchant.submitted_docs ?? '없음'}

[심사 지침]
${guidelineContent}

반드시 아래 JSON 형식으로만 응답하세요:
{"findings": "근거 서술 (한국어, 2~4문장)", "risk_level": "low|medium|high"}`;
}

function buildSynthesisPrompt(
  perspectives: PerspectiveResult[],
  judgmentContent: string
): string {
  const perspectiveSummary = perspectives
    .map(
      (p) =>
        `[${p.title}] 위험수준: ${p.risk_level}, 상태: ${p.status}\n근거: ${p.findings}`
    )
    .join('\n\n');

  return `당신은 PG사 컴플라이언스 수석 심사관입니다.
4개 관점의 분석 결과를 종합하여 심사 보고서를 작성하세요.

[관점별 결과]
${perspectiveSummary}

[종합판정 지침]
${judgmentContent}

종합 보고서를 한국어로 작성하세요. 각 관점의 주요 근거를 요약하고, 전반적인 위험 수준을 서술하세요. (JSON 아닌 자유 서술)`;
}

// worst-wins 결정 규칙 (결정적 코드 계산)
function computeDecision(results: PerspectiveResult[]): {
  risk_grade: RiskLevel;
  recommendation: Recommendation;
} {
  const successResults = results.filter((r) => r.status === 'completed');
  const failedCount = results.filter((r) => r.status === 'failed').length;

  let risk_grade: RiskLevel = 'low';
  let recommendation: Recommendation = 'approved';

  if (successResults.some((r) => r.risk_level === 'high')) {
    risk_grade = 'high';
    recommendation = 'rejected';
  } else if (successResults.some((r) => r.risk_level === 'medium')) {
    risk_grade = 'medium';
    recommendation = 'need_info';
  } else {
    risk_grade = 'low';
    recommendation = 'approved';
  }

  // 안전강등: 실패/누락 관점 있으면 recommendation이 'approved'여도 'need_info'로, risk_grade 최소 'medium'
  if (failedCount > 0 && recommendation === 'approved') {
    recommendation = 'need_info';
    risk_grade = 'medium';
  }

  return { risk_grade, recommendation };
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDB();

  // 1. 분석 레코드 조회
  const analysis = db
    .prepare(
      `SELECT a.*, m.name as merchant_name, m.category as merchant_category,
              m.business_number, m.representative, m.address, m.submitted_docs
       FROM analyses a
       JOIN merchants m ON m.id = a.merchant_id
       WHERE a.id = ?`
    )
    .get(id) as AnalysisWithMerchant | undefined;

  if (!analysis) {
    return new Response(JSON.stringify({ error: '분석 레코드를 찾을 수 없습니다.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (analysis.status !== 'pending' && analysis.status !== 'failed') {
    return new Response(
      JSON.stringify({ error: `현재 상태(${analysis.status})에서는 실행할 수 없습니다.` }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. 상태를 running으로 업데이트
  db.prepare("UPDATE analyses SET status = 'running' WHERE id = ?").run(id);

  const encoder = new TextEncoder();

  // 3. 가이드라인 조회
  const guidelinesRaw = db.prepare('SELECT * FROM guidelines').all() as Guideline[];
  const guidelineMap: Record<string, string> = {};
  for (const g of guidelinesRaw) {
    guidelineMap[g.key] = g.content;
  }

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        // 4. 관점 4개 병렬 claude 호출
        const perspectivePromises = PERSPECTIVE_KEYS.map(async (key) => {
          const title = PERSPECTIVE_TITLES[key];
          send('perspective_start', { key, title });

          const guidelineContent = guidelineMap[key] ?? DEFAULT_GUIDELINES[key];
          const prompt = buildPerspectivePrompt(key, analysis, guidelineContent);

          try {
            const raw = await runClaude(prompt);
            const parsed = parseClaudeJson(raw);

            if (!parsed) {
              const result: PerspectiveResult = {
                key,
                title,
                findings: '분석 중 오류 발생',
                risk_level: 'low',
                status: 'failed',
              };
              send('perspective_done', { key, title, risk_level: 'low', status: 'failed', findings: '분석 중 오류 발생' });
              return result;
            }

            const result: PerspectiveResult = {
              key,
              title,
              findings: parsed.findings,
              risk_level: parsed.risk_level,
              status: 'completed',
            };
            send('perspective_done', { key, title, risk_level: parsed.risk_level, status: 'completed' });
            return result;
          } catch {
            const result: PerspectiveResult = {
              key,
              title,
              findings: '분석 중 오류 발생',
              risk_level: 'low',
              status: 'failed',
            };
            send('perspective_done', { key, title, risk_level: 'low', status: 'failed', findings: '분석 중 오류 발생' });
            return result;
          }
        });

        const perspectiveResults = await Promise.all(perspectivePromises);

        // 4개 모두 실패 시 failed로 저장
        const allFailed = perspectiveResults.every((r) => r.status === 'failed');
        if (allFailed) {
          db.prepare("UPDATE analyses SET status = 'failed' WHERE id = ?").run(id);
          send('done', { error: '모든 관점 분석이 실패했습니다.' });
          controller.close();
          return;
        }

        // 5. 종합판정 시작
        send('synthesis_start', {});

        // 6. 종합판정 프롬프트 → claude 호출
        const judgmentContent = guidelineMap['judgment'] ?? DEFAULT_GUIDELINES['judgment'];
        const synthesisPrompt = buildSynthesisPrompt(perspectiveResults, judgmentContent);
        let report = '';
        try {
          report = await runClaude(synthesisPrompt);
        } catch {
          report = '종합 보고서 생성 중 오류가 발생했습니다.';
        }

        // 7. worst-wins 결정규칙
        const { risk_grade, recommendation } = computeDecision(perspectiveResults);

        // 8. analyses 업데이트
        db.prepare(`
          UPDATE analyses
          SET status = 'completed',
              risk_grade = ?,
              recommendation = ?,
              perspectives = ?,
              report = ?
          WHERE id = ?
        `).run(
          risk_grade,
          recommendation,
          JSON.stringify(perspectiveResults),
          report,
          id
        );

        // 9. 완료 SSE
        send('done', {
          risk_grade,
          recommendation,
          perspectives: perspectiveResults,
          report,
        });
      } catch (err) {
        db.prepare("UPDATE analyses SET status = 'failed' WHERE id = ?").run(id);
        send('done', { error: '분석 실행 중 예기치 못한 오류가 발생했습니다.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
