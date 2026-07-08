import { getDB } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { AnalysisWithMerchant } from '@/types/index';

type AnalysisListItem = Pick<
  AnalysisWithMerchant,
  'id' | 'merchant_id' | 'merchant_name' | 'merchant_category' | 'business_number' | 'status' | 'risk_grade' | 'recommendation' | 'final_decision' | 'created_at'
>;

export async function GET(req: NextRequest) {
  const db = getDB();
  const { searchParams } = new URL(req.url);
  const merchantId = searchParams.get('merchant_id');

  const baseQuery = `
    SELECT a.id, a.merchant_id, m.name as merchant_name, m.category as merchant_category,
           m.business_number, a.status, a.risk_grade, a.recommendation,
           a.final_decision, a.created_at
    FROM analyses a
    JOIN merchants m ON m.id = a.merchant_id
  `;

  const rows: AnalysisListItem[] = merchantId
    ? (db.prepare(baseQuery + 'WHERE a.merchant_id = ? ORDER BY a.created_at DESC').all(merchantId) as AnalysisListItem[])
    : (db.prepare(baseQuery + 'ORDER BY a.created_at DESC').all() as AnalysisListItem[]);

  return NextResponse.json(rows);
}
