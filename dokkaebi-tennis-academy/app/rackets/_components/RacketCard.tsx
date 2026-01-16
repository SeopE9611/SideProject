'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Eye, ShoppingCart } from 'lucide-react';
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

function useRacketAvailability(id: string) {
  const { data } = useSWR<{ ok: boolean; count: number; quantity: number; available: number }>(`/api/rentals/active-count/${id}`, fetcher, { dedupingInterval: 5000 });

  // qty: 보유 수량, count: 대여중 수량, avail: 현재 가용(보유 - 대여중)
  const qty = Number(data?.quantity ?? 1);
  const count = Number(data?.count ?? 0);

  const availRaw = (data as any)?.available;
  const avail = Number.isFinite(availRaw) ? Math.max(0, Number(availRaw)) : Math.max(0, qty - count);

  const rentedCount = Math.min(qty, Math.max(0, count));
  const isSold = qty <= 0; // 판매 완료(보유 0)
  const isAllRented = !isSold && avail <= 0 && rentedCount > 0; // 전량 대여중

  return { qty, count, avail, rentedCount, isSold, isAllRented, ready: data !== undefined };
}

function RacketAvailBadge({ id }: { id: string }) {
  const { qty, avail, rentedCount, isSold, isAllRented } = useRacketAvailability(id);

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
    const { avail, isSold, isAllRented, ready } = useRacketAvailability(racket.id);
    const canBuy = ready ? !isSold && avail > 0 : true; // 로딩 중엔 일단 true(서버에서 최종 검증)
    const canRent = racket.rental?.enabled ? (ready ? !isSold && avail > 0 : true) : false;
    const buyDisabledTitle = !canBuy ? (isSold ? '판매가 종료된 상품입니다.' : '현재 전량 대여중이라 구매가 불가합니다.') : undefined;
    const rentDisabledTitle = !canRent ? (racket.rental?.enabled ? (isSold ? '판매가 종료된 상품입니다.' : '현재 전량 대여중이라 대여가 불가합니다.') : '대여 불가 상태입니다') : undefined;

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

          <div className="flex flex-col bp-md:flex-row relative z-10">
            <div className="relative w-full bp-md:w-48 bp-lg:w-56 h-40 bp-sm:h-64 bp-md:h-48 bp-lg:h-56 overflow-hidden">
              <Image src={racket.images?.[0] || '/placeholder.svg?height=200&width=200&query=tennis+racket'} alt={`${racketBrandLabel(racket.brand)} ${racket.model}`} fill className="object-cover" />
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-2 z-10">
                <div className="flex items-center gap-2">
                  {!racket.rental?.enabled && <StatusBadge kind="rental" state="unavailable" />}
                  <StatusBadge kind="condition" state={racket.condition} />
                </div>
              </div>
            </div>
            <div className="flex-1 p-3 bp-sm:p-6 bp-md:p-7">
              <div className="flex flex-col bp-lg:flex-row bp-lg:justify-between bp-lg:items-start mb-3 bp-sm:mb-4 gap-3 bp-sm:gap-4">
                <div className="flex-1">
                  <div className="text-sm bp-sm:text-base text-muted-foreground mb-1.5 font-medium">{brandLabel}</div>
                  <h3 className="text-lg bp-sm:text-xl bp-md:text-2xl font-bold mb-2 bp-sm:mb-3 dark:text-white">{racket.model}</h3>
                  <div className="flex items-center gap-2 mb-2 bp-sm:mb-3">
                    <StatusBadge kind="condition" state={racket.condition} />
                    {racket.rental?.enabled ? <RacketAvailBadge id={racket.id} /> : <StatusBadge kind="rental" state="unavailable" />}
                  </div>
                </div>
                <div className="text-left bp-lg:text-right">
                  <div className="text-lg bp-sm:text-2xl bp-md:text-3xl font-bold text-blue-600 dark:text-blue-400">{racket.price.toLocaleString()}원</div>
                  <div className="mt-3 flex flex-wrap gap-2 bp-lg:justify-end">
                    {canBuy ? (
                      <Button asChild size="sm" className="shadow-lg text-xs bp-sm:text-base" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/rackets/${racket.id}/select-string`} onClick={(e) => e.stopPropagation()}>
                          <ShoppingCart className="w-4 h-4 bp-sm:w-5 bp-sm:h-5 mr-1.5" />
                          구매하기
                        </Link>
                      </Button>
                    ) : (
                      <Button size="sm" className="shadow-lg text-xs bp-sm:text-base" disabled title={buyDisabledTitle}>
                        <ShoppingCart className="w-4 h-4 bp-sm:w-5 bp-sm:h-5 mr-1.5" />
                        품절(구매 불가)
                      </Button>
                    )}

                    {racket.rental?.enabled ? (
                      canRent ? (
                        <RentDialog id={racket.id} rental={racket.rental} brand={racketBrandLabel(racket.brand)} model={racket.model} size="sm" preventCardNav={true} full={false} />
                      ) : (
                        <Button size="sm" className="shadow-lg bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-slate-700 dark:text-slate-400 text-sm bp-sm:text-base" disabled aria-disabled title={rentDisabledTitle}>
                          <Briefcase className="w-4 h-4 bp-sm:w-5 bp-sm:h-5 mr-1.5" />
                          품절(대여 불가)
                        </Button>
                      )
                    ) : (
                      <Button size="sm" className="shadow-lg bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-slate-700 dark:text-slate-400 text-sm bp-sm:text-base" disabled aria-disabled title={rentDisabledTitle}>
                        <Briefcase className="w-4 h-4 bp-sm:w-5 bp-sm:h-5 mr-1.5" />
                        대여 불가
                      </Button>
                    )}
                  </div>

                  <div className="mt-2 flex bp-lg:justify-end">
                    <Link href={`/rackets/${racket.id}`} onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" className="bg-white/80 dark:bg-slate-900/30 shadow text-xs bp-sm:text-base">
                        <Eye className="w-4 h-4 bp-sm:w-5 bp-sm:h-5 mr-1.5" />
                        <span className="bp-sm:hidden">상세</span>
                        <span className="hidden bp-sm:inline">상세보기</span>
                      </Button>
                    </Link>
                  </div>
                </div>
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
            className="h-40 bp-sm:h-64 bp-md:h-72 bp-lg:h-80 w-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                <Button size="sm" className="bg-white text-black hover:bg-gray-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white shadow-lg text-xs bp-sm:text-base">
                  <Eye className="w-4 h-4 bp-sm:w-5 bp-sm:h-5 mr-1.5" />

                  <span className="bp-sm:hidden">상세</span>
                  <span className="hidden bp-sm:inline">상세보기</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <CardContent className="p-3 bp-sm:p-6">
          <div className="text-xs bp-sm:text-base text-muted-foreground mb-2 font-medium">{brandLabel}</div>
          <CardTitle className="text-base bp-sm:text-lg bp-md:text-xl mb-3 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors dark:text-white">{racket.model}</CardTitle>

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

        <CardFooter className="p-3 bp-sm:p-6 pt-0">
          <div className="w-full">
            <div className="font-bold text-base bp-sm:text-xl bp-md:text-2xl text-blue-600 dark:text-blue-400">{racket.price.toLocaleString()}원</div>

            <div className="mt-3 flex gap-2">
              {canBuy ? (
                <Button asChild size="sm" className="flex-1 min-w-0 bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow hover:from-indigo-600 hover:to-blue-600" onClick={(e) => e.stopPropagation()}>
                  <Link href={`/rackets/${racket.id}/select-string`} onClick={(e) => e.stopPropagation()} className="justify-center">
                    <ShoppingCart className="w-4 h-4 mr-1.5" />
                    구매하기
                  </Link>
                </Button>
              ) : (
                <Button size="sm" className="flex-1 min-w-0" disabled title={buyDisabledTitle}>
                  <ShoppingCart className="w-4 h-4 mr-1.5" />
                  품절
                </Button>
              )}

              {racket.rental?.enabled ? (
                canRent ? (
                  <div className="flex-1 min-w-0">
                    <RentDialog id={racket.id} rental={racket.rental} brand={racketBrandLabel(racket.brand)} model={racket.model} size="sm" preventCardNav={true} full={false} />
                  </div>
                ) : (
                  <Button size="sm" className="flex-1 min-w-0 shadow-lg bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-slate-700 dark:text-slate-400" disabled aria-disabled title={rentDisabledTitle}>
                    <Briefcase className="w-4 h-4 mr-1.5" />
                    품절
                  </Button>
                )
              ) : (
                <Button size="sm" className="flex-1 min-w-0 shadow-lg bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-slate-700 dark:text-slate-400" disabled aria-disabled title={rentDisabledTitle}>
                  <Briefcase className="w-4 h-4 mr-1.5" />
                  대여 불가
                </Button>
              )}
            </div>
          </div>
        </CardFooter>
      </Card>
    );
  },
  (prev, next) => prev.racket.id === next.racket.id && prev.viewMode === next.viewMode && prev.brandLabel === next.brandLabel
);

export default RacketCard;
