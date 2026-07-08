'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ACCIDENT_TYPES, RISK_LEVEL_CONFIG } from '@/types';

type PerspectiveState = {
  id: number;
  name: string;
  content: string;
  status: 'pending' | 'analyzing' | 'done';
};

type AnalyzeStatus = 'idle' | 'analyzing' | 'risk_analyzing' | 'completed' | 'error';

const RISK_BADGE_COLOR: Record<number, 'green' | 'blue' | 'yellow' | 'red' | 'gray'> = {
  1: 'green', 2: 'blue', 3: 'yellow', 4: 'red', 5: 'red',
};

export default function AnalyzePage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [accidentType, setAccidentType] = useState(ACCIDENT_TYPES[0]);
  const [content, setContent] = useState('');

  const [status, setStatus] = useState<AnalyzeStatus>('idle');
  const [perspectives, setPerspectives] = useState<PerspectiveState[]>([]);
  const [riskLevel, setRiskLevel] = useState<number | null>(null);
  const [riskSummary, setRiskSummary] = useState('');
  const [analysisId, setAnalysisId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !content.trim()) return;

    setStatus('analyzing');
    setPerspectives([]);
    setRiskLevel(null);
    setRiskSummary('');
    setAnalysisId(null);

    abortRef.current = new AbortController();

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, accidentType, content }),
        signal: abortRef.current.signal,
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(part.slice(6));
            handleEvent(event);
          } catch {}
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') setStatus('error');
    }
  };

  const handleEvent = (event: Record<string, unknown>) => {
    switch (event.type) {
      case 'started':
        setAnalysisId(event.analysisId as number);
        break;
      case 'perspective_start':
        setPerspectives((prev) => [
          ...prev,
          { id: event.perspectiveId as number, name: event.name as string, content: '', status: 'analyzing' },
        ]);
        break;
      case 'perspective_chunk':
        setPerspectives((prev) =>
          prev.map((p) => p.id === event.perspectiveId ? { ...p, content: p.content + (event.chunk as string) } : p)
        );
        break;
      case 'perspective_done':
        setPerspectives((prev) =>
          prev.map((p) => p.id === event.perspectiveId ? { ...p, status: 'done' } : p)
        );
        break;
      case 'risk_analyzing':
        setStatus('risk_analyzing');
        break;
      case 'complete':
        setRiskLevel(event.riskLevel as number);
        setRiskSummary(event.riskSummary as string);
        setAnalysisId(event.analysisId as number);
        setStatus('completed');
        break;
    }
  };

  const isAnalyzing = status === 'analyzing' || status === 'risk_analyzing';

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold text-[#0a0a0a] mb-1">위험도 분석</h1>
      <p className="text-sm text-[#999] mb-6">사고 정보를 입력하면 AI가 5개 관점에서 병렬 분석합니다.</p>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2">
          <Card title="사고 정보 입력">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-[#999] mb-1">사고 키워드</label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="예: 지게차 충돌"
                  disabled={isAnalyzing}
                  className="w-full text-sm border border-[#e5e5e5] rounded px-3 py-2 focus:outline-none focus:border-[#0a0a0a] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">사고 유형</label>
                <select
                  value={accidentType}
                  onChange={(e) => setAccidentType(e.target.value as typeof accidentType)}
                  disabled={isAnalyzing}
                  className="w-full text-sm border border-[#e5e5e5] rounded px-3 py-2 focus:outline-none focus:border-[#0a0a0a] disabled:opacity-50"
                >
                  {ACCIDENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">제출 내용</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="사고 경위, 조치 사항, 안전 관리 현황 등을 상세히 입력하세요."
                  rows={8}
                  disabled={isAnalyzing}
                  className="w-full text-sm border border-[#e5e5e5] rounded px-3 py-2 focus:outline-none focus:border-[#0a0a0a] disabled:opacity-50 resize-none"
                />
              </div>
              <Button type="submit" disabled={isAnalyzing || !keyword.trim() || !content.trim()} className="w-full">
                {isAnalyzing ? '분석 중...' : '분석 시작'}
              </Button>
            </form>
          </Card>
        </div>

        <div className="col-span-3 space-y-4">
          {status === 'idle' && (
            <div className="flex items-center justify-center h-40 border border-dashed border-[#e5e5e5] rounded-lg text-sm text-[#bbb]">
              분석 결과가 여기에 표시됩니다
            </div>
          )}

          {status === 'error' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              분석 중 오류가 발생했습니다. 다시 시도해주세요.
            </div>
          )}

          {status === 'completed' && riskLevel && (
            <div className={`p-5 rounded-lg border-2 ${RISK_LEVEL_CONFIG[riskLevel].bg} ${RISK_LEVEL_CONFIG[riskLevel].border}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-3xl font-bold ${RISK_LEVEL_CONFIG[riskLevel].text}`}>Lv.{riskLevel}</span>
                <div>
                  <div className={`text-sm font-semibold ${RISK_LEVEL_CONFIG[riskLevel].text}`}>{RISK_LEVEL_CONFIG[riskLevel].label}</div>
                  <div className="text-xs text-[#555]">법적 책임 수준</div>
                </div>
              </div>
              {riskSummary && <p className="text-sm text-[#333]">{riskSummary}</p>}
              {analysisId && (
                <button
                  onClick={() => router.push(`/history/${analysisId}`)}
                  className="mt-3 text-xs underline text-[#555] hover:text-[#0a0a0a]"
                >
                  전체 보고서 보기 →
                </button>
              )}
            </div>
          )}

          {(status === 'risk_analyzing') && (
            <div className="p-4 bg-[#f5f5f5] border border-[#e5e5e5] rounded-lg text-sm text-[#555] flex items-center gap-2">
              <span className="animate-pulse">●</span>
              종합 위험도 산출 중...
            </div>
          )}

          {perspectives.map((p) => (
            <div key={p.id} className="bg-white border border-[#e5e5e5] rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left"
                onClick={() => setExpanded((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
              >
                <div className="flex items-center gap-2">
                  {p.status === 'analyzing' ? (
                    <span className="text-xs animate-pulse text-blue-500">●</span>
                  ) : (
                    <span className="text-xs text-green-500">✓</span>
                  )}
                  <span className="text-sm font-medium text-[#0a0a0a]">{p.name}</span>
                </div>
                <Badge color={p.status === 'done' ? 'green' : 'gray'}>
                  {p.status === 'analyzing' ? '분석 중' : '완료'}
                </Badge>
              </button>
              {(expanded[p.id] || p.status === 'analyzing') && p.content && (
                <div className="px-4 pb-4 border-t border-[#f5f5f5]">
                  <p className="text-xs text-[#555] leading-relaxed whitespace-pre-wrap mt-3">{p.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
