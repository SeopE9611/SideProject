"use client";

import { Badge } from "@/components/ui/badge";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";

type PassItem = {
  id: string;
  packageSize: number;
  usedCount: number;
  remainingCount: number;
  status:
    | "active"
    | "expired"
    | "suspended"
    | "paused"
    | "cancelled"
    | "pending_payment"
    | "pending_activation";
  purchasedAt: string;
  expiresAt: string | null;
  planId?: string | null;
  planTitle?: string | null;
  isExpiringSoon: boolean;
  recentUsages: {
    applicationId: string | null;
    usedAt: string;
    reverted: boolean;
  }[];
  source?: "pass" | "order";
  paymentStatus?: string;
};

type Res = { items: PassItem[] };

const fetcher = (url: string) => authenticatedSWRFetcher<Res>(url);

export default function PassList() {
  const { data, isLoading, error, mutate } = useSWR<Res>(
    "/api/passes/me",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  const isInitialLoading = isLoading;

  if (!isInitialLoading && (error || !data)) {
    return (
      <Card className="border-0 shadow-2xl">
        <CardHeader>
          <CardTitle>패키지 이용권</CardTitle>
          <CardDescription>보유 중인 교체 서비스 패키지 목록</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">
            이용권 정보를 불러오는 중 오류가 발생했습니다.
          </p>
          <Button onClick={() => mutate()} variant="outline" className="mt-3">
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  const items = data?.items ?? [];
  const activeItems = items.filter((p) => p.status === "active");
  const waitingItems = items.filter((p) =>
    ["pending_payment", "pending_activation", "suspended", "paused"].includes(
      p.status,
    ),
  );
  const historyItems = items.filter((p) =>
    ["expired", "cancelled"].includes(p.status),
  );

  const hasNoHistory = !isInitialLoading && items.length === 0;

  const statusLabel = (status: PassItem["status"]) => {
    if (status === "active") return "사용 가능";
    if (status === "pending_payment") return "입금 확인 중";
    if (status === "pending_activation") return "활성화 대기";
    if (status === "suspended" || status === "paused") return "일시정지";
    if (status === "expired") return "만료";
    if (status === "cancelled") return "취소";
    return status;
  };

  const statusBadge = (p: PassItem) => {
    if (p.status === "active")
      return p.isExpiringSoon ? (
        <Badge variant="destructive">만료 임박</Badge>
      ) : (
        <Badge>{statusLabel(p.status)}</Badge>
      );
    if (p.status === "pending_payment")
      return <Badge variant="secondary">{statusLabel(p.status)}</Badge>;
    if (p.status === "pending_activation")
      return <Badge variant="outline">{statusLabel(p.status)}</Badge>;
    if (p.status === "suspended" || p.status === "paused")
      return <Badge variant="secondary">{statusLabel(p.status)}</Badge>;
    if (p.status === "expired")
      return <Badge variant="outline">{statusLabel(p.status)}</Badge>;
    return <Badge variant="outline">{statusLabel(p.status)}</Badge>;
  };

  const renderCard = (p: PassItem) => {
    const remainPct =
      p.packageSize > 0
        ? Math.max(0, Math.min(100, (p.remainingCount / p.packageSize) * 100))
        : 0;
    const dday =
      now && p.expiresAt
        ? Math.ceil((new Date(p.expiresAt).getTime() - now) / 86400000)
        : null;

    return (
      <div
        key={p.id}
        className="bg-card p-3 shadow-sm ring-1 ring-border/70 dark:ring-border/70"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary dark:bg-primary/20">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">
                {p.planTitle ?? "교체 서비스 패키지"} {p.packageSize}회권
              </div>
              <div className="text-sm text-muted-foreground">
                구매일 {new Date(p.purchasedAt).toLocaleDateString()}
              </div>
              {/* 대기/종료 상태에서 오해를 줄이기 위한 안내 문구 */}
              {p.status === "pending_activation" && (
                <div className="text-sm text-muted-foreground">
                  구매하신 패키지는 현재 활성화 대기 중입니다. 처리 완료 후 사용
                  가능한 상태로 표시됩니다.
                </div>
              )}
              {p.status === "pending_payment" && (
                <div className="text-sm text-muted-foreground">
                  구매하신 패키지가 입금 확인 중입니다.
                </div>
              )}
              {(p.status === "expired" || p.status === "cancelled") && (
                <div className="text-sm text-muted-foreground">
                  현재는 사용이 종료된 패키지입니다.
                </div>
              )}
              {p.status === "active" && p.expiresAt && (
                <div className="text-sm text-muted-foreground">
                  만료일 {new Date(p.expiresAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge(p)}
            {p.expiresAt && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {dday === null ? "계산중" : dday >= 0 ? `D-${dday}` : `만료됨`}
              </div>
            )}
          </div>
        </div>

        {p.status === "active" && (
          <>
            <div className="mt-4">
              <div className="h-2 w-full rounded-full bg-muted/80 dark:bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${remainPct}%` }}
                />
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                사용 {p.usedCount} / 총 {p.packageSize} · 잔여{" "}
                {p.remainingCount}
              </div>
            </div>

            {p.recentUsages?.length > 0 && (
              <div className="mt-3 text-sm text-muted-foreground">
                최근 사용{" "}
                {p.recentUsages.slice(-3).map((u, idx) => (
                  <span key={idx} className="mr-2">
                    {new Date(u.usedAt).toLocaleDateString()}
                    {u.reverted ? " (복원)" : ""}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <Card className="border-0">
      <CardContent className="space-y-4">
        {isInitialLoading ? (
          <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            패키지 이용권 정보를 불러오는 중입니다...
          </div>
        ) : null}
        {hasNoHistory && (
          <div className="flex flex-col items-center justify-center py-12 bp-sm:py-16 px-4">
            <div className="bg-muted/50 rounded-full p-4 mb-4">
              <Ticket className="h-8 w-8 bp-sm:h-10 bp-sm:w-10 text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-center mb-1">
              보유 중인 패키지 이용권이 없습니다.
            </p>
            <p className="text-sm text-muted-foreground text-center">
              패키지를 구매하고 활성화 시 여기에 표시됩니다
            </p>
          </div>
        )}
        {activeItems.map(renderCard)}
        {activeItems.length === 0 && waitingItems.map(renderCard)}
        {activeItems.length === 0 &&
          waitingItems.length === 0 &&
          historyItems.map(renderCard)}
      </CardContent>
    </Card>
  );
}
