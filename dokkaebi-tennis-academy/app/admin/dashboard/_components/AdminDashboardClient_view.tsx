'use client';

/** Responsibility: 관리자 대시보드 화면 표현 + 상호작용 오케스트레이션 뷰. */

import { type ReactNode } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Activity, AlertTriangle, Bell, Boxes, ClipboardList, Package, ShoppingCart, Star, TrendingUp, Users, Wrench } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardMetrics } from '@/types/admin/dashboard';
import { formatAdminKRW, formatAdminNumber, formatIsoToKstShort } from '@/lib/admin/formatters';
import { labelOrderStatus, labelPaymentStatus, labelStringingStatus } from '@/lib/admin/status-labels';

// ----------------------------- 타입 -----------------------------

// ----------------------------- 유틸 -----------------------------

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return (await res.json()) as DashboardMetrics;
};

// ----------------------------- 상태 라벨(표시용) -----------------------------
// DB 값은 그대로 두고, 화면에서만 "pending" 같은 레거시 영문 상태를 한글로 정리
// ----------------------------- 그래프(가벼운 SVG) -----------------------------

function SparkLine({ data, height = 56 }: { data: Array<{ date: string; value: number }>; height?: number }) {
  const width = 220;
  const padding = 6;

  // 데이터가 비어있거나 1개뿐이면 2포인트로 보정해서 차트 깨짐 방지
  const safeData =
    data.length >= 2
      ? data
      : data.length === 1
        ? [data[0], data[0]]
        : [
            { date: '', value: 0 },
            { date: '', value: 0 },
          ];

  const values = safeData.map((d) => d.value);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);

  const toX = (i: number) => padding + (i * (width - padding * 2)) / Math.max(1, safeData.length - 1);
  const toY = (v: number) => height - padding - ((v - min) * (height - padding * 2)) / Math.max(1, max - min);

  const d = safeData.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(2)} ${toY(p.value).toFixed(2)}`).join(' ');

  const firstX = toX(0).toFixed(2);
  const lastX = toX(safeData.length - 1).toFixed(2);
  const baseY = (height - padding).toFixed(2);
  const areaD = `${d} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="text-primary">
      <path d={areaD} fill="currentColor" fillOpacity="0.12" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarChart({ data, height = 180 }: { data: Array<{ date: string; value: number }>; height?: number }) {
  if (!data || data.length === 0) {
    return <div className="py-12 text-center text-sm text-muted-foreground">집계 데이터가 없습니다</div>;
  }

  const width = 700;
  const padding = 20;
  const max = Math.max(1, ...data.map((d) => Number(d.value || 0)));
  const barW = (width - padding * 2) / data.length;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {data.map((d, i) => {
        const h = (Number(d.value || 0) / max) * (height - padding * 2);
        const x = padding + i * barW;
        const y = height - padding - h;
        return <rect key={`${d.date}-${i}`} x={x + 1} y={y} width={Math.max(1, barW - 2)} height={h} rx="3" className="fill-primary/20 transition-all hover:fill-primary/30" />;
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
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
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
            <rect x={x + 1} y={yOrders} width={Math.max(1, barW - 2)} height={hOrders} rx="3" className="fill-primary/70" />
            <rect x={x + 1} y={yApps} width={Math.max(1, barW - 2)} height={hApps} rx="3" className="fill-warning/70" />
            <rect x={x + 1} y={yPackages} width={Math.max(1, barW - 2)} height={hPackages} rx="3" className="fill-muted-foreground/50" />
          </g>
        );
      })}
    </svg>
  );
}

// ----------------------------- UI 컴포넌트 -----------------------------

function KpiCard({ title, value, sub, icon, trend, spark }: { title: string; value: string; sub?: string; icon: ReactNode; trend?: string; spark?: ReactNode }) {
  return (
    <Card className="group relative overflow-hidden border-border/40 bg-card/50 backdrop-blur transition-all hover:border-border/60 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="rounded-lg bg-primary/10 p-2 text-primary transition-colors group-hover:bg-primary/15">{icon}</div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
        <div className="flex items-end justify-between gap-3">
          {trend && (
            <Badge variant="secondary" className="text-xs font-normal">
              {trend}
            </Badge>
          )}
          {spark && <div className="ml-auto hidden lg:block">{spark}</div>}
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
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>

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
    <div className="space-y-8 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">관리자 대시보드</h1>
          <p className="text-sm text-muted-foreground">
            최근 {data.series.days}일 데이터 · {data.series.fromYmd} ~ {data.series.toYmd}
          </p>
        </div>
        <Button variant="outline" onClick={() => mutate()} className="shrink-0">
          <Activity className="mr-2 h-4 w-4" />
          새로고침
        </Button>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">핵심 지표</h2>
          <p className="text-sm text-muted-foreground">주요 비즈니스 메트릭</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="총 매출"
            value={formatAdminKRW(periodRevenue)}
            sub={`최근 7일: ${formatAdminKRW(weekRevenue)}`}
            icon={<TrendingUp className="h-5 w-5" />}
            trend={`평균 ${formatAdminKRW(data.kpi.orders.aov7d)}`}
            spark={<SparkLine data={data.series.dailyRevenue.slice(-30)} />}
          />
          <KpiCard
            title="주문"
            value={`${formatAdminNumber(data.kpi.orders.delta7d)}건`}
            sub={`결제완료 ${formatAdminNumber(data.kpi.orders.paid7d)}건`}
            icon={<ShoppingCart className="h-5 w-5" />}
            spark={<SparkLine data={data.series.dailyOrders.slice(-30)} />}
          />
          <KpiCard
            title="교체 서비스"
            value={`${formatAdminNumber(data.kpi.applications.delta7d)}건`}
            sub={`결제완료 ${formatAdminNumber(data.kpi.applications.paid7d)}건`}
            icon={<Wrench className="h-5 w-5" />}
            spark={<SparkLine data={data.series.dailyApplications.slice(-30)} />}
          />
          <KpiCard title="신규 회원" value={`${formatAdminNumber(data.kpi.users.delta7d)}명`} sub={`활성 ${formatAdminNumber(data.kpi.users.active7d)}명`} icon={<Users className="h-5 w-5" />} spark={<SparkLine data={data.series.dailySignups.slice(-30)} />} />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">즉시 처리 필요</h2>
          <p className="text-sm text-muted-foreground">긴급 대응이 필요한 항목</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-destructive/40 bg-destructive/10 dark:border-destructive/40 dark:bg-destructive/15">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <div className="rounded-full bg-destructive/10 p-1.5 dark:bg-destructive/15">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                긴급 처리
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2">
                <span className="text-sm">취소 요청</span>
                <Badge variant={data.kpi.queue.cancelRequests > 0 ? 'destructive' : 'secondary'}>{formatAdminNumber(data.kpi.queue.cancelRequests)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2">
                <span className="text-sm">결제 대기 24h+</span>
                <Badge variant={data.kpi.queue.paymentPending24h > 0 ? 'destructive' : 'secondary'}>{formatAdminNumber(data.kpi.queue.paymentPending24h)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2">
                <span className="text-sm">대여 연체</span>
                <Badge variant={data.kpi.queue.rentalOverdue > 0 ? 'destructive' : 'secondary'}>{formatAdminNumber(data.kpi.queue.rentalOverdue)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2">
                <span className="text-sm">교체 3일+</span>
                <Badge variant={data.kpi.queue.stringingAging3d > 0 ? 'destructive' : 'secondary'}>{formatAdminNumber(data.kpi.queue.stringingAging3d)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2">
                <span className="text-sm">지난달 정산 스냅샷</span>
                <Badge variant={!data.settlements.hasPrevSnapshot ? 'destructive' : 'secondary'}>{!data.settlements.hasPrevSnapshot ? '미생성' : 'OK'}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur transition-all hover:border-border/60 hover:shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <div className="rounded-full bg-primary/10 p-1.5">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                배송 관리
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm">송장 등록 대기</span>
                <Badge variant={data.kpi.queue.shippingPending > 0 ? 'default' : 'outline'}>{formatAdminNumber(data.kpi.queue.shippingPending)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm">반납 임박 48h</span>
                <Badge variant={data.kpi.queue.rentalDueSoon > 0 ? 'default' : 'outline'}>{formatAdminNumber(data.kpi.queue.rentalDueSoon)}</Badge>
              </div>
              <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                <Link href="/admin/orders?preset=shippingPending">관리하기</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur transition-all hover:border-border/60 hover:shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <div className="rounded-full bg-primary/10 p-1.5">
                  <Boxes className="h-4 w-4 text-primary" />
                </div>
                재고 현황
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm">재고 부족</span>
                <Badge variant={data.kpi.inventory.lowStockProducts > 0 ? 'destructive' : 'outline'}>{formatAdminNumber(data.kpi.inventory.lowStockProducts)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm">품절</span>
                <Badge variant={data.kpi.inventory.outOfStockProducts > 0 ? 'destructive' : 'outline'}>{formatAdminNumber(data.kpi.inventory.outOfStockProducts)}</Badge>
              </div>
              <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                <Link href="/admin/products?status=low_stock">재고 관리</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur transition-all hover:border-border/60 hover:shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <div className="rounded-full bg-primary/10 p-1.5">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                시스템 알림
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm">알림 큐</span>
                <Badge variant={data.kpi.queue.outboxQueued > 0 ? 'default' : 'outline'}>{formatAdminNumber(data.kpi.queue.outboxQueued)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm">알림 실패</span>
                <Badge variant={data.kpi.queue.outboxFailed > 0 ? 'destructive' : 'outline'}>{formatAdminNumber(data.kpi.queue.outboxFailed)}</Badge>
              </div>
              <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                <Link href="/admin/notifications">알림 관리</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">매출 분석</h2>
          <p className="text-sm text-muted-foreground">수익 트렌드 및 인기 상품</p>
        </div>

        <Card className="border-border/40 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">최근 14일 매출 추이</CardTitle>
            <CardDescription>주문, 교체 서비스, 패키지 결제완료 금액</CardDescription>
          </CardHeader>
          <CardContent>
            <StackedBarChart data={last14RevenueBySource} />
            <div className="mt-6 flex flex-wrap items-center gap-6 rounded-lg bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm bg-primary" />
                <span className="text-xs font-medium text-primary">주문</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm bg-warning" />
                <span className="text-xs font-medium text-warning">교체 서비스</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm bg-muted-foreground/60" />
                <span className="text-xs font-medium text-muted-foreground">패키지</span>
              </div>
              <div className="ml-auto text-sm font-semibold">총 {formatAdminKRW(last14Revenue.reduce((s, d) => s + Number(d.value || 0), 0))}</div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">인기 상품 Top 5</CardTitle>
              <CardDescription>최근 7일 결제완료 기준</CardDescription>
            </CardHeader>
            <CardContent>
              {data.top.products7d.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">집계 데이터가 없습니다</div>
              ) : (
                <div className="space-y-3">
                  {data.top.products7d.map((p, idx) => (
                    <div key={p.productId} className="group flex items-center gap-4 rounded-lg bg-muted/30 p-3 transition-all hover:bg-muted/50">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{idx + 1}</div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/products/${p.productId}/edit`} className="block truncate text-sm font-semibold group-hover:underline">
                          {p.name || '(이름 없음)'}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">{p.brand || '-'}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {formatAdminNumber(p.qty)}개
                        </Badge>
                        <span className="text-xs font-semibold">{formatAdminKRW(p.revenue)}</span>
                      </div>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" asChild className="mt-4 w-full bg-transparent">
                    <Link href="/admin/orders">전체 주문 보기</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">인기 브랜드 Top 5</CardTitle>
              <CardDescription>최근 7일 결제완료 기준</CardDescription>
            </CardHeader>
            <CardContent>
              {data.top.brands7d.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">집계 데이터가 없습니다</div>
              ) : (
                <div className="space-y-3">
                  {data.top.brands7d.map((b, idx) => {
                    const hasBrand = Boolean(b.brand && b.brand !== '-');
                    const brandHref = hasBrand ? `/admin/products?brand=${encodeURIComponent(b.brand)}` : undefined;
                    return (
                      <div key={`${b.brand}-${b.qty}-${b.revenue}`} className="group flex items-center gap-4 rounded-lg bg-muted/30 p-3 transition-all hover:bg-muted/50">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{idx + 1}</div>
                        <div className="min-w-0 flex-1">
                          {brandHref ? (
                            <Link href={brandHref} className="block truncate text-sm font-semibold group-hover:underline">
                              {b.brand}
                            </Link>
                          ) : (
                            <div className="truncate text-sm font-semibold">{b.brand || '-'}</div>
                          )}
                          <p className="text-xs text-muted-foreground">판매량 및 매출</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {formatAdminNumber(b.qty)}개
                          </Badge>
                          <span className="text-xs font-semibold">{formatAdminKRW(b.revenue)}</span>
                        </div>
                      </div>
                    );
                  })}
                  <Button size="sm" variant="outline" asChild className="mt-4 w-full bg-transparent">
                    <Link href="/admin/products">상품 관리</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">상세 처리 대기 목록</h2>
          <p className="text-sm text-muted-foreground">즉시 확인이 필요한 항목 상세</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">취소 요청</CardTitle>
              <CardDescription>주문/교체 서비스/대여 취소 요청</CardDescription>
            </CardHeader>
            <CardContent>
              {data.queueDetails.cancelRequests.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">취소 요청이 없습니다</div>
              ) : (
                <div className="space-y-3">
                  {data.queueDetails.cancelRequests.slice(0, 5).map((it) => (
                    <div key={`${it.kind}-${it.id}`} className="group flex items-start gap-3 rounded-lg border border-border/40 bg-background/60 p-3 transition-all hover:border-border/80 hover:shadow-sm">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link href={it.href} className="block truncate text-sm font-medium group-hover:underline">
                          {it.name}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {it.kind}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatIsoToKstShort(it.createdAt)}</span>
                        </div>
                      </div>
                      <Badge variant="destructive" className="shrink-0">
                        {formatAdminKRW(it.amount)}
                      </Badge>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                    <Link href="/admin/orders?preset=cancelRequests">전체 보기</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">송장 등록 대기</CardTitle>
              <CardDescription>결제완료 후 운송장 번호 미등록</CardDescription>
            </CardHeader>
            <CardContent>
              {data.queueDetails.shippingPending.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">대기 건이 없습니다</div>
              ) : (
                <div className="space-y-3">
                  {data.queueDetails.shippingPending.slice(0, 5).map((it) => (
                    <div key={`${it.kind}-${it.id}`} className="group flex items-start gap-3 rounded-lg border border-border/40 bg-background/60 p-3 transition-all hover:border-border/80 hover:shadow-sm">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link href={it.href} className="block truncate text-sm font-medium group-hover:underline">
                          {it.name}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {it.kind}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatIsoToKstShort(it.createdAt)}</span>
                        </div>
                      </div>
                      <Badge className="shrink-0">{formatAdminKRW(it.amount)}</Badge>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                    <Link href="/admin/orders?preset=shippingPending">전체 보기</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">결제 대기 24시간+</CardTitle>
              <CardDescription>장기 미결제 건</CardDescription>
            </CardHeader>
            <CardContent>
              {data.queueDetails.paymentPending24h.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">장기 미결제 건이 없습니다</div>
              ) : (
                <div className="space-y-3">
                  {data.queueDetails.paymentPending24h.slice(0, 5).map((it) => (
                    <div key={`${it.kind}:${it.id}`} className="group flex items-start gap-3 rounded-lg border border-border/40 bg-background/60 p-3 transition-all hover:border-border/80 hover:shadow-sm">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link href={it.href} className="block truncate text-sm font-medium group-hover:underline">
                          {it.name || '(이름 없음)'}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {it.kind}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatIsoToKstShort(it.createdAt)}</span>
                        </div>
                      </div>
                      <Badge variant="destructive" className="shrink-0">
                        {it.hoursAgo}h
                      </Badge>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                    <Link href="/admin/orders?preset=paymentPending24h">전체 보기</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">교체 서비스 장기 미처리</CardTitle>
              <CardDescription>3일 이상 지연된 신청</CardDescription>
            </CardHeader>
            <CardContent>
              {data.queueDetails.stringingAging.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">장기 미처리 신청이 없습니다</div>
              ) : (
                <div className="space-y-3">
                  {data.queueDetails.stringingAging.slice(0, 5).map((it) => (
                    <div key={it.id} className="group flex items-start gap-3 rounded-lg border border-border/40 bg-background/60 p-3 transition-all hover:border-border/80 hover:shadow-sm">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link href={it.href} className="block truncate text-sm font-medium group-hover:underline">
                          {it.name}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {labelStringingStatus(it.status)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{it.ageDays}일 경과</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {formatAdminKRW(it.totalPrice)}
                      </Badge>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                    <Link href="/admin/orders?preset=stringingAging3d">전체 보기</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">대여 연체</CardTitle>
              <CardDescription>반납 기한 초과</CardDescription>
            </CardHeader>
            <CardContent>
              {data.queueDetails.rentalOverdue.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">연체 건이 없습니다</div>
              ) : (
                <div className="space-y-3">
                  {data.queueDetails.rentalOverdue.slice(0, 5).map((r) => (
                    <div key={r.id} className="group flex items-start gap-3 rounded-lg border border-border/40 bg-background/60 p-3 transition-all hover:border-border/80 hover:shadow-sm">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link href={r.href} className="block truncate text-sm font-medium group-hover:underline">
                          {r.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">반납 기한: {formatIsoToKstShort(r.dueAt)}</p>
                      </div>
                      <Badge variant="destructive" className="shrink-0">
                        {r.overdueDays}일
                      </Badge>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                    <Link href="/admin/rentals?status=out&due=overdue">전체 보기</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">반납 임박</CardTitle>
              <CardDescription>48시간 이내 반납 예정</CardDescription>
            </CardHeader>
            <CardContent>
              {data.queueDetails.rentalDueSoon.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">임박 건이 없습니다</div>
              ) : (
                <div className="space-y-3">
                  {data.queueDetails.rentalDueSoon.slice(0, 5).map((r) => {
                    const badgeLabel = r.dueInHours >= 24 ? `${Math.ceil(r.dueInHours / 24)}일` : `${r.dueInHours}시간`;
                    return (
                      <div key={r.id} className="group flex items-start gap-3 rounded-lg border border-border/40 bg-background/60 p-3 transition-all hover:border-border/80 hover:shadow-sm">
                        <div className="min-w-0 flex-1 space-y-1">
                          <Link href={r.href} className="block truncate text-sm font-medium group-hover:underline">
                            {r.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">반납 기한: {formatIsoToKstShort(r.dueAt)}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {badgeLabel}
                        </Badge>
                      </div>
                    );
                  })}
                  <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                    <Link href="/admin/rentals?status=out&due=soon">전체 보기</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">추가 지표</h2>
          <p className="text-sm text-muted-foreground">리뷰, 포인트, 커뮤니티 활동</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">리뷰 현황</CardTitle>
                <div className="rounded-lg bg-muted p-2 dark:bg-muted">
                  <Star className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-sm">평균 평점</span>
                <Badge variant="secondary" className="text-base font-bold">
                  {(Math.round((data.kpi.reviews.avg || 0) * 10) / 10).toFixed(1)}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-sm">리뷰 7일</span>
                <Badge variant="outline">{formatAdminNumber(data.kpi.reviews.delta7d)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-sm">5점 리뷰</span>
                <Badge variant="outline">{formatAdminNumber(data.kpi.reviews.five)}</Badge>
              </div>
              <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                <Link href="/admin/reviews">리뷰 관리</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">포인트 7일</CardTitle>
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary dark:bg-primary/20">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-sm">지급</span>
                <Badge variant="secondary">{formatAdminNumber(data.kpi.points.issued7d)}P</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-sm">사용</span>
                <Badge variant="outline">{formatAdminNumber(data.kpi.points.spent7d)}P</Badge>
              </div>
              <Button size="sm" variant="outline" asChild className="mt-4 w-full bg-transparent">
                <Link href="/admin/users">회원 관리</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">커뮤니티</CardTitle>
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary dark:bg-primary/20">
                  <ClipboardList className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-sm">게시글 7일</span>
                <Badge variant="outline">{formatAdminNumber(data.kpi.community.posts7d)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-sm">댓글 7일</span>
                <Badge variant="outline">{formatAdminNumber(data.kpi.community.comments7d)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-sm">미처리 신고</span>
                <Badge variant={data.kpi.community.pendingReports > 0 ? 'destructive' : 'secondary'}>{formatAdminNumber(data.kpi.community.pendingReports)}</Badge>
              </div>
              <Button size="sm" variant="outline" asChild className="w-full bg-transparent">
                <Link href="/admin/boards?tab=reports">신고 관리</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">재고 관리</h2>
          <p className="text-sm text-muted-foreground">재고 부족 및 품절 상품</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">저재고 상품</CardTitle>
              <CardDescription>재고가 기준치 이하인 상품</CardDescription>
            </CardHeader>
            <CardContent>
              {data.inventoryList.lowStock.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">저재고 상품이 없습니다</div>
              ) : (
                <div className="space-y-3">
                  {data.inventoryList.lowStock.map((p) => (
                    <div key={p.id} className="group flex items-center gap-3 rounded-lg border border-border/40 bg-background/60 p-3 transition-all hover:border-border/80 hover:shadow-sm">
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/products/${p.id}/edit`} className="block truncate text-sm font-medium group-hover:underline">
                          {p.name || '(이름 없음)'}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">{p.brand || '-'}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge variant="destructive">{formatAdminNumber(p.stock)}개</Badge>
                        <p className="mt-1 text-xs text-muted-foreground">기준: {p.lowStock === null ? '-' : formatAdminNumber(p.lowStock)}</p>
                      </div>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                    <Link href="/admin/products?status=low_stock">전체 보기</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">품절 상품</CardTitle>
              <CardDescription>재고가 0 이하인 상품</CardDescription>
            </CardHeader>
            <CardContent>
              {data.inventoryList.outOfStock.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">품절 상품이 없습니다</div>
              ) : (
                <div className="space-y-3">
                  {data.inventoryList.outOfStock.map((p) => (
                    <div key={p.id} className="group flex items-center gap-3 rounded-lg border border-border/40 bg-background/60 p-3 transition-all hover:border-border/80 hover:shadow-sm">
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/products/${p.id}/edit`} className="block truncate text-sm font-medium group-hover:underline">
                          {p.name || '(이름 없음)'}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">{p.brand || '-'}</p>
                      </div>
                      <Badge variant="destructive">{formatAdminNumber(p.stock)}개</Badge>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                    <Link href="/admin/products?status=out_of_stock">전체 보기</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">최근 활동</h2>
          <p className="text-sm text-muted-foreground">최신 주문 및 교체 서비스 내역</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">최근 주문</CardTitle>
              <CardDescription>최신 5건</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recent.orders.map((o) => (
                  <Link key={o.id} href={`/admin/orders/${o.id}`} className="group flex items-start gap-3 rounded-lg border border-border/40 bg-background/60 p-3 transition-all hover:border-border/80 hover:shadow-sm">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-medium">{o.name}</p>
                      <p className="text-xs text-muted-foreground">{formatIsoToKstShort(o.createdAt)}</p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {labelPaymentStatus(o.paymentStatus)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {labelOrderStatus(o.status)}
                        </Badge>
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold">{formatAdminKRW(o.totalPrice)}</div>
                  </Link>
                ))}
                <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                  <Link href="/admin/orders">전체 주문 보기</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">최근 교체 서비스</CardTitle>
              <CardDescription>최신 5건</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recent.applications.map((a) => (
                  <Link key={a.id} href={`/admin/applications/stringing/${a.id}`} className="group flex items-start gap-3 rounded-lg border border-border/40 bg-background/60 p-3 transition-all hover:border-border/80 hover:shadow-sm">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{formatIsoToKstShort(a.createdAt)}</p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {labelPaymentStatus(a.paymentStatus)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {labelStringingStatus(a.status)}
                        </Badge>
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold">{formatAdminKRW(a.totalPrice)}</div>
                  </Link>
                ))}
                <Button size="sm" variant="outline" asChild className="mt-2 w-full bg-transparent">
                  <Link href="/admin/applications/stringing">전체 신청 보기</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">리뷰 추이</h2>
          <p className="text-sm text-muted-foreground">최근 14일 리뷰 작성 현황</p>
        </div>
        <Card className="border-border/40 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">최근 14일 리뷰 작성 추이</CardTitle>
            <CardDescription>삭제 제외 기준</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={last14Reviews} />
            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg bg-muted/30 px-4 py-3 text-sm">
              <span className="font-medium">
                최근 14일: <span className="text-primary">{formatAdminNumber(last14Reviews.reduce((s, d) => s + Number(d.value || 0), 0))}건</span>
              </span>
              <span className="font-medium">
                전체 평균: <span className="text-primary">{(Math.round((data.kpi.reviews.avg || 0) * 10) / 10).toFixed(1)}점</span>
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">상태 분포</h2>
          <p className="text-sm text-muted-foreground">주문, 결제, 교체 서비스 상태별 분포</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">주문 상태</CardTitle>
              <CardDescription>최근 {data.series.days}일 기준</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.dist.orderStatus.slice(0, 8).map((d) => (
                  <div key={d.label} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    <span className="truncate">{labelOrderStatus(d.label)}</span>
                    <Badge variant="outline">{formatAdminNumber(d.count)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">결제 상태</CardTitle>
              <CardDescription>최근 {data.series.days}일 기준</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.dist.orderPaymentStatus.slice(0, 8).map((d) => (
                  <div key={d.label} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    <span className="truncate">{labelPaymentStatus(d.label)}</span>
                    <Badge variant="outline">{formatAdminNumber(d.count)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">교체 서비스 상태</CardTitle>
              <CardDescription>최근 {data.series.days}일 기준</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.dist.applicationStatus.slice(0, 8).map((d) => (
                  <div key={d.label} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    <span className="truncate">{labelStringingStatus(d.label)}</span>
                    <Badge variant="outline">{formatAdminNumber(d.count)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
