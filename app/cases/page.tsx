'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { CourtCase } from '@/types';
import { ACCIDENT_TYPES, RISK_LEVEL_CONFIG } from '@/types';

const RISK_BADGE_COLOR: Record<number, 'green' | 'blue' | 'yellow' | 'red' | 'gray'> = {
  1: 'green', 2: 'blue', 3: 'yellow', 4: 'red', 5: 'red',
};

export default function CasesPage() {
  const [cases, setCases] = useState<CourtCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState<CourtCase | null>(null);

  useEffect(() => {
    const url = typeFilter === 'all' ? '/api/cases' : `/api/cases?type=${encodeURIComponent(typeFilter)}`;
    setLoading(true);
    fetch(url).then((r) => r.json()).then(setCases).finally(() => setLoading(false));
  }, [typeFilter]);

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold text-[#0a0a0a] mb-1">법원 판례</h1>
      <p className="text-sm text-[#999] mb-6">대한민국 물류 안전사고 관련 법원 판례 데이터베이스</p>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setTypeFilter('all')}
          className={`text-xs px-3 py-1.5 rounded border transition-colors ${typeFilter === 'all' ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]' : 'bg-white text-[#555] border-[#e5e5e5] hover:border-[#999]'}`}
        >
          전체
        </button>
        {ACCIDENT_TYPES.slice(0, 7).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${typeFilter === t ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]' : 'bg-white text-[#555] border-[#e5e5e5] hover:border-[#999]'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Card title={`판례 목록 (${cases.length}건)`}>
            {loading ? (
              <div className="text-sm text-[#999] py-8 text-center">로딩 중...</div>
            ) : cases.length === 0 ? (
              <div className="text-sm text-[#999] py-8 text-center">해당 유형의 판례가 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {cases.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={`w-full text-left p-3 rounded border transition-colors ${selected?.id === c.id ? 'border-[#0a0a0a] bg-[#f5f5f5]' : 'border-[#f0f0f0] hover:border-[#ddd]'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-[#999]">{c.case_number}</span>
                      <div className="flex gap-1">
                        <Badge color="gray">{c.accident_type}</Badge>
                        {c.risk_level && (
                          <Badge color={RISK_BADGE_COLOR[c.risk_level] ?? 'gray'}>Lv.{c.risk_level}</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-[#0a0a0a] font-medium">{c.court_name} · {c.judgment_date}</p>
                    <p className="text-xs text-[#777] mt-1 line-clamp-2">{c.incident_summary}</p>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div>
          {selected ? (
            <Card title="판례 상세">
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-[#999]">사건번호</div>
                  <div className="font-mono font-medium">{selected.case_number}</div>
                </div>
                <div>
                  <div className="text-xs text-[#999]">법원 / 선고일</div>
                  <div>{selected.court_name} / {selected.judgment_date}</div>
                </div>
                <div>
                  <div className="text-xs text-[#999]">사고 유형</div>
                  <Badge color="gray">{selected.accident_type}</Badge>
                </div>
                <div>
                  <div className="text-xs text-[#999] mb-1">사건 개요</div>
                  <p className="text-xs text-[#333] leading-relaxed">{selected.incident_summary}</p>
                </div>
                <div className="border-t border-[#f0f0f0] pt-3">
                  <div className="text-xs text-[#999] mb-1">판결 결과</div>
                  <div className="font-medium text-[#0a0a0a]">{selected.judgment_result}</div>
                  {selected.penalty && <div className="text-xs text-[#555] mt-0.5">처벌: {selected.penalty}</div>}
                  {selected.compensation_amount && (
                    <div className="text-xs text-[#555]">손해배상: {selected.compensation_amount.toLocaleString()}만원</div>
                  )}
                </div>
                {selected.risk_level && (
                  <div>
                    <div className="text-xs text-[#999] mb-1">책임 레벨</div>
                    <Badge color={RISK_BADGE_COLOR[selected.risk_level] ?? 'gray'}>
                      Lv.{selected.risk_level} {RISK_LEVEL_CONFIG[selected.risk_level]?.label}
                    </Badge>
                  </div>
                )}
                {selected.keywords && (
                  <div>
                    <div className="text-xs text-[#999] mb-1">키워드</div>
                    <div className="flex flex-wrap gap-1">
                      {selected.keywords.split(',').map((k) => (
                        <span key={k} className="text-xs bg-[#f0f0f0] px-2 py-0.5 rounded">{k.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-40 border border-dashed border-[#e5e5e5] rounded-lg text-sm text-[#bbb]">
              판례를 선택하면 상세 정보가 표시됩니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
