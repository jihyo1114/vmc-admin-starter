'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Merchant } from '@/types/index';

type Mode = 'new' | 'existing';

export default function NewAnalysisPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('new');

  // 신규 가맹점 폼 상태
  const [name, setName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [representative, setRepresentative] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [submittedDocs, setSubmittedDocs] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 기존 가맹점 상태
  const [merchants, setMerchants] = useState<Pick<Merchant, 'id' | 'name' | 'business_number' | 'category'>[]>([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState<number | null>(null);
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  const [existingError, setExistingError] = useState('');

  useEffect(() => {
    if (mode === 'existing') {
      setLoadingMerchants(true);
      fetch('/api/merchants')
        .then((r) => r.json())
        .then((data) => setMerchants(data))
        .finally(() => setLoadingMerchants(false));
    }
  }, [mode]);

  async function handleNewSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !businessNumber.trim() || !category.trim()) {
      setFormError('상호명, 사업자번호, 업종은 필수 항목입니다.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          business_number: businessNumber.trim(),
          representative: representative.trim() || undefined,
          category: category.trim(),
          address: address.trim() || undefined,
          submitted_docs: submittedDocs.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error ?? '저장 중 오류가 발생했습니다.');
        return;
      }

      const { analysisId } = await res.json();
      router.push(`/analyses/${analysisId}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExistingSubmit() {
    setExistingError('');
    if (selectedMerchantId === null) {
      setExistingError('가맹점을 선택해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_id: selectedMerchantId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setExistingError(data.error ?? '요청 중 오류가 발생했습니다.');
        return;
      }

      const { analysisId } = await res.json();
      router.push(`/analyses/${analysisId}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">새 분석</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('new')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'new'
              ? 'bg-[#0a0a0a] text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          신규 가맹점
        </button>
        <button
          onClick={() => setMode('existing')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'existing'
              ? 'bg-[#0a0a0a] text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          기존 가맹점 재심사
        </button>
      </div>

      {mode === 'new' && (
        <Card title="신규 가맹점 정보 입력">
          <form onSubmit={handleNewSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상호명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="가맹점 상호명"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                사업자번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={businessNumber}
                onChange={(e) => setBusinessNumber(e.target.value)}
                placeholder="숫자 10자리 (예: 123-45-67890)"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">대표자명</label>
              <input
                type="text"
                value={representative}
                onChange={(e) => setRepresentative(e.target.value)}
                placeholder="대표자 성명"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                업종 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="업종명 (예: 일반 소매, 온라인 교육)"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="사업장 주소"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">제출 서류 및 정보</label>
              <textarea
                value={submittedDocs}
                onChange={(e) => setSubmittedDocs(e.target.value)}
                placeholder="제출한 서류 목록 또는 추가 정보를 입력하세요."
                rows={4}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
              />
            </div>

            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? '저장 중...' : '분석 시작'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {mode === 'existing' && (
        <Card title="기존 가맹점 선택">
          {loadingMerchants ? (
            <p className="text-sm text-gray-500">목록을 불러오는 중...</p>
          ) : merchants.length === 0 ? (
            <p className="text-sm text-gray-500">등록된 가맹점이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {merchants.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMerchantId(m.id)}
                  className={`w-full text-left px-4 py-3 rounded-md border text-sm transition-colors ${
                    selectedMerchantId === m.id
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <span className="font-medium text-gray-900">{m.name}</span>
                  <span className="ml-2 text-gray-500">{m.business_number}</span>
                  <span className="ml-2 text-xs text-gray-400">{m.category}</span>
                </button>
              ))}
            </div>
          )}

          {existingError && (
            <p className="mt-3 text-sm text-red-600">{existingError}</p>
          )}

          <div className="flex justify-end mt-4">
            <Button
              variant="primary"
              disabled={submitting || selectedMerchantId === null}
              onClick={handleExistingSubmit}
            >
              {submitting ? '요청 중...' : '재심사 시작'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
