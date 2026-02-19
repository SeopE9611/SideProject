'use client';

import useSWR from 'swr';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { PointTransactionListItem } from '@/lib/types/points';
import { fallbackReason, parsePointRefKey, pointTxStatusLabel, pointTxTypeLabel, safeLocalDateTime, shortId } from '@/lib/points.display';
import Link from 'next/link';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, RefreshCw, Coins, ArrowRight, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type PointsHistoryRes = {
  ok: boolean;
  balance: number;
  items: PointTransactionListItem[];
  total: number;
  page: number;
  limit: number;
  error?: string;
  debt?: number;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(n);

export default function MyPointsTab() {
  const [page, setPage] = useState(1);
  const limit = 5;

  const { data, isLoading, mutate } = useSWR<PointsHistoryRes>(`/api/points/me/history?page=${page}&limit=${limit}`, fetcher);

  const { data: allData } = useSWR<PointsHistoryRes>(`/api/points/me/history?page=1&limit=10000`, fetcher);

  const totalPages = useMemo(() => {
    const total = data?.total ?? 0;
    return Math.max(1, Math.ceil(total / limit));
  }, [data?.total]);

  const stats = useMemo(() => {
    if (!allData?.items) return { earned: 0, spent: 0, recentTrend: 0 };

    const earned = allData.items.filter((it) => it.amount > 0).reduce((sum, it) => sum + it.amount, 0);
    const spent = allData.items.filter((it) => it.amount < 0).reduce((sum, it) => sum + Math.abs(it.amount), 0);

    const recent = allData.items.slice(0, Math.min(5, allData.items.length));
    const recentBalance = recent.reduce((sum, it) => sum + it.amount, 0);

    return { earned, spent, recentTrend: recentBalance };
  }, [allData?.items]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 bp-sm:gap-6 bp-md:grid-cols-2 bp-lg:grid-cols-3">
          <Skeleton className="h-24 bp-sm:h-28 rounded-2xl" />
          <Skeleton className="h-24 bp-sm:h-28 rounded-2xl" />
          <Skeleton className="h-24 bp-sm:h-28 rounded-2xl bp-md:col-span-2 bp-lg:col-span-1" />
        </div>
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data?.ok) {
    return (
      <Card className="border-0 shadow-xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center justify-center py-12 bp-sm:py-16">
          <div className="bg-destructive/10 rounded-full p-4 mb-4">
            <Coins className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-base font-medium mb-2">포인트 정보를 불러올 수 없습니다</p>
          <p className="text-sm text-muted-foreground mb-6">{data?.error ?? 'UNKNOWN'}</p>
          <Button onClick={() => mutate()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 bp-sm:gap-6 bp-md:grid-cols-2 bp-lg:grid-cols-3">
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 text-white">
          <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors duration-300" />
          <div className="absolute top-0 right-0 w-24 h-24 bg-card/5 rounded-full -mr-12 -mt-12" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-card/5 rounded-full -ml-10 -mb-10" />

          <CardContent className="relative p-4 bp-sm:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="bg-card/20 backdrop-blur-sm rounded-lg p-2 shadow-lg">
                <Coins className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
              </div>
              {stats.recentTrend !== 0 && (
                <Badge variant="secondary" className="bg-card/20 backdrop-blur-sm text-white border-0 px-2 py-0.5 text-xs">
                  {stats.recentTrend > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {stats.recentTrend > 0 ? '+' : ''}
                  {fmt(stats.recentTrend)}
                </Badge>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-primary">보유 포인트</p>
              <p className="text-xl bp-sm:text-2xl bp-lg:text-3xl font-black tracking-tight">{fmt(data.balance)}P</p>
              {typeof data.debt === 'number' && data.debt > 0 && (
                <p className="text-xs text-primary flex items-center gap-1">
                  <span>사용 가능:</span>
                  <span className="font-bold">{fmt(Math.max(0, data.balance - data.debt))}P</span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-card dark:bg-card">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 group-hover:opacity-80 transition-opacity duration-300" />

          <CardContent className="relative p-4 bp-sm:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 rounded-lg p-2 shadow-md">
                <ArrowUpRight className="h-4 w-4 bp-sm:h-5 bp-sm:w-5 text-primary dark:text-primary" />
              </div>
              <TrendingUp className="h-4 w-4 text-primary dark:text-primary opacity-50" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">적립 포인트 (이번 페이지)</p>
              <p className="text-xl bp-sm:text-2xl bp-lg:text-3xl font-black text-primary dark:text-primary">+{fmt(stats.earned)}</p>
              <p className="text-xs text-muted-foreground">전체 기준</p>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-card dark:bg-card bp-md:col-span-2 bp-lg:col-span-1">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 group-hover:opacity-80 transition-opacity duration-300" />

          <CardContent className="relative p-4 bp-sm:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/50 dark:to-pink-900/50 rounded-lg p-2 shadow-md">
                <ArrowDownRight className="h-4 w-4 bp-sm:h-5 bp-sm:w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400 opacity-50" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">사용 포인트 (이번 페이지)</p>
              <p className="text-xl bp-sm:text-2xl bp-lg:text-3xl font-black text-rose-600 dark:text-rose-400">-{fmt(stats.spent)}</p>
              <p className="text-xs text-muted-foreground">전체 기준</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-xl bg-card/95 dark:bg-card/95 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-background to-muted dark:from-background/50 dark:to-muted/50 border-b p-5 bp-sm:p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-xl p-2.5 shadow-md">
                <Calendar className="h-5 w-5 text-muted-foreground dark:text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg bp-sm:text-xl">포인트 내역</CardTitle>
                <p className="text-xs bp-sm:text-sm text-muted-foreground mt-0.5">전체 {data.total}건</p>
              </div>
            </div>
            <Button onClick={() => mutate()} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden bp-sm:inline">새로고침</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {data.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bp-sm:py-16 px-4">
              <div className="bg-muted/50 rounded-full p-4 mb-4">
                <Coins className="h-8 w-8 bp-sm:h-10 bp-sm:w-10 text-muted-foreground" />
              </div>
              <p className="text-base font-medium text-center mb-1">포인트 내역이 없습니다</p>
              <p className="text-sm text-muted-foreground text-center">포인트를 적립하거나 사용하면 여기에 표시됩니다</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.items.map((it, idx) => (
                <div
                  key={it.id}
                  className="group relative p-4 bp-sm:p-5 bp-lg:p-6 hover:bg-muted/30 dark:hover:bg-card transition-colors duration-200"
                  style={{
                    animation: `fadeIn 0.3s ease-out ${idx * 0.05}s both`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3 bp-sm:gap-4">
                    <div className="flex items-start gap-3 bp-sm:gap-4 flex-1 min-w-0">
                      <div
                        className={`shrink-0 rounded-xl p-2 bp-sm:p-2.5 shadow-sm ${
                          it.amount >= 0 ? 'bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50' : 'bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/50 dark:to-pink-900/50'
                        }`}
                      >
                        {it.amount >= 0 ? <ArrowUpRight className="h-4 w-4 bp-sm:h-5 bp-sm:w-5 text-primary dark:text-primary" /> : <ArrowDownRight className="h-4 w-4 bp-sm:h-5 bp-sm:w-5 text-rose-600 dark:text-rose-400" />}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5 bp-sm:space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-base bp-sm:text-lg font-bold tabular-nums ${it.amount >= 0 ? 'text-primary dark:text-primary' : 'text-rose-600 dark:text-rose-400'}`}>
                            {it.amount >= 0 ? '+' : ''}
                            {fmt(it.amount)}P
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {pointTxTypeLabel(it.type)}
                          </Badge>
                          <Badge variant={it.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
                            {pointTxStatusLabel(it.status)}
                          </Badge>
                        </div>

                        {it.reason && it.reason.trim().length >= 2 ? (
                          <p className="text-sm text-foreground line-clamp-1">{it.reason}</p>
                        ) : fallbackReason(it.type) ? (
                          <p className="text-sm text-muted-foreground line-clamp-1">{fallbackReason(it.type)}</p>
                        ) : null}

                        {(() => {
                          const ref = parsePointRefKey(it.refKey);
                          if (!ref) return null;

                          if (ref.kind === 'order') {
                            return (
                              <Link className="inline-flex items-center gap-1.5 text-xs text-primary dark:text-primary hover:underline underline-offset-4 font-medium group/link" href={`/mypage/orders/${ref.orderId}`}>
                                <span>
                                  주문번호: <span className="font-mono">{shortId(ref.orderId)}</span>
                                </span>
                                <ArrowRight className="h-3 w-3 group-hover/link:translate-x-0.5 transition-transform" />
                              </Link>
                            );
                          }

                          if (ref.kind === 'review') {
                            return (
                              <span className="text-xs text-muted-foreground">
                                리뷰: <span className="font-mono">{shortId(ref.reviewId)}</span>
                              </span>
                            );
                          }

                          return null;
                        })()}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-xs bp-sm:text-sm text-muted-foreground whitespace-nowrap">{safeLocalDateTime(it.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {data.items.length > 0 && (
          <div className="border-t bg-muted/30 dark:bg-card/30 px-4 bp-sm:px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground tabular-nums">
                <span className="hidden bp-sm:inline">페이지 </span>
                <span className="font-semibold text-foreground">{page}</span>
                <span className="mx-1">/</span>
                <span>{totalPages}</span>
              </p>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="gap-1.5">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden bp-sm:inline">이전</span>
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="gap-1.5">
                  <span className="hidden bp-sm:inline">다음</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
