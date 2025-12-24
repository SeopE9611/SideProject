'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { Loader2 } from 'lucide-react';

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
          expireDays: expireDaysNum, // 0이면 만료 없음
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        return showErrorToast(data?.error ?? '전체 공지 전송에 실패했습니다.');
      }

      showSuccessToast(`전체 공지를 전송했습니다. (총 ${data.sent ?? 0}명)`);
      onSent?.({ broadcastId: String(data.broadcastId ?? ''), sent: Number(data.sent ?? 0), expiresAt: (data.expiresAt as string | undefined) ?? null });
      onOpenChange(false);
    } catch {
      showErrorToast('네트워크 오류로 전송에 실패했습니다.');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>전체 공지 보내기</DialogTitle>
          <DialogDescription className="text-xs">관리자 권한으로 전체 사용자에게 안내 쪽지를 발송합니다.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-2">
            <div className="text-sm font-medium">제목</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예) 서비스 점검 안내" />
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium">내용</div>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="공지 내용을 입력하세요" rows={10} />
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium">자동 삭제(일)</div>
            <Input
              inputMode="numeric"
              value={expireDays}
              onChange={(e) => setExpireDays(e.target.value)}
              placeholder="예) 30 (0이면 만료 없음)"
            />
            <div className="text-xs text-muted-foreground">0이면 만료가 없고, 숫자를 입력하면 해당 일수 이후 자동 삭제(TTL)됩니다.</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            취소
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                전송 중
              </span>
            ) : (
              '전송'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
