'use client';

import useSWR from 'swr';
import { useState } from 'react';

type RentalRow = {
  id: string;
  brand: string;
  model: string;
  status: 'created' | 'paid' | 'out' | 'returned';
  days: number;
  amount: { fee: number; deposit: number; total: number };
  dueAt?: string;
};

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());
const won = (n: number) => (n || 0).toLocaleString('ko-KR') + '원';

export default function AdminRentalsClient() {
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const qs = new URLSearchParams();
  if (status) qs.set('status', status);
  qs.set('page', String(page));
  qs.set('pageSize', String(pageSize));
  const key = `/api/admin/rentals?${qs.toString()}`;

  const { data, isLoading, mutate } = useSWR<{ items: RentalRow[]; total: number }>(key, fetcher);

  const onReturn = async (id?: string) => {
    const safe = (id ?? '').trim();
    if (!safe) {
      alert('유효하지 않은 대여 ID입니다.');
      return;
    }
    if (!confirm('반납 처리하시겠어요?')) return;
    const res = await fetch(`/api/rentals/${encodeURIComponent(safe)}/return`, { method: 'POST' });

    if (res.ok) mutate();
    else alert('반납 처리 실패');
  };

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">대여 주문 관리</h1>

      <div className="flex gap-2">
        <select
          className="h-9 rounded border px-2"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">상태(전체)</option>
          <option value="created">created</option>
          <option value="paid">paid</option>
          <option value="out">out</option>
          <option value="returned">returned</option>
        </select>
      </div>

      <div className="rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-2 text-left w-[40%]">라켓</th>
              <th className="p-2 text-left">기간</th>
              <th className="p-2 text-left">수수료/보증금/총액</th>
              <th className="p-2 text-left">상태</th>
              <th className="p-2 text-right">작업</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((r, idx) => {
              const rid = r.id ?? (r as any)._id ?? '';
              const canReturn = (r.status === 'paid' || r.status === 'out') && !!rid;
              return (
                <tr key={rid || `row-${idx}`} className="border-b">
                  <td className="p-2">
                    {r.brand} {r.model}
                  </td>
                  <td className="p-2">{r.days}일</td>
                  <td className="p-2">
                    {won(r.amount.fee)} / {won(r.amount.deposit)} / <b>{won(r.amount.total)}</b>
                  </td>
                  <td className="p-2">{r.status}</td>
                  <td className="p-2 text-right">
                    <button className="h-8 rounded bg-emerald-600 px-3 text-white disabled:opacity-50" disabled={!canReturn} onClick={() => onReturn(rid)}>
                      반납 처리
                    </button>
                  </td>
                </tr>
              );
            })}
            {isLoading && (
              <tr key="loading">
                <td className="p-2 text-gray-500" colSpan={5}>
                  불러오는 중…
                </td>
              </tr>
            )}
            {!isLoading && (data?.items?.length ?? 0) === 0 && (
              <tr key="empty">
                <td className="p-4 text-gray-500" colSpan={5}>
                  데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
