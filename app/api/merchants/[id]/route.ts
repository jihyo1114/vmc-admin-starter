import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import type { Merchant, AnalysisWithMerchant } from '@/types/index';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDB();

  const merchant = db
    .prepare('SELECT * FROM merchants WHERE id = ?')
    .get(id) as Merchant | undefined;

  if (!merchant) {
    return NextResponse.json({ error: '가맹점을 찾을 수 없습니다.' }, { status: 404 });
  }

  const analyses = db
    .prepare(
      `SELECT a.*, m.name as merchant_name, m.category as merchant_category,
              m.business_number, m.representative, m.address, m.submitted_docs
       FROM analyses a
       JOIN merchants m ON m.id = a.merchant_id
       WHERE a.merchant_id = ?
       ORDER BY a.created_at ASC`
    )
    .all(id) as AnalysisWithMerchant[];

  return NextResponse.json({ merchant, analyses });
}
