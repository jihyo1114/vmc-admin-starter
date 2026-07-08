import { getDB } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const db = getDB();
  const merchants = db
    .prepare('SELECT id, name, business_number, category FROM merchants ORDER BY created_at DESC')
    .all();
  return NextResponse.json(merchants);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDB();

  // 기존 가맹점 재심사
  if ('merchant_id' in body) {
    const merchantId = body.merchant_id as number;
    const merchant = db.prepare('SELECT id FROM merchants WHERE id = ?').get(merchantId);
    if (!merchant) {
      return NextResponse.json({ error: '가맹점을 찾을 수 없습니다.' }, { status: 404 });
    }
    const result = db
      .prepare("INSERT INTO analyses (merchant_id, status) VALUES (?, 'pending')")
      .run(merchantId);
    return NextResponse.json({ analysisId: result.lastInsertRowid });
  }

  // 신규 가맹점 등록
  const { name, business_number, representative, category, address, submitted_docs } = body as {
    name?: string;
    business_number?: string;
    representative?: string;
    category?: string;
    address?: string;
    submitted_docs?: string;
  };

  if (!name || !business_number || !category) {
    return NextResponse.json({ error: '상호명, 사업자번호, 업종은 필수 항목입니다.' }, { status: 400 });
  }

  const merchantResult = db
    .prepare(
      'INSERT INTO merchants (name, business_number, representative, category, address, submitted_docs) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(name, business_number, representative ?? null, category, address ?? null, submitted_docs ?? null);

  const merchantId = merchantResult.lastInsertRowid;

  const analysisResult = db
    .prepare("INSERT INTO analyses (merchant_id, status) VALUES (?, 'pending')")
    .run(merchantId);

  return NextResponse.json({ analysisId: analysisResult.lastInsertRowid }, { status: 201 });
}
