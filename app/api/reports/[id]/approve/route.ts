import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { approver_name, pin, approver_comment } = await request.json();

  const db = getDB();

  const report = db.prepare('SELECT site_id FROM reports WHERE id = ?').get(id) as { site_id: number } | undefined;
  if (!report) return NextResponse.json({ error: '경위서를 찾을 수 없습니다.' }, { status: 404 });

  const site = db.prepare('SELECT approver_pin FROM sites WHERE id = ?').get(report.site_id) as { approver_pin: string } | undefined;
  if (!site || site.approver_pin !== pin) {
    return NextResponse.json({ error: '승인 PIN이 올바르지 않습니다.' }, { status: 401 });
  }

  db.prepare(`
    UPDATE reports SET
      status = 'approved',
      approver_name = ?,
      approver_comment = ?,
      approved_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(approver_name, approver_comment ?? null, id);

  return NextResponse.json({ ok: true });
}
