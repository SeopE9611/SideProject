'use client';

import { useEffect, useState } from 'react';
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
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">패키지 내역을 불러오는 중입니다...</div>;
  }

  if (error || !data) {
    return (
      <Card className="border-0 shadow-2xl">
        <CardHeader>
          <CardTitle>패키지 이용권</CardTitle>
          <CardDescription>보유 중인 교체 서비스 패키지 목록</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">이용권 정보를 불러오는 중 오류가 발생했습니다.</p>
          <Button onClick={() => mutate()} variant="outline" className="mt-3">
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  const items = data.items ?? [];
  return (
    <Card className="border-0">
      <CardContent className="space-y-4">
        {items.length === 0 && <div className="text-muted-foreground">보유 중인 패키지 이용권이 없습니다.</div>}
        {items.map((p) => {
          const remainPct = Math.max(0, Math.min(100, (p.remainingCount / p.packageSize) * 100));
          const dday = now ? Math.ceil((new Date(p.expiresAt).getTime() - now) / 86400000) : null;
          const statusBadge = p.status === 'active' ? p.isExpiringSoon ? <Badge variant="destructive">만료 임박</Badge> : <Badge>활성</Badge> : p.status === 'expired' ? <Badge variant="outline">만료</Badge> : <Badge variant="secondary">정지</Badge>;

          return (
            <div key={p.id} className="bg-card p-3 shadow-sm ring-1 ring-border/70 dark:ring-border/70">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary dark:bg-primary/20">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">
                      {p.planTitle ?? '교체 서비스 패키지'} {p.packageSize}회권
                    </div>
                    <div className="text-sm text-muted-foreground">
                      구매일 {new Date(p.purchasedAt).toLocaleDateString()} · 만료일 {new Date(p.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {dday === null ? '계산중' : dday >= 0 ? `D-${dday}` : `만료됨`}
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-4">
                <div className="h-2 w-full rounded-full bg-muted/80 dark:bg-muted overflow-hidden">
                  <div className="h-2 bg-primary" style={{ width: `${remainPct}%` }} />
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  사용 {p.usedCount} / 총 {p.packageSize} · 잔여 {p.remainingCount}
                </div>
              </div>

              {/* 최근 사용 이력 */}
              {p.recentUsages?.length > 0 && (
                <div className="mt-3 text-sm text-muted-foreground">
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
