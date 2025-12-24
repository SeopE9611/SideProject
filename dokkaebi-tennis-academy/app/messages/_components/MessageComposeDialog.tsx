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

  /** 받는 사람(필수) */
  toUserId: string;
  /** 화면 표시용 이름(선택) */
  toName?: string;

  /** 모달 열릴 때 기본값으로 채울 제목/내용 (선택) */
  defaultTitle?: string;
  defaultBody?: string;

  /** 전송 성공 후 추가 훅(선택) */
  onSent?: (insertedId: string) => void;
};

export default function MessageComposeDialog({
  open,
  onOpenChange,
  toUserId,
  toName,
  defaultTitle,
  defaultBody,
  onSent,
}: Props) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const receiverLabel = useMemo(() => {
    const name = (toName ?? '').trim();
    return name ? name : '회원';
  }, [toName]);

  useEffect(() => {
    if (!open) return;
    setTitle((defaultTitle ?? '').trim());
    setBody((defaultBody ?? '').trim());
  }, [open, defaultTitle, defaultBody]);

  async function handleSend() {
    if (!toUserId) return showErrorToast('받는 사람이 없습니다.');
    if (!title.trim()) return showErrorToast('제목을 입력해주세요.');
    if (!body.trim()) return showErrorToast('내용을 입력해주세요.');

    try {
      setIsSending(true);

      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          toUserId,
          title: title.trim(),
          body: body.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        const msg = (data?.error as string | undefined) ?? '쪽지 전송에 실패했습니다.';
        showErrorToast(msg);
        return;
      }

      showSuccessToast('쪽지를 전송했습니다.');
      onSent?.(String(data.id ?? ''));
      onOpenChange(false);
    } catch {
      showErrorToast('네트워크 오류로 전송에 실패했습니다.');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>쪽지 보내기</DialogTitle>
          <DialogDescription className="text-xs">받는 사람: {receiverLabel}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-2">
            <div className="text-sm font-medium">제목</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목을 입력하세요" />
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium">내용</div>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="내용을 입력하세요" rows={8} />
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
              '보내기'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
