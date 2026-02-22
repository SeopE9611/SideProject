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
  const { qty, avail, rentedCount, isSold, isAllRented, ready } = useRacketAvailability(id);

  // 로딩 중에 1/1 같은 가짜 값이 보이는 깜빡임 방지
  if (!ready) {
    return <div className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-foreground dark:bg-card dark:text-foreground whitespace-nowrap animate-pulse">수량 확인중</div>;
  }

  // 판매 완료(보유 0)
  if (isSold) {
    return <div className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-foreground dark:bg-card dark:text-foreground whitespace-nowrap">판매 완료 (재고 0)</div>;
  }

  // 전량 대여중
  if (isAllRented) {
    return (
      <div className="text-xs font-medium px-2 py-1 rounded-full bg-destructive/10 text-destructive dark:bg-destructive/10 dark:text-destructive whitespace-nowrap">
        전량 대여중 ({rentedCount}/{qty})
      </div>
    );
  }

  // “대여중 0”이면 19/19 같은 표기가 어색하므로 “재고 n개”로 표현
  if (rentedCount === 0) {
    return <div className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary whitespace-nowrap">재고 {qty}개</div>;
  }

  // 대여중이 있으면 분수(가용/보유) + 대여중 배지로 정보량 확보
  return (
    <div className="flex items-center gap-1.5">
      <div className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary whitespace-nowrap">
        가용 {avail}/{qty}
      </div>

      <div className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-primary dark:bg-muted dark:text-primary whitespace-nowrap">대여중 {rentedCount}</div>
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
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl bg-card/90 dark:bg-card/90 backdrop-blur-sm border border-border hover:border-border dark:hover:border-border relative">
          <div className="absolute inset-0 opacity-5 dark:opacity-10">
            <svg className="w-full h-full" viewBox="0 0 400 200" fill="none">
              <rect x="0" y="0" width="400" height="200" stroke="currentColor" strokeWidth="2" />
              <line x1="200" y1="0" x2="200" y2="200" stroke="currentColor" strokeWidth="2" />
              <rect x="50" y="50" width="300" height="100" stroke="currentColor" strokeWidth="1" />
              <line x1="50" y1="100" x2="350" y2="100" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>

          <div className="flex flex-col bp-md:flex-row relative z-10">
            <div className="relative w-full bp-md:w-48 bp-lg:w-56 aspect-[4/3] bp-md:aspect-square overflow-hidden">
              <Image
                src={racket.images?.[0] || '/placeholder.svg?height=200&width=200&query=tennis+racket'}
                alt={`${racketBrandLabel(racket.brand)} ${racket.model}`}
                fill
                sizes="(max-width: 768px) 100vw, 224px"
                className="object-cover object-center"
              />
            </div>
            <div className="flex-1 p-3 bp-sm:p-6 bp-md:p-7">
              <div className="flex flex-col bp-lg:flex-row bp-lg:justify-between bp-lg:items-start mb-3 bp-sm:mb-4 gap-3 bp-sm:gap-4">
                <div className="flex-1">
                  <div className="text-sm bp-sm:text-base text-muted-foreground mb-1.5 font-medium">{brandLabel}</div>
                  <h3 className="text-lg bp-sm:text-xl bp-md:text-2xl font-bold mb-2 bp-sm:mb-3 ">{racket.model}</h3>
                  <div className="flex flex-wrap items-center gap-2 mb-2 bp-sm:mb-3">
                    <StatusBadge kind="condition" state={racket.condition} />
                    <RacketAvailBadge id={racket.id} />
                    {!racket.rental?.enabled && <StatusBadge kind="rental" state="unavailable" />}
                  </div>
                </div>
                <div className="text-left bp-lg:text-right">
                  <div className="text-lg bp-sm:text-2xl bp-md:text-3xl font-bold text-primary">{racket.price.toLocaleString()}원</div>
                  <div className="mt-3 grid grid-cols-1 bp-sm:grid-cols-2 gap-2 bp-lg:max-w-[340px] bp-lg:ml-auto">
                    {canBuy ? (
                      <Button asChild size="sm" className="shadow-lg text-xs bp-sm:text-base w-full justify-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/rackets/${racket.id}/select-string`} onClick={(e) => e.stopPropagation()}>
                          <ShoppingCart className="w-4 h-4 bp-sm:w-5 bp-sm:h-5 mr-1.5" />
                          구매하기
                        </Link>
                      </Button>
                    ) : (
                      <Button size="sm" className="shadow-lg text-xs bp-sm:text-base w-full justify-center whitespace-nowrap" disabled title={buyDisabledTitle}>
                        <ShoppingCart className="w-4 h-4 bp-sm:w-5 bp-sm:h-5 mr-1.5" />
                        품절(구매 불가)
                      </Button>
                    )}

                    {racket.rental?.enabled ? (
                      canRent ? (
                        <RentDialog id={racket.id} rental={racket.rental} brand={racketBrandLabel(racket.brand)} model={racket.model} size="sm" preventCardNav={true} full={false} className="w-full justify-center whitespace-nowrap" />
                      ) : (
                        <Button
                          size="sm"
                          className="shadow-lg bg-muted/70 text-muted-foreground cursor-not-allowed dark:bg-muted dark:text-muted-foreground text-xs bp-sm:text-base w-full justify-center whitespace-nowrap"
                          disabled
                          aria-disabled
                          title={rentDisabledTitle}
                        >
                          <Briefcase className="w-4 h-4 bp-sm:w-5 bp-sm:h-5 mr-1.5" />
                          품절(대여 불가)
                        </Button>
                      )
                    ) : (
                      <Button
                        size="sm"
                        className="shadow-lg bg-muted/70 text-muted-foreground cursor-not-allowed dark:bg-muted dark:text-muted-foreground text-xs bp-sm:text-base w-full justify-center whitespace-nowrap"
                        disabled
                        aria-disabled
                        title={rentDisabledTitle}
                      >
                        <Briefcase className="w-4 h-4 bp-sm:w-5 bp-sm:h-5 mr-1.5" />
                        대여 불가
                      </Button>
                    )}
                  </div>

                  <div className="mt-2 bp-lg:max-w-[340px] bp-lg:ml-auto">
                    <Button asChild size="sm" variant="outline" className="w-full bg-card/80 dark:bg-card/30 shadow text-xs bp-sm:text-base justify-center whitespace-nowrap">
                      <Link href={`/rackets/${racket.id}`} onClick={(e) => e.stopPropagation()}>
                        <Eye className="w-4 h-4 bp-sm:w-5 bp-sm:h-5 mr-1.5" />
                        <span className="bp-sm:hidden">상세</span>
                        <span className="hidden bp-sm:inline">상세보기</span>
                      </Link>
                    </Button>
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
      <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-card/90 dark:bg-card/90 backdrop-blur-sm border border-border hover:border-border dark:hover:border-border group relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-background via-muted to-card opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative w-full aspect-[4/3] bp-md:aspect-square overflow-hidden">
          <Image
            src={racket.images?.[0] || '/placeholder.svg?height=300&width=300&query=tennis+racket'}
            alt={`${racketBrandLabel(racket.brand)} ${racket.model}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
          />

          <div className="absolute inset-0 bg-overlay/0 group-hover:bg-overlay/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex gap-2">
              <Link href={`/rackets/${racket.id}`} onClick={(e) => e.stopPropagation()}>
                <Button size="sm" className="bg-card text-foreground hover:bg-muted dark:text-foreground dark:hover:bg-card shadow-lg text-xs bp-sm:text-base">
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
          <CardTitle className="text-base bp-sm:text-lg bp-md:text-xl mb-3 line-clamp-2 group-hover:text-primary dark:group-hover:text-primary transition-colors ">{racket.model}</CardTitle>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <StatusBadge kind="condition" state={racket.condition} />
            <div className="ml-1">
              <RacketAvailBadge id={racket.id} />
            </div>
            {!racket.rental?.enabled && <StatusBadge kind="rental" state="unavailable" />}
          </div>
        </CardContent>

        <CardFooter className="p-3 bp-sm:p-6 pt-0">
          <div className="w-full">
            <div className="font-bold text-base bp-sm:text-xl bp-md:text-2xl text-primary">{racket.price.toLocaleString()}원</div>

            <div className="mt-3 flex gap-2">
              {canBuy ? (
                <Button asChild size="sm" className="flex-1 min-w-0 bg-primary text-primary-foreground shadow hover:bg-primary/90" onClick={(e) => e.stopPropagation()}>
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
                    <RentDialog id={racket.id} rental={racket.rental} brand={racketBrandLabel(racket.brand)} model={racket.model} size="sm" preventCardNav={true} full={false} className="w-full justify-center" />
                  </div>
                ) : (
                  <Button size="sm" className="flex-1 min-w-0 shadow-lg bg-muted/70 text-muted-foreground cursor-not-allowed dark:bg-muted dark:text-muted-foreground" disabled aria-disabled title={rentDisabledTitle}>
                    <Briefcase className="w-4 h-4 mr-1.5" />
                    품절
                  </Button>
                )
              ) : (
                <Button size="sm" className="flex-1 min-w-0 shadow-lg bg-muted/70 text-muted-foreground cursor-not-allowed dark:bg-muted dark:text-muted-foreground" disabled aria-disabled title={rentDisabledTitle}>
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
  (prev, next) => prev.racket.id === next.racket.id && prev.viewMode === next.viewMode && prev.brandLabel === next.brandLabel,
);

export default RacketCard;
