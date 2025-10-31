'use client';

import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

type Item = {
  id: string;
  brand: string;
  model: string;
  price: number;
  condition: 'A' | 'B' | 'C';
  status: 'available' | 'rented' | 'sold' | 'inactive';
  rental?: { enabled: boolean; deposit: number; fee: { d7: number; d15: number; d30: number } };
  images?: string[];
};

export default function AdminRacketsClient() {
  const { data, isLoading, error } = useSWR<{ items: Item[]; total: number; page: number; pageSize: number }>('/api/admin/rackets?page=1&pageSize=50', fetcher);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">라켓 관리</h1>
        <Link href="/admin/rackets/new" className="h-9 px-4 rounded-lg bg-emerald-600 text-white">
          새 라켓 등록
        </Link>
      </div>

      {isLoading ? (
        <div className="h-32 rounded bg-gray-200 animate-pulse" />
      ) : error ? (
        <div className="text-red-600">목록을 불러오지 못했습니다.</div>
      ) : !data?.items?.length ? (
        <div className="text-gray-500">등록된 라켓이 없습니다.</div>
      ) : (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">브랜드</th>
                <th className="p-3 text-left">모델</th>
                <th className="p-3 text-right">가격</th>
                <th className="p-3 text-center">상태</th>
                <th className="p-3 text-center">대여</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="p-3">{it.brand}</td>
                  <td className="p-3">{it.model}</td>
                  <td className="p-3 text-right">{it.price?.toLocaleString()}원</td>
                  <td className="p-3 text-center">{it.status}</td>
                  <td className="p-3 text-center">{it.rental?.enabled ? '가능' : '—'}</td>
                  <td className="p-3 text-right">
                    <Link href={`/admin/rackets/${it.id}/edit`} className="text-blue-600 underline">
                      수정
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
