'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { AccidentAnalysis, LegacyPerspectiveResult } from '@/types';
import { RISK_LEVEL_CONFIG } from '@/types';

export default function AnalysisDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<AccidentAnalysis | null>(null);
  const [perspectives, setPerspectives] = useState<LegacyPerspectiveResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/analyses/${id}`).then((r) => r.json()).then((data) => {
      setAnalysis(data.analysis);
      setPerspectives(data.perspectives);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-sm text-[#999] p-4">로딩 중...</div>;
  if (!analysis) return <div className="text-sm text-red-500 p-4">분석 결과를 찾을 수 없습니다.</div>;

  const cfg = analysis.risk_level ? RISK_LEVEL_CONFIG[analysis.risk_level] : null;

  return (
    <div className="max-w-3xl">
      <button onClick={() => router.back()} className="text-sm text-[#999] hover:text-[#0a0a0a] mb-4 flex items-center gap-1">
        ← 목록으로
      </button>

      <div className="flex items-start gap-4 mb-6">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-[#0a0a0a]">{analysis.keyword}</h1>
          <p className="text-sm text-[#999] mt-0.5">{analysis.accident_type} · {analysis.created_at.slice(0, 16)}</p>
        </div>
        {cfg && analysis.risk_level && (
          <div className={`px-4 py-3 rounded-lg border ${cfg.bg} ${cfg.border} text-center min-w-[100px]`}>
            <div className={`text-2xl font-bold ${cfg.text}`}>Lv.{analysis.risk_level}</div>
            <div className={`text-xs ${cfg.text}`}>{cfg.label}</div>
          </div>
        )}
      </div>

      {analysis.risk_summary && (
        <div className={`p-4 rounded-lg border mb-6 ${cfg?.bg} ${cfg?.border}`}>
          <div className="text-xs text-[#999] mb-1">종합 평가</div>
          <p className={`text-sm font-medium ${cfg?.text}`}>{analysis.risk_summary}</p>
        </div>
      )}

      <Card title="제출 내용">
        <p className="text-sm text-[#333] whitespace-pre-wrap leading-relaxed">{analysis.submitted_content}</p>
      </Card>

      <div className="mt-4 space-y-4">
        <h2 className="text-sm font-semibold text-[#0a0a0a]">관점별 분석 결과</h2>
        {perspectives.map((p) => (
          <details key={p.id} className="bg-white border border-[#e5e5e5] rounded-lg overflow-hidden group">
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none">
              <span className="text-sm font-medium text-[#0a0a0a]">{p.guideline_name}</span>
              <Badge color="green">완료</Badge>
            </summary>
            <div className="px-4 pb-4 border-t border-[#f5f5f5]">
              <p className="text-sm text-[#333] leading-relaxed whitespace-pre-wrap mt-3">
                {p.content || '분석 결과가 없습니다.'}
              </p>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
