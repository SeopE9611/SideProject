'use client';

import type React from 'react';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

export default function ForceChangePasswordClient() {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const qp = useSearchParams();
  const reason = qp.get('reason');

  // 이 페이지를 떠나려 할 때 경고를 띄울지 여부(성공하면 false로 꺼서 더는 방해 안 함)
  const [leaveGuard, setLeaveGuard] = useState(true);

  // 떠나기 확정 시 먼저 로그아웃(쿠키 제거) → 가드 해제
  const logoutBeforeLeave = async () => {
    try {
      // click/back 같은 소프트 내비게이션
      await fetch('/api/logout', { method: 'POST', keepalive: true });
    } catch {}
    setLeaveGuard(false);
  };

  // 새로고침/창닫기에서 로그아웃 시도(쿠키 제거)
  const logoutBeacon = () => {
    try {
      if ('sendBeacon' in navigator) {
        const blob = new Blob([], { type: 'application/json' });
        navigator.sendBeacon('/api/logout', blob);
      } else {
        fetch('/api/logout', { method: 'POST', keepalive: true });
      }
    } catch {}
  };

  // 1) 페이지 떠남(새로고침/닫기) 경고
  // 2) 내부 링크 클릭 시 확인창
  // 3) 뒤로 가기(popstate) 시 확인창
  useEffect(() => {
    if (!leaveGuard) return;

    // 1) 새로고침/닫기 등 하드 네비게이션
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      logoutBeacon(); // ← 떠나기 전에 쿠키 제거 시도
      // 대부분 브라우저에서 커스텀 메시지는 무시되고, 기본 경고만 표시됩니다.
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    // 공통 확인 함수
    const confirmLeave = () => window.confirm('아직 비밀번호를 바꾸지 않았습니다.\n떠나면 임시 비밀번호를 다시 볼 수 없어요.\n계속 이동할까요?');

    // 2) 내부 링크/버튼으로 다른 경로로 나가려는 경우(캡처 단계에서 선차단)
    const onClickCapture = async (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      const anchor = el?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      // 새 탭/다운로드/외부 링크 등은 건너뜀
      if (anchor.getAttribute('target') && anchor.getAttribute('target') !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return; // 외부 링크면 건너뜀
      // 같은 페이지 내 해시 이동은 허용
      if (url.pathname === window.location.pathname && url.hash) return;
      // 정말 떠날 건지 물어보고, 아니면 이동 차단
      if (!confirmLeave()) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        // 기본 이동을 막고, 먼저 로그아웃 → 전체 페이지 이동(SSR 반영)
        e.preventDefault();
        e.stopPropagation();
        await logoutBeforeLeave(); // 토큰/force_pwd_change 쿠키 삭제
        window.location.assign(url.href); // 전체 페이지 로드
      }
    };
    document.addEventListener('click', onClickCapture, true); // 캡처 단계!

    // 3) 뒤로 가기: 현재 히스토리 위에 "잠금 스냅샷"을 한 번 더 쌓아두고 popstate에서 복귀
    const pushLock = () => history.pushState({ pwdChangeLock: true }, '', window.location.href);
    pushLock();
    const onPopState = async () => {
      if (!confirmLeave()) {
        pushLock(); // 취소 시 복귀
      } else {
        await logoutBeforeLeave();
        // 뒤로가려던 곳으로 전체 이동(참조 없으면 홈)
        window.location.replace(document.referrer || '/');
      }
    };
    window.addEventListener('popstate', onPopState);

    // 정리
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('popstate', onPopState);
    };
  }, [leaveGuard]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) return showErrorToast('비밀번호는 8자 이상이어야 합니다.');
    if (newPassword !== confirm) return showErrorToast('비밀번호 확인이 일치하지 않습니다.');
    setLoading(true);
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || '변경에 실패했습니다.');
      }
      showSuccessToast('비밀번호가 변경되었습니다.');
      setLeaveGuard(false);
      router.replace('/'); // 성공 후 홈(또는 /mypage)로 이동
    } catch (e: any) {
      showErrorToast(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-sky-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <div className="container py-16">
        <div className="mx-auto max-w-lg">
          <Card className="border-border/40 bg-card/60 backdrop-blur shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">비밀번호 변경</CardTitle>
              <CardDescription className="text-base">{reason === 'must' ? '보안을 위해 먼저 비밀번호를 변경해 주세요.' : '새 비밀번호로 변경해 주세요.'}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium">
                    새 비밀번호 <span className="text-red-500">*</span>
                  </Label>
                  <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="8자 이상 입력해주세요" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    새 비밀번호 확인 <span className="text-red-500">*</span>
                  </Label>
                  <Input id="confirmPassword" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="비밀번호를 다시 입력해주세요" required />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2.5 shadow-lg hover:shadow-xl transition-all duration-200">
                  {loading ? '변경 중…' : '비밀번호 변경'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
