import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const formData = await request.formData();
  const files = formData.getAll('photos') as File[];

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'reports', id);
  fs.mkdirSync(uploadDir, { recursive: true });

  const db = getDB();
  const saved: { file_path: string; file_name: string }[] = [];

  for (const file of files.slice(0, 5)) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(uploadDir, safeName);
    fs.writeFileSync(filePath, buffer);
    const webPath = `/uploads/reports/${id}/${safeName}`;
    db.prepare('INSERT INTO report_photos (report_id, file_path, file_name) VALUES (?, ?, ?)').run(id, webPath, file.name);
    saved.push({ file_path: webPath, file_name: file.name });
  }

  return NextResponse.json({ saved });
}
