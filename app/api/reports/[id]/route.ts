import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB();

  const report = db.prepare(`
    SELECT r.*, s.name as site_name
    FROM reports r
    JOIN sites s ON s.id = r.site_id
    WHERE r.id = ?
  `).get(id);

  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const photos = db.prepare('SELECT * FROM report_photos WHERE report_id = ? ORDER BY id ASC').all(id);

  const analysis = (report as { analysis_id?: number }).analysis_id
    ? db.prepare('SELECT * FROM accident_analyses WHERE id = ?').get((report as { analysis_id: number }).analysis_id)
    : null;

  return NextResponse.json({ report, photos, analysis });
}
