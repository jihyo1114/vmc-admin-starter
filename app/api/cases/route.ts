import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  const db = getDB();
  const query = type && type !== 'all'
    ? db.prepare('SELECT * FROM court_cases WHERE accident_type = ? ORDER BY judgment_date DESC').all(type)
    : db.prepare('SELECT * FROM court_cases ORDER BY judgment_date DESC').all();

  return NextResponse.json(query);
}
