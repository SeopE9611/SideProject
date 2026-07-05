"use client";

import useSWRInfinite from "swr/infinite";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import AsyncState from "@/components/system/AsyncState";
import { StackedCardListSkeleton } from "@/components/system/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CreditCard,
  Package,
  ArrowRight,
  Briefcase,
  CheckCircle,
  AlertCircle,
  XCircle,
  Undo2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { racketBrandLabel } from "@/lib/constants";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { getCustomerRentalStatusLabel } from "@/app/mypage/_lib/flow-display";

type RentalsResponse = {
  items: unknown[];
};

const fetcher = (url: string) => authenticatedSWRFetcher<RentalsResponse>(url);

const LIMIT = 5;
const CancelRentalDialog = dynamic(
  () => import("@/app/mypage/rentals/_components/CancelRentalDialog"),
  { loading: () => null },
);

const getKey = (index: number, prev: any) => {
  if (prev && prev.items && prev.items.length < LIMIT) return null;
  const page = index + 1;
  return `/api/me/rentals?page=${page}&pageSize=${LIMIT}`;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "returned":
      return <CheckCircle className="h-4 w-4 text-primary" />;
    case "out":
      return <Clock className="h-4 w-4 text-primary" />;
    case "paid":
      return <Package className="h-4 w-4 text-foreground" />;
    case "canceled":
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "returned":
      return "success";
    case "out":
      return "info";
    case "paid":
      return "neutral";
    case "canceled":
      return "danger";
    default:
      return "neutral";
  }
};

const getStatusLabel = (status: string, hasOutboundShipping = false) => {
  if (status === "paid" && hasOutboundShipping) return "수령 확인 필요";
  return getCustomerRentalStatusLabel(status);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

export default function RentalsList() {
  const [cancelRentalDialogId, setCancelRentalDialogId] = useState<string | null>(null);

  const { data, size, setSize, isValidating, error, mutate } = useSWRInfinite(getKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const handleWithdrawCancelRequest = async (rentalId: string) => {
    if (!confirm("이 대여의 취소 요청을 철회하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/rentals/${rentalId}/cancel-withdraw`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg = body?.message || "취소 요청 철회 중 오류가 발생했습니다.";
        showErrorToast(msg);
        return;
      }

      showSuccessToast("취소 요청을 철회했습니다.");

      // 목록 전체를 다시 불러와서 해당 카드의 cancelStatus를 최신으로 맞춤
      await mutate();
    } catch (e) {
      console.error(e);
      showErrorToast("취소 요청 철회 중 오류가 발생했습니다.");
    }
  };

  const flat = useMemo(() => (data ?? []).flatMap((d: any) => d.items ?? []), [data]);

  const hasMore = useMemo(() => {
    if (!data || data.length === 0) return false;
    const last = data[data.length - 1];
    return (last?.items?.length ?? 0) === LIMIT;
  }, [data]);

  if (error) {
    return (
      <AsyncState kind="error" variant="card" resourceName="대여 내역" onAction={() => mutate()} />
    );
  }

  const isInitialLoading = !data && isValidating;

  if (!isInitialLoading && !isValidating && flat.length === 0) {
    return (
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-8 md:p-12 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-border bg-secondary md:mb-6">
            <Briefcase className="h-10 w-10 text-foreground" />
          </div>
          <h3 className="mb-2 text-ui-section-title font-semibold text-foreground">
            대여 내역이 없습니다
          </h3>
          <p className="text-muted-foreground">
            아직 대여하신 라켓이 없습니다. 지금 바로 라켓을 대여해보세요!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {isInitialLoading ? (
        <StackedCardListSkeleton
          count={3}
          cardContentClassName="space-y-4 p-4 md:p-6"
          titleLineWidthClassName="w-28"
          subtitleLineWidthClassName="w-44"
          badgeWidthClassName="w-20"
          metaLayout="twoColumn"
          metaLineWidths={["w-full", "w-full"]}
          actionCount={1}
          actionWidths={["w-28"]}
        />
      ) : null}
      {flat.map((r: any) => {
        const fee = r.amount?.fee ?? 0;
        const deposit = r.amount?.deposit ?? 0;
        const stringPrice = r.amount?.stringPrice ?? 0;
        const stringingFee = r.amount?.stringingFee ?? 0;
        const total = r.amount?.total ?? fee + deposit + stringPrice + stringingFee;

        const rentalTitle = `${racketBrandLabel(r.brand)} ${r.model ?? ""}`.trim() || "라켓 대여";
        const rentalMetaDate = r.updatedAt || r.createdAt;
        const returnDueDate = r.returnDueDate || r.endDate || r.dueDate || r.expectedReturnDate;
        const nextActionLabel =
          r.cancelStatus === "requested"
            ? "취소 요청 확인을 기다려주세요."
            : r.status === "returned" && !r.userConfirmedAt
              ? "반납 내용을 확인하고 수령 확인을 진행해주세요."
              : r.withStringService && !r.stringingApplicationId
                ? "교체서비스 신청을 이어갈 수 있어요."
                : r.status === "returned" || r.status === "canceled"
                  ? "추가로 진행할 일은 없습니다."
                  : r.hasReturnShipping
                    ? "상세에서 반납 진행 상황을 확인해주세요."
                    : "상세에서 대여 진행 상황을 확인해주세요.";

        return (
          <Card
            key={r.id}
            className={`group relative overflow-hidden border border-border bg-card shadow-sm transition-[box-shadow,border-color,background-color,color,opacity] duration-200 hover:border-primary/30 hover:shadow-md ${r.stringingApplicationId || r.withStringService ? "ring-1 ring-ring/50" : ""}`}
          >
            <div
              className="absolute inset-0 border border-border/40 bg-secondary/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ padding: "1px" }}
            >
              <div className="h-full w-full rounded-lg bg-card" />
            </div>

            <CardContent className="relative space-y-4 p-4">
              <div className="flex flex-col gap-3 border-b border-border/60 pb-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 break-keep text-ui-body font-semibold text-foreground">
                    {rentalTitle}
                  </h3>
                  <p className="mt-1 text-ui-label tabular-nums text-muted-foreground">
                    대여 기간 {r.days}일{rentalMetaDate ? ` · ${formatDate(rentalMetaDate)}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:justify-end">
                  {getStatusIcon(r.status)}
                  <Badge
                    variant={getStatusBadgeVariant(r.status)}
                    className="shrink-0 whitespace-nowrap px-3 py-1 text-ui-label font-medium"
                  >
                    {r.depositRefundedAt
                      ? "보증금 환급 완료"
                      : getStatusLabel(r.status, r.hasOutboundShipping)}
                  </Badge>
                  {r.cancelStatus === "requested" ? (
                    <Badge variant="warning" className="shrink-0 whitespace-nowrap">
                      취소 요청됨
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 rounded-xl border border-border/60 bg-muted/20 p-2 bp-sm:grid-cols-3">
                <div className="min-w-0 rounded-lg bg-card/80 px-3 py-2">
                  <div>
                    <div className="text-ui-label text-muted-foreground">대여 기간</div>
                    <div className="whitespace-nowrap font-medium tabular-nums text-foreground">
                      {r.days}일
                    </div>
                  </div>
                </div>

                <div className="min-w-0 rounded-lg bg-card/80 px-3 py-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-ui-label text-muted-foreground">반납 예정일</div>
                    <div className="whitespace-nowrap font-semibold tabular-nums text-foreground">
                      {returnDueDate ? formatDate(returnDueDate) : "상세 확인"}
                    </div>
                  </div>
                </div>

                <div className="min-w-0 rounded-lg bg-card/80 px-3 py-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-ui-label text-muted-foreground">총 결제 금액</div>
                    <div className="whitespace-nowrap font-medium tabular-nums text-foreground">
                      {total.toLocaleString()}원
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 border-t border-border/60 pt-3 bp-sm:flex bp-sm:flex-wrap bp-sm:items-center md:pt-4 [&_button]:w-full bp-sm:[&_button]:w-auto">
                <p className="break-keep text-ui-label leading-relaxed text-muted-foreground bp-sm:mr-auto">
                  <span className="font-semibold text-foreground">다음 할 일</span> ·{" "}
                  {nextActionLabel}
                </p>
                <Button size="sm" variant="outline" asChild className="bg-transparent">
                  <Link
                    href={`/mypage?tab=orders&flowType=rental&flowId=${r.id}&from=orders`}
                    className="inline-flex items-center gap-1"
                  >
                    대여 상세 보기
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>

                {r.stringingApplicationId ? (
                  <Button size="sm" variant="outline" asChild className="bg-transparent">
                    <Link
                      href={`/mypage?tab=orders&flowType=application&flowId=${r.stringingApplicationId}&from=orders`}
                      className="inline-flex items-center gap-1"
                    >
                      교체서비스 상세 보기
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                ) : r.withStringService ? (
                  <Button size="sm" variant="default" className="shadow-sm" asChild>
                    <Link
                      href={`/services/apply?rentalId=${r.id}`}
                      className="inline-flex items-center gap-1"
                    >
                      교체서비스 신청하기
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                ) : null}

                {r.cancelStatus === "requested" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleWithdrawCancelRequest(r.id)}
                    className="gap-2"
                  >
                    <Undo2 className="h-4 w-4" />
                    취소 요청 철회
                  </Button>
                ) : ["pending", "paid"].includes(r.status) &&
                  !r.hasOutboundShipping &&
                  !r.depositRefundedAt ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-2"
                    onClick={() => setCancelRentalDialogId(r.id)}
                  >
                    <XCircle className="h-4 w-4" />
                    취소 요청
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="flex justify-center pt-4">
        {hasMore ? (
          <Button
            variant="outline"
            onClick={() => setSize(size + 1)}
            disabled={isValidating}
            className="border-border hover:bg-muted dark:hover:bg-muted bg-transparent"
          >
            더 보기
          </Button>
        ) : flat.length ? (
          <span className="text-ui-body-sm text-foreground/80">마지막 페이지입니다</span>
        ) : null}
      </div>

      {hasMore && isValidating ? (
        <StackedCardListSkeleton
          count={2}
          cardContentClassName="space-y-4 p-4 md:p-6"
          titleLineWidthClassName="w-28"
          subtitleLineWidthClassName="w-44"
          badgeWidthClassName="w-20"
          metaLayout="twoColumn"
          metaLineWidths={["w-full", "w-full"]}
          actionCount={1}
          actionWidths={["w-28"]}
        />
      ) : null}

      {/* 취소 요청 클릭 시점에만 다이얼로그 코드를 로드/마운트 */}
      {cancelRentalDialogId ? (
        <CancelRentalDialog
          rentalId={cancelRentalDialogId}
          open={Boolean(cancelRentalDialogId)}
          onOpenChange={(open) => {
            if (!open) setCancelRentalDialogId(null);
          }}
          hideTrigger
          onSuccess={async () => {
            await mutate();
          }}
        />
      ) : null}
    </div>
  );
}
