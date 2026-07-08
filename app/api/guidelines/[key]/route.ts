import { getDB } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { Guideline } from '@/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const body = await request.json() as { title?: string; content?: string };
  const { title, content } = body;

  if (!title || !content) {
    return NextResponse.json({ error: '제목과 본문은 필수 항목입니다.' }, { status: 400 });
  }

  const db = getDB();
  db.prepare(
    `UPDATE guidelines SET title = ?, content = ?, updated_at = datetime('now', 'localtime') WHERE key = ?`
  ).run(title, content, key);

  const updated = db.prepare('SELECT * FROM guidelines WHERE key = ?').get(key) as Guideline | undefined;
  if (!updated) {
    return NextResponse.json({ error: '가이드라인을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
