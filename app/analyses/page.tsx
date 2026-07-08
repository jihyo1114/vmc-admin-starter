'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import type { AnalysisWithMerchant, RiskLevel, Recommendation, AnalysisStatus } from '@/types/index';

type AnalysisListItem = Pick<
  AnalysisWithMerchant,
  'id' | 'merchant_id' | 'merchant_name' | 'merchant_category' | 'business_number' | 'status' | 'risk_grade' | 'recommendation' | 'final_decision' | 'created_at'
>;

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

const STATUS_LABEL: Record<AnalysisStatus, string> = {
  pending: '대기',
  running: '실행중',
  completed: '완료',
  failed: '실패',
};

const STATUS_COLOR: Record<AnalysisStatus, 'gray' | 'yellow' | 'blue' | 'red'> = {
  pending: 'gray',
  running: 'yellow',
  completed: 'blue',
  failed: 'red',
};

type RiskFilter = 'all' | RiskLevel;
type RecommendationFilter = 'all' | Recommendation;
type StatusFilter = 'all' | AnalysisStatus;

export default function AnalysesPage() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [recommendationFilter, setRecommendationFilter] = useState<RecommendationFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [undecidedOnly, setUndecidedOnly] = useState(false);

  useEffect(() => {
    fetch('/api/analyses')
      .then((r) => {
        if (!r.ok) throw new Error('목록을 불러올 수 없습니다.');
        return r.json();
      })
      .then((data: AnalysisListItem[]) => setAnalyses(data))
      .catch(() => setError('분석 목록을 불러오는 중 오류가 발생했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = analyses.filter((a) => {
    if (riskFilter !== 'all' && a.risk_grade !== riskFilter) return false;
    if (recommendationFilter !== 'all' && a.recommendation !== recommendationFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (undecidedOnly && !(a.status === 'completed' && a.final_decision === null)) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">분석 내역</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <FilterSelect
          label="위험등급"
          value={riskFilter}
          onChange={(v) => setRiskFilter(v as RiskFilter)}
          options={[
            { value: 'all', label: '전체' },
            { value: 'low', label: '저위험' },
            { value: 'medium', label: '중위험' },
            { value: 'high', label: '고위험' },
          ]}
        />
        <FilterSelect
          label="권고"
          value={recommendationFilter}
          onChange={(v) => setRecommendationFilter(v as RecommendationFilter)}
          options={[
            { value: 'all', label: '전체' },
            { value: 'approved', label: '승인' },
            { value: 'rejected', label: '거절' },
            { value: 'need_info', label: '추가정보' },
          ]}
        />
        <FilterSelect
          label="상태"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
          options={[
            { value: 'all', label: '전체' },
            { value: 'pending', label: '대기' },
            { value: 'running', label: '실행중' },
            { value: 'completed', label: '완료' },
            { value: 'failed', label: '실패' },
          ]}
        />
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={undecidedOnly}
            onChange={(e) => setUndecidedOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          미결정만 보기
        </label>
      </div>

      {loading && <p className="text-sm text-gray-500">불러오는 중...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">가맹점명</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">업종</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">종합등급</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">AI 권고</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">최종결정</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">상태</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">생성일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                    표시할 분석 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => {
                  const needsDecision = a.status === 'completed' && !a.final_decision;
                  return (
                  <tr
                    key={a.id}
                    onClick={() => router.push(`/analyses/${a.id}`)}
                    className={`cursor-pointer transition-colors border-l-2 ${
                      needsDecision
                        ? 'border-l-amber-400 bg-amber-50 hover:bg-amber-100'
                        : 'border-l-transparent hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{a.merchant_name}</td>
                    <td className="px-4 py-3 text-gray-600">{a.merchant_category}</td>
                    <td className="px-4 py-3">
                      {a.risk_grade ? (
                        <Badge color={RISK_COLOR[a.risk_grade]}>{RISK_LABEL[a.risk_grade]}</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {a.recommendation ? (
                        <Badge color={RECOMMENDATION_COLOR[a.recommendation]}>
                          {RECOMMENDATION_LABEL[a.recommendation]}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {a.final_decision ? (
                        <Badge color={RECOMMENDATION_COLOR[a.final_decision]}>
                          {RECOMMENDATION_LABEL[a.final_decision]}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={
                        a.status === 'completed'
                          ? a.final_decision ? 'gray' : 'yellow'
                          : STATUS_COLOR[a.status]
                      }>
                        {STATUS_LABEL[a.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{a.created_at.slice(0, 10)}</td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
