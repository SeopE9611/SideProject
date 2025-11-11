'use client';

import useSWR from 'swr';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// 간단 fetcher (쿠키 포함 필요 시 credentials 옵션)
const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

type RacketItem = {
  id: string;
  brand: string;
  model: string;
  price: number;
  condition: 'A' | 'B' | 'C';
  images: string[];
  status: 'available' | 'sold' | 'rented' | 'inactive';
  rental?: { enabled: boolean; deposit: number; fee: { d7: number; d15: number; d30: number } };
};

export default function RacketsClient() {
  const search = useSearchParams();
  // 필터(1차: 브랜드, 상태등급만): 내일 가격 슬라이더 추가 예정

  const [brand, setBrand] = useState<string>('');
  const [cond, setCond] = useState<string>(''); // '', 'A', 'B', 'C'

  // 최초 1회 쿼리 ->상태 반영
  useEffect(() => {
    setBrand(search.get('brand') || '');
    const c = search.get('cond');
    setCond(['A', 'B', 'C'].includes(c ?? '') ? (c as string) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const query = new URLSearchParams();
  if (brand) query.set('brand', brand);
  if (cond) query.set('cond', cond);
  const key = `/api/rackets${query.toString() ? `?${query.toString()}` : ''}`;
  const { data, isLoading, error } = useSWR<RacketItem[]>(key, fetcher);

  // 필터링: 클라에서 1차 처리(서버 쿼리는 추후 확장)
  const items = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    return list;
  }, [data, brand, cond]);

  if (error) {
    return <div className="p-4 text-red-600">라켓 목록을 불러오는 중 오류가 발생했어요.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* 상단 타이틀 + 간단 필터 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">중고 라켓</h1>
        <div className="flex gap-2">
          <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="라켓 브랜드(예: Yonex)" className="h-9 w-48 rounded border px-3 text-sm" />
          <select value={cond ?? ''} onChange={(e) => setCond(e.target.value)} className="h-9 rounded border px-2 text-sm">
            <option value="">상태(전체)</option>
            <option value="A">A (최상)</option>
            <option value="B">B (양호)</option>
            <option value="C">C (보통)</option>
          </select>
        </div>
      </div>

      {/* 그리드 리스트 */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-56 rounded-lg bg-gray-200/60 dark:bg-gray-700/50 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-gray-500">등록된 라켓이 없습니다.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((it) => (
            <Link key={it.id} href={`/rackets/${it.id}`} className="group overflow-hidden rounded-xl border hover:shadow transition">
              <div className="aspect-[4/5] bg-gray-100 relative">
                {it.images?.[0] ? (
                  <Image src={it.images[0]} alt={`${it.brand} ${it.model}`} fill sizes="(max-width:768px) 50vw, (max-width:1200px) 33vw, 25vw" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">이미지 준비중</div>
                )}
                {it.rental?.enabled === false && <span className="absolute top-2 left-2 rounded px-2 py-0.5 text-xs font-medium bg-rose-600 text-white shadow">대여 불가</span>}
              </div>
              <div className="p-3 space-y-1">
                <div className="text-sm text-gray-500">{it.brand}</div>
                <div className="font-medium group-hover:underline">{it.model}</div>
                <div className="text-sm">
                  상태: <span className="font-semibold">{it.condition}</span>
                </div>
                <div className="text-base font-semibold">{it.price.toLocaleString()}원</div>
                {it.rental?.enabled ? (
                  // 라켓별 진행중 대여 수 조회
                  <RacketAvailBadge id={it.id} />
                ) : (
                  <div className="text-xs text-rose-600">대여 불가</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function RacketAvailBadge({ id }: { id: string }) {
  const { data } = useSWR<{ ok: boolean; count: number; quantity: number; available: number }>(
    `/api/rentals/active-count/${id}`,
    fetcher,
    { dedupingInterval: 5000 } // (선택) 5초 이내 중복 호출 방지
  );
  const qty = Number(data?.quantity ?? 1);
  const avail = Math.max(0, Number(data?.available ?? qty - Number(data?.count ?? 0)));
  const soldOut = avail <= 0;
  return <div className={`text-xs ${soldOut ? 'text-rose-600' : 'text-emerald-600'}`}>{qty > 1 ? (soldOut ? `대여 중 (0/${qty})` : `잔여 ${avail}/${qty}`) : soldOut ? '대여 중' : '대여 가능'}</div>;
}
