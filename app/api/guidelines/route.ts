import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import type { Guideline } from '@/types';

export async function GET() {
  const db = getDB();
  const guidelines = db.prepare('SELECT * FROM guidelines ORDER BY id ASC').all() as Guideline[];
  return NextResponse.json(guidelines);
}
