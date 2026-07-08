import { getDB } from '@/lib/db';
import { spawn } from 'child_process';

export async function POST(request: Request) {
  const body = await request.json();
  const { keyword, accidentType, content } = body;

  const db = getDB();

  const insertResult = db.prepare(
    `INSERT INTO accident_analyses (keyword, accident_type, submitted_content, status) VALUES (?, ?, ?, 'analyzing')`
  ).run(keyword, accidentType, content);
  const analysisId = insertResult.lastInsertRowid as number;

  const guidelines = db.prepare('SELECT * FROM analysis_guidelines ORDER BY sort_order ASC').all() as {
    id: number; name: string; prompt_template: string;
  }[];

  for (const g of guidelines) {
    db.prepare(`INSERT INTO perspective_results (analysis_id, guideline_id, status) VALUES (?, ?, 'analyzing')`).run(analysisId, g.id);
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch {}
      };

      (async () => {
        send({ type: 'started', analysisId });

        const runPerspective = (guideline: typeof guidelines[0]): Promise<{ id: number; content: string }> =>
          new Promise((resolve) => {
            const prompt = guideline.prompt_template
              .replace('{keyword}', keyword)
              .replace('{accident_type}', accidentType)
              .replace('{content}', content);

            send({ type: 'perspective_start', perspectiveId: guideline.id, name: guideline.name });

            const proc = spawn('claude', ['-p', prompt], { stdio: ['pipe', 'pipe', 'pipe'] });
            proc.stdin?.end();

            let result = '';

            proc.stdout?.on('data', (chunk: Buffer) => {
              const text = chunk.toString();
              result += text;
              send({ type: 'perspective_chunk', perspectiveId: guideline.id, chunk: text });
            });

            proc.on('close', () => {
              send({ type: 'perspective_done', perspectiveId: guideline.id });
              resolve({ id: guideline.id, content: result });
            });

            proc.on('error', () => {
              send({ type: 'perspective_done', perspectiveId: guideline.id });
              resolve({ id: guideline.id, content: '분석 중 오류가 발생했습니다.' });
            });
          });

        const results = await Promise.all(guidelines.map(runPerspective));

        for (const r of results) {
          db.prepare(
            `UPDATE perspective_results SET content = ?, status = 'completed' WHERE analysis_id = ? AND guideline_id = ?`
          ).run(r.content, analysisId, r.id);
        }

        send({ type: 'risk_analyzing' });

        const riskPrompt = `다음은 물류회사 안전사고 분석 결과입니다. 각 관점의 분석을 종합하여 회사의 법적 책임 수준을 평가하세요.

[법적 책임 수준 기준]
Level 1: 회사 책임 거의 없음 - 모든 안전 의무 이행, 근로자 과실이 주된 원인
Level 2: 경미한 책임 - 일부 절차 미흡이나 중대 위반 없음
Level 3: 중간 수준 책임 - 안전관리 일부 부재, 개선 필요
Level 4: 높은 법적 책임 - 중대한 안전 의무 위반, 민·형사 책임 가능
Level 5: 최고 책임 - 중대재해처벌법 적용 가능한 심각한 안전 의무 위반

반드시 다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{"level": <1~5 정수>, "summary": "<50자 이내 핵심 요약>"}

[사고 정보]
키워드: ${keyword}
유형: ${accidentType}
내용: ${content}

[각 관점 분석 결과]
${results.map((r, i) => `[${guidelines[i]?.name}]\n${r.content}`).join('\n\n')}`;

        const riskResult = await new Promise<string>((resolve) => {
          const proc = spawn('claude', ['-p', riskPrompt], { stdio: ['pipe', 'pipe', 'pipe'] });
          proc.stdin?.end();
          let out = '';
          proc.stdout?.on('data', (chunk: Buffer) => { out += chunk.toString(); });
          proc.on('close', () => resolve(out));
          proc.on('error', () => resolve('{"level": 3, "summary": "위험도 계산 중 오류 발생"}'));
        });

        let riskLevel = 3;
        let riskSummary = '';
        try {
          const match = riskResult.match(/\{[\s\S]*?\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            riskLevel = Math.min(5, Math.max(1, parseInt(parsed.level) || 3));
            riskSummary = parsed.summary || '';
          }
        } catch {}

        db.prepare(
          `UPDATE accident_analyses SET risk_level = ?, risk_summary = ?, status = 'completed', completed_at = datetime('now', 'localtime') WHERE id = ?`
        ).run(riskLevel, riskSummary, analysisId);

        send({ type: 'complete', analysisId, riskLevel, riskSummary });
        controller.close();
      })().catch((err) => {
        db.prepare(`UPDATE accident_analyses SET status = 'failed' WHERE id = ?`).run(analysisId);
        controller.error(err);
      });
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
