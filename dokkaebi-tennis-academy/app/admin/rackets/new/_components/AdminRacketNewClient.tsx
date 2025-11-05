'use client';
import AdminRacketForm, { type RacketForm } from '@/app/admin/rackets/_components/AdminRacketForm';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminRacketNewClient() {
  const r = useRouter();

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-900 dark:via-teal-900 dark:to-cyan-900">
        <div className="absolute inset-0 bg-[url('/tennis-court-lines.png')] opacity-10" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link href="/admin/rackets">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Plus className="h-8 w-8 text-white" />
            <h1 className="text-3xl font-bold text-white">새 라켓 등록</h1>
          </div>
          <p className="text-emerald-100 mt-2">중고 라켓 정보를 입력하여 등록하세요</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <AdminRacketForm submitLabel="등록" onSubmit={onSubmit} />
        </div>
      </div>
    </div>
  );
}
