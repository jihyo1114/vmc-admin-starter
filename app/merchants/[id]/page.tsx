'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Merchant, AnalysisWithMerchant, RiskLevel, Recommendation } from '@/types/index';

const RISK_LABEL: Record<RiskLevel, string> = {
  low: '저위험',
  medium: '중위험',
  high: '고위험',
};

const RISK_COLOR: Record<RiskLevel, 'green' | 'yellow' | 'red'> = {
  low: 'green',
  medium: 'yellow',
  high: 'red',
};

const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  approved: '승인',
  rejected: '거절',
  need_info: '추가정보',
};

const RECOMMENDATION_COLOR: Record<Recommendation, 'green' | 'red' | 'yellow'> = {
  approved: 'green',
  rejected: 'red',
  need_info: 'yellow',
};

export default function MerchantHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisWithMerchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reanalyzing, setReanalyzing] = useState(false);

  useEffect(() => {
    params.then((p) => setMerchantId(p.id));
  }, [params]);

  useEffect(() => {
    if (!merchantId) return;

    fetch(`/api/merchants/${merchantId}`)
      .then((r) => {
        if (r.status === 404) throw new Error('가맹점을 찾을 수 없습니다.');
        if (!r.ok) throw new Error('데이터를 불러올 수 없습니다.');
        return r.json();
      })
      .then((data: { merchant: Merchant; analyses: AnalysisWithMerchant[] }) => {
        setMerchant(data.merchant);
        setAnalyses(data.analyses);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [merchantId]);

  async function handleReanalyze() {
    if (!merchantId) return;
    setReanalyzing(true);
    try {
      const res = await fetch('/api/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_id: Number(merchantId) }),
      });

      if (!res.ok) {
        alert('재심사 요청 중 오류가 발생했습니다.');
        return;
      }

      const { analysisId } = (await res.json()) as { analysisId: number };
      router.push(`/analyses/${analysisId}`);
    } finally {
      setReanalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-sm text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  if (error || !merchant) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-sm text-red-600">{error || '가맹점을 찾을 수 없습니다.'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">가맹점 상세</h1>
        <Button variant="primary" onClick={handleReanalyze} disabled={reanalyzing}>
          {reanalyzing ? '요청 중...' : '새 분석 (재심사)'}
        </Button>
      </div>

      <Card title="기본 정보">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-gray-500 text-xs">상호명</dt>
            <dd className="text-gray-900 font-medium">{merchant.name}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs">사업자번호</dt>
            <dd className="text-gray-900">{merchant.business_number}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs">대표자</dt>
            <dd className="text-gray-900">{merchant.representative ?? '미기재'}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs">업종</dt>
            <dd className="text-gray-900">{merchant.category}</dd>
          </div>
          {merchant.address && (
            <div className="col-span-2">
              <dt className="text-gray-500 text-xs">주소</dt>
              <dd className="text-gray-900">{merchant.address}</dd>
            </div>
          )}
        </dl>
      </Card>

      <Card title="분석 이력">
        {analyses.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">분석 이력이 없습니다.</p>
        ) : (
          <ol className="relative border-l border-gray-200 ml-2 space-y-6 py-2">
            {analyses.map((a) => (
              <li
                key={a.id}
                className="ml-6 cursor-pointer group"
                onClick={() => router.push(`/analyses/${a.id}`)}
              >
                <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 ring-4 ring-white group-hover:bg-gray-400 transition-colors" />
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-gray-400">{a.created_at}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.risk_grade ? (
                      <Badge color={RISK_COLOR[a.risk_grade]}>{RISK_LABEL[a.risk_grade]}</Badge>
                    ) : (
                      <Badge color="gray">등급없음</Badge>
                    )}
                    {a.recommendation ? (
                      <Badge color={RECOMMENDATION_COLOR[a.recommendation]}>
                        AI: {RECOMMENDATION_LABEL[a.recommendation]}
                      </Badge>
                    ) : null}
                    {a.final_decision ? (
                      <Badge color={RECOMMENDATION_COLOR[a.final_decision]}>
                        최종: {RECOMMENDATION_LABEL[a.final_decision]}
                      </Badge>
                    ) : (
                      <Badge color="gray">미결정</Badge>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
