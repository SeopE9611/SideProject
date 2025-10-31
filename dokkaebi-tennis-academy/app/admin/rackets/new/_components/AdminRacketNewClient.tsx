'use client';
import AdminRacketForm, { RacketForm } from '@/app/admin/rackets/_components/AdminRacketForm';
import { useRouter } from 'next/navigation';

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
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">새 라켓 등록</h1>
      <AdminRacketForm submitLabel="등록" onSubmit={onSubmit} />
    </div>
  );
}
