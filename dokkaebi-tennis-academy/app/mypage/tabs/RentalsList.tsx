'use client';

import useSWRInfinite from 'swr/infinite';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, CreditCard, Package, ArrowRight, Briefcase, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { useMemo } from 'react';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

const LIMIT = 5;

const getKey = (index: number, prev: any) => {
  if (prev && prev.items && prev.items.length < LIMIT) return null;
  const page = index + 1;
  return `/api/me/rentals?page=${page}&pageSize=${LIMIT}`;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'returned':
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    case 'out':
      return <Clock className="h-4 w-4 text-blue-500" />;
    case 'paid':
      return <Package className="h-4 w-4 text-indigo-500" />;
    case 'canceled':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-slate-500" />;
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'returned':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
    case 'out':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'paid':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
    case 'canceled':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
  }
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    created: '생성됨',
    paid: '결제완료',
    out: '대여중',
    returned: '반납완료',
    canceled: '취소됨',
  };
  return labels[status] || status;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

export default function RentalsList() {
  const { data, size, setSize, isValidating, error } = useSWRInfinite(getKey, fetcher);

  const flat = useMemo(() => (data ?? []).flatMap((d: any) => d.items ?? []), [data]);

  const hasMore = useMemo(() => {
    if (!data || data.length === 0) return false;
    const last = data[data.length - 1];
    return (last?.items?.length ?? 0) === LIMIT;
  }, [data]);

  if (error) {
    return (
      <Card className="border-0 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950 dark:to-pink-950">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <Briefcase className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-red-600 dark:text-red-400">대여 내역을 불러오는 중 오류가 발생했습니다.</p>
        </CardContent>
      </Card>
    );
  }

  if (!data && isValidating) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!isValidating && flat.length === 0) {
    return (
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <CardContent className="p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 shadow-lg">
            <Briefcase className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-slate-100">대여 내역이 없습니다</h3>
          <p className="text-slate-600 dark:text-slate-400">아직 대여하신 라켓이 없습니다. 지금 바로 라켓을 대여해보세요!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {flat.map((r: any) => (
        <Card key={r.id} className="group relative overflow-hidden border-0 bg-white dark:bg-slate-900 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ padding: '1px' }}>
            <div className="h-full w-full bg-white dark:bg-slate-900 rounded-lg" />
          </div>

          <CardContent className="relative p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 shadow-lg">
                  <Briefcase className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {r.brand} {r.model}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                    <Calendar className="h-3 w-3" />
                    대여 기간: {r.days}일
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getStatusIcon(r.status)}
                <Badge className={`px-3 py-1 text-xs font-medium ${getStatusBadgeColor(r.status)}`}>{getStatusLabel(r.status)}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <Clock className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">대여 기간</div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{r.days}일</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <CreditCard className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">대여 수수료</div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{r.amount?.fee?.toLocaleString() ?? 0}원</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <Package className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">보증금</div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{r.amount?.deposit?.toLocaleString() ?? 0}원</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">총 {((r.amount?.fee ?? 0) + (r.amount?.deposit ?? 0)).toLocaleString()}원</span>
                {r.hasReturnShipping ? <Badge className="bg-emerald-600 text-white">반납 운송장 등록됨</Badge> : <Badge variant="secondary">반납 운송장 미등록</Badge>}
              </div>

              <Button size="sm" variant="outline" asChild className="border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:hover:border-indigo-600 dark:hover:bg-indigo-950 bg-transparent">
                <Link href={`/mypage?tab=rentals&id=${r.id}`} className="inline-flex items-center gap-1">
                  상세보기
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-center pt-4">
        {hasMore ? (
          <Button variant="outline" onClick={() => setSize(size + 1)} disabled={isValidating} className="border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 bg-transparent">
            {isValidating ? '불러오는 중…' : '더 보기'}
          </Button>
        ) : flat.length ? (
          <span className="text-sm text-slate-500">마지막 페이지입니다</span>
        ) : null}
      </div>
    </div>
  );
}
