"use client";

import { colors } from "@/app/admin/products/_lib/productFormOptions";
import { AdminSemanticBadge } from "@/components/admin/AdminSemanticBadge";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { FormSection } from "@/components/admin/product-form/FormSection";
import { Button } from "@/components/ui/button";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import type { StockQuantityChange } from "@/lib/product-stock-audit";
import { cn } from "@/lib/utils";
import { History } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";

type HistoryResponse = { items: Array<{ _id: string; occurredAt: string; reason: string; mode: string; changes: StockQuantityChange[]; orderId?: string; applicationId?: string }>; page: number; limit: number; total: number };

const reasons = new Map([
  ["order_created", "주문 생성"],
  ["order_canceled", "주문 취소"],
  ["admin_product_updated", "관리자 상품 수정"],
]);
const objectId = /^[a-f\d]{24}$/i;
const focusRing = "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function QuantityFields({ change, className }: { change: StockQuantityChange; className?: string }) {
  const { before, after, delta } = change;
  const tone = delta == null || delta === 0 ? "neutral" : delta > 0 ? "success" : "danger";

  return (
    <>
      <div className={cn("min-w-0 text-right", className)}>
        <dt className={adminTypography.caption}>변경 전</dt>
        <dd className={adminTypography.numeric}>{before ?? "기록 없음"}</dd>
      </div>
      <div className={cn("min-w-0 text-right", className)}>
        <dt className={adminTypography.caption}>변경 후</dt>
        <dd className={adminTypography.numeric}>{after ?? "기록 없음"}</dd>
      </div>
      <div className={cn("min-w-0 text-right", className)}>
        <dt className={adminTypography.caption}>증감량</dt>
        <dd className="tabular-nums">
          {delta == null ? (
            <span className={adminTypography.caption}>확인 필요</span>
          ) : (
            <AdminSemanticBadge tone={tone} wrap="normal">{delta > 0 ? "+" : ""}{delta}</AdminSemanticBadge>
          )}
        </dd>
      </div>
    </>
  );
}

function OptionChanges({ changes }: { changes: StockQuantityChange[] }) {
  return (
    <ul className={cn(adminSurface.fieldPanel, "divide-y divide-border")}>
      {changes.map((change) => (
        <li key={JSON.stringify([change.axis, change.color, change.gauge])} className="py-2 first:pt-0 last:pb-0">
          <dl className="grid min-w-0 grid-cols-6 gap-2 sm:grid-cols-5">
            {change.axis !== "gauge" && (
              <div className={cn("col-span-3 min-w-0 sm:col-span-1", change.axis === "color" && "col-span-6 sm:col-span-2")}>
                <dt className={adminTypography.caption}>색상</dt>
                <dd className={cn(adminTypography.bodyStrong, "[overflow-wrap:anywhere]")}>
                  {colors.find(({ id }) => id === change.color)?.name ?? (change.color || "기록 없음")}
                </dd>
              </div>
            )}
            {change.axis !== "color" && (
              <div className={cn("col-span-3 min-w-0 sm:col-span-1", change.axis === "gauge" && "col-span-6 sm:col-span-2")}>
                <dt className={adminTypography.caption}>게이지</dt>
                <dd className={cn(adminTypography.numeric, "[overflow-wrap:anywhere]")}>
                  {change.gauge ? `${change.gauge}mm` : "기록 없음"}
                </dd>
              </div>
            )}
            <QuantityFields change={change} className="col-span-2 sm:col-span-1" />
          </dl>
        </li>
      ))}
    </ul>
  );
}

export default function StockHistory({ productId }: { productId: string }) {
  const [page, setPage] = useState(1);
  const { data, error, isLoading, isValidating, mutate } = useSWR<HistoryResponse>(
    `/api/admin/products/${productId}/stock-history?page=${page}`,
    authenticatedSWRFetcher,
  );
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const firstItem = data?.items.length ? (data.page - 1) * data.limit + 1 : 0;
  const lastItem = firstItem && data ? firstItem + data.items.length - 1 : 0;

  return (
    <FormSection
      title="재고 변경 이력"
      description="기록 도입 전 이력과 일부 독립 교체서비스·대여에서 발생한 변경은 포함되지 않을 수 있습니다."
      icon={<History aria-hidden="true" className="size-5" />}
      className="min-w-0"
      contentClassName="space-y-4"
    >
      {error ? (
        <div className={cn(adminSurface.fieldPanel, "space-y-2")}>
          <p role="alert" className={cn(adminTypography.body, "text-destructive")}>재고 변경 이력을 불러오지 못했습니다.</p>
          <Button type="button" variant="outline" size="sm" disabled={isValidating} onClick={() => void mutate().catch(() => undefined)}>
            {isValidating ? "다시 불러오는 중…" : "다시 시도"}
          </Button>
        </div>
      ) : isLoading || !data ? (
        <p role="status" className={adminTypography.metaMuted}>재고 변경 이력을 불러오는 중입니다.</p>
      ) : data.items.length ? (
        <ul className="space-y-4">
          {data.items.map((item) => {
            const total = item.changes.find(({ axis }) => axis === "total");
            const variants = item.changes.filter(({ axis }) => axis === "variant");
            const aggregates = item.changes.filter(({ axis }) => axis === "color" || axis === "gauge");
            const orderId = item.orderId && objectId.test(item.orderId) ? item.orderId : null;
            const applicationId = item.applicationId && objectId.test(item.applicationId) ? item.applicationId : null;

            return (
              <li key={item._id} className={cn(adminSurface.cardMuted, "min-w-0 space-y-4 p-3 sm:p-4")}>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={adminTypography.panelTitle}>{reasons.get(item.reason) ?? "재고 변경"}</h3>
                    <AdminSemanticBadge tone="neutral">{item.mode === "admin" ? "관리자 수동" : "자동 처리"}</AdminSemanticBadge>
                  </div>
                  <time dateTime={item.occurredAt} className={adminTypography.date}>
                    {new Date(item.occurredAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} KST
                  </time>
                </div>
                {total && (
                  <div className={cn(adminSurface.highlightPanel, "space-y-2")}>
                    <h4 className={adminTypography.panelTitleCompact}>전체 재고</h4>
                    <dl className="grid grid-cols-3 gap-2">
                      <QuantityFields change={total} />
                    </dl>
                  </div>
                )}
                {variants.length > 0 && (
                  <div className="space-y-2">
                    <h4 className={adminTypography.panelTitleCompact}>조합별 변경</h4>
                    <OptionChanges changes={variants} />
                  </div>
                )}
                {aggregates.length > 0 && (variants.length > 0 ? (
                  <details className="space-y-2">
                    <summary className={cn(adminTypography.actionLabel, focusRing, "cursor-pointer py-1")}>색상·게이지별 집계</summary>
                    <OptionChanges changes={aggregates} />
                  </details>
                ) : (
                  <div className="space-y-2">
                    <h4 className={adminTypography.panelTitleCompact}>색상·게이지별 변경</h4>
                    <OptionChanges changes={aggregates} />
                  </div>
                ))}
                {(orderId || applicationId) && (
                  <div className={cn(adminTypography.bodyStrong, "flex flex-wrap gap-x-4 gap-y-2")}>
                    {orderId && <Link className={cn(focusRing, "underline underline-offset-4")} href={`/admin/orders/${orderId}`}>관련 주문</Link>}
                    {applicationId && <Link className={cn(focusRing, "underline underline-offset-4")} href={`/admin/applications/stringing/${applicationId}`}>관련 신청서</Link>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p role="status" className={cn(adminSurface.fieldPanel, adminTypography.body)}>
          {data.total ? "이 페이지에 표시할 이력이 없습니다." : "기록된 재고 변경 이력이 없습니다."}
        </p>
      )}
      <nav aria-label="재고 변경 이력 페이지" className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className={cn(adminTypography.meta, "tabular-nums")}>
          {data && !error && !isLoading
            ? `전체 ${data.total}건 · ${data.page} / ${totalPages}페이지 · ${firstItem ? `${firstItem}–${lastItem}건 표시` : "표시 0건"}`
            : `${page}페이지`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1 || isLoading} onClick={() => setPage((value) => value - 1)}>이전</Button>
          <Button type="button" variant="outline" size="sm" disabled={!data || page >= Math.min(totalPages, 10000) || isLoading || Boolean(error)} onClick={() => setPage((value) => value + 1)}>다음</Button>
        </div>
      </nav>
    </FormSection>
  );
}
