"use client";

import CustomerTypeFilter from "@/app/features/orders/components/order-filters/CustomerTypeFilter";
import { OrderStatusFilter } from "@/app/features/orders/components/order-filters/OrderStatusFilter";
import { OrderTypeFilter } from "@/app/features/orders/components/order-filters/OrderTypeFilter";
import { PaymentStatusFilter } from "@/app/features/orders/components/order-filters/PaymentStatusFilter";
import { ShippingStatusFilter } from "@/app/features/orders/components/order-filters/ShippingStatusFilter";
import ApplicationStatusBadge from "@/app/features/stringing-applications/components/ApplicationStatusBadge";
import { useOrderStore } from "@/app/store/orderStore";
import { useStringingStore } from "@/app/store/stringingStore";
import { adminDataTable } from "@/components/admin/AdminDataTable";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
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
import AdminReferencePopover from "@/components/admin/AdminReferencePopover";
import AdminRowActionMenu from "@/components/admin/AdminRowActionMenu";
import AsyncState from "@/components/system/AsyncState";
import { AdminSemanticBadge as Badge } from "@/components/admin/AdminSemanticBadge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminOrderPaymentState } from "@/lib/admin/order-payment-display";
import {
  badgeBase,
  badgeSizeSm,
  flowBadgeClass,
  getOrderStatusBadgeSpec,
  getShippingMethodBadge,
  getTrackingBadge,
  kindBadgeClass,
  linkBadgeClass,
} from "@/lib/badge-style";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { getOrderStatusLabelForDisplay, isVisitPickupOrder } from "@/lib/order-shipping";
import { needsOrderCancelFinalization } from "@/lib/orders/cancel-finalization";
import { shortenId } from "@/lib/shorten";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { getCommonApplicationStatusLabel } from "@/lib/status-labels/base";
import type { ApiResponse, OrderWithType } from "@/lib/types/order";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CreditCard,
  PackageSearch,
  Search,
  Truck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

const ORDER_LIST_COLUMNS =
  "grid-cols-[minmax(230px,1.15fr)_minmax(210px,1fr)_minmax(230px,1.05fr)_120px_140px]";

export default function OrdersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate: mutateGlobal } = useSWRConfig();

  // 현재 페이지 번호 상태
  const [page, setPage] = useState(1);

  // 검색어 상태
  const [searchTerm, setSearchTerm] = useState("");

  // 필터 상태들
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [shippingFilter, setShippingFilter] = useState("all");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("all");
  const [cancelFilter, setCancelFilter] = useState<"all" | "requested" | "approved" | "rejected">(
    "all",
  );

  // 고급 검색 토글 상태
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [syncingNiceOrderId, setSyncingNiceOrderId] = useState<string | null>(null);

  // 정렬 상태 (서버 정렬 기준)
  const [sortBy, setSortBy] = useState<"date" | "total">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const serverSort = useMemo(() => {
    const prefix = sortDirection === "desc" ? "-" : "";
    return `${prefix}${sortBy}`;
  }, [sortBy, sortDirection]);

  // 날짜 필터 상태
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // 한 페이지에 보여줄 항목 수
  const limit = 10;

  /**
   * 서버로 "검색/필터/날짜"까지 같이 전달하기 위한 쿼리스트링
   * - 서버가 아직 이 파라미터를 무시하더라도(미구현) 안전함
   * - 다음 단계에서 /api/orders가 이 값을 받아 "필터 → 페이징"으로 처리하면
   *   '현재 페이지 10개만 필터링' 문제가 구조적으로 해결됨
   */
  const qs = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("limit", String(limit));

    if (searchTerm.trim()) sp.set("q", searchTerm.trim());
    if (statusFilter !== "all") sp.set("status", statusFilter);
    if (typeFilter !== "all") sp.set("type", typeFilter);
    if (paymentFilter !== "all") sp.set("payment", paymentFilter);
    if (shippingFilter !== "all") sp.set("shipping", shippingFilter);
    if (customerTypeFilter !== "all") sp.set("customerType", customerTypeFilter);
    if (cancelFilter !== "all") sp.set("cancel", cancelFilter);
    sp.set("sort", serverSort);

    // 날짜는 KST 기준 YYYY-MM-DD로 보내는 게 안전함(UTC toISOString 오차 방지)
    if (selectedDate) {
      const kstDay = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(selectedDate); // e.g. "2025-12-31"
      sp.set("date", kstDay);
    }

    return sp.toString();
  }, [
    page,
    limit,
    searchTerm,
    statusFilter,
    typeFilter,
    paymentFilter,
    shippingFilter,
    customerTypeFilter,
    cancelFilter,
    selectedDate,
    serverSort,
  ]);

  /**
   * 필터/검색/날짜가 바뀌면 1페이지부터 다시 조회
   * - 안 하면, 기존에 page가 3~5 같은 상태에서 조건이 바뀌어
   *   "비어 보이는 페이지"가 나올 수 있음
   */
  useEffect(() => {
    setPage(1);
  }, [
    searchTerm,
    statusFilter,
    typeFilter,
    paymentFilter,
    shippingFilter,
    customerTypeFilter,
    cancelFilter,
    selectedDate,
    sortBy,
    sortDirection,
  ]);

  useEffect(() => {
    const preset = searchParams.get("preset");
    if (preset === "stringing") {
      setTypeFilter("서비스");
      return;
    }
    if (preset === "cancelRequests") {
      setCancelFilter("requested");
    }
  }, [searchParams]);

  // SWR 훅: page/limit + 검색/필터/날짜까지 쿼리로 포함
  const { data, error, mutate } = useSWR<ApiResponse>(
    `/api/orders?${qs}`,
    authenticatedSWRFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  // 데이터 준비: data.items, data.total
  const orders = data?.items ?? []; // 현재 페이지 항목 배열
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / limit));

  // 제한형 페이지 네이션
  function getPaginationItems(page: number, totalPages: number, delta = 2): (number | string)[] {
    // 한 페이지만 있으면 그냥 1만 반환
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

  /**
   * 관리자 UX용 “거래종류(kind)” 라벨
   * - 개발자/DB 타입(__type)은 운영자에게 그대로 노출하면 헷갈리기 쉽다.
   * - 정책 A: /admin/orders는 주문 + 신청서만 관리한다.
   */
  function getKindBadge(order: OrderWithType) {
    if (order.__type === "stringing_application") {
      return {
        label: "신청서",
        className: kindBadgeClass("stringing_application"),
      };
    }
    return { label: "주문", className: kindBadgeClass("order") };
  }

  /**
   * 관리자 UX용 “연결(link)” 라벨
   * - 통합/연결이 있는 경우 운영자가 즉시 인지할 수 있어야 “누락 처리”를 줄일 수 있다.
   *
   * 규칙(현재 코드 구조 기준):
   * - 신청서(__type=stringing_application) + linkedOrderId 있음 → "주문연결"
   * - 신청서 단독 → "단독"
   * - 주문(__type=order) 이면서 같은 그룹에 신청서가 존재 → "통합(주문+신청)"
   * - 그 외 → "단독"
   */
  function getLinkBadge(order: OrderWithType, isLinkedProductOrder: boolean) {
    if (order.__type === "stringing_application") {
      if (order.linkedOrderId) {
        return { label: "주문연결", className: linkBadgeClass("linked_order") };
      }
      return { label: "단독", className: linkBadgeClass("standalone") };
    }
    if (isLinkedProductOrder) {
      return {
        label: "통합(주문+신청)",
        className: linkBadgeClass("integrated"),
      };
    }
    return { label: "단독", className: linkBadgeClass("standalone") };
  }

  /**
   * 관리자 UX: “시나리오(Flow)” + “정산 앵커” 라벨
   * - 운영자가 봤을 때 이 행이 어떤 케이스(1~5)인지 즉시 구분되게 한다.
   * - 금액/정산 사고 방지: 신청서가 통합인지(주문 앵커) 단독인지(신청서 앵커)도 같이 표기한다.
   *
   * 참고: 정책 A에 따라 /admin/orders는 주문(order) + 신청서(stringing_application)만 노출한다.
   */
  type Flow = 1 | 2 | 3 | 4 | 5;

  const FLOW_LABEL: Record<Flow, string> = {
    1: "스트링 단품 구매",
    2: "스트링 구매 + 교체서비스 신청(통합)",
    3: "교체서비스 단일 신청",
    4: "라켓 단품 구매",
    5: "라켓 구매 + 스트링 선택 + 교체서비스 신청(통합)",
  };

  const FLOW_SHORT: Record<Flow, string> = {
    1: "F1 스트링 단품",
    2: "F2 스트링+신청",
    3: "F3 신청 단독",
    4: "F4 라켓 단품",
    5: "F5 라켓+신청",
  };

  function hasRacketItems(items: any[] | undefined) {
    // order.ts의 OrderItem 타입에는 kind가 없어서(응답 스냅샷에는 존재),
    // 런타임 데이터 기준으로 안전하게 any로 검사한다.
    return (
      Array.isArray(items) &&
      items.some((it) => (it as any)?.kind === "racket" || (it as any)?.kind === "used_racket")
    );
  }

  function orderFlowByHasRacket(hasRacket: boolean, integrated: boolean): Flow {
    // 주문(앵커) 기준:
    // - 통합이면 (스트링+신청=2) 또는 (라켓+신청=5)
    // - 단독이면 (스트링 단품=1) 또는 (라켓 단품=4)
    if (integrated) return (hasRacket ? 5 : 2) as Flow;
    return (hasRacket ? 4 : 1) as Flow;
  }

  function getFlowBadge(
    order: OrderWithType,
    ctx: {
      isLinkedProductOrder: boolean;
      anchorHasRacket: boolean;
      isIntegratedApp: boolean;
    },
  ) {
    const { isLinkedProductOrder, anchorHasRacket, isIntegratedApp } = ctx;

    let flow: Flow = 1;
    if (order.__type === "stringing_application") {
      flow = isIntegratedApp ? orderFlowByHasRacket(anchorHasRacket, true) : 3;
    } else {
      flow = orderFlowByHasRacket(hasRacketItems((order as any)?.items), isLinkedProductOrder);
    }

    return {
      flow,
      shortLabel: FLOW_SHORT[flow],
      label: FLOW_LABEL[flow],
      className: flowBadgeClass(flow),
    };
  }

  function getProductServiceSummary(order: OrderWithType, linkedApplication: any) {
    const itemNames = Array.isArray((order as any).items)
      ? (order as any).items
          .map((item: any) => String(item?.name ?? item?.productName ?? item?.title ?? "").trim())
          .filter(Boolean)
      : [];
    const primary =
      order.__type === "stringing_application"
        ? order.stringSummary || "교체서비스 신청"
        : itemNames[0] || order.type || "주문 상품";
    const details = [
      linkedApplication?.stringSummary ? `연결 스트링: ${linkedApplication.stringSummary}` : null,
      (order as any)?.racketSummary ? `라켓: ${(order as any).racketSummary}` : null,
      (order as any)?.packageTitle ? `패키지: ${(order as any).packageTitle}` : null,
      itemNames.length > 1 ? `외 ${itemNames.length - 1}개` : null,
    ].filter(Boolean);
    return { primary, details };
  }

  function getOrderNextAction(
    order: OrderWithType,
    context: {
      isLinkedProductOrder: boolean;
      needsStringingApplication: boolean;
      paymentState: ReturnType<typeof getAdminOrderPaymentState>;
    },
  ) {
    const { isLinkedProductOrder, needsStringingApplication, paymentState } = context;

    if (order.cancelStatus === "requested") return "취소 처리";
    if (needsOrderCancelFinalization(order)) return "취소 후처리하기";

    if (paymentState.actionLabel && needsStringingApplication) {
      return paymentState.kind === "bank_pending" ? "입금·신청서 확인" : "결제·신청서 확인";
    }

    if (paymentState.actionLabel) {
      return paymentState.actionLabel;
    }

    if (needsStringingApplication) {
      return "신청서 접수 확인";
    }

    if (isLinkedProductOrder) {
      return "교체 작업 확인";
    }

    const tracking = getTrackingBadge(order);

    if (tracking.label.includes("미등록") || tracking.label.includes("없음")) {
      return "배송 등록하기";
    }

    return "상세 보기";
  }

  // 연결 신청서는 "최신 수정/생성 시각" 기준으로 1건을 선택해 요약에 사용
  function getLatestStringingApplicationInGroup(group: OrderWithType[]) {
    const apps = group.filter((o) => o.__type === "stringing_application") as Array<
      OrderWithType & { updatedAt?: string; createdAt?: string }
    >;
    if (apps.length === 0) return null;

    const getStamp = (app: { updatedAt?: string; createdAt?: string }, idx: number) => {
      const raw = app.updatedAt ?? app.createdAt;
      const ts = raw ? new Date(raw).getTime() : Number.NaN;
      return Number.isFinite(ts) ? ts : -idx;
    };

    return apps
      .map((app, idx) => ({ app, ts: getStamp(app, idx), idx }))
      .sort((a, b) => (b.ts !== a.ts ? b.ts - a.ts : a.idx - b.idx))[0]?.app;
  }

  // 날짜 포맷터
  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat("ko-KR", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(dateString));

  // 금액 포맷터
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(amount);

  // 필터 리셋
  const resetFilters = () => {
    setPage(1);
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
    setPaymentFilter("all");
    setShippingFilter("all");
    setCustomerTypeFilter("all");
    setCancelFilter("all");
    setSelectedDate(undefined);
    setSortBy("date");
    setSortDirection("desc");
  };

  const applyQuickFilter = (
    target: "all" | "payment" | "cancel" | "shipping" | "service" | "product",
  ) => {
    resetFilters();
    if (target === "payment") setPaymentFilter("결제대기");
    if (target === "cancel") setCancelFilter("requested");
    if (target === "shipping") setShippingFilter("미등록");
    if (target === "service") setTypeFilter("서비스");
    if (target === "product") setTypeFilter("상품");
  };

  const hasQuickViewModifiers = Boolean(
    searchTerm.trim() || selectedDate || sortBy !== "date" || sortDirection !== "desc",
  );

  const activeQuickView = hasQuickViewModifiers
    ? null
    : paymentFilter === "결제대기" &&
        statusFilter === "all" &&
        typeFilter === "all" &&
        shippingFilter === "all" &&
        customerTypeFilter === "all" &&
        cancelFilter === "all"
      ? "payment"
      : cancelFilter === "requested" &&
          statusFilter === "all" &&
          typeFilter === "all" &&
          paymentFilter === "all" &&
          shippingFilter === "all" &&
          customerTypeFilter === "all"
        ? "cancel"
        : shippingFilter === "미등록" &&
            statusFilter === "all" &&
            typeFilter === "all" &&
            paymentFilter === "all" &&
            customerTypeFilter === "all" &&
            cancelFilter === "all"
          ? "shipping"
          : typeFilter === "서비스" &&
              statusFilter === "all" &&
              paymentFilter === "all" &&
              shippingFilter === "all" &&
              customerTypeFilter === "all" &&
              cancelFilter === "all"
            ? "service"
            : typeFilter === "상품" &&
                statusFilter === "all" &&
                paymentFilter === "all" &&
                shippingFilter === "all" &&
                customerTypeFilter === "all" &&
                cancelFilter === "all"
              ? "product"
              : statusFilter === "all" &&
                  typeFilter === "all" &&
                  paymentFilter === "all" &&
                  shippingFilter === "all" &&
                  customerTypeFilter === "all" &&
                  cancelFilter === "all"
                ? "all"
                : null;

  const quickViewLabel =
    activeQuickView === "payment"
      ? "결제 확인"
      : activeQuickView === "cancel"
        ? "취소 요청"
        : activeQuickView === "shipping"
          ? "배송 누락"
          : activeQuickView === "service"
            ? "교체서비스"
            : activeQuickView === "product"
              ? "일반 주문"
              : activeQuickView === "all"
                ? "전체"
                : "맞춤 필터";

  const appliedFilterLabels = [
    statusFilter !== "all" ? statusFilter : null,
    typeFilter !== "all" ? typeFilter : null,
    paymentFilter !== "all" ? paymentFilter : null,
    shippingFilter !== "all" ? `배송 ${shippingFilter}` : null,
    customerTypeFilter === "member" ? "회원" : customerTypeFilter === "guest" ? "비회원" : null,
    cancelFilter === "requested"
      ? "취소 요청"
      : cancelFilter === "approved"
        ? "취소 승인"
        : cancelFilter === "rejected"
          ? "취소 거절"
          : null,
  ].filter(Boolean) as string[];

  // 정렬 헤더 클릭 핸들러
  const handleSort = (key: "date" | "total") => {
    if (sortBy === key) {
      setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDirection("asc");
    }
  };

  // 배송정보 업데이트 네비게이션
  const handleShippingUpdate = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        showErrorToast("주문 정보를 불러올 수 없습니다.");
        return;
      }
      const order = await res.json();
      if (["취소", "결제취소"].includes(order.status)) {
        showErrorToast("취소된 주문은 배송 정보를 등록할 수 없습니다.");
        return;
      }

      // "상품 상품 구매 + 교체서비스 신청서"가 연결된 케이스면
      // 운송장/배송정보는 "신청서"에서만 관리하도록 강제한다.
      // - 따라서 신청서 배송등록 페이지로 자동 이동
      const appIdFromList =
        Array.isArray(order.stringingApplications) && order.stringingApplications.length > 0
          ? order.stringingApplications
              .filter((a: any) => a?.id)
              .sort(
                (a: any, b: any) =>
                  new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
              )[0]?.id
          : null;
      const appId = appIdFromList ?? order.stringingApplicationId ?? null;

      if (order.isStringServiceApplied && appId) {
        showSuccessToast(
          "이 주문은 교체서비스 신청서와 연결되어 있어 배송 정보는 신청서에서 관리합니다.",
        );
        router.push(`/admin/applications/stringing/${appId}/shipping-update`);
        return;
      }

      router.push(`/admin/orders/${orderId}/shipping-update`);
    } catch {
      showErrorToast("오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  function canSyncNicePayment(order: OrderWithType) {
    if (order.__type !== "order") return false;
    const provider = String(
      order.paymentInfo?.provider ?? order.paymentProvider ?? "",
    ).toLowerCase();
    const tid = String(order.paymentInfo?.tid ?? order.paymentTid ?? "").trim();
    const status = String(order.status ?? "").toLowerCase();
    return (
      provider === "nicepay" &&
      Boolean(tid) &&
      !status.includes("취소") &&
      !status.includes("환불") &&
      status !== "canceled" &&
      status !== "cancelled" &&
      status !== "refunded"
    );
  }

  async function handleNicePaymentSync(orderId: string) {
    if (syncingNiceOrderId) return;
    setSyncingNiceOrderId(orderId);
    try {
      const res = await fetch(`/api/payments/nice/sync/${orderId}`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || "PG 상태 확인에 실패했습니다.");
      }
      await mutate();
      await mutateGlobal(
        (key) => typeof key === "string" && key.startsWith("/api/admin/operations"),
      );
      showSuccessToast("PG 결제 상태를 확인했습니다.");
    } catch (error: any) {
      showErrorToast(`PG 상태 확인 실패: ${error?.message || "알 수 없는 오류"}`);
    } finally {
      setSyncingNiceOrderId(null);
    }
  }

  // 스트링 상품 주문과 그에 연결된 교체 서비스 신청을 "묶음"으로 그룹화하는 함수
  function groupLinkedOrders(orders: OrderWithType[]) {
    // @param orders 주문 목록 (OrderWithType[])
    // @returns OrderWithType[][] 형태로 반환되며,
    //  - 일반 주문만 있는 경우 → [[order]]
    //  - 연결된 상품 + 서비스 신청이 있으면 → [[productOrder, stringingApplication]]
    const visited = new Set(); // 중복 방지를 위한 방문 체크용 Set
    const groups: OrderWithType[][] = []; // 반환할 그룹 배열 (이중 배열)

    for (const order of orders) {
      // 이미 방문한 주문이면 skip
      if (visited.has(order.id)) continue;

      // 📌 스트링 교체 서비스 신청이면 (stringing_application)
      if (order.__type === "stringing_application" && order.linkedOrderId) {
        // 연결된 상품 주문 찾기
        const linked = orders.find((o) => o.id === order.linkedOrderId);

        if (linked) {
          //  연결된 상품 주문과 함께 묶음으로 그룹에 추가
          groups.push([linked, order]);

          // 둘 다 visited 처리
          visited.add(order.id);
          visited.add(linked.id);
        } else {
          //  연결된 상품 주문 못 찾으면 단독으로 묶음 처리
          groups.push([order]);
          visited.add(order.id);
        }
      }

      //  일반 주문인데 아무 교체 서비스도 연결되지 않은 경우
      else if (!orders.some((o) => o.linkedOrderId === order.id)) {
        groups.push([order]);
        visited.add(order.id);
      }

      // else 생략: 이미 연결된 상품 주문은 위에서 처리되기 때문에 따로 처리 안함
    }

    return groups;
  }

  return (
    <AdminPageShell variant="wide" className="py-4">
      {/* 제목 및 설명 */}
      <div>
        <AdminPageHeader
          variant="compact"
          title="주문 관리"
          description="결제 확인, 배송 누락, 취소 요청, 교체서비스 연결 주문을 한곳에서 확인하고 처리합니다."
          icon={PackageSearch}
          helperText="오늘 처리함에서 우선순위를 확인한 뒤, 이 화면에서 주문별 상세 처리를 진행하세요."
        />
      </div>

      <div className="mb-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
        <div className="flex flex-row items-center justify-between gap-2">
          <details className="group min-w-0">
            <summary className="cursor-pointer list-none text-ui-body-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
              업무 가이드 · 우선 처리 기준 보기
            </summary>
            <p className="mt-2 max-w-4xl text-ui-body-sm leading-relaxed text-muted-foreground break-keep">
              결제 대기와 배송 미등록 건을 먼저 확인하고, 취소 요청은 환불 계좌 준비 여부를 함께
              검토하세요. 통합 주문의 배송 정보는 연결된 교체서비스 신청서에서 관리합니다.
            </p>
          </details>
          <Link
            href="/admin/operations"
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-border bg-background px-3 text-ui-label font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            오늘 처리함 보기
          </Link>
        </div>
      </div>

      <AdminFilterBar
        className="mb-3"
        quickFilters={
          <>
            <span className="mr-1 text-ui-label font-semibold text-muted-foreground">빠른 보기</span>
            {[
              ["all", "전체"],
              ["payment", "결제 확인"],
              ["cancel", "취소 요청"],
              ["shipping", "배송 누락"],
              ["service", "교체서비스"],
              ["product", "일반 주문"],
            ].map(([value, label]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={activeQuickView === value ? "default" : "outline"}
                onClick={() =>
                  applyQuickFilter(
                    value as "all" | "payment" | "cancel" | "shipping" | "service" | "product",
                  )
                }
                className="h-8"
              >
                {label}
              </Button>
            ))}
          </>
        }
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 bg-transparent"
              aria-expanded={showAdvanced}
              onClick={() => setShowAdvanced((current) => !current)}
            >
              {showAdvanced ? "상세 필터 닫기" : "상세 필터"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 bg-transparent"
              onClick={resetFilters}
            >
              필터 초기화
            </Button>
          </>
        }
        activeFilters={
          <>
            <span className="font-medium text-foreground/80">현재 보기: {quickViewLabel}</span>
            {searchTerm.trim() ? (
              <span className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1">
                검색어: {searchTerm.trim()}
              </span>
            ) : null}
            {appliedFilterLabels.map((label) => (
              <span
                key={label}
                className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1"
              >
                {label}
              </span>
            ))}
            {selectedDate ? (
              <span className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1">
                선택 날짜: {selectedDate.toLocaleDateString("ko-KR")}
              </span>
            ) : null}
            <span className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 tabular-nums">
              전체 결과: {data ? `${data.total.toLocaleString("ko-KR")}건` : "-"}
            </span>
          </>
        }
      >
        <div className="space-y-3">
          <div className="relative min-w-0">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              aria-label="주문 통합 검색"
              placeholder="주문/신청 ID, 고객명, 이메일 검색..."
              className="h-9 w-full pl-8 pr-9 text-ui-label"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-9 w-9 rounded-l-none px-3"
                onClick={() => setSearchTerm("")}
                aria-label="검색어 지우기"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          {showAdvanced ? (
            <div className="grid w-full grid-cols-1 gap-2 border-t border-border/60 pt-3 md:grid-cols-2 xl:grid-cols-4">
              <CustomerTypeFilter value={customerTypeFilter} onChange={setCustomerTypeFilter} />
              <OrderStatusFilter value={statusFilter} onChange={setStatusFilter} />
              <PaymentStatusFilter value={paymentFilter} onChange={setPaymentFilter} />
              <ShippingStatusFilter value={shippingFilter} onChange={setShippingFilter} />
              <OrderTypeFilter value={typeFilter} onChange={setTypeFilter} />
              <Select
                value={cancelFilter}
                onValueChange={(value) =>
                  setCancelFilter(value as "all" | "requested" | "approved" | "rejected")
                }
              >
                <SelectTrigger className="h-9" aria-label="취소 상태 필터">
                  <SelectValue placeholder="취소 상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">취소 상태 전체</SelectItem>
                  <SelectItem value="requested">취소 요청</SelectItem>
                  <SelectItem value="approved">취소 승인</SelectItem>
                  <SelectItem value="rejected">취소 거절</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                aria-label="주문 날짜 필터"
                className="h-9"
                value={
                  selectedDate
                    ? new Intl.DateTimeFormat("en-CA", {
                        timeZone: "Asia/Seoul",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      }).format(selectedDate)
                    : ""
                }
                onChange={(event) =>
                  setSelectedDate(
                    event.target.value
                      ? new Date(`${event.target.value}T00:00:00+09:00`)
                      : undefined,
                  )
                }
              />
              <div className="flex min-w-0 gap-2">
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as "date" | "total")}>
                  <SelectTrigger className="h-9 min-w-0 flex-1" aria-label="주문 정렬 기준">
                    <SelectValue placeholder="정렬 기준" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">주문일</SelectItem>
                    <SelectItem value="total">결제 금액</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={sortDirection}
                  onValueChange={(value) => setSortDirection(value as "asc" | "desc")}
                >
                  <SelectTrigger className="h-9 min-w-0 flex-1" aria-label="주문 정렬 방향">
                    <SelectValue placeholder="정렬 방향" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">내림차순</SelectItem>
                    <SelectItem value="asc">오름차순</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
        </div>
      </AdminFilterBar>

      {/* 주문 목록 */}
      <AdminListTable
        title="주문 목록"
        viewLabel={quickViewLabel}
        resultLabel={data ? `총 ${data.total.toLocaleString("ko-KR")}건` : "불러오는 중…"}
        description="고객, 상품, 핵심 상태와 다음 처리 항목을 한 행에서 확인할 수 있습니다."
        contentClassName="min-h-[420px]"
        columnsClassName={ORDER_LIST_COLUMNS}
        ariaLabel="주문 관리 목록"
      >
        <AdminListColumnHeader columnsClassName={ORDER_LIST_COLUMNS}>
          <div
            role="columnheader"
            aria-sort={
              sortBy === "date" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"
            }
            className="min-w-0 px-4 py-2.5"
          >
            <button
              type="button"
              aria-label="접수일 정렬"
              onClick={() => handleSort("date")}
              className={cn(
                "inline-flex min-h-8 items-center gap-1 rounded-sm text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                sortBy === "date" && "text-primary",
              )}
            >
              주문 / 고객
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
            상품 / 서비스
          </div>
          <div role="columnheader" className="min-w-0 px-4 py-2.5">
            상태 / 처리
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
              결제 금액
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
          {error ? (
            <AdminListRow columnsClassName={ORDER_LIST_COLUMNS} ariaLabel="주문 목록 오류">
              <AdminListCell className="col-span-5 py-6">
                <AsyncState
                  kind="error"
                  tone="admin"
                  variant="inline"
                  resourceName="주문 데이터"
                  onAction={() => {
                    void mutate();
                  }}
                />
              </AdminListCell>
            </AdminListRow>
          ) : !data ? (
            Array.from({ length: 4 }).map((_, rowIndex) => (
              <AdminListRow
                key={`orders-list-skeleton-${rowIndex}`}
                columnsClassName={ORDER_LIST_COLUMNS}
                ariaLabel="주문 불러오는 중"
              >
                {Array.from({ length: 5 }).map((__, cellIndex) => (
                  <AdminListCell key={`orders-list-skeleton-${rowIndex}-${cellIndex}`}>
                    <Skeleton className="h-6 w-full" />
                  </AdminListCell>
                ))}
              </AdminListRow>
            ))
          ) : data.items.length === 0 ? (
            <AdminListRow columnsClassName={ORDER_LIST_COLUMNS} ariaLabel="주문 목록 비어 있음">
              <AdminListCell className="col-span-5 py-6">
                <AsyncState
                  kind="empty"
                  tone="admin"
                  variant="inline"
                  resourceName="주문 데이터"
                />
              </AdminListCell>
            </AdminListRow>
          ) : (
            groupLinkedOrders(orders).map((group) => {
              const hasStringingAppInGroup = group.some(
                (o) => o.__type === "stringing_application",
              );
              const anchorOrder = group.find((o) => o.__type === "order") ?? null;
              const anchorHasRacket = hasRacketItems((anchorOrder as any)?.items);

              return group.map((order) => {
                const linkedApplication =
                  getLatestStringingApplicationInGroup(group) ??
                  (order as any).linkedStringingApplication ??
                  null;
                const isLinkedProductOrder =
                  order.__type === "order" &&
                  (hasStringingAppInGroup || (order as any).hasStringingApplication === true);
                const expectsStringingApplication =
                  order.__type === "order" && order.shippingInfo?.withStringService === true;
                const needsStringingApplication =
                  expectsStringingApplication && !isLinkedProductOrder;
                const paymentState = getAdminOrderPaymentState({
                  paymentStatus: order.paymentStatus,
                  paymentMethod: order.paymentMethod,
                  paymentProvider: order.paymentProvider,
                  totalPrice: order.total,
                });
                const isIntegratedApp =
                  order.__type === "stringing_application" &&
                  !!order.linkedOrderId &&
                  !!anchorOrder;
                const hasCancelRequest =
                  order.cancelStatus === "requested" ||
                  linkedApplication?.cancelStatus === "requested";
                const kind = getKindBadge(order);
                const link = getLinkBadge(order, isLinkedProductOrder);
                const flow = getFlowBadge(order, {
                  isLinkedProductOrder,
                  anchorHasRacket,
                  isIntegratedApp,
                });
                const actionMethodSource =
                  order.__type === "stringing_application"
                    ? ((order as any)?.shippingInfo?.shippingMethod ??
                      (order as any)?.collectionMethod)
                    : (order as any)?.shippingInfo;
                const shippingActionLabel = isVisitPickupOrder(actionMethodSource)
                  ? "수령 정보 등록"
                  : "배송 정보 등록";
                const productSummary = getProductServiceSummary(order, linkedApplication);
                const nextActionLabel = getOrderNextAction(order, {
                  isLinkedProductOrder,
                  needsStringingApplication,
                  paymentState,
                });
                const detailHref =
                  order.__type === "stringing_application"
                    ? `/admin/applications/stringing/${order.id}`
                    : `/admin/orders/${order.id}`;
                const linkedDocumentId =
                  order.__type === "stringing_application"
                    ? order.linkedOrderId
                    : linkedApplication?.id;
                const methodSource =
                  order.__type === "stringing_application" &&
                  anchorOrder &&
                  (order as any).linkedOrderId
                    ? (anchorOrder as any)
                    : (order as any);
                const shippingMethod = getShippingMethodBadge(methodSource);
                const trackingLabel = isLinkedProductOrder
                  ? "신청서에서 관리"
                  : getTrackingBadge(order).label;
                const linkedStatusLabel = linkedApplication?.status
                  ? (getCommonApplicationStatusLabel(linkedApplication.status) ??
                    linkedApplication.status)
                  : null;
                const needsCancelFinalization =
                  order.__type === "order" && needsOrderCancelFinalization(order);
                const statusLabel = getOrderStatusLabelForDisplay(
                  order.status,
                  (order as any).shippingInfo,
                );
                const normalizedStatus = statusLabel.replace(/\s/g, "");
                const normalizedPayment = paymentState.label.replace(/\s/g, "");
                const isPaymentEquivalent = normalizedStatus === normalizedPayment;
                const statusSpec = getOrderStatusBadgeSpec(order.status);
                const exceptionLabel = needsCancelFinalization
                  ? "주문 취소 후처리 필요"
                  : hasCancelRequest
                    ? "취소 요청"
                    : needsStringingApplication
                      ? "교체 신청서 미접수"
                      : trackingLabel === "미등록"
                        ? "배송 정보 미등록"
                      : null;
                const paymentVariant =
                  paymentState.kind === "paid"
                    ? "success"
                    : paymentState.kind === "bank_pending" ||
                        paymentState.kind === "pg_pending" ||
                        paymentState.kind === "pending"
                      ? "warning"
                      : paymentState.kind === "canceled" ||
                          paymentState.kind === "refunded" ||
                          paymentState.kind === "failed"
                        ? "danger"
                        : paymentState.kind === "other"
                          ? "info"
                          : "neutral";
                const paymentMeta = order.paymentMethod || order.paymentProvider || paymentState.label;

                return (
                  <AdminListRow
                    key={order.id}
                    columnsClassName={ORDER_LIST_COLUMNS}
                    ariaLabel={`${order.customer.name} ${kind.label}`}
                  >
                    <AdminListCell>
                      <AdminListPrimary
                        title={order.customer.name
                          .replace(/\s*\(비회원\)\s*$/, "")
                          .replace(/\s*\(탈퇴한 회원\)\s*$/, "")}
                        meta={
                          <>
                            <Badge
                              variant="secondary"
                              className={cn(badgeBase, badgeSizeSm, kind.className)}
                            >
                              {kind.label}
                            </Badge>
                            <span className="font-mono">ID {shortenId(order.id)}</span>
                            <span className="tabular-nums">{formatDate(order.date)}</span>
                          </>
                        }
                        supporting={
                          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <span>{link.label} · {flow.shortLabel}</span>
                            <AdminReferencePopover
                              title="주문·신청 참조 정보"
                              trigger={
                                <button type="button" className={adminDataTable.referenceTrigger}>
                                  연락처·참조 보기
                                </button>
                              }
                              items={[
                                { label: "문서 ID", value: order.id, copyValue: order.id },
                                {
                                  label: "이메일",
                                  value: order.customer.email || null,
                                  copyValue: order.customer.email || undefined,
                                },
                                { label: "문서 유형", value: `${kind.label} · ${link.label}` },
                                { label: "시나리오", value: flow.label },
                                {
                                  label: "연결 문서",
                                  value: linkedDocumentId ?? null,
                                  copyValue: linkedDocumentId ?? undefined,
                                },
                              ]}
                            />
                          </div>
                        }
                      />
                    </AdminListCell>

                    <AdminListCell>
                      <AdminListPrimary
                        title={productSummary.primary}
                        meta={
                          productSummary.details.length > 0
                            ? productSummary.details.join(" · ")
                            : order.__type === "stringing_application"
                              ? "교체서비스 접수"
                              : `상품 ${order.items.length}종`
                        }
                        supporting={
                          isLinkedProductOrder
                            ? "연결 신청서 있음 · 교체서비스 포함"
                            : order.__type === "stringing_application" && order.linkedOrderId
                              ? "주문에 연결된 신청서"
                              : flow.shortLabel
                        }
                      />
                    </AdminListCell>

                    <AdminListCell>
                      <AdminStatusGroup
                        primary={
                          <>
                            {order.__type === "stringing_application" ? (
                              <ApplicationStatusBadge status={order.status} />
                            ) : !isPaymentEquivalent ? (
                              <Badge
                                variant={statusSpec.variant}
                                className={cn(badgeBase, badgeSizeSm, "whitespace-nowrap")}
                              >
                                {statusLabel}
                              </Badge>
                            ) : null}
                            <Badge
                              variant={paymentVariant}
                              className={cn(badgeBase, badgeSizeSm, "whitespace-nowrap")}
                            >
                              {paymentState.label}
                            </Badge>
                          </>
                        }
                        secondary={
                          <>
                            {shippingMethod.label} · {trackingLabel}
                            {isLinkedProductOrder && linkedStatusLabel
                              ? ` · 교체서비스 ${linkedStatusLabel}`
                              : ""}
                          </>
                        }
                        alert={exceptionLabel}
                        alertTone={
                          needsCancelFinalization || hasCancelRequest ? "danger" : "attention"
                        }
                      />
                    </AdminListCell>

                    <AdminListCell align="end">
                      <AdminMoneyBlock
                        amount={formatCurrency(order.total)}
                        meta={paymentMeta}
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
                          <Link
                            href={detailHref}
                            onClick={() => {
                              if (order.__type === "stringing_application") {
                                useStringingStore.getState().setSelectedApplicationId(order.id);
                              } else {
                                useOrderStore.getState().setSelectedOrderId(order.id);
                              }
                            }}
                          >
                            {nextActionLabel}
                          </Link>
                        </Button>
                        <AdminRowActionMenu ariaLabel="주문 부가 작업 메뉴 열기">
                          {canSyncNicePayment(order) ? (
                            <DropdownMenuItem
                              className="whitespace-nowrap"
                              title="NICEPAY의 현재 결제 상태를 다시 조회합니다."
                              disabled={syncingNiceOrderId === order.id}
                              onClick={() => {
                                void handleNicePaymentSync(order.id);
                              }}
                            >
                              <CreditCard className="mr-2 h-4 w-4" />
                              {syncingNiceOrderId === order.id ? "확인 중..." : "PG 상태 확인"}
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            className="whitespace-nowrap"
                            onClick={() => {
                              if (order.__type === "stringing_application") {
                                router.push(
                                  `/admin/applications/stringing/${order.id}/shipping-update`,
                                );
                                return;
                              }
                              handleShippingUpdate(order.id);
                            }}
                          >
                            <Truck className="mr-2 h-4 w-4" /> {shippingActionLabel}
                          </DropdownMenuItem>
                        </AdminRowActionMenu>
                      </AdminRowActions>
                    </AdminListCell>
                  </AdminListRow>
                );
              });
            })
          )}
        </AdminListBody>

        {totalPages > 1 ? (
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                다음
              </Button>
              </div>
            </div>
          </div>
        ) : null}
      </AdminListTable>
    </AdminPageShell>
  );
}
