'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function AuthGatePage() {
  const sp = useSearchParams();
  const redirect = sp.get('redirect') || '/';

  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`${location.origin}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.message || `인증 실패 (HTTP ${res.status})`);
        return;
      }
      // 하드 내비게이션: 쿠키 동반 보장
      window.location.replace(redirect || '/');
    } catch {
      setMsg('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-overlay/80 backdrop-blur-sm" />
      <div className="relative h-full flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-card dark:bg-muted shadow-2xl p-6 space-y-4">
          <h1 className="text-xl font-semibold">🔒 아직 개발 단계입니다</h1>
          <p className="text-sm text-muted-foreground">접근하려면 개발자 전용 비밀번호를 입력하세요.</p>

          <div className="space-y-2">
            <label className="text-sm font-medium">비밀번호</label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="개발자 전용 비밀번호"
              className="w-full rounded-lg border border-border bg-card dark:bg-muted px-3 py-2 outline-none focus:ring-2 ring-ring"
              autoFocus
            />
          </div>

          {msg && <p className="text-sm text-destructive">{msg}</p>}

          <button type="button" disabled={loading || !pw} onClick={handleClick} className="w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 font-medium disabled:opacity-60">
            {loading ? '확인 중…' : '입장하기'}
          </button>

          <p className="text-xs text-muted-foreground text-center">인증에 성공하면 {redirect} 로 이동합니다.</p>
        </div>
      </div>
    </div>
  );
}
