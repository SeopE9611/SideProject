'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { Loader2, Bell, Calendar } from 'lucide-react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /** 기본 만료일(일). 0 또는 빈 값이면 만료 없음 */
  defaultExpireDays?: number;

  /** 전송 성공 후 훅 */
  onSent?: (info: { broadcastId: string; sent: number; expiresAt?: string | null }) => void;
};

export default function AdminBroadcastDialog({ open, onOpenChange, defaultExpireDays = 30, onSent }: Props) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [expireDays, setExpireDays] = useState(String(defaultExpireDays));
  const [isSending, setIsSending] = useState(false);

  const expireDaysNum = useMemo(() => {
    const n = Number(expireDays);
    if (!Number.isFinite(n)) return null;
    if (n <= 0) return 0;
    return Math.floor(n);
  }, [expireDays]);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setBody('');
    setExpireDays(String(defaultExpireDays));
  }, [open, defaultExpireDays]);

  async function handleSend() {
    const t = title.trim();
    const b = body.trim();

    if (!t) return showErrorToast('제목을 입력해주세요.');
    if (!b) return showErrorToast('내용을 입력해주세요.');

    try {
      setIsSending(true);

      const res = await fetch('/api/messages/admin', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: t,
          body: b,
          expireDays: expireDaysNum,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        return showErrorToast(data?.error ?? '전체 공지 전송에 실패했습니다.');
      }

      showSuccessToast(`전체 공지를 전송했습니다. (총 ${data.sent ?? 0}명)`);
      onSent?.({
        broadcastId: String(data.broadcastId ?? ''),
        sent: Number(data.sent ?? 0),
        expiresAt: (data.expiresAt as string | undefined) ?? null,
      });
      onOpenChange(false);
    } catch {
      showErrorToast('네트워크 오류로 전송에 실패했습니다.');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">전체 공지 보내기</DialogTitle>
              <DialogDescription className="text-sm mt-1">관리자 권한으로 전체 사용자에게 안내 쪽지를 발송합니다.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          <div className="grid gap-2.5">
            <label htmlFor="broadcast-title" className="text-sm font-semibold text-foreground">
              제목
            </label>
            <Input id="broadcast-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예) 서비스 점검 안내" className="h-10" />
          </div>

          <div className="grid gap-2.5">
            <label htmlFor="broadcast-body" className="text-sm font-semibold text-foreground">
              내용
            </label>
            <Textarea id="broadcast-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="공지 내용을 입력하세요" rows={12} className="resize-none" />
          </div>

          <div className="grid gap-2.5">
            <label htmlFor="expire-days" className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              자동 삭제 (일)
            </label>
            <Input id="expire-days" inputMode="numeric" value={expireDays} onChange={(e) => setExpireDays(e.target.value)} placeholder="예) 30 (0이면 만료 없음)" className="h-10" />
            <p className="text-xs text-muted-foreground leading-relaxed">0이면 만료가 없고, 숫자를 입력하면 해당 일수 이후 자동 삭제(TTL)됩니다.</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending} className="min-w-[80px]">
            취소
          </Button>
          <Button onClick={handleSend} disabled={isSending} className="min-w-[100px] gap-2">
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                전송 중
              </>
            ) : (
              <>
                <Bell className="h-4 w-4" />
                전송
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
