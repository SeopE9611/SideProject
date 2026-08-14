"use client";

import AdminPageShell from "@/components/admin/AdminPageShell";
import {
  AdminListBody,
  AdminListCell,
  AdminListColumnHeader,
  AdminListPrimary,
  AdminListRow,
  AdminListTable,
  AdminMoneyBlock,
  AdminRowActions,
  AdminStatusGroup,
} from "@/components/admin/AdminListTable";
import { adminDataTable } from "@/components/admin/AdminDataTable";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminReferencePopover from "@/components/admin/AdminReferencePopover";
import AdminRowActionMenu from "@/components/admin/AdminRowActionMenu";
import { AdminSemanticBadge as Badge } from "@/components/admin/AdminSemanticBadge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  badgeBase,
  badgeSizeSm,
  badgeToneVariant,
  getPaymentStatusBadgeSpec,
  getRentalStatusBadgeSpec,
} from "@/lib/badge-style";
import { shortenId } from "@/lib/shorten";
import { showErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  Package,
  Search,
  Truck,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
// import CleanupCreatedButton from '@/app/admin/rentals/_components/CleanupCreatedButton';
import { derivePaymentStatus, deriveShippingStatus } from "@/app/features/rentals/utils/status";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { runAdminActionWithToast } from "@/lib/admin/adminActionHelpers";
import {
  getCommonApplicationStatusLabel,
  getCommonRentalStatusLabel,
} from "@/lib/status-labels/base";
import {
  adminMutator,
  ensureAdminMutationSucceeded,
  getAdminErrorMessage,
} from "@/lib/admin/adminFetcher";
import { racketBrandLabel } from "@/lib/constants";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import type {
  AdminRentalListItemDto,
  AdminRentalPaymentFilter,
  AdminRentalShippingFilter,
  AdminRentalsListResponseDto,
} from "@/types/admin/rentals";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type RentalRow = AdminRentalListItemDto & {
  id: string;
  createdAt: string;
  dueAt: string | null;
  depositRefundedAt: string | null;
};

const RENTAL_LIST_COLUMNS =
  "grid-cols-[minmax(220px,1.1fr)_minmax(210px,1fr)_minmax(230px,1.05fr)_130px_130px]";

const PAY_FILTERS: AdminRentalPaymentFilter[] = ["all", "unpaid", "paid"];
const SHIP_FILTERS: AdminRentalShippingFilter[] = [
  "all",
  "none",
  "outbound-set",
  "return-set",
  "both-set",
];

function toIsoOrNull(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mapApiToViewModel(response: AdminRentalsListResponseDto): {
  items: RentalRow[];
  total: number;
} {
  return {
    total: response.total,
    items: response.items.map((item) => ({
      ...item,
      id: item.id ?? "",
      createdAt: toIsoOrNull(item.createdAt) ?? new Date(0).toISOString(),
      dueAt: toIsoOrNull(item.dueAt),
      depositRefundedAt: toIsoOrNull(item.depositRefundedAt),
    })),
  };
}

const won = (n: number) => (n || 0).toLocaleString("ko-KR") + "원";

function isRentalReturnedStatus(status?: string | null) {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase();
  return normalized === "returned" || normalized.includes("반납완료");
}

const rentalStatusLabels: Record<string, string> = {
  pending: "대기중",
  paid: "결제완료",
  out: "대여중",
  rented: "대여중",
  returned: "반납완료",
  overdue: "연체",
  canceled: "취소됨",
  cancelled: "취소됨",
};

function getRentalStatusDisplayLabel(status?: string | null): string {
  const normalized = String(status ?? "").trim();
  return getCommonRentalStatusLabel(normalized) ?? rentalStatusLabels[normalized] ?? normalized;
}

function getStringingApplicationStatusDisplayLabel(status?: string | null): string {
  const normalized = String(status ?? "").trim();
  return getCommonApplicationStatusLabel(normalized) ?? normalized;
}

const paymentFilterLabels: Record<AdminRentalPaymentFilter, string> = {
  all: "결제 전체",
  unpaid: "결제대기",
  paid: "결제완료",
};

const shippingFilterLabels: Record<AdminRentalShippingFilter, string> = {
  all: "운송장 전체",
  none: "운송장 없음 / 방문 수령",
  "outbound-set": "인도 운송장 등록",
  "return-set": "반납 운송장 등록",
  "both-set": "왕복 운송장 등록",
};

const AdminConfirmDialog = dynamic(() => import("@/components/admin/AdminConfirmDialog"), {
  loading: () => null,
});

export default function AdminRentalsClient() {
  /**
   *  관리자 UX용 뱃지(대여 페이지)
   *  - Orders 페이지와 동일하게 “시나리오(F#)” + “정산 앵커”를 표준화해
   *    운영자가 페이지를 옮겨 다녀도 같은 언어로 인지할 수 있게 만든다.
   * - 운영자가 “이 대여가 단독인지 / 교체서비스 포함인지 / 신청서 연결인지”를 한눈에 확인.
   */
  function getServiceBadge(r: RentalRow) {
    if (r.withStringService) {
      return { label: "교체서비스 포함", variant: badgeToneVariant("brand") };
    }
    return { label: "단독", variant: "outline" as const };
  }
  function getLinkBadge(r: RentalRow) {
    if (r.stringingApplicationId) {
      return { label: "신청서 연결", variant: badgeToneVariant("info") };
    }
    return null;
  }

  type Flow = 6 | 7;
  const FLOW_LABEL: Record<Flow, string> = {
    6: "라켓 단품 대여",
    7: "라켓 대여 + 스트링 선택 + 교체서비스 신청(통합)",
  };
  function getFlowBadge(r: RentalRow) {
    // 대여 페이지에서는 “신청서 연결(또는 교체서비스 포함)”이면 통합(F7), 아니면 단독 대여(F6)로 취급
    const isIntegrated = !!r.stringingApplicationId || !!r.withStringService;
    const flow: Flow = isIntegrated ? 7 : 6;
    return {
      flow,
      label: FLOW_LABEL[flow],
    };
  }

  function getRentalNextAction(r: RentalRow) {
    if (r.cancelRequest?.status === "requested") return "취소 처리";
    if (derivePaymentStatus(r) !== "paid") return "결제 확인하기";
    if (r.status === "paid") return "인도 처리하기";
    if (r.status === "out") return "반납 처리하기";
    if (isRentalReturnedStatus(r.status) && !r.depositRefundedAt) return "환불 확인하기";
    return "대여 상세";
  }

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<null | {
    type: "return" | "refundMark" | "refundClear";
    rentalId: string;
  }>(null);
  const [status, setStatus] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const initialPay = searchParams.get("pay");
  const [payFilter, setPayFilter] = useState<AdminRentalPaymentFilter>(
    initialPay && PAY_FILTERS.includes(initialPay as AdminRentalPaymentFilter)
      ? (initialPay as AdminRentalPaymentFilter)
      : "all",
  );
  const initialShip = searchParams.get("ship");
  const [shipFilter, setShipFilter] = useState<AdminRentalShippingFilter>(
    initialShip && SHIP_FILTERS.includes(initialShip as AdminRentalShippingFilter)
      ? (initialShip as AdminRentalShippingFilter)
      : "all",
  );
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"date" | "total">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const pageSize = 20;
  // 쿼리 → 상태 1회 동기화(직접 새로고침 대비)
  /** URL 쿼리스트링을 읽어 현재 화면의 필터 상태로 반영 */
  function applyURLParamsToFilterState() {
    const get = (k: string) => searchParams.get(k) ?? "";

    // 검색/상태/결제/배송
    const queryText = get("q");
    const statusParam = get("status");
    const payParam = get("pay");
    const shipParam = get("ship");

    // 기간/페이지/정렬
    const fromParam = get("from");
    const toParam = get("to");
    const pageParam = Number(searchParams.get("page") ?? 1);
    const sortParam = searchParams.get("sort") ?? "";

    if (queryText) setSearchTerm(queryText);
    if (statusParam) setStatus(statusParam);
    if (payParam && PAY_FILTERS.includes(payParam as AdminRentalPaymentFilter))
      setPayFilter(payParam as AdminRentalPaymentFilter);
    if (shipParam && SHIP_FILTERS.includes(shipParam as AdminRentalShippingFilter))
      setShipFilter(shipParam as AdminRentalShippingFilter);
    if (fromParam) setFrom(fromParam);
    if (toParam) setTo(toParam);
    if (!Number.isNaN(pageParam) && pageParam > 0) setPage(pageParam);
    if (sortParam === "createdAt") {
      setSortBy("date");
      setSortDirection("asc");
    } else if (sortParam === "-createdAt") {
      setSortBy("date");
      setSortDirection("desc");
    } else if (sortParam === "total") {
      setSortBy("total");
      setSortDirection("asc");
    } else if (sortParam === "-total") {
      setSortBy("total");
      setSortDirection("desc");
    }
  }

  useEffect(() => {
    applyURLParamsToFilterState();
  }, []);

  const qs = new URLSearchParams();
  if (payFilter !== "all") qs.set("pay", payFilter);
  if (shipFilter !== "all") qs.set("ship", shipFilter);
  if (status) qs.set("status", status);

  if (searchTerm.trim()) qs.set("q", searchTerm.trim());
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const sort =
    sortBy === "date"
      ? sortDirection === "asc"
        ? "createdAt"
        : "-createdAt"
      : sortDirection === "asc"
        ? "total"
        : "-total";
  qs.set("sort", sort);
  function formatYMD(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function setPreset(range: "today" | "7d" | "30d" | "thisMonth") {
    setPage(1);
    const now = new Date();
    let f = new Date();
    let t = new Date();
    if (range === "today") {
      // f=t=오늘
    } else if (range === "7d") {
      f.setDate(now.getDate() - 6); // 오늘 포함 7일
    } else if (range === "30d") {
      f.setDate(now.getDate() - 29);
    } else if (range === "thisMonth") {
      f = new Date(now.getFullYear(), now.getMonth(), 1);
      t = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    setFrom(formatYMD(f));
    setTo(formatYMD(t));
  }

  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));
  const key = `/api/admin/rentals?${qs.toString()}`;

  /** 현재 필터 상태를 URL 쿼리스트링에 기록(히스토리 오염 방지를 위해 replace 사용) */
  function updateURLFromFilterState() {
    const url = new URL(window.location.href);

    const setParam = (key: string, value?: string | number | null) => {
      if (value === undefined || value === null || value === "" || value === "all") {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, String(value));
      }
    };

    setParam("q", searchTerm);
    setParam("status", status);
    setParam("pay", payFilter);
    setParam("ship", shipFilter);
    setParam("from", from);
    setParam("to", to);
    setParam("page", page === 1 ? undefined : page);
    setParam("sort", sort);

    router.replace(
      url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""),
    );
  }

  /** 화면의 필터 상태를 기본값으로 되돌리고, URL 쿼리도 함께 제거 */
  function resetAllFiltersAndURL() {
    setSearchTerm("");
    setStatus("");
    setFrom("");
    setTo("");
    setPayFilter("all");
    setShipFilter("all");
    setPage(1);
    setSortBy("date");
    setSortDirection("desc");
    router.replace(pathname); // 쿼리 전부 제거
  }

  // 상태 변경 시 URL 동기화 (200ms 디바운스)
  useEffect(() => {
    const timer = setTimeout(updateURLFromFilterState, 200);
    return () => clearTimeout(timer);
  }, [searchTerm, status, payFilter, shipFilter, from, to, page, sortBy, sortDirection]);

  const {
    data: apiData,
    isLoading,
    mutate,
    error,
  } = useSWR<AdminRentalsListResponseDto>(key, authenticatedSWRFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  // 3차 보완: API 응답 미확정(undefined)과 실제 빈 목록을 분리한다.
  const hasResolvedData = !!apiData;
  const hasDataError = !!error;
  const data = useMemo(() => (apiData ? mapApiToViewModel(apiData) : null), [apiData]);
  const commonErrorMessage = error ? getAdminErrorMessage(error) : null;

  useEffect(() => {
    if (commonErrorMessage) showErrorToast(commonErrorMessage);
  }, [commonErrorMessage]);

  const rentals = data?.items ?? [];

  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    Boolean(status) ||
    payFilter !== "all" ||
    shipFilter !== "all" ||
    Boolean(from) ||
    Boolean(to);

  const activeFilterLabels = [
    searchTerm.trim() ? `검색어: ${searchTerm.trim()}` : null,
    status ? `대여 상태: ${getRentalStatusDisplayLabel(status)}` : null,
    payFilter !== "all" ? `결제 상태: ${paymentFilterLabels[payFilter]}` : null,
    shipFilter !== "all" ? `배송 상태: ${shippingFilterLabels[shipFilter]}` : null,
    from ? `시작일: ${from}` : null,
    to ? `종료일: ${to}` : null,
  ].filter((label): label is string => Boolean(label));

  const hasTextOrDateFilters = Boolean(searchTerm.trim() || from || to);
  const currentViewLabel = !hasActiveFilters
    ? "전체 대여"
    : !hasTextOrDateFilters && !status && payFilter === "unpaid" && shipFilter === "all"
      ? "결제대기"
      : !hasTextOrDateFilters && !status && payFilter === "all" && shipFilter === "none"
        ? "인도 필요"
        : !hasTextOrDateFilters && status === "out" && payFilter === "all" && shipFilter === "all"
          ? "반납 필요"
          : !hasTextOrDateFilters &&
              status === "returned" &&
              payFilter === "all" &&
              shipFilter === "all"
            ? "보증금 환불 확인"
            : "사용자 지정 조건";

  function applyQuickView(view: "unpaid" | "shipping" | "out" | "returned") {
    setSearchTerm("");
    setStatus(view === "out" ? "out" : view === "returned" ? "returned" : "");
    setFrom("");
    setTo("");
    setPayFilter(view === "unpaid" ? "unpaid" : "all");
    setShipFilter(view === "shipping" ? "none" : "all");
    setPage(1);
  }

  const shouldShowActualEmpty =
    hasResolvedData && !hasDataError && !hasActiveFilters && (data?.items.length ?? 0) === 0;

  const shouldShowSearchEmpty =
    hasResolvedData && !hasDataError && hasActiveFilters && (data?.items.length ?? 0) === 0;

  const markRefund = async (id: string, mark: boolean) => {
    if (busyId) return;
    setBusyId(id);

    const result = await runAdminActionWithToast<{
      ok?: boolean;
      message?: string;
    }>({
      action: async () => {
        const json = await adminMutator<{ ok?: boolean; message?: string }>(
          `/api/admin/rentals/${encodeURIComponent(id)}/deposit/refund`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: mark ? "mark" : "clear" }),
          },
        );
        ensureAdminMutationSucceeded(json, "처리 실패");
        return json;
      },
      successMessage: mark ? "환불 처리 완료" : "환불 해제 완료",
      fallbackErrorMessage: "처리 실패",
    });

    if (result) await mutate();
    setBusyId(null);
  };

  const onReturn = async (id?: string) => {
    const safe = (id ?? "").trim();
    if (!safe) {
      showErrorToast("유효하지 않은 대여 ID입니다.");
      return;
    }

    const result = await runAdminActionWithToast({
      action: () =>
        adminMutator(`/api/admin/rentals/${encodeURIComponent(safe)}/return`, {
          method: "POST",
        }),
      successMessage: "반납 처리 완료",
      fallbackErrorMessage: "반납 처리 실패",
    });

    if (result) mutate();
  };

  const handleSort = (key: "date" | "total") => {
    setPage(1);
    if (sortBy === key) {
      setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDirection("asc");
    }
  };

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat("ko-KR", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(dateString));

  function getPaginationItems(page: number, totalPages: number, delta = 2): (number | string)[] {
    if (totalPages <= 1) return [1];
    const items: (number | string)[] = [1];
    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);
    if (left > 2) items.push("dots-left");
    for (let i = left; i <= right; i++) items.push(i);
    if (right < totalPages - 1) items.push("dots-right");
    items.push(totalPages);
    return items;
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : null;
  function getShippingLabel(item: RentalRow) {
    if (item.servicePickupMethod === "SHOP_VISIT") {
      return "운송장 불필요";
    }

    const s = deriveShippingStatus(item);
    const map = {
      none: ["운송장 없음", "neutral"],
      "outbound-set": ["인도 운송장", "info"],
      "return-set": ["반납 운송장", "info"],
      "both-set": ["왕복 운송장", "success"],
    } as const;

    return map[s][0];
  }

  return (
    <AdminPageShell variant="wide" className="py-6">
      <div>
        <AdminPageHeader
          variant="compact"
          title="대여 관리"
          description="라켓 대여의 결제 확인, 인도, 반납, 보증금 환불, 연결 신청서를 한곳에서 관리합니다."
          icon={Truck}
          scope="범위: 라켓 대여 주문"
          helperText="교체서비스가 포함된 대여는 신청서 연결 상태를 함께 확인하세요."
        />

        <details className={cn("mb-5 rounded-lg border px-4 py-3", adminSurface.cardMuted)}>
          <summary className={cn("cursor-pointer", adminTypography.panelTitle)}>
            대여 업무 가이드
          </summary>
          <div className={cn("mt-3 grid grid-cols-3 gap-2", adminTypography.body)}>
            <p>
              <strong className="text-foreground">결제대기</strong> · 결제 확인 후 인도 처리
            </p>
            <p>
              <strong className="text-foreground">인도 운송장 없음</strong> · 택배 발송 전 운송장
              등록
            </p>
            <p>
              <strong className="text-foreground">반납 필요</strong> · 대여 종료 후 반납 확인
            </p>
            <p>
              <strong className="text-foreground">보증금 환불</strong> · 반납 완료 후 환불 여부 확인
            </p>
            <p>
              <strong className="text-foreground">취소 요청</strong> · 환불 계좌 준비 여부 확인
            </p>
            <p>
              <strong className="text-foreground">교체서비스 포함</strong> · 연결 신청서 상세와 함께
              확인
            </p>
          </div>
        </details>
        {/* 유지보수: created 청소 버튼 */}
        {/* <CleanupCreatedButton hours={2} /> */}
      </div>

      <AdminFilterBar
        className="mb-4"
        quickFilters={
          <>
            <span className={cn("mr-1", adminTypography.panelTitleCompact)}>빠른 보기</span>
            <Button
              type="button"
              size="sm"
              variant={!hasActiveFilters ? "default" : "outline"}
              onClick={resetAllFiltersAndURL}
            >
              전체
            </Button>
            <Button
              type="button"
              size="sm"
              variant={currentViewLabel === "결제대기" ? "default" : "outline"}
              onClick={() => applyQuickView("unpaid")}
            >
              결제대기
            </Button>
            <Button
              type="button"
              size="sm"
              variant={currentViewLabel === "인도 필요" ? "default" : "outline"}
              onClick={() => applyQuickView("shipping")}
            >
              인도 필요
            </Button>
            <Button
              type="button"
              size="sm"
              variant={currentViewLabel === "반납 필요" ? "default" : "outline"}
              onClick={() => applyQuickView("out")}
            >
              반납 필요
            </Button>
            <Button
              type="button"
              size="sm"
              variant={currentViewLabel === "보증금 환불 확인" ? "default" : "outline"}
              onClick={() => applyQuickView("returned")}
            >
              보증금 환불 확인
            </Button>
          </>
        }
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            onClick={resetAllFiltersAndURL}
          >
            필터 초기화
          </Button>
        }
        activeFilters={
          <>
            <span className="font-medium text-foreground/80">현재 보기: {currentViewLabel}</span>
            {activeFilterLabels.map((label) => (
              <span
                key={label}
                className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1"
              >
                {label}
              </span>
            ))}
            {hasResolvedData && !hasDataError && data ? (
              <span className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 tabular-nums">
                전체 결과: {data.total.toLocaleString("ko-KR")}건
              </span>
            ) : null}
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(240px,2fr)_repeat(3,minmax(130px,1fr))]">
            <div className="relative min-w-0">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                value={searchTerm}
                onChange={(e) => {
                  setPage(1);
                  setSearchTerm(e.target.value);
                }}
                placeholder="대여 ID, 고객명, 이메일, 브랜드, 모델 검색..."
                className="h-9 w-full min-w-0 pl-8"
                aria-label="대여 통합 검색"
              />
            </div>
            <div className="min-w-0">
              <Select
                value={status || "all"}
                onValueChange={(v) => {
                  setPage(1);
                  setStatus(v === "all" ? "" : (v as string));
                }}
              >
                <SelectTrigger
                  className="h-9 w-full min-w-0 text-ui-label"
                  aria-label="대여 상태 필터"
                >
                  <SelectValue placeholder="상태(전체)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">상태(전체)</SelectItem>
                  <SelectItem value="pending">대기중</SelectItem>
                  <SelectItem value="paid">결제완료</SelectItem>
                  <SelectItem value="out">대여중</SelectItem>
                  <SelectItem value="returned">반납완료</SelectItem>
                  <SelectItem value="canceled">취소</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Select
                value={payFilter}
                onValueChange={(v) => {
                  setPage(1);
                  if (PAY_FILTERS.includes(v as AdminRentalPaymentFilter))
                    setPayFilter(v as AdminRentalPaymentFilter);
                }}
              >
                <SelectTrigger
                  className="h-9 w-full min-w-0 text-ui-label"
                  aria-label="대여 결제 상태 필터"
                >
                  <SelectValue placeholder="결제(전체)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">결제(전체)</SelectItem>
                  <SelectItem value="unpaid">결제대기</SelectItem>
                  <SelectItem value="paid">결제완료</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Select
                value={shipFilter}
                onValueChange={(v) => {
                  setPage(1);
                  if (SHIP_FILTERS.includes(v as AdminRentalShippingFilter))
                    setShipFilter(v as AdminRentalShippingFilter);
                }}
              >
                <SelectTrigger
                  className="h-9 w-full min-w-0 text-ui-label"
                  aria-label="대여 배송 및 운송장 필터"
                >
                  <SelectValue placeholder="배송/운송장(전체)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">배송/운송장(전체)</SelectItem>
                  <SelectItem value="none">운송장 없음 / 방문 수령</SelectItem>
                  <SelectItem value="outbound-set">인도 운송장</SelectItem>
                  <SelectItem value="return-set">반납 운송장</SelectItem>
                  <SelectItem value="both-set">인도+반납</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setPage(1);
                setFrom(e.target.value);
              }}
              placeholder="시작일"
              aria-label="시작일(From)"
              className="h-9 w-[150px] min-w-0 tabular-nums"
            />
            <span className="text-xs text-muted-foreground">~</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setPage(1);
                setTo(e.target.value);
              }}
              placeholder="종료일"
              aria-label="종료일(To)"
              className="h-9 w-[150px] min-w-0 tabular-nums"
            />

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setPreset("today")}>
                오늘
              </Button>
              <Button type="button" variant="outline" onClick={() => setPreset("7d")}>
                7일
              </Button>
              <Button type="button" variant="outline" onClick={() => setPreset("30d")}>
                30일
              </Button>
              <Button type="button" variant="outline" onClick={() => setPreset("thisMonth")}>
                이번 달
              </Button>
            </div>
          </div>
        </div>
      </AdminFilterBar>

      <AdminListTable
        title="대여 목록"
        viewLabel={status ? getRentalStatusDisplayLabel(status) : "전체 대여"}
        resultLabel={hasResolvedData && !hasDataError && data ? `총 ${data.total}건` : "불러오는 중…"}
        description="고객, 대여 라켓, 반납 일정, 결제와 보증금 상태를 한 행에서 확인할 수 있습니다."
        columnsClassName={RENTAL_LIST_COLUMNS}
        ariaLabel="대여 관리 목록"
      >
        <AdminListColumnHeader columnsClassName={RENTAL_LIST_COLUMNS}>
          <div
            role="columnheader"
            aria-sort={
              sortBy === "date" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"
            }
            className="min-w-0 px-4 py-2.5"
          >
            <button
              type="button"
              aria-label="생성일 정렬"
              onClick={() => handleSort("date")}
              className={cn(
                "inline-flex min-h-8 items-center gap-1 rounded-sm text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                sortBy === "date" && "text-primary",
              )}
            >
              대여 / 고객
              {sortBy === "date" ? (
                sortDirection === "asc" ? (
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                )
              ) : (
                <ArrowUpDown
                  className="h-3.5 w-3.5 text-muted-foreground opacity-50"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
          <div role="columnheader" className="min-w-0 px-4 py-2.5">
            라켓 / 기간
          </div>
          <div role="columnheader" className="min-w-0 px-4 py-2.5">
            상태 / 인도·반납
          </div>
          <div
            role="columnheader"
            aria-sort={
              sortBy === "total" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"
            }
            className="min-w-0 px-4 py-2.5 text-right"
          >
            <button
              type="button"
              aria-label="결제 금액 정렬"
              onClick={() => handleSort("total")}
              className={cn(
                "ml-auto inline-flex min-h-8 items-center justify-end gap-1 rounded-sm text-right transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                sortBy === "total" && "text-primary",
              )}
            >
              결제 / 보증금
              {sortBy === "total" ? (
                sortDirection === "asc" ? (
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                )
              ) : (
                <ArrowUpDown
                  className="h-3.5 w-3.5 text-muted-foreground opacity-50"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
          <div role="columnheader" className="min-w-0 px-4 py-2.5 text-right">
            다음 작업
          </div>
        </AdminListColumnHeader>

        <AdminListBody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, rowIndex) => (
              <AdminListRow
                key={`rentals-list-skeleton-${rowIndex}`}
                columnsClassName={RENTAL_LIST_COLUMNS}
                ariaLabel="대여 불러오는 중"
              >
                {Array.from({ length: 5 }).map((__, cellIndex) => (
                  <AdminListCell key={`rentals-list-skeleton-${rowIndex}-${cellIndex}`}>
                    <Skeleton className="h-6 w-full" />
                  </AdminListCell>
                ))}
              </AdminListRow>
            ))
          ) : hasDataError ? (
            <AdminListRow columnsClassName={RENTAL_LIST_COLUMNS} ariaLabel="대여 목록 오류">
              <AdminListCell className="col-span-5 py-6 text-center">
                데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
              </AdminListCell>
            </AdminListRow>
          ) : shouldShowActualEmpty ? (
            <AdminListRow columnsClassName={RENTAL_LIST_COLUMNS} ariaLabel="대여 목록 비어 있음">
              <AdminListCell className="col-span-5 py-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <Search className="h-8 w-8 text-muted-foreground/50" />
                  <p className={adminTypography.body}>
                    아직 등록된 대여가 없습니다. 새 대여가 접수되면 이곳에 표시됩니다.
                  </p>
                </div>
              </AdminListCell>
            </AdminListRow>
          ) : shouldShowSearchEmpty ? (
            <AdminListRow columnsClassName={RENTAL_LIST_COLUMNS} ariaLabel="대여 검색 결과 없음">
              <AdminListCell className="col-span-5 py-6 text-center">
                적용한 검색어와 필터에 맞는 대여가 없습니다. 조건을 조정하거나 필터를 초기화해
                주세요.
              </AdminListCell>
            </AdminListRow>
          ) : (
            rentals.map((r, idx) => {
              const rid = r.id;
              const svc = getServiceBadge(r);
              const link = getLinkBadge(r);
              const flow = getFlowBadge(r);
              const warnMissingApp = !!r.withStringService && !r.stringingApplicationId;
              const nextActionLabel = getRentalNextAction(r);
              const isReturned = isRentalReturnedStatus(r.status);
              const shippingLabel = getShippingLabel(r);
              const applicationStatusLabel = r.stringingApplicationStatus
                ? getStringingApplicationStatusDisplayLabel(r.stringingApplicationStatus)
                : null;
              const exceptionLabel =
                r.cancelRequest?.status === "requested"
                  ? "취소 요청"
                  : warnMissingApp
                    ? "신청서 연결 필요"
                    : isReturned && !r.depositRefundedAt
                      ? "보증금 환불 확인 필요"
                      : null;
              const rentalStatusSpec = getRentalStatusBadgeSpec(r.status);
              const paymentLabel =
                r.paymentStatusLabel ??
                (derivePaymentStatus(r) === "paid" ? "결제완료" : "결제대기");
              const paymentSpec = getPaymentStatusBadgeSpec(paymentLabel);

              return (
                <AdminListRow
                  key={rid || `row-${idx}`}
                  columnsClassName={RENTAL_LIST_COLUMNS}
                  ariaLabel={`${r.customer?.name || "고객명 없음"} 대여`}
                >
                  <AdminListCell>
                    <AdminListPrimary
                      title={r.customer?.name || "고객명 없음"}
                      meta={
                        <>
                          <span className="font-mono">ID {shortenId(rid)}</span>
                          <span className="tabular-nums">
                            {r.createdAt ? formatDate(r.createdAt) : "생성일 미등록"}
                          </span>
                        </>
                      }
                      supporting={
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <Badge
                            variant={svc.variant}
                            className={cn(badgeBase, badgeSizeSm, "whitespace-nowrap")}
                          >
                            {svc.label}
                          </Badge>
                          <span>{link?.label ?? "신청서 연결 없음"} · {flow.flow === 7 ? "통합" : "단독"}</span>
                          <AdminReferencePopover
                            title="대여 참조 정보"
                            trigger={
                              <button type="button" className={adminDataTable.referenceTrigger}>
                                연락처·연결 문서 보기
                              </button>
                            }
                            items={[
                              { label: "대여 ID", value: rid, copyValue: rid },
                              {
                                label: "이메일",
                                value: r.customer?.email || null,
                                copyValue: r.customer?.email || undefined,
                              },
                              { label: "서비스", value: svc.label },
                              { label: "연결", value: link?.label ?? "연결 없음" },
                              { label: "시나리오", value: flow.label },
                              {
                                label: "신청서 ID",
                                value: r.stringingApplicationId
                                  ? String(r.stringingApplicationId)
                                  : null,
                                copyValue: r.stringingApplicationId
                                  ? String(r.stringingApplicationId)
                                  : undefined,
                              },
                            ]}
                          />
                        </div>
                      }
                    />
                  </AdminListCell>

                  <AdminListCell>
                    <AdminListPrimary
                      title={
                        rid ? (
                          <Link
                            href={`/admin/rentals/${rid}`}
                            className="underline-offset-2 hover:underline"
                            title={`${racketBrandLabel(r.brand)} ${r.model}`}
                          >
                            {racketBrandLabel(r.brand)} {r.model}
                          </Link>
                        ) : (
                          `${racketBrandLabel(r.brand)} ${r.model}`
                        )
                      }
                      meta={
                        <>
                          <span className="tabular-nums">
                            시작 {r.createdAt ? formatDate(r.createdAt) : "미등록"}
                          </span>
                          <span>{r.days}일</span>
                        </>
                      }
                      supporting={
                        <span className="tabular-nums">
                          반납 예정 {r.dueAt ? formatDate(r.dueAt) : "미등록"}
                        </span>
                      }
                    />
                  </AdminListCell>

                  <AdminListCell>
                    <AdminStatusGroup
                      primary={
                        <>
                          <Badge
                            variant={rentalStatusSpec.variant}
                            className={cn(badgeBase, badgeSizeSm, "whitespace-nowrap")}
                          >
                            {getRentalStatusDisplayLabel(r.status)}
                          </Badge>
                          <Badge
                            variant={paymentSpec.variant}
                            className={cn(badgeBase, badgeSizeSm, "whitespace-nowrap")}
                          >
                            {paymentLabel}
                          </Badge>
                        </>
                      }
                      secondary={
                        <>
                          {shippingLabel}
                          {applicationStatusLabel
                            ? ` · 교체서비스 ${applicationStatusLabel}`
                            : ""}
                        </>
                      }
                      alert={exceptionLabel}
                      alertTone={
                        r.cancelRequest?.status === "requested" ? "danger" : "attention"
                      }
                    />
                  </AdminListCell>

                  <AdminListCell align="end">
                    <AdminMoneyBlock
                      amount={won(r.amount.total)}
                      meta={`보증금 ${won(r.amount.deposit)} · ${r.depositRefundedAt ? "환불 완료" : "미환불"}`}
                      detailAction={
                        <AdminReferencePopover
                          title="결제·보증금 구성"
                          align="end"
                          trigger={
                            <button type="button" className={adminDataTable.referenceTrigger}>
                              금액 상세 보기
                            </button>
                          }
                          items={[
                            { label: "총액", value: won(r.amount.total) },
                            { label: "수수료", value: won(r.amount.fee) },
                            { label: "보증금", value: won(r.amount.deposit) },
                            {
                              label: "스트링",
                              value:
                                (r.amount.stringPrice ?? 0) > 0
                                  ? won(r.amount.stringPrice ?? 0)
                                  : null,
                            },
                            {
                              label: "교체비",
                              value:
                                (r.amount.stringingFee ?? 0) > 0
                                  ? won(r.amount.stringingFee ?? 0)
                                  : null,
                            },
                          ]}
                        />
                      }
                    />
                  </AdminListCell>

                  <AdminListCell align="end">
                    <AdminRowActions>
                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        className="h-auto min-h-8 max-w-[132px] whitespace-normal break-keep border border-border/70 px-2.5 py-1.5 text-ui-label font-medium leading-tight hover:border-border hover:bg-muted/40 focus-visible:ring-2"
                      >
                        <Link href={`/admin/rentals/${rid}`}>{nextActionLabel}</Link>
                      </Button>
                      <AdminRowActionMenu ariaLabel={`${r.customer?.name || r.id} 대여 관리 메뉴`}>
                        {r.stringingApplicationId ? (
                          <>
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/admin/applications/stringing/${encodeURIComponent(String(r.stringingApplicationId))}`}
                              >
                                <Eye className="mr-2 h-4 w-4" /> 연결 신청서 보기
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        ) : null}
                        {r.status === "paid" || r.status === "out" ? (
                          <DropdownMenuItem
                            className="whitespace-nowrap"
                            onClick={() =>
                              setPendingAction({
                                type: "return",
                                rentalId: rid,
                              })
                            }
                            disabled={busyId === rid}
                          >
                            <Package className="mr-2 h-4 w-4" /> 반납 처리
                          </DropdownMenuItem>
                        ) : null}
                        {isReturned ? (
                          r.depositRefundedAt ? (
                            <DropdownMenuItem
                              onClick={() =>
                                setPendingAction({
                                  type: "refundClear",
                                  rentalId: rid,
                                })
                              }
                              disabled={busyId === rid}
                            >
                              <Truck className="mr-2 h-4 w-4" /> 환불 해제
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                setPendingAction({
                                  type: "refundMark",
                                  rentalId: rid,
                                })
                              }
                              disabled={busyId === rid}
                            >
                              <Truck className="mr-2 h-4 w-4" /> 환불 처리
                            </DropdownMenuItem>
                          )
                        ) : null}
                      </AdminRowActionMenu>
                    </AdminRowActions>
                  </AdminListCell>
                </AdminListRow>
              );
            })
          )}
        </AdminListBody>

        {!hasDataError && totalPages && totalPages > 1 ? (
          <div role="rowgroup" className="border-t border-border">
            <div role="row">
              <div
                role="cell"
                aria-colspan={5}
                className="flex flex-wrap items-center justify-center gap-1 px-4 py-3"
              >
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                이전
              </Button>
              {getPaginationItems(page, totalPages).map((it, idx) =>
                typeof it === "number" ? (
                  <Button
                    key={`page-${it}`}
                    size="sm"
                    variant={it === page ? "default" : "outline"}
                    onClick={() => setPage(it)}
                  >
                    {it}
                  </Button>
                ) : (
                  <span key={`dots-${idx}`} className="px-2 text-muted-foreground">
                    …
                  </span>
                ),
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages ?? 1, p + 1))}
                disabled={!totalPages || page >= totalPages}
              >
                다음
              </Button>
              </div>
            </div>
          </div>
        ) : null}
      </AdminListTable>
      <AdminConfirmDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        onCancel={() => setPendingAction(null)}
        onConfirm={async () => {
          const action = pendingAction;
          if (!action) return;
          setPendingAction(null);
          if (action.type === "return") {
            await onReturn(action.rentalId);
            return;
          }
          await markRefund(action.rentalId, action.type === "refundMark");
        }}
        severity="danger"
        title={
          pendingAction?.type === "return"
            ? "반납 처리할까요?"
            : pendingAction?.type === "refundMark"
              ? "보증금 환불 처리할까요?"
              : "보증금 환불 처리를 해제할까요?"
        }
        description={
          pendingAction?.type === "return"
            ? "선택한 대여 건의 상태가 반납완료(returned)로 변경됩니다."
            : pendingAction?.type === "refundMark"
              ? "선택한 대여 건을 보증금 환불 완료 상태로 기록합니다."
              : "선택한 대여 건의 보증금 환불 완료 기록을 해제합니다."
        }
        confirmText={
          pendingAction?.type === "return"
            ? "반납 처리"
            : pendingAction?.type === "refundMark"
              ? "환불 처리"
              : "환불 해제"
        }
        cancelText="취소"
        eventKey={
          pendingAction?.type === "return"
            ? "admin-rentals-return-confirm"
            : pendingAction?.type === "refundMark"
              ? "admin-rentals-refund-mark-confirm"
              : "admin-rentals-refund-clear-confirm"
        }
        eventMeta={{ rentalId: pendingAction?.rentalId }}
      />
    </AdminPageShell>
  );
}
