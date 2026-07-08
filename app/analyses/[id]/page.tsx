'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type {
  AnalysisWithMerchant,
  PerspectiveResult,
  PerspectiveKey,
  RiskLevel,
  Recommendation,
} from '@/types/index';

// ── 한국어 표시 매핑 ──────────────────────────────────────────

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
  approved: '승인 권고',
  rejected: '거절 권고',
  need_info: '추가정보 필요',
};

const DECISION_LABEL: Record<Recommendation, string> = {
  approved: '승인',
  rejected: '거절',
  need_info: '추가정보 필요',
};

const DECISION_COLOR: Record<Recommendation, 'green' | 'red' | 'yellow'> = {
  approved: 'green',
  rejected: 'red',
  need_info: 'yellow',
};

const PERSPECTIVE_DISPLAY_TITLE: Record<PerspectiveKey, string> = {
  identity: '신원 확인',
  industry: '업종 위험도',
  reputation: '평판 조회',
  documents: '서류 정합성',
};

const PERSPECTIVE_ORDER: PerspectiveKey[] = ['identity', 'industry', 'reputation', 'documents'];

// ── 관점 진행 상태 타입 (SSE 스트리밍 중 사용) ────────────────

type PerspectiveLive = {
  key: PerspectiveKey;
  title: string;
  status: 'waiting' | 'analyzing' | 'done' | 'failed';
  risk_level?: RiskLevel;
  findings?: string;
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────

export default function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisWithMerchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // SSE 스트리밍 상태
  const [streaming, setStreaming] = useState(false);
  const [streamError, setStreamError] = useState('');
  const [livePerspectives, setLivePerspectives] = useState<PerspectiveLive[]>([]);
  const [synthesizing, setSynthesizing] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // 최종결정 입력 상태
  const [decisionSelect, setDecisionSelect] = useState<Recommendation | ''>('');
  const [decisionMemo, setDecisionMemo] = useState('');
  const [savingDecision, setSavingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const [decisionSaved, setDecisionSaved] = useState(false);

  // 재심사 상태
  const [reanalyzing, setReanalyzing] = useState(false);

  // params unwrap
  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  // 분석 데이터 조회
  const fetchAnalysis = async (analysisId: string) => {
    try {
      const res = await fetch(`/api/analyses/${analysisId}`);
      if (!res.ok) {
        setError('분석 데이터를 찾을 수 없습니다.');
        return;
      }
      const data = (await res.json()) as AnalysisWithMerchant;
      setAnalysis(data);
      // 결정 필드 초기값 세팅
      if (data.final_decision) {
        setDecisionSelect(data.final_decision);
        setDecisionMemo(data.decision_memo ?? '');
      }
    } catch {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchAnalysis(id);
  }, [id]);

  // 언마운트 시 SSE 연결 종료
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // ── 분석 실행 (SSE) ─────────────────────────────────────────

  function startAnalysis() {
    if (!id) return;

    // 초기화
    setStreaming(true);
    setStreamError('');
    setSynthesizing(false);
    setLivePerspectives(
      PERSPECTIVE_ORDER.map((key) => ({
        key,
        title: PERSPECTIVE_DISPLAY_TITLE[key],
        status: 'waiting',
      }))
    );

    const es = new EventSource(`/api/analyses/${id}/run`, { withCredentials: false });
    eventSourceRef.current = es;

    // POST 대신 EventSource는 GET만 지원하므로 fetch로 POST 후 SSE 수신
    // 실제로는 fetch + ReadableStream을 사용해야 하지만,
    // run/route.ts가 POST라 EventSource 직접 연결 불가 → fetch + reader 방식으로 처리
    es.close();
    eventSourceRef.current = null;

    // fetch + ReadableStream 방식으로 SSE POST 처리
    fetchSSE(id);
  }

  async function fetchSSE(analysisId: string) {
    const controller = new AbortController();

    // 컴포넌트 언마운트 시 abort를 위해 ref에 저장하는 cleanup 등록
    const cleanup = () => controller.abort();
    eventSourceRef.current = { close: cleanup } as unknown as EventSource;

    try {
      const res = await fetch(`/api/analyses/${analysisId}/run`, {
        method: 'POST',
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setStreamError('분석 실행 요청에 실패했습니다.');
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let currentEvent = '';
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            currentData = line.slice(6).trim();
          } else if (line === '' && currentEvent && currentData) {
            handleSSEEvent(currentEvent, currentData);
            currentEvent = '';
            currentData = '';
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setStreamError('분석 중 연결 오류가 발생했습니다.');
        setStreaming(false);
      }
    }
  }

  function handleSSEEvent(event: string, dataStr: string) {
    try {
      const data = JSON.parse(dataStr) as Record<string, unknown>;

      if (event === 'perspective_start') {
        const key = data.key as PerspectiveKey;
        setLivePerspectives((prev) =>
          prev.map((p) => (p.key === key ? { ...p, status: 'analyzing' } : p))
        );
      } else if (event === 'perspective_done') {
        const key = data.key as PerspectiveKey;
        const status = data.status as 'completed' | 'failed';
        setLivePerspectives((prev) =>
          prev.map((p) =>
            p.key === key
              ? {
                  ...p,
                  status: status === 'completed' ? 'done' : 'failed',
                  risk_level: data.risk_level as RiskLevel | undefined,
                  findings: data.findings as string | undefined,
                }
              : p
          )
        );
      } else if (event === 'synthesis_start') {
        setSynthesizing(true);
      } else if (event === 'done') {
        setStreaming(false);
        setSynthesizing(false);
        if (data.error) {
          setStreamError(data.error as string);
        } else {
          // 분석 완료 → 데이터 다시 조회
          if (id) fetchAnalysis(id);
        }
      } else if (event === 'error') {
        setStreamError((data.message as string) ?? '알 수 없는 오류');
        setStreaming(false);
      }
    } catch {
      // JSON 파싱 오류는 무시
    }
  }

  // ── 최종결정 저장 ────────────────────────────────────────────

  async function saveDecision() {
    if (!id || !decisionSelect) return;

    setSavingDecision(true);
    setDecisionError('');
    try {
      const res = await fetch(`/api/analyses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          final_decision: decisionSelect,
          decision_memo: decisionMemo,
        }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setDecisionError(body.error ?? '저장 중 오류가 발생했습니다.');
        return;
      }

      const updated = (await res.json()) as {
        final_decision: Recommendation;
        decision_memo: string | null;
        decided_by: string;
        decided_at: string;
      };

      setAnalysis((prev) =>
        prev
          ? {
              ...prev,
              final_decision: updated.final_decision,
              decision_memo: updated.decision_memo,
              decided_by: updated.decided_by,
              decided_at: updated.decided_at,
            }
          : prev
      );
      setDecisionSaved(true);
    } finally {
      setSavingDecision(false);
    }
  }

  // ── 재심사 ───────────────────────────────────────────────────

  async function handleReanalyze() {
    if (!analysis) return;
    setReanalyzing(true);
    try {
      const res = await fetch('/api/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_id: analysis.merchant_id }),
      });

      if (!res.ok) {
        alert('재심사 요청 중 오류가 발생했습니다.');
        return;
      }

      const data = (await res.json()) as { analysisId: number };
      router.push(`/analyses/${data.analysisId}`);
    } finally {
      setReanalyzing(false);
    }
  }

  // ── 파싱된 perspectives ──────────────────────────────────────

  function parsePerspectives(analysis: AnalysisWithMerchant): PerspectiveResult[] {
    if (!analysis.perspectives) return [];
    try {
      return JSON.parse(analysis.perspectives) as PerspectiveResult[];
    } catch {
      return [];
    }
  }

  // ── 렌더 ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-sm text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-sm text-red-600">{error || '분석 데이터를 찾을 수 없습니다.'}</p>
      </div>
    );
  }

  const { status } = analysis;

  // ── (b) running 상태 ─────────────────────────────────────────

  if (status === 'running') {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <MerchantInfoCard analysis={analysis} />
        <Card>
          <p className="text-sm text-gray-600 text-center py-4">분석 진행 중...</p>
        </Card>
      </div>
    );
  }

  // ── (a) pending / failed 상태 ────────────────────────────────

  if (status === 'pending' || status === 'failed') {
    return (
      <div className="max-w-3xl mx-auto space-y-4 print:hidden">
        <MerchantInfoCard analysis={analysis} />

        {status === 'failed' && !streaming && (
          <p className="text-sm text-red-600">이전 분석이 실패했습니다. 다시 시도하세요.</p>
        )}

        {streamError && (
          <p className="text-sm text-red-600">{streamError}</p>
        )}

        {!streaming && (
          <div className="flex justify-start">
            <Button variant="primary" onClick={startAnalysis}>
              분석 실행
            </Button>
          </div>
        )}

        {streaming && (
          <div className="space-y-3">
            <Card title="관점별 분석 현황">
              <div className="space-y-2">
                {livePerspectives.map((p) => (
                  <div
                    key={p.key}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-sm font-medium text-gray-700">
                      {PERSPECTIVE_DISPLAY_TITLE[p.key]}
                    </span>
                    <span className="text-sm text-gray-500">
                      {p.status === 'waiting' && '대기 중'}
                      {p.status === 'analyzing' && '분석 중...'}
                      {p.status === 'done' && p.risk_level && (
                        <Badge color={RISK_COLOR[p.risk_level]}>
                          {RISK_LABEL[p.risk_level]}
                        </Badge>
                      )}
                      {p.status === 'failed' && (
                        <Badge color="gray">분석불가</Badge>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {synthesizing && (
              <Card>
                <p className="text-sm text-gray-600 text-center py-2">
                  종합 판정 중...
                </p>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── (c) completed 상태 ───────────────────────────────────────

  const perspectives = parsePerspectives(analysis);
  const reportFirstLine = analysis.report?.split('\n').find((l) => l.trim()) ?? '';

  return (
    <>
      <style media="print">{`
        .no-print { display: none !important; }
        body { background: white !important; }
      `}</style>

      {decisionSaved && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 no-print">
          <div className="bg-white rounded-xl shadow-xl p-8 flex flex-col items-center gap-4 min-w-[280px]">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-100">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-900">결정이 저장되었습니다</p>
            {analysis.decided_by && (
              <p className="text-sm text-gray-500">결정자: {analysis.decided_by}</p>
            )}
            <Button variant="primary" onClick={() => setDecisionSaved(false)}>
              확인
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4 no-print">
          <h1 className="text-xl font-semibold text-gray-900">{analysis.merchant_name}</h1>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              인쇄 / PDF
            </Button>
            <Button variant="secondary" size="sm" onClick={handleReanalyze} disabled={reanalyzing}>
              {reanalyzing ? '요청 중...' : '재심사'}
            </Button>
            <a
              href={`/analyses?merchant_id=${analysis.merchant_id}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors text-sm px-4 py-2 bg-white hover:bg-gray-50 text-[#0a0a0a] border border-[#e5e5e5]"
            >
              이력 보기
            </a>
          </div>
        </div>

        <div className="flex gap-6 items-start">
          {/* ── 좌측 콘텐츠 영역 ─────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* 요약 카드 */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                {analysis.risk_grade && (
                  <Badge color={RISK_COLOR[analysis.risk_grade]} size="md">
                    {RISK_LABEL[analysis.risk_grade]}
                  </Badge>
                )}
                {analysis.recommendation && (
                  <Badge color={DECISION_COLOR[analysis.recommendation]} size="md">
                    {RECOMMENDATION_LABEL[analysis.recommendation]}
                  </Badge>
                )}
              </div>
              {reportFirstLine && (
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{reportFirstLine}</p>
              )}
            </div>

            {/* 가맹점 제출 정보 */}
            <MerchantInfoCard analysis={analysis} />

            {/* 관점별 분석 4개 */}
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">AI 다각도 분석</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PERSPECTIVE_ORDER.map((key) => {
                  const p = perspectives.find((r) => r.key === key);
                  return (
                    <Card key={key} title={PERSPECTIVE_DISPLAY_TITLE[key]}>
                      {!p || p.status === 'failed' ? (
                        <Badge color="gray">분석불가</Badge>
                      ) : (
                        <div className="space-y-2">
                          <Badge color={RISK_COLOR[p.risk_level]}>{RISK_LABEL[p.risk_level]}</Badge>
                          <p className="text-sm text-gray-600 leading-relaxed">{p.findings}</p>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* 종합 보고서 */}
            {analysis.report && (
              <Card title="종합 보고서">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {analysis.report}
                </p>
              </Card>
            )}
          </div>

          {/* ── 우측 sticky 패널 ──────────────────────────────── */}
          <div className="w-72 shrink-0 no-print">
            <div className="sticky top-6 space-y-3">
              {/* 위험도 + AI 권고 요약 */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI 분석 결과</p>
                {analysis.risk_grade && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">위험도</span>
                    <Badge color={RISK_COLOR[analysis.risk_grade]} size="md">
                      {RISK_LABEL[analysis.risk_grade]}
                    </Badge>
                  </div>
                )}
                {analysis.recommendation && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">AI 권고</span>
                    <Badge color={DECISION_COLOR[analysis.recommendation]} size="md">
                      {RECOMMENDATION_LABEL[analysis.recommendation]}
                    </Badge>
                  </div>
                )}
              </div>

              {/* 결정 폼 */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">최종 결정</p>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">결정</label>
                  <select
                    value={decisionSelect}
                    onChange={(e) => setDecisionSelect(e.target.value as Recommendation | '')}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 bg-gray-50"
                  >
                    <option value="">선택하세요</option>
                    <option value="approved">승인</option>
                    <option value="rejected">거절</option>
                    <option value="need_info">추가정보 필요</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">메모</label>
                  <textarea
                    value={decisionMemo}
                    onChange={(e) => setDecisionMemo(e.target.value)}
                    placeholder="결정 사유를 입력하세요."
                    rows={3}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none bg-gray-50"
                  />
                </div>

                {decisionError && <p className="text-xs text-red-600">{decisionError}</p>}

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={saveDecision}
                  disabled={savingDecision || !decisionSelect}
                >
                  {savingDecision ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      저장 중...
                    </span>
                  ) : '결정 저장'}
                </Button>

                {analysis.decided_by && analysis.decided_at && (
                  <div className="pt-3 border-t border-gray-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">확정 결정</span>
                      {analysis.final_decision && (
                        <Badge color={DECISION_COLOR[analysis.final_decision]}>
                          {DECISION_LABEL[analysis.final_decision]}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      결정자: <span className="text-gray-700 font-medium">{analysis.decided_by}</span>
                    </p>
                    <p className="text-xs text-gray-400">{analysis.decided_at}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── 가맹점 정보 카드 (공통) ───────────────────────────────────

function MerchantInfoCard({ analysis }: { analysis: AnalysisWithMerchant }) {
  return (
    <Card title="가맹점 정보">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-gray-500 text-xs">상호명</dt>
          <dd className="text-gray-900 font-medium">{analysis.merchant_name}</dd>
        </div>
        <div>
          <dt className="text-gray-500 text-xs">사업자번호</dt>
          <dd className="text-gray-900">{analysis.business_number}</dd>
        </div>
        <div>
          <dt className="text-gray-500 text-xs">대표자</dt>
          <dd className="text-gray-900">{analysis.representative ?? '미기재'}</dd>
        </div>
        <div>
          <dt className="text-gray-500 text-xs">업종</dt>
          <dd className="text-gray-900">{analysis.merchant_category}</dd>
        </div>
        {analysis.address && (
          <div className="col-span-2">
            <dt className="text-gray-500 text-xs">주소</dt>
            <dd className="text-gray-900">{analysis.address}</dd>
          </div>
        )}
        {analysis.submitted_docs && (
          <div className="col-span-2">
            <dt className="text-gray-500 text-xs">제출 서류</dt>
            <dd className="text-gray-900">{analysis.submitted_docs}</dd>
          </div>
        )}
      </dl>
    </Card>
  );
}
