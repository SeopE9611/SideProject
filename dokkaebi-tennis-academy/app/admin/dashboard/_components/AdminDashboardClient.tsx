'use client';

import type { ReactNode } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Activity, AlertTriangle, Bell, Boxes, ClipboardList, Clock, Timer, CalendarClock, Package, ShoppingCart, Star, TrendingUp, Users, Wrench } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// ----------------------------- 타입 -----------------------------

type DashboardMetrics = {
  generatedAt: string;
  series: {
    days: number;
    fromYmd: string;
    toYmd: string;
    dailyRevenue: Array<{ date: string; value: number }>;
    dailyRevenueBySource: Array<{ date: string; orders: number; applications: number; packages: number; total: number }>;
    dailyOrders: Array<{ date: string; value: number }>;
    dailyApplications: Array<{ date: string; value: number }>;
    dailySignups: Array<{ date: string; value: number }>;
    dailyReviews: Array<{ date: string; value: number }>;
  };
  kpi: {
    users: { total: number; delta7d: number; active7d: number; byProvider: { local: number; kakao: number; naver: number } };
    orders: { total: number; delta7d: number; paid7d: number; revenue7d: number; aov7d: number };
    applications: { total: number; delta7d: number; paid7d: number; revenue7d: number };
    rentals: { total: number; delta7d: number; paid7d: number; revenue7d: number };
    packages: { total: number; delta7d: number; paid7d: number; revenue7d: number };
    reviews: {
      total: number;
      delta7d: number;
      avg: number;
      five: number;
      byType: { product: number; service: number };
      byRating: { one: number; two: number; three: number; four: number; five: number };
    };
    points: { issued7d: number; spent7d: number };
    community: { posts7d: number; comments7d: number; pendingReports: number };
    inventory: { lowStockProducts: number; outOfStockProducts: number; inactiveRackets: number };
    queue: {
      cancelRequests: number;
      shippingPending: number;
      paymentPending24h: number;
      rentalOverdue: number;
      rentalDueSoon: number;
      passExpiringSoon: number;
      outboxQueued: number;
      outboxFailed: number;
      stringingAging3d: number;
    };
  };

  dist: {
    orderStatus: Array<{ label: string; count: number }>;
    orderPaymentStatus: Array<{ label: string; count: number }>;
    applicationStatus: Array<{ label: string; count: number }>;
  };
  inventoryList: {
    lowStock: Array<{ id: string; name: string; brand: string; stock: number; lowStock: number | null }>;
    outOfStock: Array<{ id: string; name: string; brand: string; stock: number }>;
  };
  top: {
    products7d: Array<{ productId: string; name: string; brand: string; qty: number; revenue: number }>;
    brands7d: Array<{ brand: string; qty: number; revenue: number }>;
  };
  recent: {
    orders: Array<{ id: string; createdAt: string; name: string; totalPrice: number; status: string; paymentStatus: string }>;
    applications: Array<{ id: string; createdAt: string; name: string; totalPrice: number; status: string; paymentStatus: string }>;
    rentals: Array<{ id: string; createdAt: string; name: string; total: number; status: string }>;
    reports: Array<{ id: string; createdAt: string; kind: 'post' | 'comment'; reason: string }>;
  };
  queueDetails: {
    cancelRequests: Array<{
      kind: 'order' | 'application' | 'rental';
      id: string;
      createdAt: string;
      name: string;
      amount: number;
      status: string;
      paymentStatus?: string;
      href: string;
    }>;
    shippingPending: Array<{
      kind: 'order' | 'application';
      id: string;
      createdAt: string;
      name: string;
      amount: number;
      status: string;
      paymentStatus: string;
      href: string;
    }>;
    // 결제 대기(24h) "리스트" (Top 카드 상세 렌더링용)
    paymentPending24h: Array<{
      kind: 'order' | 'application' | 'rental' | 'package';
      id: string;
      createdAt: string;
      name: string;
      amount: number;
      status: string;
      href: string;
      hoursAgo: number;
    }>;
    rentalOverdue: Array<{
      id: string;
      dueAt: string;
      name: string;
      amount: number;
      overdueDays: number;
      href: string;
    }>;
    rentalDueSoon: Array<{
      id: string;
      dueAt: string;
      name: string;
      amount: number;
      dueInHours: number;
      href: string;
    }>;
    passExpiringSoon: Array<{
      id: string;
      expiresAt: string;
      name: string;
      remainingCount: number;
      daysLeft: number;
      href: string;
    }>;
    stringingAging: Array<{
      id: string;
      createdAt: string;
      name: string;
      status: string;
      paymentStatus: string;
      totalPrice: number;
      ageDays: number;
      href: string;
    }>;
    outboxBacklog: Array<{
      id: string;
      createdAt: string;
      status: 'queued' | 'failed' | 'sent';
      eventType: string;
      to: string | null;
      retries: number;
      error: string | null;
    }>;
  };
};

// ----------------------------- 유틸 -----------------------------

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return (await res.json()) as DashboardMetrics;
};

function formatNumber(n: number) {
  return new Intl.NumberFormat('ko-KR').format(Number(n || 0));
}

function formatKRW(n: number) {
  return `${formatNumber(n)}원`;
}

function formatIsoToKstShort(iso: string) {
  // 서버에서 ISO로 내려오므로, 브라우저 로컬(한국)에서는 자연스럽게 KST로 표시됨
  // (해외에서 접속해도 '일자' 정도만 읽히면 괜찮도록 "YYYY-MM-DD HH:mm" 형태로만)
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

// ----------------------------- 그래프(가벼운 SVG) -----------------------------

function SparkLine({ data, height = 56 }: { data: Array<{ date: string; value: number }>; height?: number }) {
  const width = 220;
  const padding = 6;
  const values = data.map((d) => d.value);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);

  const toX = (i: number) => padding + (i * (width - padding * 2)) / Math.max(1, data.length - 1);
  const toY = (v: number) => height - padding - ((v - min) * (height - padding * 2)) / Math.max(1, max - min);

  const d = data.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(2)} ${toY(p.value).toFixed(2)}`).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="text-emerald-600">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function BarChart({ data, height = 180 }: { data: Array<{ date: string; value: number }>; height?: number }) {
  const width = 700;
  const padding = 20;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = (width - padding * 2) / data.length;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {data.map((d, i) => {
        const h = ((Number(d.value) || 0) / max) * (height - padding * 2);
        const x = padding + i * barW;
        const y = height - padding - h;
        return <rect key={d.date} x={x + 1} y={y} width={Math.max(1, barW - 2)} height={h} className="fill-muted-foreground/30" />;
      })}
    </svg>
  );
}

function StackedBarChart({ data, height = 180 }: { data: Array<{ date: string; orders: number; applications: number; packages: number; total: number }>; height?: number }) {
  const width = 700;
  const padding = 20;
  const max = Math.max(1, ...data.map((d) => Number(d.total || 0)));
  const barW = (width - padding * 2) / Math.max(1, data.length);

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {data.map((d, i) => {
        const total = Number(d.total || 0);
        if (total <= 0) return null;

        const barH = (total / max) * (height - padding * 2);
        const x = padding + i * barW;
        const yBase = height - padding;

        const orders = Number(d.orders || 0);
        const applications = Number(d.applications || 0);
        const packages = Number(d.packages || 0);

        const seg = (v: number) => (total > 0 ? (v / total) * barH : 0);

        const hOrders = seg(orders);
        const hApps = seg(applications);
        const hPackages = seg(packages);

        // 아래에서 위로 쌓기
        const yPackages = yBase - hPackages;
        const yApps = yPackages - hApps;
        const yOrders = yApps - hOrders;

        return (
          <g key={d.date}>
            <rect x={x + 1} y={yOrders} width={Math.max(1, barW - 2)} height={hOrders} className="fill-muted-foreground/20" />
            <rect x={x + 1} y={yApps} width={Math.max(1, barW - 2)} height={hApps} className="fill-muted-foreground/40" />
            <rect x={x + 1} y={yPackages} width={Math.max(1, barW - 2)} height={hPackages} className="fill-muted-foreground/60" />
          </g>
        );
      })}
    </svg>
  );
}

// ----------------------------- UI 컴포넌트 -----------------------------

function KpiCard({ title, value, sub, icon, trend, spark }: { title: string; value: string; sub?: string; icon: ReactNode; trend?: string; spark?: ReactNode }) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-2xl font-bold">{value}</div>
            {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
            {trend ? (
              <div className="mt-2 text-xs">
                <Badge variant="secondary">{trend}</Badge>
              </div>
            ) : null}
          </div>
          {spark ? <div className="hidden sm:block">{spark}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-10/12" />
      <Skeleton className="h-4 w-9/12" />
    </div>
  );
}

// ----------------------------- 메인 -----------------------------

export default function AdminDashboardClient() {
  const { data, error, isLoading, mutate } = useSWR('/api/admin/dashboard/metrics', fetcher, {
    revalidateOnFocus: true,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-40" />
                <Skeleton className="mt-2 h-4 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-2 h-4 w-72" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-44 w-full" />
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <ListSkeleton />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <ListSkeleton />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>대시보드 데이터를 불러오지 못했습니다</CardTitle>
          <CardDescription className="break-all">{String(error?.message || 'Unknown error')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => mutate()}>다시 시도</Button>
        </CardContent>
      </Card>
    );
  }

  const last14RevenueBySource = data.series.dailyRevenueBySource.slice(-14);
  const last14Revenue = last14RevenueBySource.map((d) => ({ date: d.date, value: d.total }));
  const last14Reviews = data.series.dailyReviews.slice(-14);
  const last14Orders = data.series.dailyOrders.slice(-14);
  const last14Apps = data.series.dailyApplications.slice(-14);

  // series.days(기본 30일) 범위 합산값입니다. (엄밀한 '이번 달'과는 다를 수 있음)
  const periodRevenue = data.series.dailyRevenue.reduce((sum, d) => sum + Number(d.value || 0), 0);
  const weekRevenue = data.kpi.orders.revenue7d + data.kpi.applications.revenue7d + data.kpi.packages.revenue7d;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">관리자 대시보드</h1>
          <p className="text-sm text-muted-foreground">
            최근 {data.series.days}일({data.series.fromYmd} ~ {data.series.toYmd}) 기준으로 집계합니다.
            <span className="ml-2 text-xs text-muted-foreground">(갱신: {formatIsoToKstShort(data.generatedAt)})</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => mutate()}>
            새로고침
          </Button>
          <Button asChild>
            <Link href="/admin/orders">주문 관리</Link>
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title={`최근 ${data.series.days}일 매출(결제완료 합산)`}
          value={formatKRW(periodRevenue)}
          sub={`최근 7일 매출: ${formatKRW(weekRevenue)}`}
          icon={<TrendingUp className="h-4 w-4" />}
          trend={`주문AOV(7d): ${formatKRW(data.kpi.orders.aov7d)}`}
          spark={<SparkLine data={data.series.dailyRevenue.slice(-30)} />}
        />
        <KpiCard
          title="주문(7d)"
          value={`${formatNumber(data.kpi.orders.delta7d)}건`}
          sub={`결제완료: ${formatNumber(data.kpi.orders.paid7d)}건`}
          icon={<ShoppingCart className="h-4 w-4" />}
          trend={`송장 대기: ${formatNumber(data.kpi.queue.shippingPending)}건`}
          spark={<SparkLine data={data.series.dailyOrders.slice(-30)} />}
        />
        <KpiCard
          title="교체 서비스 신청(7d)"
          value={`${formatNumber(data.kpi.applications.delta7d)}건`}
          sub={`결제완료: ${formatNumber(data.kpi.applications.paid7d)}건`}
          icon={<Wrench className="h-4 w-4" />}
          trend={`취소 요청: ${formatNumber(data.kpi.queue.cancelRequests)}건`}
          spark={<SparkLine data={data.series.dailyApplications.slice(-30)} />}
        />
        <KpiCard
          title="회원(7d)"
          value={`${formatNumber(data.kpi.users.delta7d)}명`}
          sub={`활성(7d): ${formatNumber(data.kpi.users.active7d)}명`}
          icon={<Users className="h-4 w-4" />}
          trend={`카카오 ${formatNumber(data.kpi.users.byProvider.kakao)} / 네이버 ${formatNumber(data.kpi.users.byProvider.naver)}`}
          spark={<SparkLine data={data.series.dailySignups.slice(-30)} />}
        />
      </div>

      {/* Ops Quick Alerts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">운영 큐</CardTitle>
            <CardDescription className="text-xs">관리자가 지금 바로 처리해야 할 항목들</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                취소 요청
              </span>
              <Badge variant={data.kpi.queue.cancelRequests > 0 ? 'destructive' : 'secondary'}>{formatNumber(data.kpi.queue.cancelRequests)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                송장 등록 대기
              </span>
              <Badge variant={data.kpi.queue.shippingPending > 0 ? 'destructive' : 'secondary'}>{formatNumber(data.kpi.queue.shippingPending)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {/* 미결제 장기건은 운영 누락이 자주 나서 경고 아이콘 사용 */}
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                결제 대기(24h+)
              </span>
              <Badge variant={data.kpi.queue.paymentPending24h > 0 ? 'destructive' : 'secondary'}>{formatNumber(data.kpi.queue.paymentPending24h)}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                대여 연체
              </span>
              <Badge variant={data.kpi.queue.rentalOverdue > 0 ? 'destructive' : 'secondary'}>{formatNumber(data.kpi.queue.rentalOverdue)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
                반납 임박(48h)
              </span>
              <Badge variant={data.kpi.queue.rentalDueSoon > 0 ? 'secondary' : 'outline'}>{formatNumber(data.kpi.queue.rentalDueSoon)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                패스 만료 임박(30d)
              </span>
              <Badge variant={data.kpi.queue.passExpiringSoon > 0 ? 'secondary' : 'outline'}>{formatNumber(data.kpi.queue.passExpiringSoon)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                알림 큐(Outbox)
              </span>
              <Badge variant={data.kpi.queue.outboxQueued > 0 ? 'secondary' : 'outline'}>{formatNumber(data.kpi.queue.outboxQueued)}</Badge>
            </div>
            {/* 교체서비스 장기 미처리(3d+) */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                교체서비스 장기 미처리(3d+)
              </span>
              <Badge variant={data.kpi.queue.stringingAging3d > 0 ? 'destructive' : 'secondary'}>{formatNumber(data.kpi.queue.stringingAging3d)}</Badge>
            </div>

            {/* Outbox 실패 */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                알림 실패(Outbox)
              </span>
              <Badge variant={data.kpi.queue.outboxFailed > 0 ? 'destructive' : 'outline'}>{formatNumber(data.kpi.queue.outboxFailed)}</Badge>
            </div>

            <div className="pt-2 space-y-2">
              <Button size="sm" variant="outline" asChild className="w-full">
                <Link href="/admin/packages?status=활성&sort=expiryDate:asc">패키지 관리</Link>
              </Button>
              <Button size="sm" variant="outline" asChild className="w-full">
                <Link href="/admin/rentals?status=out">대여 관리</Link>
              </Button>
              <Button size="sm" variant="outline" asChild className="w-full">
                <Link href="/admin/notifications">알림 관리</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">재고/상품</CardTitle>
            <CardDescription className="text-xs">재고 이슈를 빠르게 확인합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                재고 부족
              </span>
              <Badge variant={data.kpi.inventory.lowStockProducts > 0 ? 'destructive' : 'secondary'}>{formatNumber(data.kpi.inventory.lowStockProducts)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-muted-foreground" />
                품절
              </span>
              <Badge variant={data.kpi.inventory.outOfStockProducts > 0 ? 'destructive' : 'secondary'}>{formatNumber(data.kpi.inventory.outOfStockProducts)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                비활성 라켓
              </span>
              <Badge variant="outline">{formatNumber(data.kpi.inventory.inactiveRackets)}</Badge>
            </div>
            <div className="pt-2">
              <Button size="sm" variant="outline" asChild className="w-full">
                <Link href="/admin/products?status=low_stock">상품 재고 보기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">포인트(7d)</CardTitle>
            <CardDescription className="text-xs">최근 7일 포인트 증감</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>지급</span>
              <Badge variant="secondary">{formatNumber(data.kpi.points.issued7d)}P</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>사용</span>
              <Badge variant="outline">{formatNumber(data.kpi.points.spent7d)}P</Badge>
            </div>
            <div className="pt-2">
              <Button size="sm" variant="outline" asChild className="w-full">
                <Link href="/admin/users">회원 포인트 관리</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">리뷰</CardTitle>
            <CardDescription className="text-xs">평점/작성량 모니터링</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                평균 평점
              </span>
              <Badge variant="secondary">{(Math.round((data.kpi.reviews.avg || 0) * 10) / 10).toFixed(1)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>리뷰(7d)</span>
              <Badge variant="outline">{formatNumber(data.kpi.reviews.delta7d)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>5점</span>
              <Badge variant="outline">{formatNumber(data.kpi.reviews.five)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>유형</span>
              <div className="flex gap-1">
                <Badge variant="secondary">상품 {formatNumber(data.kpi.reviews.byType.product)}</Badge>
                <Badge variant="outline">서비스 {formatNumber(data.kpi.reviews.byType.service)}</Badge>
              </div>
            </div>
            <div className="pt-2">
              <Button size="sm" variant="outline" asChild className="w-full">
                <Link href="/admin/reviews">리뷰 관리</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">커뮤니티</CardTitle>
            <CardDescription className="text-xs">신고/활동량 모니터링</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>게시글(7d)</span>
              <Badge variant="outline">{formatNumber(data.kpi.community.posts7d)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>댓글(7d)</span>
              <Badge variant="outline">{formatNumber(data.kpi.community.comments7d)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>미처리 신고</span>
              <Badge variant={data.kpi.community.pendingReports > 0 ? 'destructive' : 'secondary'}>{formatNumber(data.kpi.community.pendingReports)}</Badge>
            </div>
            <div className="pt-2">
              <Button size="sm" variant="outline" asChild className="w-full">
                {/* 신고 관리는 게시판 관리(/admin/boards) 내 탭으로 통합 */}
                <Link href="/admin/boards?tab=reports">신고 관리</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>저재고 상품(Top)</CardTitle>
            <CardDescription>stock &lt;= lowStock (재고가 0인 상품은 별도)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.inventoryList.lowStock.length === 0 ? (
              <div className="text-sm text-muted-foreground">저재고 상품이 없습니다.</div>
            ) : (
              data.inventoryList.lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <Link href={`/admin/products/${p.id}/edit`} className="truncate font-medium hover:underline">
                      {p.name || '(이름 없음)'}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground">{p.brand || '-'}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant="destructive">{formatNumber(p.stock)}</Badge>
                    <div className="mt-1 text-[11px] text-muted-foreground">기준: {p.lowStock === null ? '-' : formatNumber(p.lowStock)}</div>
                  </div>
                </div>
              ))
            )}
            <div className="pt-2">
              <Button size="sm" variant="outline" asChild className="w-full">
                <Link href="/admin/products?status=low_stock">저재고 전체 보기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>품절 상품(Top)</CardTitle>
            <CardDescription>stock &lt;= 0</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.inventoryList.outOfStock.length === 0 ? (
              <div className="text-sm text-muted-foreground">품절 상품이 없습니다.</div>
            ) : (
              data.inventoryList.outOfStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <Link href={`/admin/products/${p.id}/edit`} className="truncate font-medium hover:underline">
                      {p.name || '(이름 없음)'}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground">{p.brand || '-'}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant="destructive">{formatNumber(p.stock)}</Badge>
                    <div className="mt-1 text-[11px] text-muted-foreground">재고 0 이하</div>
                  </div>
                </div>
              ))
            )}
            <div className="pt-2">
              <Button size="sm" variant="outline" asChild className="w-full">
                <Link href="/admin/products?status=out_of_stock">품절 전체 보기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Sales (7d) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 판매 상품(7d)</CardTitle>
            <CardDescription>결제완료 주문 · 상품(kind=product) 기준</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.top.products7d.length === 0 ? (
              <div className="text-sm text-muted-foreground">집계 데이터가 없습니다.</div>
            ) : (
              data.top.products7d.map((p) => (
                <div key={p.productId} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <Link href={`/admin/products/${p.productId}/edit`} className="truncate font-medium hover:underline">
                      {p.name || '(이름 없음)'}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground">{p.brand || '-'}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Badge variant="secondary">{formatNumber(p.qty)}개</Badge>
                      <Badge>{formatKRW(p.revenue)}</Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div className="pt-2">
              <Button size="sm" variant="outline" asChild className="w-full">
                <Link href="/admin/orders">주문 목록에서 더 보기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 브랜드(7d)</CardTitle>
            <CardDescription>결제완료 주문 · 상품(kind=product) 기준</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.top.brands7d.length === 0 ? (
              <div className="text-sm text-muted-foreground">집계 데이터가 없습니다.</div>
            ) : (
              data.top.brands7d.map((b) => {
                const hasBrand = Boolean(b.brand && b.brand !== '-');
                const brandHref = hasBrand ? `/admin/products?brand=${encodeURIComponent(b.brand)}` : undefined;
                return (
                  <div key={`${b.brand}-${b.qty}-${b.revenue}`} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      {brandHref ? (
                        <Link href={brandHref} className="truncate font-medium hover:underline">
                          {b.brand}
                        </Link>
                      ) : (
                        <div className="truncate font-medium">{b.brand || '-'}</div>
                      )}
                      <div className="truncate text-xs text-muted-foreground">판매량 · 매출 합산</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Badge variant="secondary">{formatNumber(b.qty)}개</Badge>
                        <Badge>{formatKRW(b.revenue)}</Badge>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div className="pt-2">
              <Button size="sm" variant="outline" asChild className="w-full">
                <Link href="/admin/products">상품 관리로 이동</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 운영 큐 상세 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 취소요청 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">취소 요청(Top)</CardTitle>
            <CardDescription>주문/교체서비스/대여 취소요청을 오래된 순으로 표시</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.queueDetails.cancelRequests.length === 0 ? (
              <div className="text-sm text-muted-foreground">취소 요청이 없습니다.</div>
            ) : (
              data.queueDetails.cancelRequests.map((it) => (
                <div key={`${it.kind}-${it.id}`} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      <Link href={it.href} className="hover:underline">
                        {it.name}
                      </Link>
                      <span className="ml-2 text-xs text-muted-foreground">({it.kind})</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatIsoToKstShort(it.createdAt)} · {it.status}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant="destructive">{formatKRW(it.amount)}</Badge>
                  </div>
                </div>
              ))
            )}
            <div className="pt-2">
              <Button size="sm" variant="outline" asChild className="w-full">
                <Link href="/admin/orders?preset=cancelRequests">관련 목록에서 더 보기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 송장 미등록 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">송장 미등록(Top)</CardTitle>
            <CardDescription className="text-xs">결제완료 + 배송건 + 운송장번호 없음</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.queueDetails.shippingPending.length === 0 ? (
              <div className="text-sm text-muted-foreground">송장 대기 건이 없습니다.</div>
            ) : (
              data.queueDetails.shippingPending.map((it) => (
                <div key={`${it.kind}-${it.id}`} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      <Link href={it.href} className="hover:underline">
                        {it.name}
                      </Link>
                      <span className="ml-2 text-xs text-muted-foreground">({it.kind})</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatIsoToKstShort(it.createdAt)} · {it.status}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge>{formatKRW(it.amount)}</Badge>
                  </div>
                </div>
              ))
            )}
            <div className="pt-2">
              <Button size="sm" variant="outline" asChild className="w-full">
                <Link href="/admin/orders?preset=shippingPending">주문/신청 목록에서 처리</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">결제 대기(24h+ Top)</CardTitle>
            <CardDescription>paymentStatus=결제대기(또는 rental pending) & createdAt ≤ now-24h</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {data.queueDetails.paymentPending24h.length === 0 ? (
              <div className="text-sm text-muted-foreground">24시간 이상 결제 대기 건이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {data.queueDetails.paymentPending24h.map((it) => (
                  <div key={`${it.kind}:${it.id}`} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={it.href} className="text-sm font-medium hover:underline">
                        {it.name || '(이름 없음)'}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {it.kind} · {formatIsoToKstShort(it.createdAt)} · {formatKRW(it.amount)}
                      </div>
                    </div>

                    {/* 경과시간을 강하게 보여주기 */}
                    <Badge variant="destructive">{it.hoursAgo}h</Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-1">
              <Button size="sm" variant="outline" asChild className="w-full">
                <Link href="/admin/orders?preset=paymentPending24h">주문/신청 목록에서 처리</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">대여 연체(Top)</CardTitle>
            <CardDescription className="text-xs">status=out &amp; dueAt &lt; now</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.queueDetails.rentalOverdue.length === 0 ? (
              <div className="text-sm text-muted-foreground">연체 없음</div>
            ) : (
              <div className="space-y-2">
                {data.queueDetails.rentalOverdue.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={r.href} className="text-sm font-medium hover:underline line-clamp-1">
                        {r.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        반납기한: {formatIsoToKstShort(r.dueAt)} · {formatKRW(r.amount)}
                      </div>
                    </div>
                    <Badge variant="destructive" className="shrink-0">
                      {r.overdueDays}일
                    </Badge>
                  </div>
                ))}

                <div className="pt-1">
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/admin/rentals?status=out&due=overdue">대여 관리</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">반납 임박(Top)</CardTitle>
            <CardDescription className="text-xs">status=out &amp; dueAt ∈ [now, now+48h]</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.queueDetails.rentalDueSoon.length === 0 ? (
              <div className="text-sm text-muted-foreground">임박 없음</div>
            ) : (
              <div className="space-y-2">
                {data.queueDetails.rentalDueSoon.map((r) => {
                  // 24시간 이상이면 "N일", 아니면 "N시간"으로 표시
                  const badgeLabel = r.dueInHours >= 24 ? `${Math.ceil(r.dueInHours / 24)}일` : `${r.dueInHours}h`;
                  return (
                    <div key={r.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={r.href} className="text-sm font-medium hover:underline line-clamp-1">
                          {r.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          반납기한: {formatIsoToKstShort(r.dueAt)} · {formatKRW(r.amount)}
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {badgeLabel}
                      </Badge>
                    </div>
                  );
                })}
                <div className="pt-1">
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/admin/rentals?status=out&due=soon">대여 관리</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">패스 만료 임박(Top)</CardTitle>
            <CardDescription className="text-xs">status=active &amp; expiresAt ∈ [now, now+30d]</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.queueDetails.passExpiringSoon.length === 0 ? (
              <div className="text-sm text-muted-foreground">만료 임박 없음</div>
            ) : (
              <div className="space-y-2">
                {data.queueDetails.passExpiringSoon.map((p) => (
                  <div key={p.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={p.href} className="text-sm font-medium hover:underline line-clamp-1">
                        {p.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        만료일: {formatIsoToKstShort(p.expiresAt)} · 잔여 {formatNumber(p.remainingCount)}회
                      </div>
                    </div>
                    <Badge variant={p.daysLeft <= 7 ? 'destructive' : 'secondary'} className="shrink-0">
                      {p.daysLeft}일
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-2">
              <Button size="sm" variant="outline" asChild className="w-full">
                <Link href="/admin/packages?preset=passExpiringSoon">패키지 목록에서 더 보기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        {/* 스트링 장기 미처리 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">스트링 장기 미처리(3d+)</CardTitle>
            <CardDescription>검토/접수/작업 중인데 3일 이상 지난 신청</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.queueDetails.stringingAging.length === 0 ? (
              <div className="text-sm text-muted-foreground">장기 미처리 신청이 없습니다.</div>
            ) : (
              data.queueDetails.stringingAging.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      <Link href={it.href} className="hover:underline">
                        {it.name}
                      </Link>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatIsoToKstShort(it.createdAt)} · {it.status} · {it.ageDays}일 경과
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant="secondary">{formatKRW(it.totalPrice)}</Badge>
                  </div>
                </div>
              ))
            )}
            <div className="pt-2">
              <Button size="sm" variant="outline" asChild className="w-full">
                <Link href="/admin/orders?preset=stringingAging3d">신청 목록에서 더 보기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Outbox backlog */}
        <Card>
          <CardHeader>
            <CardTitle>알림 Outbox 백로그</CardTitle>
            <CardDescription>queued/failed 상태의 알림 작업</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.queueDetails.outboxBacklog.length === 0 ? (
              <div className="text-sm text-muted-foreground">백로그가 없습니다.</div>
            ) : (
              data.queueDetails.outboxBacklog.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{it.eventType}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatIsoToKstShort(it.createdAt)} · {it.status} · {it.to ?? '-'}
                      {it.error ? ` · ${it.error}` : ''}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant={it.status === 'failed' ? 'destructive' : 'secondary'}>retry {it.retries}</Badge>
                  </div>
                </div>
              ))
            )}
            <div className="pt-2">
              <Button size="sm" variant="outline" asChild className="w-full">
                <Link href="/admin/notifications?status=failed">Outbox 관리로 이동</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader>
          <CardTitle>최근 14일 매출 추이(결제완료)</CardTitle>
          <CardDescription>주문 / 교체 서비스 / 패키지 결제완료 금액을 분해해서 봅니다</CardDescription>
        </CardHeader>
        <CardContent>
          <StackedBarChart data={last14RevenueBySource} />
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/20" /> 주문
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/40" /> 교체 서비스
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/60" /> 패키지
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">최근 14일 총 매출: {formatKRW(last14Revenue.reduce((s, d) => s + Number(d.value || 0), 0))}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>최근 14일 리뷰 작성 추이</CardTitle>
          <CardDescription>삭제 제외 기준</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart data={last14Reviews} />
          <div className="mt-2 text-xs text-muted-foreground">
            최근 14일 리뷰: {formatNumber(last14Reviews.reduce((s, d) => s + Number(d.value || 0), 0))}건 · 전체 평균 평점: {(Math.round((data.kpi.reviews.avg || 0) * 10) / 10).toFixed(1)}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>최근 주문</CardTitle>
            <CardDescription>최신 5건</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recent.orders.map((o) => (
              <div key={o.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{o.name}</div>
                  <div className="text-xs text-muted-foreground">{formatIsoToKstShort(o.createdAt)}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="secondary">{o.paymentStatus}</Badge>
                    <Badge variant="outline">{o.status}</Badge>
                  </div>
                </div>
                <div className="shrink-0 text-right text-sm font-semibold">{formatKRW(o.totalPrice)}</div>
              </div>
            ))}
            <Button size="sm" variant="outline" asChild className="w-full">
              <Link href="/admin/orders">주문 전체 보기</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>최근 신청 / 대여 / 신고</CardTitle>
            <CardDescription>최신 5건씩</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <section>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium">교체 서비스 신청</div>
                <Badge variant="outline">{formatNumber(data.kpi.applications.total)}건</Badge>
              </div>
              <div className="space-y-2">
                {data.recent.applications.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{a.name}</div>
                      <div className="text-xs text-muted-foreground">{formatIsoToKstShort(a.createdAt)}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="secondary">{a.paymentStatus}</Badge>
                        <Badge variant="outline">{a.status}</Badge>
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-sm font-semibold">{formatKRW(a.totalPrice)}</div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium">대여</div>
                <Badge variant="outline">{formatNumber(data.kpi.rentals.total)}건</Badge>
              </div>
              <div className="space-y-2">
                {data.recent.rentals.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{formatIsoToKstShort(r.createdAt)}</div>
                      <div className="mt-1">
                        <Badge variant="secondary">{r.status}</Badge>
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-sm font-semibold">{formatKRW(r.total)}</div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium">신고</div>
                <Badge variant={data.kpi.community.pendingReports > 0 ? 'destructive' : 'outline'}>미처리 {formatNumber(data.kpi.community.pendingReports)}</Badge>
              </div>
              <div className="space-y-2">
                {data.recent.reports.map((r) => (
                  <div key={r.id} className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5 shrink-0">
                      {r.kind === 'comment' ? '댓글' : '글'}
                    </Badge>
                    <div className="min-w-0">
                      <div className="truncate text-sm">{r.reason || '(사유 없음)'}</div>
                      <div className="text-xs text-muted-foreground">{formatIsoToKstShort(r.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </CardContent>
        </Card>
      </div>

      {/* Distributions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">주문 상태 분포(이번 달)</CardTitle>
            <CardDescription className="text-xs">status 필드 기준</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.dist.orderStatus.slice(0, 10).map((d) => (
              <div key={d.label} className="flex items-center justify-between text-sm">
                <span className="truncate">{d.label}</span>
                <Badge variant="outline">{formatNumber(d.count)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">결제 상태 분포(이번 달)</CardTitle>
            <CardDescription className="text-xs">paymentStatus 필드 기준</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.dist.orderPaymentStatus.slice(0, 10).map((d) => (
              <div key={d.label} className="flex items-center justify-between text-sm">
                <span className="truncate">{d.label}</span>
                <Badge variant="outline">{formatNumber(d.count)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">신청 상태 분포(이번 달)</CardTitle>
            <CardDescription className="text-xs">stringing_applications.status 기준</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.dist.applicationStatus.slice(0, 10).map((d) => (
              <div key={d.label} className="flex items-center justify-between text-sm">
                <span className="truncate">{d.label}</span>
                <Badge variant="outline">{formatNumber(d.count)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
