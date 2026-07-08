'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type {
  MerchantDashboard,
  DashboardRecentItem,
  PendingQueueItem,
  RiskLevel,
  Recommendation,
  AnalysisStatus,
} from '@/types/index';

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

function isRiskLevel(v: string | null): v is RiskLevel {
  return v === 'low' || v === 'medium' || v === 'high';
}

function isRecommendation(v: string | null): v is Recommendation {
  return v === 'approved' || v === 'rejected' || v === 'need_info';
}

function isAnalysisStatus(v: string): v is AnalysisStatus {
  return v === 'pending' || v === 'running' || v === 'completed' || v === 'failed';
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

function KpiCard({
  label,
  value,
  sub,
  onClick,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  onClick?: () => void;
  highlight?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={[
        'bg-white border rounded-lg p-5',
        onClick ? 'cursor-pointer hover:border-gray-400 transition-colors' : '',
        highlight ? 'border-red-200 bg-red-50' : 'border-gray-200',
      ].join(' ')}
    >
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function DistBar({ approved, rejected, need_info }: { approved: number; rejected: number; need_info: number }) {
  const total = approved + rejected + need_info;

  if (total === 0) {
    return (
      <div className="mt-3">
        <div className="h-3 rounded-full bg-gray-100" />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>승인 0</span>
          <span>거절 0</span>
          <span>추가정보 0</span>
        </div>
      </div>
    );
  }

  const approvedPct = Math.round((approved / total) * 100);
  const rejectedPct = Math.round((rejected / total) * 100);
  // 나머지는 need_info (반올림 오차 흡수)
  const needInfoPct = 100 - approvedPct - rejectedPct;

  return (
    <div className="mt-3">
      <div className="flex h-3 rounded-full overflow-hidden">
        {approvedPct > 0 && (
          <div className="bg-green-400" style={{ width: `${approvedPct}%` }} title={`승인 ${approvedPct}%`} />
        )}
        {needInfoPct > 0 && (
          <div className="bg-yellow-400" style={{ width: `${needInfoPct}%` }} title={`추가정보 ${needInfoPct}%`} />
        )}
        {rejectedPct > 0 && (
          <div className="bg-red-400" style={{ width: `${rejectedPct}%` }} title={`거절 ${rejectedPct}%`} />
        )}
      </div>
      <div className="flex gap-4 text-xs text-gray-500 mt-2">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
          승인 {approved}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />
          추가정보 {need_info}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
          거절 {rejected}
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<MerchantDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d: MerchantDashboard) => setData(d))
      .catch(() => {
        setData({
          pending_decision: 0,
          high_risk: 0,
          throughput: { today: 0, this_week: 0 },
          recommendation_dist: { approved: 0, rejected: 0, need_info: 0 },
          recent: [],
          pending_queue: [],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const d = data ?? {
    pending_decision: 0,
    high_risk: 0,
    throughput: { today: 0, this_week: 0 },
    recommendation_dist: { approved: 0, rejected: 0, need_info: 0 },
    recent: [] as DashboardRecentItem[],
    pending_queue: [] as PendingQueueItem[],
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-500 mt-0.5">가맹점 심사 현황</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">불러오는 중...</p>
      ) : (
        <>
          {d.pending_queue.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">검토 대기</h2>
                  <p className="text-xs text-gray-500 mt-0.5">결정이 필요한 분석 건 (위험도 우선)</p>
                </div>
                <a
                  href="/analyses"
                  className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2"
                >
                  전체 보기 →
                </a>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50">
                    <tr>
                      <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">가맹점명</th>
                      <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">업종</th>
                      <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">위험도</th>
                      <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">AI 권고</th>
                      <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">대기시간</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {d.pending_queue.map((item: PendingQueueItem) => (
                      <tr
                        key={item.id}
                        onClick={() => router.push(`/analyses/${item.id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-gray-900">{item.merchant_name}</td>
                        <td className="py-3 px-4 text-gray-600">{item.merchant_category}</td>
                        <td className="py-3 px-4">
                          {isRiskLevel(item.risk_grade) ? (
                            <Badge color={RISK_COLOR[item.risk_grade]}>{RISK_LABEL[item.risk_grade]}</Badge>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="py-3 px-4">
                          {isRecommendation(item.recommendation) ? (
                            <Badge color={RECOMMENDATION_COLOR[item.recommendation]}>
                              {RECOMMENDATION_LABEL[item.recommendation]}
                            </Badge>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-xs">{relativeTime(item.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-4 mb-6">
            <KpiCard
              label="미결정 대기"
              value={`${d.pending_decision}건`}
              sub="결정 필요"
              onClick={() => router.push('/analyses')}
            />
            <KpiCard
              label="고위험/거절권고"
              value={`${d.high_risk}건`}
              sub="즉시 검토 필요"
              highlight={d.high_risk > 0}
              onClick={() => router.push('/analyses')}
            />
            <KpiCard
              label="처리량"
              value={`오늘 ${d.throughput.today}건`}
              sub={`이번 주 ${d.throughput.this_week}건`}
            />
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="text-xs text-gray-500 mb-1">권고 분포</div>
              <div className="text-2xl font-semibold text-gray-900">
                {d.recommendation_dist.approved + d.recommendation_dist.rejected + d.recommendation_dist.need_info}건
              </div>
              <DistBar
                approved={d.recommendation_dist.approved}
                rejected={d.recommendation_dist.rejected}
                need_info={d.recommendation_dist.need_info}
              />
            </div>
          </div>

          <Card title="최근 분석 내역 (최근 10건)">
            {d.recent.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">아직 분석 내역이 없습니다.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500">가맹점명</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500">업종</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500">종합등급</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500">AI 권고</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500">최종결정</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500">상태</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500">생성일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {d.recent.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => router.push(`/analyses/${item.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 font-medium text-gray-900">{item.merchant_name}</td>
                      <td className="py-3 px-3 text-gray-600">{item.merchant_category}</td>
                      <td className="py-3 px-3">
                        {isRiskLevel(item.risk_grade) ? (
                          <Badge color={RISK_COLOR[item.risk_grade]}>{RISK_LABEL[item.risk_grade]}</Badge>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {isRecommendation(item.recommendation) ? (
                          <Badge color={RECOMMENDATION_COLOR[item.recommendation]}>
                            {RECOMMENDATION_LABEL[item.recommendation]}
                          </Badge>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {isRecommendation(item.final_decision) ? (
                          <Badge color={RECOMMENDATION_COLOR[item.final_decision]}>
                            {RECOMMENDATION_LABEL[item.final_decision]}
                          </Badge>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {isAnalysisStatus(item.status) ? (
                          <Badge color={
                            item.status === 'completed'
                              ? item.final_decision ? 'gray' : 'yellow'
                              : STATUS_COLOR[item.status]
                          }>
                            {STATUS_LABEL[item.status]}
                          </Badge>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-400 text-xs">{item.created_at.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
