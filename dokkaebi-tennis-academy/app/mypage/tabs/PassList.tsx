'use client';

import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ticket, Clock } from 'lucide-react';

type PassItem = {
  id: string;
  packageSize: number;
  usedCount: number;
  remainingCount: number;
  status: 'active' | 'expired' | 'suspended';
  purchasedAt: string;
  expiresAt: string;
  planId?: string | null;
  planTitle?: string | null;
  isExpiringSoon: boolean;
  recentUsages: { applicationId: string | null; usedAt: string; reverted: boolean }[];
};

type Res = { items: PassItem[] };

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

export default function PassList() {
  const { data, isLoading, error, mutate } = useSWR<Res>('/api/passes/me', fetcher);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-2xl">
        <CardHeader>
          <CardTitle>패키지 이용권</CardTitle>
          <CardDescription>보유 중인 교체 서비스 패키지 목록</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-6 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-20 w-full bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="h-20 w-full bg-slate-100 dark:bg-slate-800 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-0 shadow-2xl">
        <CardHeader>
          <CardTitle>패키지 이용권</CardTitle>
          <CardDescription>보유 중인 교체 서비스 패키지 목록</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 dark:text-red-400">이용권 정보를 불러오는 중 오류가 발생했습니다.</p>
          <Button onClick={() => mutate()} variant="outline" className="mt-3">
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  const items = data.items ?? [];
  return (
    <Card className="border-0 shadow-2xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg">
            <Ticket className="h-6 w-6" />
          </div>
          <div>
            <CardTitle>패키지 이용권</CardTitle>
            <CardDescription>잔여 횟수와 만료일을 확인하세요.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 && <div className="text-slate-500 dark:text-slate-400">보유 중인 패키지 이용권이 없습니다.</div>}
        {items.map((p) => {
          const remainPct = Math.max(0, Math.min(100, (p.remainingCount / p.packageSize) * 100));
          const dday = Math.ceil((new Date(p.expiresAt).getTime() - Date.now()) / 86400000);
          const statusBadge = p.status === 'active' ? p.isExpiringSoon ? <Badge variant="destructive">만료 임박</Badge> : <Badge>활성</Badge> : p.status === 'expired' ? <Badge variant="outline">만료</Badge> : <Badge variant="secondary">정지</Badge>;

          return (
            <div key={p.id} className="bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-700/70">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">
                      {p.planTitle ?? '교체 서비스 패키지'} {p.packageSize}회권
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      구매일 {new Date(p.purchasedAt).toLocaleDateString()} · 만료일 {new Date(p.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge}
                  <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                    <Clock className="h-4 w-4" />
                    {dday >= 0 ? `D-${dday}` : `만료됨`}
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-4">
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${remainPct}%` }} />
                </div>
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  사용 {p.usedCount} / 총 {p.packageSize} · 잔여 {p.remainingCount}
                </div>
              </div>

              {/* 최근 사용 이력 */}
              {p.recentUsages?.length > 0 && (
                <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  최근 사용{' '}
                  {p.recentUsages.slice(-3).map((u, idx) => (
                    <span key={idx} className="mr-2">
                      {new Date(u.usedAt).toLocaleDateString()}
                      {u.reverted ? ' (복원)' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
