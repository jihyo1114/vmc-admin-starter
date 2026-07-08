import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const db = getDB();
  const sites = db.prepare('SELECT id, name, address FROM sites ORDER BY id ASC').all();
  return NextResponse.json(sites);
}
