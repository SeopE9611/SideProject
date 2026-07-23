"use client";

import { Badge } from "@/components/ui/badge";
import AsyncState from "@/components/system/AsyncState";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { Card, CardContent } from "@/components/ui/card";
import PassListSkeleton from "@/app/mypage/tabs/PassListSkeleton";
import { badgeStyleSpec, getPaymentStatusBadgeSpec } from "@/lib/badge-style";
import { Clock, Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";

type UsageStatus =
  | "available"
  | "paused"
  | "exhausted"
  | "expired"
  | "cancelled"
  | "not_issued"
  | "unknown";
type ActivationStatus =
  | "active"
  | "awaiting_payment"
  | "pending_issue"
  | "paused"
  | "ended"
  | "cancelled"
  | "failed"
  | "unknown";
type PassItem = {
  id: string;
  packageSize: number | null;
  usedCount: number | null;
  remainingCount: number | null;
  status: string | null;
  purchasedAt: string;
  expiresAt: string | null;
  planId?: string | null;
  planTitle?: string | null;
  isExpiringSoon: boolean;
  recentUsages: { applicationId: string | null; usedAt: string; reverted: boolean }[];
  source: "pass" | "order";
  orderId: string | null;
  orderStatus: string | null;
  usageStatus: UsageStatus;
  usageStatusLabel: string;
  paymentStatus: string | null;
  paymentMethod: string | null;
  paymentProvider: string | null;
  paymentTotalAmount: number | null;
  paymentStatusLabel: string;
  activationStatus: ActivationStatus;
  activationStatusLabel: string;
  displayGroup: "available" | "waiting" | "history";
};
type Res = { items: PassItem[] };
const fetcher = (url: string) => authenticatedSWRFetcher<Res>(url);

function getPassUsageBadgeSpec(usageStatus: UsageStatus) {
  if (usageStatus === "available") return badgeStyleSpec("success");
  if (usageStatus === "paused") return badgeStyleSpec("warning");
  if (usageStatus === "expired" || usageStatus === "cancelled") return badgeStyleSpec("danger");
  return badgeStyleSpec("neutral");
}
function getPassActivationBadgeSpec(activationStatus: ActivationStatus) {
  if (activationStatus === "active") return badgeStyleSpec("success");
  if (activationStatus === "awaiting_payment" || activationStatus === "paused")
    return badgeStyleSpec("warning");
  if (activationStatus === "pending_issue") return badgeStyleSpec("info");
  if (activationStatus === "cancelled" || activationStatus === "failed")
    return badgeStyleSpec("danger");
  return badgeStyleSpec("neutral");
}
function statusDescription(item: PassItem) {
  if (item.usageStatus === "available")
    return item.expiresAt
      ? `만료일 ${new Date(item.expiresAt).toLocaleDateString()}`
      : "만료일 없이 사용할 수 있습니다.";
  if (item.usageStatus === "paused") return "현재 이용이 일시정지되어 있습니다.";
  if (item.activationStatus === "awaiting_payment") return "결제 확인 후 패키지권이 활성화됩니다.";
  if (item.activationStatus === "pending_issue")
    return "결제는 완료됐으며 패키지권 발급을 처리하고 있습니다.";
  if (item.activationStatus === "failed") return "결제 또는 발급 처리 결과를 확인해 주세요.";
  if (item.usageStatus === "exhausted") return "모든 이용 횟수를 사용했습니다.";
  if (item.usageStatus === "expired") return "패키지 이용 기간이 만료되었습니다.";
  if (item.usageStatus === "cancelled") return "취소된 패키지 주문 또는 이용권입니다.";
  return "패키지권 상태를 확인하고 있습니다.";
}
function dateTime(value: string | null) {
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(time) ? null : time;
}

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
  const sortItems = (group: PassItem["displayGroup"]) =>
    [...items]
      .filter((item) => item.displayGroup === group)
      .sort((a, b) => {
        if (group === "available") {
          if (a.isExpiringSoon !== b.isExpiringSoon) return a.isExpiringSoon ? -1 : 1;
          const aExpiry = dateTime(a.expiresAt) ?? Number.POSITIVE_INFINITY;
          const bExpiry = dateTime(b.expiresAt) ?? Number.POSITIVE_INFINITY;
          if (aExpiry !== bExpiry) return aExpiry - bExpiry;
        }
        return (
          (dateTime(b.purchasedAt) ?? Number.NEGATIVE_INFINITY) -
          (dateTime(a.purchasedAt) ?? Number.NEGATIVE_INFINITY)
        );
      });
  const sections = [
    {
      key: "available" as const,
      title: "사용 가능한 패키지권",
      description: "현재 교체서비스 신청에 사용할 수 있습니다.",
      items: sortItems("available"),
    },
    {
      key: "waiting" as const,
      title: "처리 중·일시정지",
      description: "결제 확인, 패스 발급 또는 일시정지 상태입니다.",
      items: sortItems("waiting"),
    },
    {
      key: "history" as const,
      title: "종료·취소 내역",
      description: "소진, 만료, 취소 또는 결제 실패 내역입니다.",
      items: sortItems("history"),
    },
  ].filter((section) => section.items.length > 0);

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
              보유·대기·종료 패키지 내역이 없습니다
            </p>
            <p className="mt-1 break-keep text-ui-body-sm text-muted-foreground">
              패키지를 구매하면 결제 확인 후 표시됩니다.
            </p>
          </div>
        ) : null}
        {sections.map((section) => (
          <section key={section.key} className="space-y-3">
            <div>
              <h2 className="font-ui-bold text-ui-card-title text-foreground">
                {section.title}{" "}
                <span className="text-muted-foreground">{section.items.length}</span>
              </h2>
              <p className="text-ui-label text-muted-foreground">{section.description}</p>
            </div>
            {section.items.map((passItem) => {
              const usageCounts =
                typeof passItem.packageSize === "number" &&
                Number.isFinite(passItem.packageSize) &&
                passItem.packageSize > 0 &&
                typeof passItem.remainingCount === "number" &&
                Number.isFinite(passItem.remainingCount)
                  ? { packageSize: passItem.packageSize, remainingCount: passItem.remainingCount }
                  : null;
              const hasUsageCounts = usageCounts !== null;
              const remainPct = usageCounts
                ? Math.max(
                    0,
                    Math.min(100, (usageCounts.remainingCount / usageCounts.packageSize) * 100),
                  )
                : null;
              const expiresAt = dateTime(passItem.expiresAt);
              const dday =
                now && expiresAt !== null ? Math.ceil((expiresAt - now) / 86400000) : null;
              const usageBadgeSpec = getPassUsageBadgeSpec(passItem.usageStatus);
              const paymentStatusBadgeSpec = getPaymentStatusBadgeSpec(passItem.paymentStatusLabel);
              const activationBadgeSpec = getPassActivationBadgeSpec(passItem.activationStatus);
              return (
                <article
                  key={passItem.id}
                  className={`rounded-panel border bg-card p-4 shadow-soft transition-shadow hover:shadow-md md:p-5 ${passItem.usageStatus === "available" ? "border-brand-highlight/30" : "border-border/80"}`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <span className="rounded-control bg-brand-muted p-2.5 text-brand-highlight-ink">
                        <Ticket className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="break-keep font-ui-bold text-ui-card-title text-foreground">
                          {passItem.planTitle ?? "교체서비스 패키지"}{" "}
                          {passItem.packageSize ?? "횟수 확인 중"}회권
                        </h3>
                        <p className="mt-1 text-ui-label text-muted-foreground">
                          구매일{" "}
                          {passItem.purchasedAt
                            ? new Date(passItem.purchasedAt).toLocaleDateString()
                            : "확인 중"}
                        </p>
                        <p className="mt-2 break-keep text-ui-body-sm text-muted-foreground">
                          {statusDescription(passItem)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-start gap-2 self-start">
                      <Badge
                        variant={usageBadgeSpec.variant}
                        className={usageBadgeSpec.className}
                        aria-label={`이용권 상태: ${passItem.usageStatusLabel}`}
                      >
                        {passItem.usageStatusLabel}
                      </Badge>
                      <Badge
                        variant={paymentStatusBadgeSpec.variant}
                        className={paymentStatusBadgeSpec.className}
                        aria-label={`결제 상태: ${passItem.paymentStatusLabel}`}
                      >
                        {passItem.paymentStatusLabel}
                      </Badge>
                      <Badge
                        variant={activationBadgeSpec.variant}
                        className={activationBadgeSpec.className}
                        aria-label={`활성화 상태: ${passItem.activationStatusLabel}`}
                      >
                        {passItem.activationStatusLabel}
                      </Badge>
                      {passItem.isExpiringSoon ? (
                        <Badge variant="warning" aria-label="만료 임박">
                          만료 임박
                        </Badge>
                      ) : null}
                      {passItem.expiresAt ? (
                        <span
                          className={`flex items-center gap-1 text-ui-label ${passItem.isExpiringSoon || (dday !== null && dday < 0) ? "text-destructive" : "text-muted-foreground"}`}
                        >
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                          {dday === null ? "계산 중" : dday >= 0 ? `D-${dday}` : "만료됨"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {passItem.source === "pass" ? (
                    <>
                      <div className="mt-5 rounded-control border border-brand-highlight/20 bg-brand-muted/45 p-4">
                        <div className="flex flex-wrap items-end justify-between gap-2">
                          <p className="text-ui-body-sm font-medium text-muted-foreground">
                            남은 이용 횟수
                          </p>
                          {hasUsageCounts ? (
                            <p className="font-ui-bold text-ui-section-title tabular-nums text-brand-highlight-ink">
                              {passItem.remainingCount}회{" "}
                              <span className="text-ui-body-sm font-medium text-muted-foreground">
                                / 총 {passItem.packageSize}회
                              </span>
                            </p>
                          ) : (
                            <p className="text-ui-body-sm text-muted-foreground">
                              횟수 정보 확인 중
                            </p>
                          )}
                        </div>
                        {remainPct !== null ? (
                          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-background">
                            <div
                              className="h-full rounded-full bg-brand-highlight transition-all"
                              style={{ width: `${remainPct}%` }}
                            />
                          </div>
                        ) : null}
                        {typeof passItem.usedCount === "number" &&
                        Number.isFinite(passItem.usedCount) ? (
                          <p className="mt-2 text-ui-label text-muted-foreground">
                            지금까지 {passItem.usedCount}회 사용했습니다.
                          </p>
                        ) : null}
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
                  ) : (
                    <p className="mt-4 text-ui-body-sm text-muted-foreground">
                      패키지 총 {passItem.packageSize ?? "횟수 확인 중"}회 · 아직 발급되지 않음
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {passItem.orderId?.trim() ? (
                      <a
                        href={`/services/packages/success?packageOrderId=${encodeURIComponent(passItem.orderId)}`}
                        className="text-ui-body-sm font-medium text-brand-highlight-ink underline-offset-4 hover:underline"
                      >
                        주문·결제 정보
                      </a>
                    ) : null}
                    {passItem.usageStatus === "available" ? (
                      <a
                        href="/services#service-start"
                        className="text-ui-body-sm font-medium text-brand-highlight-ink underline-offset-4 hover:underline"
                      >
                        교체서비스 시작하기
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
