"use client";

import { Badge } from "@/components/ui/badge";
import AsyncState from "@/components/system/AsyncState";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { Card, CardContent } from "@/components/ui/card";
import PassListSkeleton from "@/app/mypage/tabs/PassListSkeleton";
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
    | "ended"
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
  recentUsages: { applicationId: string | null; usedAt: string; reverted: boolean }[];
  source?: "pass" | "order";
  paymentStatus?: string;
};
type Res = { items: PassItem[] };
const fetcher = (url: string) => authenticatedSWRFetcher<Res>(url);

const statusLabel = (status: PassItem["status"]) =>
  ({
    active: "사용 가능",
    pending_payment: "입금 확인 중",
    pending_activation: "활성화 대기",
    suspended: "일시정지",
    paused: "일시정지",
    ended: "종료",
    expired: "만료",
    cancelled: "취소",
  })[status];
const statusDescription = (passItem: PassItem) => {
  if (passItem.status === "pending_activation")
    return "처리 완료 후 사용 가능한 상태로 표시됩니다.";
  if (passItem.status === "pending_payment") return "입금 확인이 완료되면 이용권이 활성화됩니다.";
  if (passItem.status === "suspended" || passItem.status === "paused")
    return "현재 이용이 잠시 중지된 이용권입니다.";
  if (passItem.status !== "active") return "현재는 사용할 수 없는 이용권입니다.";
  return passItem.expiresAt
    ? `만료일 ${new Date(passItem.expiresAt).toLocaleDateString()}`
    : "만료일 없이 사용할 수 있습니다.";
};

export default function PassList() {
  const { data, isLoading, error, mutate } = useSWR<Res>("/api/passes/me", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  const [now, setNow] = useState(0);
  useEffect(() => setNow(Date.now()), []);
  if (!isLoading && (error || !data))
    return (
      <AsyncState
        kind="error"
        variant="card"
        resourceName="패키지권 정보"
        onAction={() => mutate()}
      />
    );
  const items = data?.items ?? [];
  const groups = [
    items.filter((item) => item.status === "active"),
    items.filter((item) =>
      ["pending_payment", "pending_activation", "suspended", "paused"].includes(item.status),
    ),
    items.filter((item) => ["ended", "expired", "cancelled"].includes(item.status)),
  ];
  const visibleItems = groups.find((group) => group.length > 0) ?? [];

  return (
    <Card className="rounded-panel border-border/80 bg-transparent shadow-none">
      <CardContent className="space-y-4 p-0">
        {isLoading ? <PassListSkeleton /> : null}
        {!isLoading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-panel border border-border/80 bg-muted/25 px-4 py-14 text-center shadow-soft">
            <span className="rounded-control bg-brand-muted p-4 text-brand-highlight-ink">
              <Ticket className="h-8 w-8" aria-hidden="true" />
            </span>
            <p className="mt-4 font-ui-bold text-ui-section-title text-foreground">
              보유 중인 이용권이 없습니다
            </p>
            <p className="mt-1 break-keep text-ui-body-sm text-muted-foreground">
              이용권을 구매하면 결제 확인 후 이곳에서 확인할 수 있습니다.
            </p>
          </div>
        ) : null}
        {visibleItems.map((passItem) => {
          const remainPct =
            passItem.packageSize > 0
              ? Math.max(0, Math.min(100, (passItem.remainingCount / passItem.packageSize) * 100))
              : 0;
          const dday =
            now && passItem.expiresAt
              ? Math.ceil((new Date(passItem.expiresAt).getTime() - now) / 86400000)
              : null;
          const expiring = passItem.status === "active" && passItem.isExpiringSoon;
          return (
            <article
              key={passItem.id}
              className={`rounded-panel border bg-card p-4 shadow-soft transition-shadow hover:shadow-md md:p-5 ${passItem.status === "active" ? "border-brand-highlight/30" : "border-border/80"}`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:justify-between">
                <div className="flex min-w-0 gap-3">
                  <span className="rounded-control bg-brand-muted p-2.5 text-brand-highlight-ink">
                    <Ticket className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="break-keep font-ui-bold text-ui-card-title text-foreground">
                      {passItem.planTitle ?? "교체서비스 패키지"} {passItem.packageSize}회권
                    </h3>
                    <p className="mt-1 text-ui-label text-muted-foreground">
                      구매일 {new Date(passItem.purchasedAt).toLocaleDateString()}
                    </p>
                    <p className="mt-2 break-keep text-ui-body-sm text-muted-foreground">
                      {statusDescription(passItem)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start">
                  <Badge
                    variant={
                      expiring
                        ? "destructive"
                        : passItem.status === "active"
                          ? "default"
                          : passItem.status === "pending_payment" ||
                              passItem.status === "suspended" ||
                              passItem.status === "paused"
                            ? "secondary"
                            : "outline"
                    }
                  >
                    {expiring ? "만료 임박" : statusLabel(passItem.status)}
                  </Badge>
                  {passItem.expiresAt ? (
                    <span
                      className={`flex items-center gap-1 text-ui-label ${expiring || (dday !== null && dday < 0) ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {dday === null ? "계산 중" : dday >= 0 ? `D-${dday}` : "만료됨"}
                    </span>
                  ) : null}
                </div>
              </div>
              {passItem.status === "active" ? (
                <>
                  <div className="mt-5 rounded-control border border-brand-highlight/20 bg-brand-muted/45 p-4">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <p className="text-ui-body-sm font-medium text-muted-foreground">
                        남은 이용 횟수
                      </p>
                      <p className="font-ui-bold text-ui-section-title tabular-nums text-brand-highlight-ink">
                        {passItem.remainingCount}회{" "}
                        <span className="text-ui-body-sm font-medium text-muted-foreground">
                          / 총 {passItem.packageSize}회
                        </span>
                      </p>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full rounded-full bg-brand-highlight transition-all"
                        style={{ width: `${remainPct}%` }}
                      />
                    </div>
                    <p className="mt-2 text-ui-label text-muted-foreground">
                      지금까지 {passItem.usedCount}회 사용했습니다.
                    </p>
                  </div>
                  {passItem.recentUsages?.length > 0 ? (
                    <div className="mt-3 rounded-control bg-muted/40 px-4 py-3">
                      <p className="text-ui-label font-medium text-muted-foreground">
                        최근 사용 내역
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-ui-body-sm text-foreground">
                        {passItem.recentUsages.slice(-3).map((usage, index) => (
                          <span key={index}>
                            {new Date(usage.usedAt).toLocaleDateString()}
                            {usage.reverted ? " · 복원" : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </article>
          );
        })}
      </CardContent>
    </Card>
  );
}
