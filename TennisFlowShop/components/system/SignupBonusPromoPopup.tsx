'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type SignupPromo = {
  enabled: boolean;
  campaignId: string;
  amount: number;
  startDate?: string | null; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
};

type Props = {
  promo: SignupPromo;
  onPrimaryClick?: () => void; // "회원가입하고 받기" 클릭 시 실행
};

// 24시간 동안 다시 안 뜨게
const DISMISS_HOURS = 24;

export default function SignupBonusPromoPopup({ promo, onPrimaryClick }: Props) {
  const [open, setOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const storageKey = useMemo(() => `signup-bonus-promo-dismissed:${promo.campaignId}`, [promo.campaignId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!promo.enabled) {
        if (!cancelled) setAuthChecked(true);
        return;
      }

      // 로그인 상태면 “가입 이벤트 팝업”은 의미 없으니 아예 띄우지 않음
      try {
        const res = await fetch('/api/users/me', { credentials: 'include' });
        if (!cancelled && res.ok) {
          setOpen(false);
          setAuthChecked(true);
          return;
        }
      } catch {
        // 네트워크 에러면 “비로그인처럼” 간주하고 계속 진행
      }

      if (cancelled) return;
      setAuthChecked(true);

      // 24시간 dismiss 체크
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const last = new Date(raw);
        if (Number.isFinite(last.getTime())) {
          const diffMs = Date.now() - last.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          if (diffHours < DISMISS_HOURS) return;
        }
      }

      // 최종 open
      setOpen(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [promo.enabled, storageKey]);

  const dismiss = () => {
    localStorage.setItem(storageKey, new Date().toISOString());
    setOpen(false);
  };

  const periodText = (() => {
    const s = (promo.startDate ?? '').trim();
    const e = (promo.endDate ?? '').trim();
    if (!s && !e) return null;
    if (s && e) return `${s} ~ ${e}`;
    if (s && !e) return `${s}부터`;
    return `${e}까지`;
  })();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setOpen(false);
          return;
        }
        setOpen(true);
      }}
    >
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden [&>button]:z-20 [&>button]:bg-background/20 [&>button]:hover:bg-background/30 [&>button]:text-foreground" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        {/* 상단 비주얼 영역 */}
        <div className="relative overflow-hidden border-b border-primary/20 bg-primary/10 px-6 py-12 text-foreground dark:bg-primary/20">
          <div className="relative z-10 pr-32">
            <div className="text-sm font-semibold opacity-90">가입 이벤트</div>
            <div className="mt-2 text-2xl font-black">회원가입 시 {promo.amount.toLocaleString('ko-KR')}P 지급</div>
            <div className="mt-2 text-sm text-muted-foreground">{periodText ? `기간: ${periodText}` : '지금 가입하면 자동으로 지급됩니다.'}</div>
          </div>
          <img src="/funny.png" alt="프로모션" className="absolute right-2 top-1/2 -translate-y-1/2 h-40 w-auto opacity-95" />
        </div>

        <div className="p-6 space-y-4">
          <DialogHeader>
            <DialogTitle>사용하지 않은 혜택이 있어요!</DialogTitle>
            <DialogDescription>
              일반 회원가입 / 카카오 / 네이버 가입 모두 동일하게 적용됩니다.
              <br />
              가입 완료 후 마이페이지의 포인트 내역에서 확인할 수 있어요.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                dismiss();
                onPrimaryClick?.();
              }}
            >
              회원가입하고 받기
            </Button>
            <Button variant="secondary" className="w-full sm:w-auto" onClick={dismiss}>
              나중에 보기
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
