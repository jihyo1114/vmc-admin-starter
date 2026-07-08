'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Report, ReportPhoto, AccidentAnalysis } from '@/types';
import { RISK_LEVEL_CONFIG } from '@/types';
import { getUserSession } from '@/components/UserSessionModal';

type PerspectiveState = { id: number; name: string; content: string; status: 'pending' | 'analyzing' | 'done' };

export default function ReportDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [analysis, setAnalysis] = useState<AccidentAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  const [analyzing, setAnalyzing] = useState(false);
  const [perspectives, setPerspectives] = useState<PerspectiveState[]>([]);
  const [analysisDone, setAnalysisDone] = useState(false);

  const [approverName, setApproverName] = useState('');
  const [pin, setPin] = useState('');
  const [comment, setComment] = useState('');
  const [approving, setApproving] = useState(false);
  const [pinError, setPinError] = useState('');

  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    fetch(`/api/reports/${id}`).then((r) => r.json()).then((data) => {
      setReport(data.report);
      setPhotos(data.photos);
      setAnalysis(data.analysis);
    }).finally(() => setLoading(false));

    const s = getUserSession();
    if (s) setApproverName(s.name);
  }, [id]);

  const startAnalysis = async () => {
    setAnalyzing(true);
    setPerspectives([]);
    setAnalysisDone(false);

    const response = await fetch(`/api/reports/${id}/analyze`, { method: 'POST' });
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
          if (event.type === 'perspective_start') setPerspectives((p) => [...p, { id: event.perspectiveId, name: event.name, content: '', status: 'analyzing' }]);
          if (event.type === 'perspective_chunk') setPerspectives((p) => p.map((x) => x.id === event.perspectiveId ? { ...x, content: x.content + event.chunk } : x));
          if (event.type === 'perspective_done') setPerspectives((p) => p.map((x) => x.id === event.perspectiveId ? { ...x, status: 'done' } : x));
          if (event.type === 'complete') {
            setAnalysis({ id: event.analysisId, risk_level: event.riskLevel, risk_summary: event.riskSummary } as AccidentAnalysis);
            setAnalysisDone(true);
            setAnalyzing(false);
          }
        } catch {}
      }
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    setPinError('');
    const res = await fetch(`/api/reports/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approver_name: approverName, pin, approver_comment: comment }),
    });
    if (res.ok) {
      setReport((r) => r ? { ...r, status: 'approved', approver_name: approverName, approved_at: new Date().toISOString() } : r);
    } else {
      const data = await res.json();
      setPinError(data.error || '승인 실패');
    }
    setApproving(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="text-sm text-[#999] p-4">로딩 중...</div>;
  if (!report) return <div className="text-sm text-red-500 p-4">경위서를 찾을 수 없습니다.</div>;

  const riskCfg = analysis?.risk_level ? RISK_LEVEL_CONFIG[analysis.risk_level] : null;

  return (
    <div className="max-w-3xl print:max-w-full print:p-0">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button onClick={() => router.back()} className="text-sm text-[#999] hover:text-[#0a0a0a]">← 목록으로</button>
        <div className="flex gap-2">
          {report.status === 'approved' && (
            <Button onClick={handlePrint} variant="secondary">PDF 출력</Button>
          )}
        </div>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#0a0a0a]">{report.accident_type} 경위서</h1>
          <p className="text-sm text-[#999] mt-0.5">{report.site_name} · {report.occurred_at.slice(0, 16)}</p>
        </div>
        <Badge color={report.status === 'approved' ? 'green' : 'yellow'}>
          {report.status === 'approved' ? '승인 완료' : '검토 대기'}
        </Badge>
      </div>

      <div className="print:block">
        <Card title="사고 기본 정보">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div><span className="text-[#999]">사고 유형</span><div className="mt-0.5 font-medium">{report.accident_type}</div></div>
            <div><span className="text-[#999]">발생 일시</span><div className="mt-0.5">{report.occurred_at.slice(0, 16)}</div></div>
            <div><span className="text-[#999]">발생 위치</span><div className="mt-0.5">{report.location}</div></div>
            <div><span className="text-[#999]">현장</span><div className="mt-0.5">{report.site_name}</div></div>
            <div><span className="text-[#999]">피해 인원</span><div className="mt-0.5">{report.victim_count}명 ({report.injury_severity})</div></div>
            <div><span className="text-[#999]">목격자</span><div className="mt-0.5">{report.witnesses || '-'}</div></div>
            <div><span className="text-[#999]">작성자</span><div className="mt-0.5">{report.reporter_name} ({report.reporter_department})</div></div>
            <div><span className="text-[#999]">작성 일시</span><div className="mt-0.5">{report.created_at.slice(0, 16)}</div></div>
          </div>
        </Card>

        <div className="mt-4">
          <Card title="사고 경위">
            <p className="text-sm text-[#333] leading-relaxed whitespace-pre-wrap">{report.incident_description}</p>
          </Card>
        </div>

        <div className="mt-4">
          <Card title="즉시 조치 사항">
            <p className="text-sm text-[#333] leading-relaxed whitespace-pre-wrap">{report.immediate_action}</p>
          </Card>
        </div>

        {photos.length > 0 && (
          <div className="mt-4">
            <Card title={`현장 사진 (${photos.length}장)`}>
              <div className="grid grid-cols-3 gap-3">
                {photos.map((p) => (
                  <img key={p.id} src={p.file_path} alt={p.file_name} className="w-full aspect-square object-cover rounded-lg border border-[#e5e5e5]" />
                ))}
              </div>
            </Card>
          </div>
        )}

        {report.status === 'approved' && report.approver_name && (
          <div className="mt-4">
            <Card title="승인 정보">
              <div className="text-sm space-y-1">
                <div><span className="text-[#999]">승인자: </span>{report.approver_name}</div>
                <div><span className="text-[#999]">승인 일시: </span>{report.approved_at?.slice(0, 16)}</div>
                {report.approver_comment && <div><span className="text-[#999]">의견: </span>{report.approver_comment}</div>}
              </div>
            </Card>
          </div>
        )}
      </div>

      <div className="mt-6 print:hidden">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-[#0a0a0a]">AI 위험도 분석</h2>
          {!analysis && !analyzing && (
            <Button onClick={startAnalysis}>분석 시작</Button>
          )}
        </div>

        {riskCfg && analysis?.risk_level && (
          <div className={`p-4 rounded-lg border mb-4 ${riskCfg.bg} ${riskCfg.border}`}>
            <div className="flex items-center gap-3">
              <span className={`text-3xl font-bold ${riskCfg.text}`}>Lv.{analysis.risk_level}</span>
              <div>
                <div className={`text-sm font-semibold ${riskCfg.text}`}>{riskCfg.label}</div>
                {analysis.risk_summary && <div className="text-xs text-[#555] mt-0.5">{analysis.risk_summary}</div>}
              </div>
            </div>
          </div>
        )}

        {perspectives.map((p) => (
          <div key={p.id} className="mb-2 bg-white border border-[#e5e5e5] rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                {p.status === 'analyzing' ? <span className="text-xs animate-pulse text-blue-500">●</span> : <span className="text-xs text-green-500">✓</span>}
                <span className="text-sm font-medium">{p.name}</span>
              </div>
              <Badge color={p.status === 'done' ? 'green' : 'gray'}>{p.status === 'analyzing' ? '분석 중' : '완료'}</Badge>
            </div>
            {p.content && (
              <div className="px-4 pb-3 border-t border-[#f5f5f5]">
                <p className="text-xs text-[#555] leading-relaxed whitespace-pre-wrap mt-2 line-clamp-3">{p.content}</p>
              </div>
            )}
          </div>
        ))}

        {!analysis && !analyzing && (
          <div className="p-4 border border-dashed border-[#e5e5e5] rounded-lg text-sm text-[#bbb] text-center">
            "분석 시작" 버튼을 클릭하면 AI가 5개 관점에서 위험도를 분석합니다.
          </div>
        )}
      </div>

      {report.status === 'submitted' && (
        <div className="mt-6 print:hidden">
          <Card title="책임자 최종 승인">
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[#999] mb-1">승인자 이름</label>
                <input value={approverName} onChange={(e) => setApproverName(e.target.value)} placeholder="홍길동" className="w-full text-sm border border-[#e5e5e5] rounded px-3 py-2 focus:outline-none focus:border-[#0a0a0a]" />
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">현장 승인 PIN</label>
                <input type="password" value={pin} onChange={(e) => { setPin(e.target.value); setPinError(''); }} placeholder="****" maxLength={8}
                  className={`w-full text-sm border rounded px-3 py-2 focus:outline-none ${pinError ? 'border-red-400' : 'border-[#e5e5e5] focus:border-[#0a0a0a]'}`} />
                {pinError && <p className="text-xs text-red-500 mt-1">{pinError}</p>}
                <p className="text-xs text-[#bbb] mt-1">기본 PIN: 1234</p>
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">검토 의견 (선택)</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="추가 의견을 입력하세요." className="w-full text-sm border border-[#e5e5e5] rounded px-3 py-2 focus:outline-none focus:border-[#0a0a0a] resize-none" />
              </div>
              <Button onClick={handleApprove} disabled={!approverName.trim() || !pin.trim() || approving} className="w-full">
                {approving ? '승인 처리 중...' : '최종 승인'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
