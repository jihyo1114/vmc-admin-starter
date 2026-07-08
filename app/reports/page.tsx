'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { Report } from '@/types';

function StatusBadge({ status }: { status: Report['status'] }) {
  return status === 'approved'
    ? <Badge color="green">승인 완료</Badge>
    : <Badge color="yellow">검토 대기</Badge>;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'approved'>('all');

  useEffect(() => {
    fetch('/api/reports').then((r) => r.json()).then(setReports).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? reports : reports.filter((r) => r.status === filter);

  const pendingCount = reports.filter((r) => r.status === 'submitted').length;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#0a0a0a]">경위서 목록</h1>
          <p className="text-sm text-[#999] mt-0.5">
            전체 {reports.length}건
            {pendingCount > 0 && <span className="ml-2 text-orange-500 font-medium">· 검토 대기 {pendingCount}건</span>}
          </p>
        </div>
        <Link href="/reports/new">
          <button className="bg-[#0a0a0a] text-white text-sm px-4 py-2 rounded hover:bg-[#222]">+ 경위서 작성</button>
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {(['all', 'submitted', 'approved'] as const).map((v) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${filter === v ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]' : 'bg-white text-[#555] border-[#e5e5e5] hover:border-[#999]'}`}>
            {v === 'all' ? '전체' : v === 'submitted' ? '검토 대기' : '승인 완료'}
          </button>
        ))}
      </div>

      <Card title="">
        {loading ? (
          <div className="text-sm text-[#999] py-8 text-center">로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-[#999] py-8 text-center">
            경위서가 없습니다.{' '}
            <Link href="/reports/new" className="underline text-[#0a0a0a]">첫 경위서를 작성하세요.</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#eee]">
                <th className="text-left py-2 text-[#999] font-normal">발생일시</th>
                <th className="text-left py-2 text-[#999] font-normal">현장</th>
                <th className="text-left py-2 text-[#999] font-normal">사고 유형</th>
                <th className="text-left py-2 text-[#999] font-normal">작성자</th>
                <th className="text-left py-2 text-[#999] font-normal">상태</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-[#f5f5f5] hover:bg-[#fafafa]">
                  <td className="py-3 text-[#555]">{r.occurred_at.slice(0, 16)}</td>
                  <td className="py-3 font-medium">{r.site_name}</td>
                  <td className="py-3 text-[#555]">{r.accident_type}</td>
                  <td className="py-3 text-[#555]">{r.reporter_name}</td>
                  <td className="py-3"><StatusBadge status={r.status} /></td>
                  <td className="py-3 text-right">
                    <Link href={`/reports/${r.id}`} className="text-xs text-[#555] hover:text-[#0a0a0a] underline">보기</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
