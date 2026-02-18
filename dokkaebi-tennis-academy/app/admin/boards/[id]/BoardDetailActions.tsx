'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, EyeOff, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type BoardDetailActionsProps = {
  postId: string;
  currentStatus: 'published' | 'hidden' | 'deleted' | string;
};

export default function BoardDetailActions({ postId, currentStatus }: BoardDetailActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<'publish' | 'hide' | 'delete' | null>(null);

  const runStatusChange = async (nextStatus: 'published' | 'hidden') => {
    setPendingAction(nextStatus === 'published' ? 'publish' : 'hide');
    try {
      const res = await fetch(`/api/boards/${encodeURIComponent(postId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: nextStatus,
          auditContext: {
            source: 'admin_board_detail_page',
            action: 'status_change_button',
          },
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.ok) {
        const msg = payload?.error?.message || payload?.message || `${nextStatus === 'published' ? '공개' : '숨김'} 처리에 실패했습니다.`;
        throw new Error(msg);
      }

      toast.success(`게시물을 ${nextStatus === 'published' ? '공개' : '숨김'} 처리했습니다.`);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : '상태 변경 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setPendingAction(null);
    }
  };

  const runDelete = async () => {
    const ok = window.confirm('정말로 이 게시물을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.');
    if (!ok) return;

    setPendingAction('delete');
    try {
      const res = await fetch(`/api/boards/${encodeURIComponent(postId)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'x-admin-audit-source': 'admin_board_detail_page',
          'x-admin-audit-action': 'delete_button',
        },
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.ok) {
        const msg = payload?.error?.message || payload?.message || '게시물 삭제에 실패했습니다.';
        throw new Error(msg);
      }

      toast.success('게시물을 삭제했습니다. 목록으로 이동합니다.');
      router.push('/admin/boards');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" asChild className="bg-white/60 backdrop-blur-sm border-blue-200 hover:bg-blue-50 dark:border-blue-700 dark:hover:bg-blue-950/20">
        <Link href={`/admin/boards/${postId}/edit`}>
          <Pencil className="mr-2 h-4 w-4" />
          수정
        </Link>
      </Button>

      {currentStatus !== 'published' ? (
        <Button disabled={pendingAction !== null} onClick={() => runStatusChange('published')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Eye className="mr-2 h-4 w-4" />
          {pendingAction === 'publish' ? '공개 처리 중...' : '공개'}
        </Button>
      ) : (
        <Button disabled={pendingAction !== null} onClick={() => runStatusChange('hidden')} variant="secondary">
          <EyeOff className="mr-2 h-4 w-4" />
          {pendingAction === 'hide' ? '숨김 처리 중...' : '숨김'}
        </Button>
      )}

      <Button disabled={pendingAction !== null} variant="destructive" className="bg-red-500 hover:bg-red-600" onClick={runDelete}>
        <Trash2 className="mr-2 h-4 w-4" />
        {pendingAction === 'delete' ? '삭제 중...' : '삭제'}
      </Button>
    </div>
  );
}
