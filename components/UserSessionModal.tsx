'use client';

import { useEffect, useState } from 'react';
import type { Site, UserSession } from '@/types';

const SESSION_KEY = 'safety_user_session';

export function getUserSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}

export function clearUserSession() {
  localStorage.removeItem(SESSION_KEY);
  window.location.reload();
}

export function UserSessionModal() {
  const [open, setOpen] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [siteId, setSiteId] = useState('');
  const [role, setRole] = useState<'writer' | 'approver'>('writer');
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    const s = getUserSession();
    setSession(s);
    if (!s) {
      fetch('/api/sites').then((r) => r.json()).then((data: Site[]) => {
        setSites(data);
        if (data.length > 0) setSiteId(String(data[0].id));
        setOpen(true);
      });
    }
  }, []);

  const openModal = () => {
    const s = getUserSession();
    if (s) { setName(s.name); setDepartment(s.department); setSiteId(String(s.site_id)); setRole(s.role); }
    fetch('/api/sites').then((r) => r.json()).then((data: Site[]) => { setSites(data); setOpen(true); });
  };

  const handleSave = () => {
    if (!name.trim() || !department.trim() || !siteId) return;
    const site = sites.find((s) => String(s.id) === siteId);
    const newSession: UserSession = { name: name.trim(), department: department.trim(), site_id: Number(siteId), site_name: site?.name ?? '', role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);
    setOpen(false);
  };

  return (
    <>
      {session && !open && (
        <div className="fixed bottom-4 right-4 z-40 bg-white border border-[#e5e5e5] rounded-lg shadow-sm px-3 py-2 flex items-center gap-3 text-xs text-[#555]">
          <span className="font-medium text-[#0a0a0a]">{session.name}</span>
          <span className="text-[#bbb]">|</span>
          <span>{session.site_name}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${session.role === 'approver' ? 'bg-[#0a0a0a] text-white' : 'bg-[#f0f0f0] text-[#555]'}`}>
            {session.role === 'approver' ? '책임자' : '작성자'}
          </span>
          <button onClick={openModal} className="text-[#999] hover:text-[#0a0a0a] underline">변경</button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-[#0a0a0a] mb-1">현장 접속 설정</h2>
            <p className="text-xs text-[#999] mb-5">이름과 현장을 설정하면 경위서 작성 시 자동으로 입력됩니다.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[#999] mb-1">이름</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" className="w-full text-sm border border-[#e5e5e5] rounded px-3 py-2.5 focus:outline-none focus:border-[#0a0a0a]" />
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">부서</label>
                <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="안전관리팀" className="w-full text-sm border border-[#e5e5e5] rounded px-3 py-2.5 focus:outline-none focus:border-[#0a0a0a]" />
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">현장 (사업장)</label>
                <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="w-full text-sm border border-[#e5e5e5] rounded px-3 py-2.5 focus:outline-none focus:border-[#0a0a0a]">
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-2">역할</label>
                <div className="flex gap-2">
                  {(['writer', 'approver'] as const).map((r) => (
                    <button key={r} onClick={() => setRole(r)} className={`flex-1 py-2.5 text-sm rounded border transition-colors ${role === r ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]' : 'bg-white text-[#555] border-[#e5e5e5] hover:border-[#999]'}`}>
                      {r === 'writer' ? '작성자' : '책임자'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleSave} disabled={!name.trim() || !department.trim()} className="w-full mt-5 bg-[#0a0a0a] text-white text-sm py-3 rounded-lg font-medium hover:bg-[#222] disabled:opacity-40 transition-colors">
              설정 완료
            </button>
          </div>
        </div>
      )}
    </>
  );
}
