'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { AccidentAnalysis } from '@/types';
import { RISK_LEVEL_CONFIG } from '@/types';

const RISK_BADGE_COLOR: Record<number, 'green' | 'blue' | 'yellow' | 'red' | 'gray'> = {
  1: 'green', 2: 'blue', 3: 'yellow', 4: 'red', 5: 'red',
};

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<AccidentAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/analyses').then((r) => r.json()).then(setAnalyses).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? analyses : analyses.filter((a) => String(a.risk_level) === filter);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#0a0a0a]">분석 내역</h1>
          <p className="text-sm text-[#999] mt-0.5">전체 {analyses.length}건</p>
        </div>
        <Link href="/analyze">
          <button className="text-sm bg-[#0a0a0a] text-white px-4 py-2 rounded hover:bg-[#222]">+ 새 분석</button>
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {['all', '1', '2', '3', '4', '5'].map((v) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${
              filter === v ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]' : 'bg-white text-[#555] border-[#e5e5e5] hover:border-[#999]'
            }`}
          >
            {v === 'all' ? '전체' : `Lv.${v}`}
          </button>
        ))}
      </div>

      <Card title="">
        {loading ? (
          <div className="text-sm text-[#999] py-8 text-center">로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-[#999] py-8 text-center">분석 내역이 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#eee]">
                <th className="text-left py-2 text-[#999] font-normal">키워드</th>
                <th className="text-left py-2 text-[#999] font-normal">사고 유형</th>
                <th className="text-left py-2 text-[#999] font-normal">위험도</th>
                <th className="text-left py-2 text-[#999] font-normal">요약</th>
                <th className="text-left py-2 text-[#999] font-normal">분석 일시</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-[#f5f5f5] hover:bg-[#fafafa]">
                  <td className="py-3 font-medium">{a.keyword}</td>
                  <td className="py-3 text-[#555]">{a.accident_type}</td>
                  <td className="py-3">
                    {a.risk_level ? (
                      <Badge color={RISK_BADGE_COLOR[a.risk_level] ?? 'gray'}>
                        Lv.{a.risk_level} {RISK_LEVEL_CONFIG[a.risk_level]?.label}
                      </Badge>
                    ) : (
                      <Badge color="gray">{a.status === 'analyzing' ? '분석 중' : '-'}</Badge>
                    )}
                  </td>
                  <td className="py-3 text-[#777] max-w-[200px] truncate">{a.risk_summary ?? '-'}</td>
                  <td className="py-3 text-[#999]">{a.created_at.slice(0, 16)}</td>
                  <td className="py-3 text-right">
                    <Link href={`/history/${a.id}`} className="text-xs text-[#555] hover:text-[#0a0a0a] underline">상세보기</Link>
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
