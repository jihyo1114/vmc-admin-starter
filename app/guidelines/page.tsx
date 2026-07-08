'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Guideline } from '@/types';

const KEY_LABELS: Record<string, string> = {
  identity: '신원확인',
  industry: '업종위험도',
  reputation: '평판/부정이력',
  documents: '제출서류 정합성',
  judgment: '종합판정',
};

type EditState = { title: string; content: string };

export default function GuidelinesPage() {
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/guidelines')
      .then((r) => r.json())
      .then((data: Guideline[]) => {
        setGuidelines(data);
        const initial: Record<string, EditState> = {};
        data.forEach((g) => {
          initial[g.key] = { title: g.title, content: g.content };
        });
        setEdits(initial);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, field: keyof EditState, value: string) => {
    setEdits((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const handleSave = async (g: Guideline) => {
    const edit = edits[g.key];
    if (!edit.title.trim() || !edit.content.trim()) {
      setErrorKey(g.key);
      setTimeout(() => setErrorKey(null), 2000);
      return;
    }

    setSaving(g.key);
    try {
      const res = await fetch(`/api/guidelines/${g.key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: edit.title, content: edit.content }),
      });

      if (!res.ok) throw new Error('저장 실패');

      const updated: Guideline = await res.json();
      setGuidelines((prev) => prev.map((item) => (item.key === g.key ? updated : item)));
      setSavedKey(g.key);
      setTimeout(() => setSavedKey(null), 2000);
    } finally {
      setSaving(null);
    }
  };

  const isDirty = (g: Guideline) => {
    const edit = edits[g.key];
    return edit && (edit.title !== g.title || edit.content !== g.content);
  };

  if (loading) return <div className="text-sm text-[#999] p-4">로딩 중...</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-[#0a0a0a] mb-1">가이드라인 관리</h1>
      <p className="text-sm text-[#999] mb-6">AI 심사 시 사용되는 관점별 가이드라인을 조회하고 수정합니다.</p>

      <div className="space-y-4">
        {guidelines.map((g) => {
          const edit = edits[g.key] ?? { title: g.title, content: g.content };
          return (
            <Card key={g.key}>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge color="slate">{KEY_LABELS[g.key] ?? g.key}</Badge>
                  {savedKey === g.key && <Badge color="green">저장되었습니다</Badge>}
                  {errorKey === g.key && <Badge color="red">제목과 본문을 입력하세요</Badge>}
                  {isDirty(g) && savedKey !== g.key && <Badge color="yellow">수정됨</Badge>}
                </div>

                <div>
                  <label className="block text-xs text-[#999] mb-1">제목</label>
                  <input
                    type="text"
                    value={edit.title}
                    onChange={(e) => handleChange(g.key, 'title', e.target.value)}
                    className="w-full text-sm border border-[#e5e5e5] rounded px-3 py-2 focus:outline-none focus:border-[#0a0a0a]"
                    placeholder="가이드라인 제목"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#999] mb-1">본문</label>
                  <textarea
                    value={edit.content}
                    onChange={(e) => handleChange(g.key, 'content', e.target.value)}
                    rows={8}
                    className="w-full text-sm border border-[#e5e5e5] rounded px-3 py-2 focus:outline-none focus:border-[#0a0a0a] resize-none leading-relaxed"
                    placeholder="가이드라인 본문을 입력하세요"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#bbb]">마지막 저장: {g.updated_at.slice(0, 16)}</span>
                  <Button
                    onClick={() => handleSave(g)}
                    disabled={saving === g.key}
                  >
                    {saving === g.key ? '저장 중...' : '저장'}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
