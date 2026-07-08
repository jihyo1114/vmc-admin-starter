'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { CourtCase } from '@/types';
import { RISK_LEVEL_CONFIG } from '@/types';

const RISK_BADGE_COLOR: Record<number, 'green' | 'blue' | 'yellow' | 'red' | 'gray'> = {
  1: 'green', 2: 'blue', 3: 'yellow', 4: 'red', 5: 'red',
};

export default function HistoryPage() {
  const [cases, setCases] = useState<CourtCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/cases').then((r) => r.json()).then(setCases).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? cases : cases.filter((c) => String(c.risk_level) === filter);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#0a0a0a]">판례 내역</h1>
          <p className="text-sm text-[#999] mt-0.5">전체 {cases.length}건</p>
        </div>
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
          <div className="text-sm text-[#999] py-8 text-center">판례 내역이 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#eee]">
                <th className="text-left py-2 text-[#999] font-normal">사건번호</th>
                <th className="text-left py-2 text-[#999] font-normal">법원</th>
                <th className="text-left py-2 text-[#999] font-normal">사고 유형</th>
                <th className="text-left py-2 text-[#999] font-normal">위험도</th>
                <th className="text-left py-2 text-[#999] font-normal">키워드</th>
                <th className="text-left py-2 text-[#999] font-normal">판결일</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-[#f5f5f5] hover:bg-[#fafafa]">
                  <td className="py-3 font-medium">{c.case_number}</td>
                  <td className="py-3 text-[#555]">{c.court_name}</td>
                  <td className="py-3 text-[#555]">{c.accident_type}</td>
                  <td className="py-3">
                    {c.risk_level ? (
                      <Badge color={RISK_BADGE_COLOR[c.risk_level] ?? 'gray'}>
                        Lv.{c.risk_level} {RISK_LEVEL_CONFIG[c.risk_level]?.label}
                      </Badge>
                    ) : (
                      <Badge color="gray">-</Badge>
                    )}
                  </td>
                  <td className="py-3 text-[#777] max-w-[160px] truncate">{c.keywords ?? '-'}</td>
                  <td className="py-3 text-[#999]">{c.judgment_date}</td>
                  <td className="py-3 text-right">
                    <Link href={`/history/${c.id}`} className="text-xs text-[#555] hover:text-[#0a0a0a] underline">상세보기</Link>
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
