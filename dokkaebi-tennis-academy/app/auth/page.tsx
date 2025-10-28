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
      // ✅ 절대경로 + no-store + include
      const res = await fetch(`${location.origin}/api/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ password: pw }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data?.message || `인증 실패 (HTTP ${res.status})`);
        return;
      }

      // ✅ 하드 내비게이션으로 쿠키 동반 보장
      window.location.replace(redirect || '/');
    } catch (e) {
      setMsg('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative h-full flex items-center justify-center p-4">
        {/* ✅ form 태그 제거 (브라우저 기본 submit 가로채기 방지) */}
        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl p-6 space-y-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">🔒 아직 개발 단계입니다</h1>
            <p className="text-sm text-zinc-500">접근하려면 개발자 전용 비밀번호를 입력하세요.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">비밀번호</label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="개발자 전용 비밀번호"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 outline-none focus:ring-2 ring-indigo-500"
              autoFocus
            />
          </div>

          {msg && <p className="text-sm text-red-500">{msg}</p>}

          <button type="button" disabled={loading || !pw} onClick={handleClick} className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 font-medium disabled:opacity-60">
            {loading ? '확인 중…' : '입장하기'}
          </button>

          <p className="text-xs text-zinc-400 text-center">인증에 성공하면 {redirect} 로 이동합니다.</p>
        </div>
      </div>
    </div>
  );
}
