import { getDB } from '@/lib/db';
import type { AnalysisWithMerchant } from '@/types/index';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDB();

  const row = db
    .prepare(
      `SELECT a.*, m.name as merchant_name, m.category as merchant_category,
              m.business_number, m.representative, m.address, m.submitted_docs
       FROM analyses a
       JOIN merchants m ON m.id = a.merchant_id
       WHERE a.id = ?`
    )
    .get(id) as AnalysisWithMerchant | undefined;

  if (!row) {
    return new Response(JSON.stringify({ error: '분석 레코드를 찾을 수 없습니다.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(row), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDB();

  const body = (await req.json()) as { final_decision?: string; decision_memo?: string };
  const { final_decision, decision_memo } = body;

  if (!final_decision) {
    return new Response(JSON.stringify({ error: 'final_decision은 필수입니다.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const settingRow = db
    .prepare("SELECT value FROM settings WHERE key = 'reviewer_name'")
    .get() as { value: string } | undefined;
  const decided_by = settingRow?.value ?? '심사자';

  db.prepare(
    `UPDATE analyses
     SET final_decision = ?,
         decision_memo = ?,
         decided_by = ?,
         decided_at = datetime('now', 'localtime')
     WHERE id = ?`
  ).run(final_decision, decision_memo ?? null, decided_by, id);

  const updated = db
    .prepare(
      'SELECT final_decision, decision_memo, decided_by, decided_at FROM analyses WHERE id = ?'
    )
    .get(id);

  return new Response(JSON.stringify(updated), {
    headers: { 'Content-Type': 'application/json' },
  });
}
