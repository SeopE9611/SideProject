"use client";

import ApplicationStatusBadge from "@/app/features/stringing-applications/components/ApplicationStatusBadge";
import { normalizeCollection } from "@/app/features/stringing-applications/lib/collection";
import { collectionMethodLabel } from "@/app/features/stringing-applications/lib/fulfillment-labels";
import ServiceReviewCTA from "@/components/reviews/ServiceReviewCTA";
import AsyncState from "@/components/system/AsyncState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/public/EmptyState";
import { PublicSurface } from "@/components/public/PublicSurface";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { readCancelRequestError } from "@/lib/cancel-request/refund-account-client";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/lib/toast";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import {
  ArrowRight,
  Ban,
  CheckCircle,
  Clock,
  FileText,
  Phone,
  Undo2,
  User,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MdSportsTennis } from "react-icons/md";
import { useSWRConfig } from "swr";
import useSWRInfinite from "swr/infinite";

type AcademyClassSnapshotForApplication = {
  classId: string;
  name: string;
  lessonTypeLabel?: string | null;
  levelLabel?: string | null;
  location?: string | null;
  scheduleText?: string | null;
  price?: number | null;
};

export interface Application {
  id: string;
  _id?: string;
  kind?: "stringing" | "academy_lesson";
  type: "스트링 장착 서비스" | "아카데미 레슨 신청" | "아카데미 수강 신청";
  title?: string;
  applicantName: string | null;
  phone: string | null;
  appliedAt: string;
  status: string;
  statusLabel?: string;
  racketType?: string;
  stringType?: string;
  preferredDate?: string;
  preferredTime?: string;

  visitSlotCount?: number | null;
  visitDurationMinutes?: number | null;

  course?: string;
  schedule?: string;
  desiredLessonType?: string | null;
  desiredLessonTypeLabel?: string;
  currentLevel?: string | null;
  currentLevelLabel?: string;
  preferredDays?: string[];
  preferredTimeText?: string | null;
  lessonGoal?: string | null;
  requestMemo?: string | null;
  customerMessage?: string | null;
  classSnapshot?: AcademyClassSnapshotForApplication | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  hasTracking?: boolean;
  cancelStatus?: string; // '요청' | '승인' | '거절' | 'none'
  cancelReasonSummary?: string | null;

  // /api/applications/me 에서 내려주는 파생값
  inboundRequired?: boolean; // 고객→매장 입고 필요 여부
  needsInboundTracking?: boolean; // 입고가 필요하고 + 자가발송(self_ship)이라 운송장 입력이 필요한지

  // 이 신청이 어떤 주문에서 생성되었는지 연결 정보
  orderId?: string | null;
  rentalId?: string | null;

  // 사용자 확정 시각(없으면 null) - 교체확정 완료 여부 판단용
  userConfirmedAt?: string | null;
  packageApplied?: boolean;
  paymentStatus?: string | null;
  paymentProvider?: string | null;
}

type AppResponse = { items: Application[]; total: number };

type CancelStringingParams = {
  reasonCode: string;
  reasonText?: string;
  refundAccount?: { bank: string; account: string; holder: string };
};

const shouldRequestCancelRefundAccount = (app?: Application | null) => {
  if (!app) return true;
  const normalizedProvider = String(app.paymentProvider ?? "")
    .trim()
    .toLowerCase();
  return (
    !app.packageApplied && app.paymentStatus === "결제완료" && normalizedProvider !== "nicepay"
  );
};

const getNoRefundAccountMessage = (app?: Application | null) => {
  const normalizedProvider = String(app?.paymentProvider ?? "")
    .trim()
    .toLowerCase();
  if (app?.packageApplied)
    return "패키지 사용 신청은 환불계좌 입력 없이 취소 요청할 수 있습니다. 승인 시 사용 회차 복원 기준으로 처리됩니다.";
  if (normalizedProvider === "nicepay")
    return "카드 결제 취소는 환불계좌 없이 요청할 수 있습니다. 관리자 승인 후 결제사 취소 또는 주문 취소 흐름에 따라 처리됩니다.";
  return "이 신청은 환불계좌 입력 없이 취소 요청할 수 있습니다.";
};

const ApplicationsListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, idx) => (
      <PublicSurface key={idx} padding="md" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-full max-w-sm" />
            <Skeleton className="h-4 w-44" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:justify-end">
          <Skeleton className="h-9 w-full md:w-24" />
          <Skeleton className="h-9 w-full md:w-24" />
        </div>
      </PublicSurface>
    ))}
  </div>
);

const formatAcademyClassPrice = (price?: number | null) => {
  if (typeof price === "number" && price > 0) {
    return `${price.toLocaleString("ko-KR")}원`;
  }
  return "상담 후 안내";
};

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

// --- 희망 일시 포맷터 (방문 예약 전용) ---

const pad2 = (n: number) => String(n).padStart(2, "0");

const formatVisitTimeRange = (
  preferredDate?: string,
  preferredTime?: string,
  durationMinutes?: number | null,
  slotCount?: number | null,
): string => {
  if (!preferredDate || !preferredTime) {
    return "예약 일시 미입력";
  }

  const [hh, mm] = preferredTime.split(":");
  const h = Number(hh);
  const m = Number(mm);

  if (!Number.isFinite(h) || !Number.isFinite(m) || !durationMinutes || durationMinutes <= 0) {
    // duration 없으면 예전처럼 시작 시각만
    return `${preferredDate} ${preferredTime}`;
  }

  const startTotal = h * 60 + m;
  const endTotal = startTotal + durationMinutes;

  const endH = Math.floor(endTotal / 60) % 24;
  const endM = endTotal % 60;
  const endTimeStr = `${pad2(endH)}:${pad2(endM)}`;

  const baseRange = `${preferredDate} ${preferredTime} ~ ${endTimeStr}`;

  if (slotCount && slotCount > 0) {
    return `${baseRange} (${slotCount}슬롯 / 총 ${durationMinutes}분)`;
  }
  return `${baseRange} (총 ${durationMinutes}분)`;
};

const fetcher = (url: string) => authenticatedSWRFetcher<AppResponse>(url);

const LIMIT = 5;
const CancelStringingDialog = dynamic(() => import("./CancelStringingDialog"), {
  loading: () => null,
});

// 신청 상태별 아이콘
const getApplicationStatusIcon = (status: Application["status"]) => {
  switch (status) {
    case "검토 중":
      return <Clock className="h-4 w-4 text-warning" />;
    case "접수완료":
      return <CheckCircle className="h-4 w-4 text-primary" />;
    case "작업 중":
      return <Clock className="h-4 w-4 text-foreground" />;
    case "교체완료":
      return <CheckCircle className="h-4 w-4 text-primary" />;
    default:
      return <Ban className="h-4 w-4 text-destructive" />;
  }
};

const getAcademyStatusVariant = (status: string) => {
  switch (status) {
    case "confirmed":
    case "등록 확정":
      return "success" as const;
    case "reviewing":
    case "검토 중":
      return "warning" as const;
    case "contacted":
    case "상담 완료":
      return "info" as const;
    case "cancelled":
    case "취소":
      return "danger" as const;
    case "submitted":
    case "접수완료":
    default:
      return "neutral" as const;
  }
};

export default function ApplicationsClient() {
  const router = useRouter();

  const { mutate: globalMutate } = useSWRConfig();
  // 교체확정 요청 중(신청서별로 1개만)
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  // SWR Infinite 키 생성
  const getKey = (pageIndex: number, previousPageData: AppResponse | null) => {
    // 직전 페이지가 LIMIT 미만이면 다음 페이지 없음
    if (previousPageData && previousPageData.items && previousPageData.items.length < LIMIT)
      return null;

    const page = pageIndex + 1;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(LIMIT));

    // 필터/검색 대비용
    // if (statusFilter) params.set('status', statusFilter);
    // if (keyword) params.set('q', keyword);
    // if (dateFrom) params.set('dateFrom', dateFrom);

    return `/api/applications/me?${params.toString()}`;
  };

  const { data, size, setSize, isValidating, error, mutate } = useSWRInfinite<AppResponse>(
    getKey,
    fetcher,
    {
      revalidateFirstPage: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  // 취소 요청 Dialog 제어용 상태
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);

  const handleOpenCancel = (id: string) => {
    setTargetId(id);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async (params: CancelStringingParams) => {
    if (!targetId) return;

    try {
      setIsCancelSubmitting(true);

      const res = await fetch(`/api/applications/stringing/${targetId}/cancel-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reasonCode: params.reasonCode,
          reasonText: params.reasonText,
          ...(params.refundAccount ? { refundAccount: params.refundAccount } : {}),
        }),
      });

      if (!res.ok) {
        const parsed = await readCancelRequestError(res, "취소 요청 처리 중 오류가 발생했습니다.");
        showErrorToast(parsed.message);
        return;
      }

      showSuccessToast("취소 요청을 접수했습니다.");

      // Dialog 닫기 + 선택된 ID 초기화
      setCancelDialogOpen(false);
      setTargetId(null);

      // 목록 재검증(취소 요청 뱃지/버튼 상태 갱신)
      await mutate();
    } catch (error) {
      console.error(error);
      showErrorToast("취소 요청 처리 중 오류가 발생했습니다.");
    } finally {
      setIsCancelSubmitting(false);
    }
  };

  const handleWithdrawCancelRequest = async (applicationId: string) => {
    if (!confirm("이 신청의 취소 요청을 철회하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/applications/${applicationId}/cancel-request-withdraw`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = data?.message || "취소 요청 철회 중 오류가 발생했습니다.";
        showErrorToast(msg);
        return;
      }

      showSuccessToast("취소 요청을 철회했습니다.");

      // 신청 목록 전체 재검증 → 취소 요청 뱃지/버튼 상태 갱신
      await mutate();
    } catch (e) {
      console.error(e);
      showErrorToast("취소 요청 철회 중 오류가 발생했습니다.");
    }
  };

  // 교체확정(사용자) - 교체완료 상태에서만 가능
  const handleConfirmService = async (applicationId: string) => {
    if (confirmingId) return;

    const ok = confirm(
      "교체서비스 확정을 진행할까요?\n\n확정 후에는 포인트가 지급되며, 되돌릴 수 없습니다.",
    );
    if (!ok) return;

    try {
      setConfirmingId(applicationId);

      const res = await fetch(`/api/applications/stringing/${applicationId}/confirm`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        showErrorToast(
          data?.message || data?.error || "교체서비스 확정 처리 중 오류가 발생했습니다.",
        );
        return;
      }

      if (data?.already) {
        showSuccessToast(data?.message || "이미 교체서비스 확정된 신청입니다.");
      } else {
        const earned = Number(data?.earnedPoints ?? 0);
        showSuccessToast(
          earned > 0 ? `교체서비스 확정 완료 (+${earned}P 적립)` : "교체서비스 확정 완료",
        );
      }

      // 신청 목록 재검증
      await mutate();

      // 다른 탭(포인트/주문)도 UX상 갱신되도록 재검증
      await globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/points/me"),
        undefined,
        { revalidate: true },
      );
      await globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/users/me/orders"),
        undefined,
        { revalidate: true },
      );
    } catch (e) {
      console.error(e);
      showErrorToast("교체서비스 확정 처리 중 오류가 발생했습니다.");
    } finally {
      setConfirmingId(null);
    }
  };

  // 누적 리스트
  const applications = useMemo(() => (data ? data.flatMap((d) => d.items) : []), [data]);
  const cancelTargetApplication = targetId
    ? (applications.find((app) => app.id === targetId) ?? null)
    : null;

  // 더 보기 여부
  const hasMore = useMemo(() => {
    if (!data || data.length === 0) return false;
    const last = data[data.length - 1];
    return (last?.items?.length ?? 0) === LIMIT;
  }, [data]);

  // 에러
  if (error) {
    return (
      <AsyncState kind="error" variant="card" resourceName="신청 내역" onAction={() => mutate()} />
    );
  }

  const isInitialLoading = !data && isValidating;

  return (
    <div className="space-y-4 md:space-y-6">
      {isInitialLoading ? <ApplicationsListSkeleton count={3} /> : null}
      {!isInitialLoading && applications.length === 0 ? (
        <EmptyState
          icon={
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background shadow-sm">
              <FileText className="h-8 w-8 text-success" />
            </div>
          }
          title="신청 내역이 없습니다"
          description="아직 신청하신 서비스가 없습니다. 필요한 서비스를 신청하고 진행 상태를 이곳에서 확인해 보세요."
          action={
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button asChild>
                <Link href="/services/apply?mode=single">교체서비스 신청하기</Link>
              </Button>
              <Button asChild variant="outline" className="bg-transparent">
                <Link href="/services">서비스 안내 보기</Link>
              </Button>
            </div>
          }
          className="rounded-2xl py-12"
        />
      ) : null}

      {!isInitialLoading
        ? applications.map((app) => {
            const isAcademyLesson =
              app.kind === "academy_lesson" ||
              app.type === "아카데미 레슨 신청" ||
              app.type === "아카데미 수강 신청";
            const isStringService = !isAcademyLesson && app.type === "스트링 장착 서비스";
            // collectionMethod는 "방문/자가발송" 라벨 표시에만 사용 (버튼 노출 조건은 needsInboundTracking 사용)
            const cm = normalizeCollection(
              (app as any).collectionMethod ?? (app as any).shippingInfo?.collectionMethod,
            );

            // Step1에서 내려준 파생값(고증 보정 핵심)
            // - inboundRequired=false  : 주문(라켓 포함)/대여 기반 → 고객이 보낼 필요 없음
            // - needsInboundTracking=true : 고객 자가발송 케이스 → 운송장 등록 UI 필요
            const inboundRequired = isStringService ? Boolean((app as any).inboundRequired) : false;
            const needsInboundTracking = isStringService
              ? Boolean((app as any).needsInboundTracking)
              : false;

            // 자가발송(운송장 입력이 필요한 경우에만 true)
            const isSelfShip = isStringService && needsInboundTracking;
            const isVisit = isStringService && cm === "visit";

            // 방문 예약 희망 일시 라벨 (목록 카드용)
            const visitTimeLabel =
              isStringService && isVisit && app.preferredDate && app.preferredTime
                ? formatVisitTimeRange(
                    app.preferredDate,
                    app.preferredTime,
                    app.visitDurationMinutes ?? null,
                    app.visitSlotCount ?? null,
                  ).replace(/-/g, ".")
                : null;

            // 라벨 고증에 맞게 보정
            const collectionLabel = !isStringService
              ? null
              : !inboundRequired
                ? "접수 방식: 입고 불필요(주문/대여 기반)"
                : cm === "self_ship" || cm === "courier_pickup" || cm === "visit"
                  ? `접수 방식: ${collectionMethodLabel(cm)}`
                  : "접수 방식: 기타";

            // 운송장 등록 여부
            const hasTracking = app.hasTracking;
            // 연결된 주문/대여 ID
            const orderId = (app as any).orderId as string | null | undefined;
            const rentalId = (app as any).rentalId as string | null | undefined;

            // 우선순위: 주문 기반(orderId) > 대여 기반(rentalId)
            const hasOrderLink = Boolean(orderId);
            const hasRentalLink = !hasOrderLink && Boolean(rentalId);
            const isLinkedApplication = Boolean(orderId || rentalId);
            const canShowInboundTracking =
              isStringService && needsInboundTracking && !isLinkedApplication;

            // 종료 상태(수정 금지)
            const CLOSED = ["작업 중", "교체완료"];
            const isClosed = CLOSED.includes(String((app as any).status));

            // 취소 상태 계산 (한글/영문 둘 다 대응)
            const rawCancelStatus = app.cancelStatus ?? "none";
            const isCancelRequested = rawCancelStatus === "요청" || rawCancelStatus === "requested";
            const isCancelRejected = rawCancelStatus === "거절" || rawCancelStatus === "rejected";

            // 취소 요청 가능 여부
            const isCancelable =
              isStringService && ["접수완료", "검토 중"].includes(app.status) && !isCancelRequested; // 요청 상태가 아니면 언제든 다시 취소 요청 가능
            const title = isStringService
              ? `${app.racketType?.trim() || "라켓 미입력"} / ${app.stringType?.trim() || "스트링 미입력"}`
              : app.title?.trim() || "아카데미 레슨 신청";
            const displayStatus = isAcademyLesson ? app.statusLabel || app.status : app.status;
            const preferredDaysLabel = app.preferredDays?.length
              ? app.preferredDays.join(", ")
              : "희망 요일 미입력";
            const metaLinkLabel = isAcademyLesson
              ? null
              : hasOrderLink
                ? "주문 기반 교체서비스"
                : hasRentalLink
                  ? "대여 기반 장착 정보"
                  : "단독 교체서비스";
            const detailHref = isAcademyLesson
              ? `/mypage/academy-applications/${app.id}`
              : hasOrderLink && orderId
                ? `/mypage?tab=orders&flowType=order&flowId=${orderId}&from=orders&focus=stringing`
                : `/mypage?tab=orders&flowType=application&flowId=${app.id}&from=orders`;
            const nextActionLabel = isCancelRequested
              ? "취소 요청 확인을 기다려주세요."
              : canShowInboundTracking
                ? hasTracking
                  ? "라켓 발송 운송장을 수정할 수 있어요."
                  : "라켓 발송 운송장을 등록해주세요."
                : isLinkedApplication
                  ? "연결된 주문/대여 상세에서 진행 상황을 확인해보세요."
                  : isStringService && app.status === "교체완료" && !(app as any).userConfirmedAt
                    ? "작업 내용을 확인하고 교체서비스 확정을 진행해주세요."
                    : app.status === "교체완료" || app.status === "취소"
                      ? "추가로 진행할 일은 없습니다."
                      : "상세에서 신청 진행 상황을 확인해주세요.";

            return (
              <PublicSurface
                key={app.id}
                data-cy="mypage-application-summary-card"
                padding="sm"
                className="space-y-4 transition-[box-shadow,border-color] duration-200 hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 break-keep text-ui-body font-semibold text-foreground">
                      {title}
                    </h3>
                    <p className="mt-1 text-ui-label tabular-nums text-muted-foreground">
                      {app.type} · 신청일 {formatDateTime(app.appliedAt)}
                    </p>
                  </div>
                  <div
                    className="flex shrink-0 items-center gap-2"
                    data-cy="mypage-application-status-wrap"
                  >
                    {isAcademyLesson ? (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      getApplicationStatusIcon(app.status)
                    )}
                    <span data-cy="mypage-application-status-badge">
                      {isAcademyLesson ? (
                        <Badge
                          variant={getAcademyStatusVariant(app.status)}
                          className="shrink-0 whitespace-nowrap text-ui-micro font-medium"
                        >
                          {displayStatus}
                        </Badge>
                      ) : (
                        <ApplicationStatusBadge status={app.status} />
                      )}
                    </span>
                    {isCancelRequested ? (
                      <Badge
                        variant="warning"
                        className="shrink-0 whitespace-nowrap text-ui-micro font-medium"
                      >
                        취소 요청됨
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 rounded-xl border border-border/50 bg-muted/20 p-2 md:grid-cols-3">
                  {isStringService ? (
                    <>
                      <div className="min-w-0 rounded-lg bg-card/80 px-3 py-2">
                        <p className="text-ui-label text-muted-foreground">라켓 수</p>
                        <p className="mt-1 text-ui-body-sm font-semibold text-foreground">
                          {(app as any).rackets?.length ? `${(app as any).rackets.length}개` : app.racketType?.trim() ? "1개" : "미입력"}
                        </p>
                      </div>
                      <div className="min-w-0 rounded-lg bg-card/80 px-3 py-2">
                        <p className="text-ui-label text-muted-foreground">방문/발송 상태</p>
                        <p className="mt-1 line-clamp-1 break-keep text-ui-body-sm font-semibold text-foreground">
                          {isVisit && app.preferredDate && app.preferredTime ? visitTimeLabel : collectionLabel || (hasTracking ? "운송장 등록됨" : "운송장 미등록")}
                        </p>
                      </div>
                      <div className="min-w-0 rounded-lg bg-card/80 px-3 py-2">
                        <p className="text-ui-label text-muted-foreground">연결 서비스</p>
                        <p className="mt-1 line-clamp-1 break-keep text-ui-body-sm font-semibold text-foreground">
                          {metaLinkLabel ?? "단독 교체서비스"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                        <MdSportsTennis className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-ui-label uppercase tracking-wide text-muted-foreground">
                            희망 레슨 유형
                          </p>
                          <p className="font-medium text-foreground">
                            {app.desiredLessonTypeLabel ?? "미선택"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-ui-label uppercase tracking-wide text-muted-foreground">
                            현재 실력
                          </p>
                          <p className="font-medium text-foreground">
                            {app.currentLevelLabel ?? "미선택"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-ui-label uppercase tracking-wide text-muted-foreground">
                            희망 요일
                          </p>
                          <p className="break-words font-medium text-foreground">
                            {preferredDaysLabel}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-ui-label uppercase tracking-wide text-muted-foreground">
                            희망 시간대
                          </p>
                          <p className="break-words font-medium text-foreground">
                            {app.preferredTimeText?.trim() || "희망 시간 미입력"}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {isAcademyLesson ? (
                  <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-3 text-ui-body-sm text-foreground">
                    <p className="text-muted-foreground">
                      신청 내용 확인 후 도깨비테니스에서 상담을 도와드립니다.
                    </p>

                    {app.classSnapshot ? (
                      <div className="rounded-xl border border-border/50 bg-background p-3">
                        <p className="text-ui-label font-medium uppercase tracking-wide text-muted-foreground">
                          선택 클래스
                        </p>
                        <p className="mt-1 break-keep font-semibold text-foreground">
                          {app.classSnapshot.name || "클래스명 미입력"}
                        </p>
                        <dl className="mt-3 grid gap-2 text-ui-body-sm text-muted-foreground md:grid-cols-2">
                          <div>
                            <dt className="text-ui-label uppercase tracking-wide">수업 유형</dt>
                            <dd className="mt-0.5 font-medium text-foreground">
                              {app.classSnapshot.lessonTypeLabel || "미선택"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-ui-label uppercase tracking-wide">레벨</dt>
                            <dd className="mt-0.5 font-medium text-foreground">
                              {app.classSnapshot.levelLabel || "미선택"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-ui-label uppercase tracking-wide">일정</dt>
                            <dd className="mt-0.5 break-keep font-medium text-foreground">
                              {app.classSnapshot.scheduleText || "상담 후 조율"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-ui-label uppercase tracking-wide">장소</dt>
                            <dd className="mt-0.5 break-keep font-medium text-foreground">
                              {app.classSnapshot.location || "상담 후 안내"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-ui-label uppercase tracking-wide">수강료</dt>
                            <dd className="mt-0.5 font-medium text-foreground">
                              {formatAcademyClassPrice(app.classSnapshot.price)}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    ) : null}

                    {app.lessonGoal ? (
                      <div>
                        <p className="text-ui-label font-medium uppercase tracking-wide text-muted-foreground">
                          레슨 목표
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words">{app.lessonGoal}</p>
                      </div>
                    ) : null}
                    {app.requestMemo ? (
                      <div>
                        <p className="text-ui-label font-medium uppercase tracking-wide text-muted-foreground">
                          요청사항
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words">{app.requestMemo}</p>
                      </div>
                    ) : null}
                    {app.customerMessage ? (
                      <div className="rounded-lg border border-info/30 bg-info/10 p-3 text-info dark:bg-info/15">
                        <p className="text-ui-label font-semibold">관리자 안내</p>
                        <p className="mt-1 whitespace-pre-wrap break-words">
                          {app.customerMessage}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-2 border-t border-border/60 pt-3 bp-sm:flex bp-sm:flex-wrap bp-sm:items-center md:pt-4 [&_button]:w-full bp-sm:[&_button]:w-auto">
                  <p className="break-keep text-ui-label leading-relaxed text-muted-foreground bp-sm:mr-auto">
                    <span className="font-semibold text-foreground">다음 할 일</span> · {nextActionLabel}
                  </p>
                  {isStringService || isAcademyLesson ? (
                    <Button
                      data-cy="mypage-application-detail-cta"
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(detailHref)}
                      className="bg-transparent"
                    >
                      상세 보기
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  ) : null}

                  {hasOrderLink && orderId ? (
                    <Button asChild size="sm" variant="outline" className="bg-transparent">
                      <Link
                        href={`/mypage?tab=orders&flowType=order&flowId=${orderId}&from=orders`}
                      >
                        주문 상세 보기
                      </Link>
                    </Button>
                  ) : null}
                  {hasRentalLink && rentalId ? (
                    <Button asChild size="sm" variant="outline" className="bg-transparent">
                      <Link
                        href={`/mypage?tab=orders&flowType=rental&flowId=${rentalId}&from=orders`}
                      >
                        대여 상세 보기
                      </Link>
                    </Button>
                  ) : null}

                  {canShowInboundTracking ? (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 sm:col-span-2 md:w-full">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-ui-body-sm">
                        <span className="font-medium text-foreground">운송장 상태</span>
                        <Badge variant={hasTracking ? "outline" : "default"}>
                          {hasTracking ? "등록됨" : "등록 필요"}
                        </Badge>
                      </div>
                      <p className="mb-3 text-ui-label leading-relaxed text-muted-foreground">
                        {hasTracking
                          ? "등록된 운송장을 수정할 수 있습니다."
                          : "라켓을 보내신 뒤 운송장을 등록해 주세요."}
                      </p>
                      {isClosed ? (
                        <Button
                          data-cy="mypage-application-shipping-cta"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            showInfoToast("이미 종료된 신청서입니다. 운송장 수정이 불가합니다.")
                          }
                        >
                          운송장 수정
                        </Button>
                      ) : (
                        <Button
                          data-cy="mypage-application-shipping-cta"
                          variant={hasTracking ? "outline" : "default"}
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/services/applications/${app.id}/shipping?return=${encodeURIComponent("/mypage?tab=orders")}`,
                            )
                          }
                        >
                          {hasTracking ? "운송장 수정" : "운송장 등록"}
                        </Button>
                      )}
                    </div>
                  ) : null}

                  {isStringService && !isLinkedApplication && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block">
                            {(() => {
                              const userConfirmedAt = (app as any).userConfirmedAt ?? null;
                              const isUserConfirmed = Boolean(userConfirmedAt);

                              const canConfirm =
                                !isLinkedApplication &&
                                app.status === "교체완료" &&
                                !isUserConfirmed &&
                                !isCancelRequested &&
                                confirmingId !== app.id;

                              const label =
                                confirmingId === app.id
                                  ? "확정 중…"
                                  : isUserConfirmed
                                    ? "교체서비스 확정 완료"
                                    : "교체서비스 확정";

                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={!canConfirm}
                                  onClick={() => handleConfirmService(app.id)}
                                >
                                  <CheckCircle className="mr-1 h-4 w-4" />
                                  {label}
                                </Button>
                              );
                            })()}
                          </span>
                        </TooltipTrigger>

                        <TooltipContent>
                          {(() => {
                            const userConfirmedAt = (app as any).userConfirmedAt ?? null;
                            const isUserConfirmed = Boolean(userConfirmedAt);

                            if (confirmingId === app.id)
                              return <p>교체서비스 확정 처리 중입니다.</p>;
                            if (isUserConfirmed) return <p>이미 교체서비스 확정된 신청입니다.</p>;
                            if (isCancelRequested)
                              return <p>취소 요청 처리 중에는 확정할 수 없습니다.</p>;
                            if (app.status !== "교체완료")
                              return <p>교체완료 상태에서만 교체서비스 확정이 가능합니다.</p>;

                            return <p>교체서비스 확정 시 포인트가 지급됩니다.</p>;
                          })()}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {isStringService && (
                    <ServiceReviewCTA
                      applicationId={app.id}
                      status={app.status}
                      userConfirmedAt={app.userConfirmedAt ?? null}
                      className="w-auto"
                    />
                  )}

                  {isCancelRequested ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleWithdrawCancelRequest(app.id)}
                      className="gap-2"
                    >
                      <Undo2 className="h-4 w-4" />
                      취소 요청 철회
                    </Button>
                  ) : (
                    isCancelable && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleOpenCancel(app.id)}
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        취소 요청
                      </Button>
                    )
                  )}
                </div>
              </PublicSurface>
            );
          })
        : null}

      {/* '더 보기' 버튼 */}
      <div className="mt-6 flex justify-center items-center">
        {hasMore ? (
          <Button variant="outline" onClick={() => setSize(size + 1)} disabled={isValidating}>
            더 보기
          </Button>
        ) : applications.length ? (
          <span className="text-ui-body-sm text-foreground/80">마지막 페이지입니다</span>
        ) : null}
      </div>

      {hasMore && isValidating ? <ApplicationsListSkeleton count={2} /> : null}

      {/* 취소 요청 버튼 클릭 시에만 다이얼로그 코드를 로드 */}
      {cancelDialogOpen && targetId ? (
        <CancelStringingDialog
          open={cancelDialogOpen}
          onOpenChange={(open) => {
            setCancelDialogOpen(open);
            if (!open) {
              setTargetId(null);
            }
          }}
          onConfirm={handleConfirmCancel}
          isSubmitting={isCancelSubmitting}
          needsRefundAccount={shouldRequestCancelRefundAccount(cancelTargetApplication)}
          noRefundAccountMessage={getNoRefundAccountMessage(cancelTargetApplication)}
        />
      ) : null}
    </div>
  );
}
