'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ACCIDENT_TYPES, INJURY_SEVERITIES } from '@/types';
import type { UserSession } from '@/types';
import { getUserSession } from '@/components/UserSessionModal';

type FormData = {
  accident_type: string;
  occurred_at: string;
  location: string;
  victim_count: number;
  injury_severity: string;
  incident_note: string;
  immediate_action_note: string;
  incident_description: string;
  immediate_action: string;
  witnesses: string;
};

const STEPS = ['기본 정보', '사고 내용 메모', 'AI 초안 검토', '사진 및 제출'];

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-6">
      <div className="flex justify-between text-xs text-[#999] mb-2">
        <span>Step {current} / {total}</span>
        <span>{STEPS[current - 1]}</span>
      </div>
      <div className="w-full h-1.5 bg-[#eee] rounded-full">
        <div className="h-1.5 bg-[#0a0a0a] rounded-full transition-all" style={{ width: `${(current / total) * 100}%` }} />
      </div>
    </div>
  );
}

export default function NewReportPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [session, setSession] = useState<UserSession | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const [form, setForm] = useState<FormData>({
    accident_type: ACCIDENT_TYPES[0],
    occurred_at: localNow,
    location: '',
    victim_count: 1,
    injury_severity: '경상',
    incident_note: '',
    immediate_action_note: '',
    incident_description: '',
    immediate_action: '',
    witnesses: '',
  });

  useEffect(() => {
    setSession(getUserSession());
  }, []);

  const set = (field: keyof FormData, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleDraft = async () => {
    setDrafting(true);
    try {
      const res = await fetch('/api/ai/draft-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accident_type: form.accident_type,
          location: form.location,
          occurred_at: form.occurred_at,
          victim_count: form.victim_count,
          injury_severity: form.injury_severity,
          incident_note: form.incident_note,
          immediate_action_note: form.immediate_action_note,
        }),
      });
      const data = await res.json();
      setForm((prev) => ({
        ...prev,
        incident_description: data.incident_description || prev.incident_note,
        immediate_action: data.immediate_action || prev.immediate_action_note,
      }));
      setStep(3);
    } finally {
      setDrafting(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 5 - photos.length);
    const newPhotos = [...photos, ...files].slice(0, 5);
    setPhotos(newPhotos);
    setPhotoPreviews(newPhotos.map((f) => URL.createObjectURL(f)));
  };

  const removePhoto = (i: number) => {
    const newPhotos = photos.filter((_, idx) => idx !== i);
    setPhotos(newPhotos);
    setPhotoPreviews(newPhotos.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async () => {
    if (!session) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: session.site_id,
          reporter_name: session.name,
          reporter_department: session.department,
          ...form,
        }),
      });
      const { id } = await res.json();

      if (photos.length > 0) {
        const fd = new FormData();
        photos.forEach((p) => fd.append('photos', p));
        await fetch(`/api/reports/${id}/photos`, { method: 'POST', body: fd });
      }

      router.push(`/reports/${id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const step1Valid = form.location.trim() !== '';
  const step2Valid = form.incident_note.trim() !== '' && form.immediate_action_note.trim() !== '';

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="text-sm text-[#999] hover:text-[#0a0a0a]">← 뒤로</button>
        <h1 className="text-lg font-semibold text-[#0a0a0a]">경위서 작성</h1>
      </div>

      <StepBar current={step} total={4} />

      {!session && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700 mb-4">
          하단의 현장 접속 설정을 먼저 완료해주세요.
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#555] mb-1.5">사고 유형</label>
            <select value={form.accident_type} onChange={(e) => set('accident_type', e.target.value)}
              className="w-full text-sm border border-[#e5e5e5] rounded-lg px-4 py-3 focus:outline-none focus:border-[#0a0a0a]">
              {ACCIDENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#555] mb-1.5">사고 발생 일시</label>
            <input type="datetime-local" value={form.occurred_at} onChange={(e) => set('occurred_at', e.target.value)}
              className="w-full text-sm border border-[#e5e5e5] rounded-lg px-4 py-3 focus:outline-none focus:border-[#0a0a0a]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#555] mb-1.5">사고 발생 위치 <span className="text-red-400">*</span></label>
            <input type="text" value={form.location} onChange={(e) => set('location', e.target.value)}
              placeholder="예: 창고 2동 3층 컨베이어 구역"
              className="w-full text-sm border border-[#e5e5e5] rounded-lg px-4 py-3 focus:outline-none focus:border-[#0a0a0a]" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#555] mb-1.5">피해 인원</label>
              <input type="number" min={0} value={form.victim_count} onChange={(e) => set('victim_count', Number(e.target.value))}
                className="w-full text-sm border border-[#e5e5e5] rounded-lg px-4 py-3 focus:outline-none focus:border-[#0a0a0a]" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#555] mb-1.5">부상 정도</label>
              <select value={form.injury_severity} onChange={(e) => set('injury_severity', e.target.value)}
                className="w-full text-sm border border-[#e5e5e5] rounded-lg px-4 py-3 focus:outline-none focus:border-[#0a0a0a]">
                {INJURY_SEVERITIES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <button onClick={() => setStep(2)} disabled={!step1Valid}
            className="w-full bg-[#0a0a0a] text-white text-sm py-3.5 rounded-lg font-medium hover:bg-[#222] disabled:opacity-40 mt-2">
            다음 →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-600">
            짧게 메모해도 됩니다. AI가 정식 문체로 변환합니다.
          </div>
          <div>
            <label className="block text-xs font-medium text-[#555] mb-1.5">사고 경위 <span className="text-red-400">*</span></label>
            <textarea value={form.incident_note} onChange={(e) => set('incident_note', e.target.value)}
              placeholder="예: 지게차 후진 중 뒤에 있던 작업자 충돌. 안전통로 라인 있었는데 진입함."
              rows={5} className="w-full text-sm border border-[#e5e5e5] rounded-lg px-4 py-3 focus:outline-none focus:border-[#0a0a0a] resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#555] mb-1.5">즉시 조치 사항 <span className="text-red-400">*</span></label>
            <textarea value={form.immediate_action_note} onChange={(e) => set('immediate_action_note', e.target.value)}
              placeholder="예: 119 신고, 현장보존, 팀장 보고, 작업중지"
              rows={4} className="w-full text-sm border border-[#e5e5e5] rounded-lg px-4 py-3 focus:outline-none focus:border-[#0a0a0a] resize-none" />
          </div>
          <button onClick={handleDraft} disabled={!step2Valid || drafting}
            className="w-full bg-[#0a0a0a] text-white text-sm py-3.5 rounded-lg font-medium hover:bg-[#222] disabled:opacity-40 mt-2">
            {drafting ? 'AI 초안 생성 중...' : 'AI 초안 생성 →'}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-600">
            AI가 생성한 초안입니다. 내용을 검토하고 필요 시 수정하세요.
          </div>
          <div>
            <label className="block text-xs font-medium text-[#555] mb-1.5">사고 경위 (검토 및 수정)</label>
            <textarea value={form.incident_description} onChange={(e) => set('incident_description', e.target.value)}
              rows={7} className="w-full text-sm border border-[#e5e5e5] rounded-lg px-4 py-3 focus:outline-none focus:border-[#0a0a0a] resize-none leading-relaxed" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#555] mb-1.5">즉시 조치 사항 (검토 및 수정)</label>
            <textarea value={form.immediate_action} onChange={(e) => set('immediate_action', e.target.value)}
              rows={4} className="w-full text-sm border border-[#e5e5e5] rounded-lg px-4 py-3 focus:outline-none focus:border-[#0a0a0a] resize-none leading-relaxed" />
          </div>
          <button onClick={() => setStep(4)} disabled={!form.incident_description.trim()}
            className="w-full bg-[#0a0a0a] text-white text-sm py-3.5 rounded-lg font-medium hover:bg-[#222] disabled:opacity-40 mt-2">
            다음 →
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#555] mb-1.5">목격자</label>
            <input type="text" value={form.witnesses} onChange={(e) => set('witnesses', e.target.value)}
              placeholder="예: 김철수 (물류1팀), 이영희 (안전팀)"
              className="w-full text-sm border border-[#e5e5e5] rounded-lg px-4 py-3 focus:outline-none focus:border-[#0a0a0a]" />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#555] mb-1.5">현장 사진 ({photos.length}/5)</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {photoPreviews.map((src, i) => (
                <div key={i} className="relative aspect-square">
                  <img src={src} alt="" className="w-full h-full object-cover rounded-lg border border-[#e5e5e5]" />
                  <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center">×</button>
                </div>
              ))}
              {photos.length < 5 && (
                <button onClick={() => fileRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-[#ddd] rounded-lg flex items-center justify-center text-[#bbb] text-2xl hover:border-[#999]">
                  +
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
          </div>

          {session && (
            <div className="p-4 bg-[#f5f5f5] rounded-lg">
              <div className="text-xs text-[#999] mb-2">작성자 정보</div>
              <div className="text-sm text-[#0a0a0a]">{session.name} · {session.department} · {session.site_name}</div>
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting || !session}
            className="w-full bg-[#0a0a0a] text-white text-sm py-3.5 rounded-lg font-medium hover:bg-[#222] disabled:opacity-40 mt-2">
            {submitting ? '제출 중...' : '경위서 제출 및 위험도 분석 시작'}
          </button>
        </div>
      )}
    </div>
  );
}
