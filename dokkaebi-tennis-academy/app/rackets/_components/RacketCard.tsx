'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, Eye, Heart, ShoppingCart } from 'lucide-react';
import useSWR from 'swr';
import { racketBrandLabel } from '@/lib/constants';
import StatusBadge from '@/components/badges/StatusBadge';
import { useRouter } from 'next/navigation';
import RentDialog from '@/app/rackets/[id]/_components/RentDialog';

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

type Props = {
  racket: RacketItem;
  viewMode: 'grid' | 'list';
  brandLabel: string;
};

function RacketAvailBadge({ id }: { id: string }) {
  const { data } = useSWR<{ ok: boolean; count: number; quantity: number; available: number }>(`/api/rentals/active-count/${id}`, fetcher, { dedupingInterval: 5000 });
  // "잔여" → "가용" (판매/대여 공통으로 지금 가능한 수량)
  // - qty: 보유 수량
  // - count: 대여중 수량(paid/out)
  // - avail: 현재 가용(보유 - 대여중)
  const qty = Number(data?.quantity ?? 1);
  const count = Number(data?.count ?? 0);

  const availRaw = (data as any)?.available;
  const avail = Number.isFinite(availRaw) ? Math.max(0, Number(availRaw)) : Math.max(0, qty - count);

  // 전량 대여중 vs 판매완료를 구분하기 위한 보조값
  const rentedCount = Math.min(qty, Math.max(0, count)); // 혹시 count가 비정상적으로 커져도 UI는 클램프
  const isSold = qty <= 0;
  const isAllRented = !isSold && avail <= 0 && rentedCount > 0;

  if (isSold) {
    return <div className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 whitespace-nowrap">판매 완료</div>;
  }

  if (isAllRented) {
    return (
      <div className="text-xs font-medium px-2 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 whitespace-nowrap">
        전량 대여중 ({rentedCount}/{qty})
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 whitespace-nowrap">
        가용 {avail}/{qty}
      </div>

      {rentedCount > 0 && <div className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 whitespace-nowrap">대여중 {rentedCount}</div>}
    </div>
  );
}

const RacketCard = React.memo(
  function RacketCard({ racket, viewMode, brandLabel }: Props) {
    const router = useRouter();
    if (viewMode === 'list') {
      return (
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 relative">
          <div className="absolute inset-0 opacity-5 dark:opacity-10">
            <svg className="w-full h-full" viewBox="0 0 400 200" fill="none">
              <rect x="0" y="0" width="400" height="200" stroke="currentColor" strokeWidth="2" />
              <line x1="200" y1="0" x2="200" y2="200" stroke="currentColor" strokeWidth="2" />
              <rect x="50" y="50" width="300" height="100" stroke="currentColor" strokeWidth="1" />
              <line x1="50" y1="100" x2="350" y2="100" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>

          <div className="flex flex-col md:flex-row relative z-10">
            <div className="relative w-full md:w-48 h-48 flex-shrink-0">
              <Image src={racket.images?.[0] || '/placeholder.svg?height=200&width=200&query=tennis+racket'} alt={`${racketBrandLabel(racket.brand)} ${racket.model}`} fill className="object-cover" />
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-2 z-10">
                <div className="flex items-center gap-2">
                  {!racket.rental?.enabled && <StatusBadge kind="rental" state="unavailable" />}
                  <StatusBadge kind="condition" state={racket.condition} />
                </div>
              </div>
            </div>
            <div className="flex-1 p-4 md:p-6">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4 gap-4">
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground mb-1 font-medium">{brandLabel}</div>
                  <h3 className="text-lg md:text-xl font-bold mb-2 dark:text-white">{racket.model}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    {/* 상태 등급 */}
                    <StatusBadge kind="condition" state={racket.condition} />

                    {racket.rental?.enabled ? <RacketAvailBadge id={racket.id} /> : <StatusBadge kind="rental" state="unavailable" />}
                  </div>
                </div>
                <div className="text-left lg:text-right">
                  <div className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">{racket.price.toLocaleString()}원</div>
                </div>
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <Link href={`/rackets/${racket.id}`} onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" className="bg-white text-black hover:bg-gray-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white shadow-lg">
                    <Eye className="w-4 h-4 mr-1" />
                    상세보기
                  </Button>
                </Link>

                {/* 대여하기: 목록형에서도 모달 직접 오픈 (상세로 이동 X) */}
                {racket.rental?.enabled ? (
                  <RentDialog id={racket.id} rental={racket.rental} brand={racketBrandLabel(racket.brand)} model={racket.model} size="sm" preventCardNav={true} full={false} />
                ) : (
                  <Button size="sm" className="shadow-lg bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-slate-700 dark:text-slate-400" disabled aria-disabled title="대여 불가 상태입니다">
                    <Briefcase className="w-4 h-4 mr-1" />
                    대여 불가
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      );
    }

    // grid view
    return (
      <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 group relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative">
          <Image
            src={racket.images?.[0] || '/placeholder.svg?height=300&width=300&query=tennis+racket'}
            alt={`${racketBrandLabel(racket.brand)} ${racket.model}`}
            width={300}
            height={300}
            className="h-48 md:h-56 w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
            <div className="flex items-center gap-2">
              {!racket.rental?.enabled && <StatusBadge kind="rental" state="unavailable" />}
              <StatusBadge kind="condition" state={racket.condition} />
            </div>
          </div>

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex gap-2">
              <Link href={`/rackets/${racket.id}`} onClick={(e) => e.stopPropagation()}>
                <Button size="sm" className="bg-white text-black hover:bg-gray-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white shadow-lg">
                  <Eye className="w-4 h-4 mr-1" />
                  상세보기
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <CardContent className="p-4 md:p-5">
          <div className="text-sm text-muted-foreground mb-2 font-medium">{brandLabel}</div>
          <CardTitle className="text-base md:text-lg mb-3 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors dark:text-white">{racket.model}</CardTitle>

          <div className="flex items-center gap-2 mb-3">
            <StatusBadge kind="condition" state={racket.condition} />
            {racket.rental?.enabled ? (
              <div className="ml-1">
                <RacketAvailBadge id={racket.id} />
              </div>
            ) : (
              <StatusBadge kind="rental" state="unavailable" />
            )}
          </div>
        </CardContent>

        <CardFooter className="p-4 md:p-5 pt-0 flex justify-between items-center">
          <div>
            <div className="font-bold text-lg text-blue-600 dark:text-blue-400">{racket.price.toLocaleString()}원</div>
          </div>

          {racket.rental?.enabled ? (
            <RentDialog id={racket.id} rental={racket.rental} brand={racketBrandLabel(racket.brand)} model={racket.model} size="sm" preventCardNav={true} full={false} />
          ) : (
            <Button size="sm" className="shadow-lg bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-slate-700 dark:text-slate-400" disabled aria-disabled>
              <Briefcase className="w-4 h-4 mr-1" />
              대여 불가
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  },
  (prev, next) => prev.racket.id === next.racket.id && prev.viewMode === next.viewMode && prev.brandLabel === next.brandLabel
);

export default RacketCard;
