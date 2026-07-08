import { getDB } from '@/lib/db';
import { spawn } from 'child_process';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB();

  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as {
    id: number; accident_type: string; location: string;
    incident_description: string; immediate_action: string;
    injury_severity: string; victim_count: number;
  } | undefined;

  if (!report) return new Response('Not found', { status: 404 });

  const keyword = `${report.accident_type} (${report.location})`;
  const submittedContent = `사고 경위:\n${report.incident_description}\n\n즉시 조치:\n${report.immediate_action}\n\n피해 현황: ${report.victim_count}명, ${report.injury_severity}`;

  const analysisResult = db.prepare(
    `INSERT INTO accident_analyses (keyword, accident_type, submitted_content, status) VALUES (?, ?, ?, 'analyzing')`
  ).run(keyword, report.accident_type, submittedContent);
  const analysisId = analysisResult.lastInsertRowid as number;

  db.prepare(`UPDATE reports SET analysis_id = ? WHERE id = ?`).run(analysisId, id);

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

        const runPerspective = (g: typeof guidelines[0]): Promise<{ id: number; content: string }> =>
          new Promise((resolve) => {
            const prompt = g.prompt_template
              .replace('{keyword}', keyword)
              .replace('{accident_type}', report.accident_type)
              .replace('{content}', submittedContent);

            send({ type: 'perspective_start', perspectiveId: g.id, name: g.name });
            const proc = spawn('claude', ['-p', prompt], { stdio: ['pipe', 'pipe', 'pipe'] });
            proc.stdin?.end();
            let result = '';
            proc.stdout?.on('data', (chunk: Buffer) => {
              const text = chunk.toString();
              result += text;
              send({ type: 'perspective_chunk', perspectiveId: g.id, chunk: text });
            });
            proc.on('close', () => { send({ type: 'perspective_done', perspectiveId: g.id }); resolve({ id: g.id, content: result }); });
            proc.on('error', () => { resolve({ id: g.id, content: '분석 중 오류 발생' }); });
          });

        const results = await Promise.all(guidelines.map(runPerspective));

        for (const r of results) {
          db.prepare(`UPDATE perspective_results SET content = ?, status = 'completed' WHERE analysis_id = ? AND guideline_id = ?`).run(r.content, analysisId, r.id);
        }

        send({ type: 'risk_analyzing' });

        const riskPrompt = `다음 물류회사 안전사고 분석 결과를 종합하여 회사의 법적 책임 수준을 평가하세요.
Level 1: 회사 책임 거의 없음 / Level 2: 경미한 책임 / Level 3: 중간 책임 / Level 4: 높은 법적 책임 / Level 5: 중대재해처벌법 적용 가능
반드시 JSON만: {"level": <1-5>, "summary": "<50자 이내>"}

${results.map((r, i) => `[${guidelines[i]?.name}]\n${r.content}`).join('\n\n')}`;

        const riskOut = await new Promise<string>((resolve) => {
          const proc = spawn('claude', ['-p', riskPrompt], { stdio: ['pipe', 'pipe', 'pipe'] });
          proc.stdin?.end();
          let out = '';
          proc.stdout?.on('data', (c: Buffer) => { out += c.toString(); });
          proc.on('close', () => resolve(out));
          proc.on('error', () => resolve('{"level": 3, "summary": "분석 완료"}'));
        });

        let riskLevel = 3, riskSummary = '';
        try {
          const m = riskOut.match(/\{[\s\S]*?\}/);
          if (m) { const p = JSON.parse(m[0]); riskLevel = Math.min(5, Math.max(1, parseInt(p.level) || 3)); riskSummary = p.summary || ''; }
        } catch {}

        db.prepare(`UPDATE accident_analyses SET risk_level = ?, risk_summary = ?, status = 'completed', completed_at = datetime('now', 'localtime') WHERE id = ?`).run(riskLevel, riskSummary, analysisId);
        send({ type: 'complete', analysisId, riskLevel, riskSummary });
        controller.close();
      })().catch(() => controller.close());
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
