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

const conditionLabels: Record<string, string> = {
  A: '최상',
  B: '양호',
  C: '보통',
};

const conditionColors: Record<string, string> = {
  A: 'bg-gradient-to-r from-green-600 to-emerald-600',
  B: 'bg-gradient-to-r from-blue-600 to-cyan-600',
  C: 'bg-gradient-to-r from-orange-600 to-amber-600',
};

function RacketAvailBadge({ id }: { id: string }) {
  const { data } = useSWR<{ ok: boolean; count: number; quantity: number; available: number }>(`/api/rentals/active-count/${id}`, fetcher, { dedupingInterval: 5000 });
  const qty = Number(data?.quantity ?? 1);
  // 우선순위: 서버의 available → 없을 때만 count로 보정
  const avail = Number.isFinite(data?.available) ? Math.max(0, Number(data?.available)) : Math.max(0, qty - Number(data?.count ?? 0));
  const soldOut = avail <= 0;
  return (
    <div className={`text-xs font-medium ${soldOut ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{qty > 1 ? (soldOut ? `대여 중 (0/${qty})` : `잔여 ${avail}/${qty}`) : soldOut ? '대여 중' : '대여 가능'}</div>
  );
}

const RacketCard = React.memo(
  function RacketCard({ racket, viewMode, brandLabel }: Props) {
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
                {racket.rental?.enabled === false && <span className="rounded px-2 py-1 text-xs font-semibold bg-rose-600 text-white shadow">대여 불가</span>}
                <Badge className={`${conditionColors[racket.condition]} text-white shadow-lg`}>상태 {conditionLabels[racket.condition]}</Badge>
              </div>
            </div>
            <div className="flex-1 p-4 md:p-6">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4 gap-4">
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground mb-1 font-medium">{brandLabel}</div>
                  <h3 className="text-lg md:text-xl font-bold mb-2 dark:text-white">{racket.model}</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <Badge variant="outline" className="border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400">
                      {conditionLabels[racket.condition]}
                    </Badge>
                    {racket.rental?.enabled && <RacketAvailBadge id={racket.id} />}
                  </div>
                </div>
                <div className="text-left lg:text-right">
                  <div className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">{racket.price.toLocaleString()}원</div>
                  {racket.rental?.enabled && (
                    <div className="text-sm text-muted-foreground mt-1">
                      <RacketAvailBadge id={racket.id} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                {racket.rental?.enabled === false ? (
                  <Button className="w-full bg-gray-300 text-gray-600 cursor-not-allowed" disabled aria-disabled title="대여 불가 상태입니다">
                    <Eye className="w-4 h-4 mr-2" />
                    상세보기
                  </Button>
                ) : (
                  <Link href={`/rackets/${racket.id}`} className="flex-1">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-500 dark:to-indigo-500 dark:hover:from-blue-600 dark:hover:to-indigo-600 shadow-lg">
                      <Eye className="w-4 h-4 mr-2" />
                      상세보기
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </Card>
      );
    }

    // grid view
    return (
      <Link href={`/rackets/${racket.id}`}>
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
              {racket.rental?.enabled === false && <span className="rounded px-2 py-1 text-xs font-semibold bg-rose-600 text-white shadow">대여 불가</span>}
              <Badge className={`${conditionColors[racket.condition]} text-white shadow-lg`}>상태 {conditionLabels[racket.condition]}</Badge>
            </div>

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-white text-black hover:bg-gray-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  상세보기
                </Button>
              </div>
            </div>
          </div>

          <CardContent className="p-4 md:p-5">
            <div className="text-sm text-muted-foreground mb-2 font-medium">{brandLabel}</div>
            <CardTitle className="text-base md:text-lg mb-3 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors dark:text-white">{racket.model}</CardTitle>

            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-xs border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400">
                {conditionLabels[racket.condition]}
              </Badge>
              {racket.rental?.enabled && (
                <div className="ml-1">
                  <RacketAvailBadge id={racket.id} />
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="p-4 md:p-5 pt-0 flex justify-between items-center">
            <div>
              <div className="font-bold text-lg text-blue-600 dark:text-blue-400">{racket.price.toLocaleString()}원</div>
            </div>
            <Button
              size="sm"
              className={`shadow-lg ${racket.rental?.enabled ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
              disabled={racket.rental?.enabled === false}
              aria-disabled={racket.rental?.enabled === false}
              title={racket.rental?.enabled === false ? '대여 불가 상태입니다' : '대여하기'}
            >
              <Briefcase className="w-4 h-4 mr-1" />
              {racket.rental?.enabled === false ? '대여 불가' : '대여하기'}
            </Button>
          </CardFooter>
        </Card>
      </Link>
    );
  },
  (prev, next) => prev.racket.id === next.racket.id && prev.viewMode === next.viewMode && prev.brandLabel === next.brandLabel
);

export default RacketCard;
