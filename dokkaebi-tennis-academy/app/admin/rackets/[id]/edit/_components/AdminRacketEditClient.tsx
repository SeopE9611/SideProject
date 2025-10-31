'use client';

import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import AdminRacketForm, { RacketForm } from '@/app/admin/rackets/_components/AdminRacketForm';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

export default function AdminRacketEditClient({ id }: { id: string }) {
  const r = useRouter();
  const { data, isLoading, error } = useSWR(`/api/admin/rackets/${id}`, fetcher);

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
    if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    const res = await fetch(`/api/admin/rackets/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) {
      alert(json?.message ?? '삭제 실패');
      return;
    }
    r.push('/admin/rackets');
  };

  if (isLoading) return <div className="max-w-3xl mx-auto p-4">불러오는 중…</div>;
  if (error || !data?.id) return <div className="max-w-3xl mx-auto p-4">데이터를 불러오지 못했습니다.</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">라켓 수정</h1>
        <button onClick={onDelete} className="h-10 px-4 rounded border border-red-300 text-red-600">
          삭제
        </button>
      </div>
      <AdminRacketForm initial={data} submitLabel="저장" onSubmit={onSubmit} />
    </div>
  );
}
