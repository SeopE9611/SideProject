'use client';

import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import AdminRacketForm, { type RacketForm } from '@/app/admin/rackets/_components/AdminRacketForm';
import { ArrowLeft, Edit, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { racketBrandLabel } from '@/lib/constants';
import { UNSAVED_CHANGES_MESSAGE } from '@/lib/hooks/useUnsavedChangesGuard';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

function StockChip({ id, total }: { id: string; total: number }) {
  const { data } = useSWR<{ ok: boolean; available: number }>(`/api/admin/rentals/active-count/${id}`, (u) => fetch(u, { credentials: 'include' }).then((r) => r.json()), { dedupingInterval: 5000 });
  const qty = Math.max(1, total ?? 1);
  const avail = Math.max(0, Number(data?.available ?? 0));
  const soldOut = avail <= 0;
  return (
    <Badge variant={soldOut ? 'destructive' : 'default'} className="font-normal">
      {qty > 1 ? (soldOut ? `0/${qty}` : `${avail}/${qty}`) : soldOut ? '대여 중' : '대여 가능'}
    </Badge>
  );
}

export default function AdminRacketEditClient({ id }: { id: string }) {
  const r = useRouter();
  const { data, isLoading, error } = useSWR(`/api/admin/rackets/${id}`, fetcher);

  const confirmLeave = (e: React.MouseEvent) => {
    const hasUnsaved = typeof window !== 'undefined' && window.history.state?.__unsaved === true;
    if (!hasUnsaved) return;
    if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const onSubmit = async (payload: RacketForm) => {
    const res = await fetch(`/api/admin/rackets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json?.message ?? '수정 실패');
      return;
    }
    r.push('/admin/rackets');
  };

  const onDelete = async () => {
    const res = await fetch(`/api/admin/rackets/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) {
      alert(json?.message ?? '삭제 실패');
      return;
    }
    r.push('/admin/rackets');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-white to-card dark:from-background dark:via-muted dark:to-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-card dark:bg-card rounded-xl shadow-sm border border-border dark:border-border p-8">
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-12 bg-background dark:bg-card rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-white to-card dark:from-background dark:via-muted dark:to-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-card dark:bg-card rounded-xl shadow-sm border border-destructive dark:border-destructive p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive dark:text-destructive">데이터를 불러오지 못했습니다.</p>
            <Link href="/admin/rackets" className="mt-4 inline-block">
              <Button variant="outline">목록으로 돌아가기</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-white to-card dark:from-background dark:via-muted dark:to-card">
      <div className="relative overflow-hidden bg-gradient-to-br from-background via-muted to-card dark:from-background dark:via-muted dark:to-card">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link href="/admin/rackets" data-no-unsaved-guard onClick={confirmLeave}>
            <Button variant="ghost" size="sm" className="text-foreground hover:bg-card mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Edit className="h-8 w-8 text-white" />
                <h1 className="text-3xl font-bold text-white">라켓 수정</h1>
                <StockChip id={data.id} total={data.quantity ?? 1} />
              </div>
              <p className="text-primary">
                {racketBrandLabel(data.brand)} {data.model}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="lg" className="shadow-lg">
                  <Trash2 className="h-5 w-5 mr-2" />
                  삭제
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>라켓을 삭제하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>이 작업은 되돌릴 수 없습니다. 라켓 정보가 영구적으로 삭제됩니다.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive">
                    삭제
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card dark:bg-card rounded-xl shadow-sm border border-border dark:border-border p-6">
          <AdminRacketForm initial={data} submitLabel="저장" onSubmit={onSubmit} />
        </div>
      </div>
    </div>
  );
}
