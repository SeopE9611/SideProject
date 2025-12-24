'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

type SafeUser = { id: string; name: string | null; email: string | null; role: string };
type ToUser = { id: string; name: string; role: string } | null;

export default function MessageWriteClient({ me, toUser }: { me: SafeUser; toUser: ToUser }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => !!toUser?.id && title.trim().length > 0 && body.trim().length > 0, [toUser, title, body]);

  async function submit() {
    if (!toUser?.id) return showErrorToast('받는 사용자가 올바르지 않습니다.');
    if (!title.trim()) return showErrorToast('제목을 입력해주세요.');
    if (!body.trim()) return showErrorToast('내용을 입력해주세요.');

    setLoading(true);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: toUser.id, title, body }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) return showErrorToast(data?.error ?? '쪽지 전송에 실패했습니다.');
      showSuccessToast('쪽지를 보냈습니다.');
      router.push('/messages'); // (원하면 여기서 ?tab=send로 확장 가능)
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">쪽지 보내기</CardTitle>
          <Button variant="outline" onClick={() => router.back()}>
            뒤로
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            받는 사람: <span className="font-medium text-foreground">{toUser?.name ?? '알 수 없음'}</span>
          </div>

          <Input placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="내용" rows={10} value={body} onChange={(e) => setBody(e.target.value)} />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.push('/messages')}>
              취소
            </Button>
            <Button disabled={!canSubmit || loading} onClick={submit}>
              {loading ? '전송 중…' : '전송'}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">스팸 방지를 위해 “게시글 5개 + 댓글 5개” 조건 및 레이트리밋이 적용됩니다. (관리자는 예외)</div>
        </CardContent>
      </Card>
    </div>
  );
}
