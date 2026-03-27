"use client";

import useSWRInfinite from "swr/infinite";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import AsyncState from "@/components/system/AsyncState";
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
import { getMypageUserStatusLabel } from "@/app/mypage/_lib/status-label";

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

const getStatusLabel = (status: string) => {
  const baseLabel = getMypageUserStatusLabel(status);
  if (baseLabel === "취소") return "취소됨";
  return baseLabel;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const RentalsListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, idx) => (
      <Card key={idx} className="border-0 bg-card">
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-44" />
            </div>
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <div className="grid grid-cols-1 gap-2 bp-sm:grid-cols-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-9 w-28" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);
export default function RentalsList() {
  const [cancelRentalDialogId, setCancelRentalDialogId] = useState<
    string | null
  >(null);

  const { data, size, setSize, isValidating, error, mutate } = useSWRInfinite(
    getKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const handleWithdrawCancelRequest = async (rentalId: string) => {
    if (!confirm("대여 취소 요청을 철회하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/rentals/${rentalId}/cancel-withdraw`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg =
          body?.message || "대여 취소 요청 철회 중 오류가 발생했습니다.";
        showErrorToast(msg);
        return;
      }

      showSuccessToast("대여 취소 요청을 철회했습니다.");

      // 목록 전체를 다시 불러와서 해당 카드의 cancelStatus를 최신으로 맞춤
      await mutate();
    } catch (e) {
      console.error(e);
      showErrorToast("대여 취소 요청 철회 중 오류가 발생했습니다.");
    }
  };

  const flat = useMemo(
    () => (data ?? []).flatMap((d: any) => d.items ?? []),
    [data],
  );

  const hasMore = useMemo(() => {
    if (!data || data.length === 0) return false;
    const last = data[data.length - 1];
    return (last?.items?.length ?? 0) === LIMIT;
  }, [data]);

  if (error) {
    return (
      <AsyncState
        kind="error"
        variant="card"
        resourceName="대여 내역"
        onAction={() => mutate()}
      />
    );
  }

  const isInitialLoading = !data && isValidating;

  if (!isInitialLoading && !isValidating && flat.length === 0) {
    return (
      <Card className="relative overflow-hidden border-0 bg-muted/30 dark:bg-card/40">
        <CardContent className="p-8 md:p-12 text-center">
          <div className="mx-auto mb-4 md:mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted/30 shadow-lg">
            <Briefcase className="h-10 w-10 text-foreground" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">
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
        <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          대여 내역을 불러오는 중입니다...
        </div>
      ) : null}
      {flat.map((r: any) => {
        const fee = r.amount?.fee ?? 0;
        const deposit = r.amount?.deposit ?? 0;
        const stringPrice = r.amount?.stringPrice ?? 0;
        const stringingFee = r.amount?.stringingFee ?? 0;
        const total =
          r.amount?.total ?? fee + deposit + stringPrice + stringingFee;

        const rentalTitle =
          `${racketBrandLabel(r.brand)} ${r.model ?? ""}`.trim() || "라켓 대여";
        const rentalMetaDate = r.updatedAt || r.createdAt;

        return (
          <Card
            key={r.id}
            className={`group relative overflow-hidden border-0 bg-card shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${r.stringingApplicationId || r.withStringService ? "ring-1 ring-ring" : ""}`}
          >
            <div
              className="absolute inset-0 bg-muted/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ padding: "1px" }}
            >
              <div className="h-full w-full rounded-lg bg-card" />
            </div>

            <CardContent className="relative space-y-4 p-4 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {rentalTitle}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    대여 기간 {r.days}일
                    {rentalMetaDate
                      ? ` · 최근 업데이트 ${formatDate(rentalMetaDate)}`
                      : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusIcon(r.status)}
                  <Badge
                    variant={getStatusBadgeVariant(r.status)}
                    className="px-3 py-1 text-xs font-medium"
                  >
                    {getStatusLabel(r.status)}
                  </Badge>
                  {r.cancelStatus === "requested" ? (
                    <Badge variant="warning">취소 요청됨</Badge>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {r.stringingApplicationId ? (
                  <Badge variant="outline">교체 신청서 연결됨</Badge>
                ) : null}
                {!r.stringingApplicationId && r.withStringService ? (
                  <Badge variant="outline">교체 서비스 포함</Badge>
                ) : null}
                <Badge variant="outline">
                  {r.hasReturnShipping
                    ? "반납 운송장 등록됨"
                    : "반납 운송장 미등록"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-3 rounded-xl border border-border/50 bg-muted/30 p-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      대여 수수료
                    </div>
                    <div className="font-medium text-foreground">
                      {fee.toLocaleString()}원
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      보증금
                    </div>
                    <div className="font-medium text-foreground">
                      {deposit.toLocaleString()}원
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      총 결제 예상
                    </div>
                    <div className="font-medium text-foreground">
                      {total.toLocaleString()}원
                    </div>
                  </div>
                </div>

                {stringPrice > 0 ? (
                  <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        스트링 상품
                      </div>
                      <div className="font-medium text-foreground">
                        {stringPrice.toLocaleString()}원
                      </div>
                    </div>
                  </div>
                ) : null}

                {stringingFee > 0 ? (
                  <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        교체 서비스
                      </div>
                      <div className="font-medium text-foreground">
                        {stringingFee.toLocaleString()}원
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 md:pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="bg-transparent"
                >
                  <Link
                    href={`/mypage?tab=orders&flowType=rental&flowId=${r.id}&from=orders`}
                    className="inline-flex items-center gap-1"
                  >
                    상세 보기
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>

                {r.stringingApplicationId ? (
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="bg-transparent"
                  >
                    <Link
                      href={`/mypage?tab=orders&flowType=application&flowId=${r.stringingApplicationId}&from=orders`}
                      className="inline-flex items-center gap-1"
                    >
                      교체서비스 보기
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                ) : r.withStringService ? (
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    asChild
                  >
                    <Link
                      href={`/services/apply?rentalId=${r.id}`}
                      className="inline-flex items-center gap-1"
                    >
                      교체 신청하기
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                ) : null}

                {r.cancelStatus === "requested" ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleWithdrawCancelRequest(r.id)}
                    className="gap-2"
                  >
                    <Undo2 className="h-4 w-4" />
                    대여 취소 요청 철회
                  </Button>
                ) : ["pending", "paid"].includes(r.status) &&
                  !r.hasOutboundShipping ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-2"
                    onClick={() => setCancelRentalDialogId(r.id)}
                  >
                    <XCircle className="h-4 w-4" />
                    대여 취소 요청
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
          <span className="text-sm text-muted-foreground">
            마지막 페이지입니다
          </span>
        ) : null}
      </div>

      {hasMore && isValidating ? <RentalsListSkeleton count={2} /> : null}

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
