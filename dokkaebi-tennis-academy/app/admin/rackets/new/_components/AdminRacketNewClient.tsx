'use client';
import AdminRacketForm, { type RacketForm } from '@/app/admin/rackets/_components/AdminRacketForm';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { UNSAVED_CHANGES_MESSAGE } from '@/lib/hooks/useUnsavedChangesGuard';

export default function AdminRacketNewClient() {
  const r = useRouter();

  const confirmLeave = (e: React.MouseEvent) => {
    const hasUnsaved = typeof window !== 'undefined' && window.history.state?.__unsaved === true;
    if (!hasUnsaved) return;
    if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const onSubmit = async (data: RacketForm) => {
    const res = await fetch('/api/admin/rackets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json?.message ?? '등록 실패');
      return;
    }
    r.push('/admin/rackets');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="space-y-6"
        >
          <div className="rounded-2xl p-8 border border-border bg-card shadow-lg">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-md">
                  <Package className="h-8 w-8 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">라켓 등록</h2>
                  <p className="text-muted-foreground">새로운 중고 라켓 정보를 입력하고 등록하세요.</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" type="button" asChild className="bg-muted/40 hover:bg-muted border-border">
                  <Link href="/admin/rackets" onClick={confirmLeave}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    취소
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <Separator className="bg-border" />

          <AdminRacketForm submitLabel="저장" onSubmit={onSubmit} />
        </form>
      </div>
    </div>
  );
}
