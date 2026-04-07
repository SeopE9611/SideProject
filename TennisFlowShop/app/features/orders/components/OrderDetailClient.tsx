"use client";

import dynamic from "next/dynamic";
import CustomerEditForm from "@/app/features/orders/components/CustomerEditForm";
import OrderHistory from "@/app/features/orders/components/OrderHistory";
import OrderStatusSelect from "@/app/features/orders/components/OrderStatusSelect";
import PaymentEditForm from "@/app/features/orders/components/PaymentEditForm";
import PaymentMethodDetail from "@/app/features/orders/components/PaymentMethodDetail";
import RequestEditForm from "@/app/features/orders/components/RequestEditForm";
import AdminCancelRequestCard from "@/components/admin/AdminCancelRequestCard";
import { LinkedDocItem } from "@/components/admin/LinkedDocsCard";
import LinkedFlowStageCard from "@/components/admin/LinkedFlowStageCard";
import AsyncState from "@/components/system/AsyncState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { inferNextActionForOperationGroup } from "@/lib/admin/next-action-guidance";
import {
  isApplicationClosedForLinkedAutomation,
  isOrderBlockedForLinkedAutomation,
} from "@/lib/admin/linked-flow-stage";
import {
  badgeBase,
  badgeSizeSm,
  getOrderStatusBadgeSpec,
  getPaymentStatusBadgeSpec,
  getShippingMethodBadge,
} from "@/lib/badge-style";
import {
  buildAdminCancelRequestView,
  normalizeAdminCancelRequestStatus,
} from "@/lib/cancel-request/admin-cancel-request-view";
import {
  getOrderDeliveryInfoTitle,
  getOrderStatusLabelForDisplay,
  hasAnyRegisteredFulfillmentField,
  isVisitPickupOrder,
  orderShippingMethodLabel,
  shouldShowDeliveryOnlyFields,
} from "@/lib/order-shipping";
import {
  getAdminCancelPolicyMessage,
  isAdminCancelableOrderStatus,
} from "@/lib/orders/cancel-refund-policy";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Edit3,
  LinkIcon,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Settings,
  ShoppingCart,
  Truck,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";

const AdminCancelOrderDialog = dynamic(
  () => import("@/app/features/orders/components/AdminCancelOrderDialog"),
  { loading: () => null },
);

// useSWRInfinite용 getKey (처리 이력)
const LIMIT = 5; // 페이지 당 이력 개수
const getOrderHistoryKey =
  (orderId?: string) => (pageIndex: number, prev: any) => {
    // orderId가 없으면 요청 중단
    if (!orderId) return null;
    if (prev && prev.history.length === 0) return null;
    return `/api/orders/${orderId}/history?page=${pageIndex + 1}&limit=${LIMIT}`;
  };

// 타입 정의 (서버에서 내려받는 주문 정보 형태)
interface OrderDetail {
  _id: string;
  stringingApplicationId?: string;
  status: string;
  date: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    addressDetail: string;
    postalCode?: string;
  };
  shippingInfo: {
    shippingMethod: string;
    estimatedDate: string;
    invoice?: {
      courier: string;
      trackingNumber: string;
    };
    deliveryRequest?: string;
    depositor?: string;
  };
  paymentStatus: string;
  paymentMethod: string;
  paymentBank?: string;
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  history: Array<any>; // initialData용 (하지만 useSWRInfinite로 실제 이력 사용)
  cancelReason?: string;
  cancelReasonDetail?: string;
  stringService?: {
    hasStringService: boolean; // 이 주문에 스트링 서비스(패키지/신청 연결)가 있는지
    totalSlots?: number | null; // 패키지 전체 횟수
    usedSlots?: number | null; // 지금까지 사용한 횟수
    remainingSlots?: number | null; // 남은 횟수
    passTitle?: string | null; // (있다면) 패키지 이름
    note?: string | null; // (선택) 설명/메모용
  } | null;
  // 이 주문과 연결된 모든 스트링 신청서 요약 리스트
  latestActiveLinkedApplication?: {
    id: string;
    status: string;
    cancelRequestStatus?: string | null;
    needsInboundTracking?: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
    receptionLabel?: string | null;
    tensionSummary?: string | null;
    stringNames?: string[];
    totalPrice?: number | null;
    packageInfo?: {
      applied: boolean;
      useCount: number;
      passId?: string | null;
      passTitle?: string | null;
      packageSize?: number | null;
      usedCount?: number | null;
      remainingCount?: number | null;
      expiresAt?: string | null;
      redeemedAt?: string | null;
    } | null;
    reservationLabel?: string | null;
    racketCount?: number;
    shippingInfo?: {
      selfShip?: {
        courier?: string | null;
        trackingNo?: string | null;
        shippedAt?: string | null;
      } | null;
    } | null;
  } | null;
  stringingApplications?: {
    id: string;
    status: string;
    cancelRequestStatus?: string | null;
    needsInboundTracking?: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
    receptionLabel?: string | null;
    tensionSummary?: string | null;
    stringNames?: string[];
    totalPrice?: number | null;
    packageInfo?: {
      applied: boolean;
      useCount: number;
      passId?: string | null;
      passTitle?: string | null;
      packageSize?: number | null;
      usedCount?: number | null;
      remainingCount?: number | null;
      expiresAt?: string | null;
      redeemedAt?: string | null;
    } | null;
    reservationLabel?: string | null;
    racketCount?: number;
    shippingInfo?: {
      selfShip?: {
        courier?: string | null;
        trackingNo?: string | null;
        shippedAt?: string | null;
      } | null;
    } | null;
  }[];
}

// 메인 컴포넌트
interface Props {
  orderId: string;
}

export default function OrderDetailClient({ orderId }: Props) {
  const router = useRouter();

  // 편집 모드
  const [isEditMode, setIsEditMode] = useState(false);
  // 카드별 편집 토글
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editingPayment, setEditingPayment] = useState(false);
  const [editingItems, setEditingItems] = useState(false);
  const [editingRequest, setEditingRequest] = useState(false);

  // 주문 전체 데이터를 SWR로 가져옴
  const {
    data: orderDetail,
    error: orderError,
    isLoading: isOrderLoading,
    mutate: mutateOrder,
  } = useSWR<OrderDetail>(
    orderId ? `/api/orders/${orderId}` : null,
    authenticatedSWRFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  // 처리 이력 데이터를 SWRInfinite로 가져옴. (키: `/api/orders/${orderId}/history?…`)
  const {
    data: historyPages,
    error: historyError,
    mutate: mutateHistory,
  } = useSWRInfinite(getOrderHistoryKey(orderId), authenticatedSWRFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  // local 상태를 두어 "옵티미스틱 업데이트"가 가능하게 적용
  // 서버에서 받아온 orderDetail.status가 바뀌면 자동 동기화
  const [localStatus, setLocalStatus] = useState<string>(
    orderDetail?.status || "대기중",
  );

  const [isProcessingCancelRequest, setIsProcessingCancelRequest] =
    useState(false);

  useEffect(() => {
    if (orderDetail && orderDetail.status !== localStatus) {
      setLocalStatus(orderDetail.status);
    }
  }, [orderDetail]);

  // 로딩/에러 처리
  if (orderError) {
    return (
      <AsyncState
        kind="error"
        tone="admin"
        variant="page-center"
        resourceName="주문 상세"
        onAction={() => {
          void mutateOrder();
        }}
      />
    );
  }
  if (!orderDetail) {
    if (isOrderLoading) return null;
    return (
      <AsyncState
        kind="empty"
        tone="admin"
        variant="page-center"
        resourceName="주문 상세"
        title="주문 정보를 찾을 수 없습니다"
        description="주문 ID를 확인한 뒤 다시 시도해 주세요."
      />
    );
  }

  // 취소 요청 상태 정보 계산
  const cancelInfo = buildAdminCancelRequestView(
    (orderDetail as any)?.cancelRequest,
    "order",
  );

  // 실제 cancelRequest.status 를 보고 "요청됨" 상태인지 여부
  const cancelStatus = normalizeAdminCancelRequestStatus(
    (orderDetail as any).cancelRequest?.status,
  );
  const isCancelRequested = cancelStatus === "requested";

  const isCanceled = ["취소", "결제취소", "환불"].includes(localStatus);
  const isCancelableByPolicy = isAdminCancelableOrderStatus(localStatus);
  const cancelPolicyMessage = getAdminCancelPolicyMessage(localStatus);

  // 상단 요약 카드/배지 공통 클래스
  const summaryCardClass =
    "flex min-h-[112px] flex-col items-start justify-start gap-1 rounded-xl border border-border/60 bg-card/70 p-3.5 backdrop-blur-sm";
  const summaryBadgeClass = cn(
    badgeBase,
    badgeSizeSm,
    "inline-flex w-fit self-start",
  );

  // 대표 stage 카드/연결 가이드용 기준 신청서: 서버에서 선별한 latestActiveLinkedApplication 우선 사용
  const latestLinkedApplication =
    orderDetail.latestActiveLinkedApplication ?? null;
  const isLinkedStageBlockedByOrder =
    isOrderBlockedForLinkedAutomation(localStatus);
  const isLinkedStageBlockedByApplication = latestLinkedApplication
    ? isApplicationClosedForLinkedAutomation({
        status: latestLinkedApplication.status,
        cancelRequestStatus: latestLinkedApplication.cancelRequestStatus,
      })
    : false;
  const linkedStageBlockedReason = isLinkedStageBlockedByOrder
    ? `주문 상태(${localStatus})에서는 연결 진행 단계를 변경할 수 없습니다.`
    : isLinkedStageBlockedByApplication
      ? "신청서가 취소되었거나 취소 승인 완료 상태여서 연결 진행 단계를 변경할 수 없습니다."
      : null;

  const shouldShowLinkedSelfShipSummary =
    latestLinkedApplication?.needsInboundTracking === true;

  // 연결된 교체서비스 신청서 ID(있다면 최신 1개를 우선 사용)
  // - 주문 + 교체서비스가 묶인 케이스에서는 운송장/배송정보를 '신청서'에서 단일 관리하도록 통일.
  const linkedStringingAppId =
    latestLinkedApplication?.id ?? orderDetail.stringingApplicationId ?? null;
  const isShippingManagedByApplication = Boolean(linkedStringingAppId);

  // 관리자 상세에서 “수령/배송(사용자가 체크아웃에서 선택한 값)”을 한눈에 보기 위한 배지
  // - 목록(/admin/orders)에서 쓰는 규칙과 동일한 기준으로 표시한다.
  // - 통합건(주문+신청)이라도, 실제 운송장/배송 등록은 신청서에서 하더라도
  // “사용자가 무엇을 선택했는지”는 운영자가 즉시 확인할 수 있어야 한다.
  const shippingMethodBadge = getShippingMethodBadge(orderDetail as any);
  const shippingMethodValue =
    orderDetail.shippingInfo?.shippingMethod ??
    (orderDetail.shippingInfo as any)?.deliveryMethod;
  const registeredShippingMethod = orderDetail.shippingInfo?.shippingMethod;
  const shippingMethodLabel = orderShippingMethodLabel(shippingMethodValue);
  const isVisitPickup = isVisitPickupOrder(orderDetail.shippingInfo);
  const hasShippingInfoRegistered = hasAnyRegisteredFulfillmentField(
    orderDetail.shippingInfo,
  );
  const showDeliveryOnlyFields = shouldShowDeliveryOnlyFields(
    orderDetail.shippingInfo,
  );

  // 페이지네이션 없이 가져온 모든 이력 합치기
  const allHistory: any[] = historyPages
    ? historyPages.flatMap((page: any) => page.history)
    : [];

  // 날짜/통화 포맷 함수
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "날짜 없음";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "유효하지 않은 날짜";
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(amount);
  };

  // 연결 문서(표시용) 구성: 신청서(복수) 우선, 없으면 레거시 단일 필드 사용
  // - 핵심: “연결/통합”을 운영자가 한눈에 파악하도록, 상세 화면에서도 공용 카드로 통일
  const linkedDocs: LinkedDocItem[] = (() => {
    const docs: LinkedDocItem[] = [];
    const apps = Array.isArray(orderDetail.stringingApplications)
      ? orderDetail.stringingApplications
      : [];

    if (apps.length > 0) {
      for (const app of apps) {
        if (!app?.id) continue;
        const parts: string[] = [];
        if (app.status) parts.push(`상태: ${app.status}`);
        if (app.createdAt) parts.push(formatDate(app.createdAt));
        parts.push(`라켓 ${app.racketCount ?? 0}개`);
        docs.push({
          kind: "stringing_application",
          id: app.id,
          href: `/admin/applications/stringing/${app.id}`,
          subtitle: parts.filter(Boolean).join(" · ") || undefined,
        });
      }
      return docs;
    }

    if (orderDetail.stringingApplicationId) {
      docs.push({
        kind: "stringing_application",
        id: orderDetail.stringingApplicationId,
        href: `/admin/applications/stringing/${orderDetail.stringingApplicationId}`,
      });
    }

    return docs;
  })();

  const linkedApplicationForGuide = latestLinkedApplication;
  const latestStringNames = Array.from(
    new Set(
      (latestLinkedApplication?.stringNames ?? [])
        .map((name) => String(name ?? "").trim())
        .filter(Boolean),
    ),
  );
  const latestStringSummary =
    latestStringNames.length > 0 ? latestStringNames.join(", ") : null;
  const latestRacketCount =
    typeof latestLinkedApplication?.racketCount === "number"
      ? latestLinkedApplication.racketCount
      : null;
  const latestPackageInfo = latestLinkedApplication?.packageInfo ?? null;
  const latestPackageApplied = latestPackageInfo?.applied === true;
  const latestPackageTitle = String(latestPackageInfo?.passTitle ?? "").trim();
  const latestPackageSize =
    typeof latestPackageInfo?.packageSize === "number"
      ? latestPackageInfo.packageSize
      : null;
  const latestPackageUsedCount =
    typeof latestPackageInfo?.usedCount === "number"
      ? latestPackageInfo.usedCount
      : null;
  const latestPackageRemainingCount =
    typeof latestPackageInfo?.remainingCount === "number"
      ? latestPackageInfo.remainingCount
      : null;
  const latestPackageSummary = (() => {
    if (
      latestPackageSize !== null &&
      latestPackageUsedCount !== null &&
      latestPackageRemainingCount !== null
    ) {
      if (latestPackageTitle) {
        return `패키지 사용 현황: ${latestPackageTitle} · 총 ${latestPackageSize}회 / 사용 ${latestPackageUsedCount}회 / 남은 ${latestPackageRemainingCount}회`;
      }
      return `교체 서비스 사용 현황: 총 ${latestPackageSize}회 / 사용 ${latestPackageUsedCount}회 / 남은 ${latestPackageRemainingCount}회`;
    }
    return "이 주문은 교체서비스 신청서와 연결되어 있습니다. 핵심 접수 정보는 우측 요약에서 확인하세요.";
  })();

  const orderGuide = inferNextActionForOperationGroup([
    {
      kind: "order",
      statusLabel: localStatus,
      paymentLabel: orderDetail.paymentStatus,
      related: linkedApplicationForGuide
        ? {
            kind: "stringing_application",
            id: linkedApplicationForGuide.id,
            href: `/admin/applications/stringing/${linkedApplicationForGuide.id}`,
          }
        : null,
      hasShippingInfo: Boolean(
        registeredShippingMethod ||
        orderDetail.shippingInfo?.estimatedDate ||
        orderDetail.shippingInfo?.invoice?.courier ||
        orderDetail.shippingInfo?.invoice?.trackingNumber,
      ),
      hasOutboundTracking: Boolean(
        orderDetail.shippingInfo?.invoice?.trackingNumber,
      ),
    },
    ...(linkedApplicationForGuide
      ? [
          {
            kind: "stringing_application" as const,
            statusLabel: linkedApplicationForGuide.status,
            paymentLabel: null,
          },
        ]
      : []),
  ]);

  // 취소 성공 시 호출되는 콜백
  const handleCancelSuccess = async (reason: string, detail?: string) => {
    // 옵티미스틱 업데이트: 클라이언트 화면에서 곧바로 상태를 '취소'로 바꿔줌
    setLocalStatus("취소");

    try {
      // SWR 캐시의 해당 키를 revalidate (서버에서 최신 정보 가져오기)
      await mutateOrder(); // `/api/orders/${orderId}` 다시 호출
      await mutateHistory(); // `/api/orders/${orderId}/history?…` 다시 호출
      showSuccessToast("주문이 취소되었습니다.");
    } catch (err) {
      console.error("[OrderDetailClient] cancel mutate error:", err);
      showErrorToast("취소 후 데이터 갱신 중 오류가 발생했습니다.");
      // 오류 시, 서버에서 받아온 원래 상태로 복원
      if (orderDetail.status !== "취소") {
        setLocalStatus(orderDetail.status);
      }
    }
  };

  // 🔹 (추가) "취소 요청 승인" 버튼 클릭 시
  const handleApproveCancelRequest = async () => {
    if (!orderId) return;

    if (!isCancelableByPolicy) {
      showErrorToast(cancelPolicyMessage);
      return;
    }

    const ok = window.confirm(
      "이 주문의 취소 요청을 승인하시겠습니까?\n주문과 연결된 모든 교체 서비스 신청이 함께 취소됩니다.",
    );
    if (!ok) return;

    setIsProcessingCancelRequest(true);
    try {
      const existingReq: any = (orderDetail as any).cancelRequest ?? {};

      const res = await fetch(`/api/orders/${orderId}/cancel-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          // 고객이 요청할 때 저장된 reasonCode / reasonText 를 그대로 넘겨줌
          reasonCode: existingReq.reasonCode,
          reasonText: existingReq.reasonText,
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "취소 승인 실패");
      }

      // 서버에서 주문/신청/패키지 복원 처리 후 최신 상태로 갱신
      await mutateOrder();
      await mutateHistory();
      setLocalStatus("취소");
      showSuccessToast("주문 취소 요청을 승인했습니다.");
    } catch (err: any) {
      console.error(err);
      showErrorToast(err?.message || "취소 승인 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessingCancelRequest(false);
    }
  };

  // 🔹 (추가) "취소 요청 거절" 버튼 클릭 시
  const handleRejectCancelRequest = async () => {
    if (!orderId) return;

    const adminMemo =
      window.prompt(
        "취소 요청 거절 사유를 입력하세요.\n(선택 입력, 비워두면 사유 없이 기록됩니다.)",
      ) ?? "";

    const ok = window.confirm("이 주문의 취소 요청을 거절하시겠습니까?");
    if (!ok) return;

    setIsProcessingCancelRequest(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel-reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          adminMemo: adminMemo.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "취소 거절 실패");
      }

      await mutateOrder();
      await mutateHistory();
      showSuccessToast("주문 취소 요청을 거절했습니다.");
    } catch (err: any) {
      console.error(err);
      showErrorToast(err?.message || "취소 거절 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessingCancelRequest(false);
    }
  };

  const handleShippingUpdate = () => {
    if (isCanceled) {
      showErrorToast("취소된 주문은 배송 정보를 수정할 수 없습니다.");
      return;
    }

    // 연결 주문(주문 + 교체서비스 신청서)인 경우:
    // 배송정보/운송장은 신청서에서 단일 관리 → 신청서 배송등록 페이지로 이동
    if (isShippingManagedByApplication && linkedStringingAppId) {
      showSuccessToast(
        "이 주문은 교체서비스 신청서와 연결되어 있어 라켓 발송 정보는 신청서에서 관리합니다.",
      );
      router.push(
        `/admin/applications/stringing/${linkedStringingAppId}/shipping-update`,
      );
      return;
    }

    router.push(`/admin/orders/${orderId}/shipping-update`);
  };

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-muted/30">
      <div className="container py-6 space-y-6 lg:py-8">
        <div className="mx-auto w-full max-w-[1500px]">
          {/* 개선된 관리자 헤더 */}
          <div className="mb-6 rounded-2xl border border-border bg-muted/30 p-5 shadow-lg lg:p-6">
            <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-card rounded-full p-3 shadow-md">
                  <Settings className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    주문 관리
                  </h1>
                  <p className="mt-1 text-muted-foreground">
                    주문 ID: {orderDetail._id}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 bg-card/70 backdrop-blur-sm border-border hover:bg-muted dark:bg-card/60 dark:border-border dark:hover:bg-muted"
                  asChild
                >
                  <Link href="/admin/orders">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    주문 목록으로 돌아가기
                  </Link>
                </Button>
                <Button
                  variant={isEditMode ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={
                    isEditMode
                      ? ""
                      : "bg-card/70 backdrop-blur-sm border-border hover:bg-muted \
 dark:bg-card/60 dark:border-border dark:hover:bg-muted"
                  }
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  {isEditMode ? "편집 취소" : "편집 모드"}
                </Button>
                <Button
                  onClick={handleShippingUpdate}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Truck className="mr-2 h-4 w-4" />
                  {/* 방문 수령 주문은 배송 용어 대신 수령 용어로 노출 */}
                  {isVisitPickup
                    ? isShippingManagedByApplication
                      ? "신청서 수령 정보 확인"
                      : hasShippingInfoRegistered
                        ? "방문 수령 정보 수정하기"
                        : "방문 수령 정보 등록하기"
                    : isShippingManagedByApplication
                      ? "라켓 발송 정보 확인"
                      : hasShippingInfoRegistered
                        ? "배송 정보 수정하기"
                        : "배송 정보 등록하기"}
                </Button>
              </div>
            </div>

            {/* 주문 요약 정보 */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className={summaryCardClass}>
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    주문일시
                  </span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {formatDate(orderDetail.date)}
                </p>
              </div>

              <div className={summaryCardClass}>
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    총 결제금액
                  </span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {formatCurrency(orderDetail.total)}
                </p>
              </div>

              <div className={summaryCardClass}>
                <div className="flex items-center space-x-2 mb-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    주문 상태
                  </span>
                </div>
                {(() => {
                  const st = getOrderStatusBadgeSpec(localStatus);
                  return (
                    <Badge variant={st.variant} className={summaryBadgeClass}>
                      {getOrderStatusLabelForDisplay(
                        localStatus,
                        orderDetail.shippingInfo,
                      )}
                    </Badge>
                  );
                })()}
              </div>

              <div className={summaryCardClass}>
                <div className="flex items-center space-x-2 mb-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    결제 상태
                  </span>
                </div>
                {(() => {
                  const pay = getPaymentStatusBadgeSpec(
                    orderDetail.paymentStatus,
                  );
                  return (
                    <Badge variant={pay.variant} className={summaryBadgeClass}>
                      {orderDetail.paymentStatus}
                    </Badge>
                  );
                })()}
              </div>
              <div className={summaryCardClass}>
                <div className="flex items-center space-x-2 mb-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    수령/배송
                  </span>
                </div>
                <Badge
                  variant={shippingMethodBadge.variant}
                  className={summaryBadgeClass}
                >
                  {shippingMethodBadge.label}
                </Badge>
                {isShippingManagedByApplication && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    운송장/배송 등록은 신청서에서 관리
                  </p>
                )}
              </div>
            </div>
            {/* 취소 요청 상태 안내 (관리자용) */}
            {cancelInfo && (
              <AdminCancelRequestCard
                badgeLabel={cancelInfo.badgeLabel}
                description={cancelInfo.description}
                reasonSummary={cancelInfo.reasonSummary}
                tone={cancelInfo.tone}
                rightSlot={
                  <div className="rounded-md border border-border/60 bg-background/60 px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      환불 계좌 정보
                    </p>
                    <dl className="mt-2 space-y-1 text-xs text-foreground/90">
                      <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
                        <dt className="text-muted-foreground">환불 은행</dt>
                        <dd>
                          {cancelInfo.refundAccount?.bankLabel || "미입력"}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
                        <dt className="text-muted-foreground">계좌번호</dt>
                        <dd className="font-mono">
                          {cancelInfo.refundAccount?.account || "미입력"}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
                        <dt className="text-muted-foreground">예금주</dt>
                        <dd>{cancelInfo.refundAccount?.holder || "미입력"}</dd>
                      </div>
                    </dl>
                  </div>
                }
              />
            )}
          </div>

          {latestLinkedApplication?.id && latestLinkedApplication?.status && (
            <Card className="mb-4 border border-primary/30 bg-primary/10 shadow-sm">
              <CardContent className="p-4">
                <div className="grid gap-2 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-4">
                  <p className="text-sm font-semibold text-primary">
                    연결 업무 가이드
                  </p>
                  <p className="text-sm text-muted-foreground">
                    현재 단계:{" "}
                    <span className="font-semibold text-foreground">
                      {orderGuide.stage}
                    </span>
                  </p>
                  <p className="text-sm text-foreground md:text-right">
                    다음 할 일:{" "}
                    <span className="font-semibold">{orderGuide.nextAction}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {latestLinkedApplication?.id && latestLinkedApplication?.status && (
            <LinkedFlowStageCard
              className="mb-4 border border-border shadow-xl bg-card overflow-hidden"
              orderId={orderId}
              orderStatus={localStatus}
              applicationStatus={latestLinkedApplication.status}
              shippingInfo={orderDetail.shippingInfo}
              disabled={Boolean(linkedStageBlockedReason)}
              disabledReason={linkedStageBlockedReason}
              onSaved={async () => {
                await mutateOrder();
                await mutateHistory();
                router.refresh();
              }}
            />
          )}

          {/* 주문 상태 및 요약 */}
          <Card className="mb-6 overflow-hidden border-0 bg-muted/30 shadow-xl ring-ring">
            <CardHeader className="bg-muted/30 border-b pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>주문 상태 관리</CardTitle>
                {(() => {
                  const st = getOrderStatusBadgeSpec(localStatus);
                  return (
                    <Badge
                      variant={st.variant}
                      className={cn(badgeBase, badgeSizeSm, "w-fit self-start")}
                    >
                      {getOrderStatusLabelForDisplay(
                        localStatus,
                        orderDetail.shippingInfo,
                      )}
                    </Badge>
                  );
                })()}
              </div>
              <CardDescription>
                {/* 방문 수령 주문은 수령 전/후 기준으로 안내 문구 분기 */}
                {isVisitPickup
                  ? `${formatDate(orderDetail.date)}에 접수된 주문입니다. · 주문 취소(수령 전)와 환불(수령 후)은 별도 정책으로 운영합니다.`
                  : `${formatDate(orderDetail.date)}에 접수된 주문입니다. · 주문 취소(배송 전)와 환불(배송 후)은 별도 정책으로 운영합니다.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 lg:p-5">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
                {/* 왼쪽: 상태 변경 영역 */}
                <div className="rounded-xl border border-border/60 bg-card/70 p-4">
                  <div className="space-y-3">
                    <div className="rounded-md border border-border bg-muted/60 px-3 py-2 text-sm font-medium text-foreground">
                      이 영역은 현재 주문의 개별 상태만 조정합니다. 연결된
                      주문/신청의 공통 흐름 변경은 위 ‘연결 진행 단계’에서
                      처리합니다.
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        주문 진행 상태
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        현재 주문의 진행 단계를 확인하고 필요한 경우 상태를
                        변경합니다.
                      </p>
                    </div>

                    <div className="max-w-[280px]">
                      <OrderStatusSelect
                        orderId={orderId!}
                        currentStatus={localStatus}
                        shippingInfo={orderDetail.shippingInfo}
                      />
                    </div>

                    {!isCanceled && (
                      <p className="text-xs text-muted-foreground">
                        운영 기준: {cancelPolicyMessage}
                      </p>
                    )}
                  </div>
                </div>

                {/* 오른쪽: 취소/승인/거절 액션 영역 */}
                <div className="rounded-xl border border-border/60 bg-card/70 p-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        운영 액션
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        취소 요청 처리 및 관리자 취소를 진행합니다.
                      </p>
                    </div>

                    <div className="flex min-h-[40px] flex-wrap items-center gap-2">
                      {localStatus === "취소" ? (
                        <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                          취소된 주문입니다. 추가 액션이 불가능합니다.
                        </div>
                      ) : isCancelRequested ? (
                        <>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleApproveCancelRequest}
                            disabled={
                              isProcessingCancelRequest || !isCancelableByPolicy
                            }
                          >
                            취소 승인
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleRejectCancelRequest}
                            disabled={isProcessingCancelRequest}
                          >
                            취소 거절
                          </Button>
                        </>
                      ) : (
                        <AdminCancelOrderDialog
                          orderId={orderId!}
                          onCancelSuccess={handleCancelSuccess}
                          key={"cancel-" + allHistory.length}
                          disabled={!isCancelableByPolicy}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>

            {/* 연결 문서 + 최신 접수 요약 통합 */}
            {linkedDocs.length > 0 && (
              <div className="m-3.5">
                <Card className="border border-border/60 bg-card/70">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">연결 문맥 요약</CardTitle>
                    <CardDescription>
                      연결된 신청 문서와 최신 접수 핵심 정보를 한 번에 확인합니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                        <p className="mb-2 text-sm font-semibold text-foreground">
                          연결된 문서
                        </p>
                        <div className="space-y-2">
                          {linkedDocs.map((doc) => (
                            <div
                              key={`${doc.kind}:${doc.id}`}
                              className="flex flex-col gap-2 rounded-md border border-border/60 bg-card/70 p-2 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <p className="text-sm text-muted-foreground">
                                신청번호:{" "}
                                <span className="font-mono text-foreground">
                                  {doc.id}
                                </span>
                              </p>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    void navigator.clipboard
                                      .writeText(String(doc.id))
                                      .then(() => {
                                        showSuccessToast("ID가 복사되었습니다.");
                                      })
                                      .catch(() => {});
                                  }}
                                >
                                  복사
                                </Button>
                                <Link href={doc.href}>
                                  <Button type="button" variant="outline" size="sm">
                                    상세 보기
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          {latestPackageSummary}
                        </p>
                      </div>

                      <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                        <p className="mb-2 text-sm font-semibold text-foreground">
                          최신 신청 접수 요약
                        </p>
                        <div className="grid gap-2 text-sm sm:grid-cols-2">
                          {latestLinkedApplication?.status && (
                            <p>
                              <span className="text-muted-foreground">
                                신청 상태:
                              </span>{" "}
                              <span className="font-medium text-foreground">
                                {latestLinkedApplication.status}
                              </span>
                            </p>
                          )}
                          {latestLinkedApplication?.receptionLabel && (
                            <p>
                              <span className="text-muted-foreground">
                                접수 방식:
                              </span>{" "}
                              <span className="font-medium text-foreground">
                                {latestLinkedApplication.receptionLabel}
                              </span>
                            </p>
                          )}
                          {latestRacketCount !== null && (
                            <p>
                              <span className="text-muted-foreground">
                                라인 수:
                              </span>{" "}
                              <span className="font-medium text-foreground">
                                {latestRacketCount}개
                              </span>
                            </p>
                          )}
                          {latestStringSummary && (
                            <p>
                              <span className="text-muted-foreground">
                                스트링:
                              </span>{" "}
                              <span className="font-medium text-foreground">
                                {latestStringSummary}
                              </span>
                            </p>
                          )}
                          {latestLinkedApplication?.tensionSummary && (
                            <p>
                              <span className="text-muted-foreground">텐션:</span>{" "}
                              <span className="font-medium text-foreground">
                                {latestLinkedApplication.tensionSummary}
                              </span>
                            </p>
                          )}
                          {latestLinkedApplication?.reservationLabel && (
                            <p>
                              <span className="text-muted-foreground">예약:</span>{" "}
                              <span className="font-medium text-foreground">
                                {latestLinkedApplication.reservationLabel}
                              </span>
                            </p>
                          )}
                          {typeof latestLinkedApplication?.totalPrice ===
                            "number" && (
                            <p>
                              <span className="text-muted-foreground">금액:</span>{" "}
                              <span className="font-semibold text-foreground">
                                {formatCurrency(latestLinkedApplication.totalPrice)}
                              </span>
                            </p>
                          )}
                          <p>
                            <span className="text-muted-foreground">
                              패키지 적용:
                            </span>{" "}
                            <span className="font-medium text-foreground">
                              {latestPackageApplied ? "적용" : "미적용"}
                            </span>
                          </p>
                          {latestPackageTitle && (
                            <p>
                              <span className="text-muted-foreground">
                                패키지 상품:
                              </span>{" "}
                              <span className="font-medium text-foreground">
                                {latestPackageTitle}
                              </span>
                            </p>
                          )}
                          {latestPackageSize !== null &&
                            latestPackageUsedCount !== null &&
                            latestPackageRemainingCount !== null && (
                              <p className="sm:col-span-2">
                                <span className="text-muted-foreground">
                                  패키지 사용 현황:
                                </span>{" "}
                                <span className="font-medium text-foreground">
                                  총 {latestPackageSize}회 / 사용{" "}
                                  {latestPackageUsedCount}회 / 남은{" "}
                                  {latestPackageRemainingCount}회
                                </span>
                              </p>
                            )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </Card>

          <div className="grid gap-4 xl:grid-cols-12">
            {/* 고객 정보 */}
            <Card className="overflow-hidden border-0 bg-muted/30 shadow-xl ring-ring xl:col-span-6">
              <CardHeader className="bg-muted/30 border-b pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-foreground" />
                    <span>고객 정보</span>
                  </div>
                  {isEditMode && (
                    <Edit3 className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardTitle>
              </CardHeader>

              {editingCustomer ? (
                <CardContent className="p-4 lg:p-5">
                  <CustomerEditForm
                    initialData={{
                      name: orderDetail.customer.name,
                      email: orderDetail.customer.email,
                      phone: orderDetail.customer.phone,
                      address: orderDetail.customer.address,
                      addressDetail: orderDetail.customer.addressDetail ?? "",
                      postalCode: orderDetail.customer.postalCode || "",
                    }}
                    orderId={orderDetail._id}
                    resourcePath="/api/orders"
                    onSuccess={(updated: any) => {
                      mutateOrder(); // SWR 캐시 갱신
                      mutateHistory();
                      setEditingCustomer(false);
                    }}
                    onCancel={() => setEditingCustomer(false)}
                  />
                </CardContent>
              ) : (
                <>
                  <CardContent className="p-4 lg:p-5">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">이름</p>
                          <p className="font-semibold text-foreground">
                            {orderDetail.customer.name ?? "이름 없음"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            이메일
                          </p>
                          <p className="font-semibold text-foreground">
                            {orderDetail.customer.email ?? "이메일 없음"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            전화번호
                          </p>
                          <p className="font-semibold text-foreground">
                            {orderDetail.customer.phone ?? "전화번호 없음"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 p-3 bg-muted rounded-lg">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">주소</p>
                          <p className="font-semibold text-foreground">
                            {orderDetail.customer.address ?? "주소 없음"}
                          </p>
                          {orderDetail.customer.addressDetail && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {orderDetail.customer.addressDetail}
                            </p>
                          )}
                          {orderDetail.customer.postalCode && (
                            <p className="text-sm text-muted-foreground">
                              우편번호: {orderDetail.customer.postalCode}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  {isEditMode && (
                    <CardFooter className="flex justify-center bg-muted/50 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingCustomer(true)}
                        className="hover:bg-muted border-border"
                      >
                        수정하기
                      </Button>
                    </CardFooter>
                  )}
                </>
              )}
            </Card>

            {/* 배송 정보 */}
            <Card className="overflow-hidden border-0 bg-muted/30 shadow-xl ring-ring xl:col-span-6">
              <CardHeader className="bg-muted/30 border-b pb-3">
                <CardTitle className="flex items-center">
                  <Truck className="mr-2 h-5 w-5 text-primary" />
                  {getOrderDeliveryInfoTitle(orderDetail.shippingInfo)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 lg:p-5">
                {isShippingManagedByApplication && linkedStringingAppId ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-sm text-foreground dark:bg-primary/20">
                    <div className="flex items-start gap-2">
                      <LinkIcon className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="space-y-2">
                        <p className="font-medium">
                          이 주문은 교체서비스 신청서와 연결되어 있어{" "}
                          {isVisitPickup ? "수령 준비 정보" : "라켓 발송 정보"}
                          를 신청서에서 관리합니다.
                        </p>
                        <div className="flex items-center space-x-3 p-3 bg-card/70 dark:bg-card/30 rounded-lg border border-border/60 dark:border-border">
                          <Truck className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-sm text-muted-foreground">
                              주문 시 선택한 수령 방식
                            </p>
                            <p className="font-semibold text-primary">
                              {shippingMethodLabel}
                            </p>
                          </div>
                        </div>
                        {shouldShowLinkedSelfShipSummary &&
                          latestLinkedApplication && (
                            <div className="rounded-lg border border-border/60 bg-card/70 p-3 text-sm dark:bg-card/30">
                              <p className="font-medium text-foreground">
                                라켓 발송 상태:{" "}
                                {latestLinkedApplication.shippingInfo?.selfShip
                                  ?.trackingNo
                                  ? "등록됨"
                                  : "미등록"}
                              </p>
                              <p className="mt-1 text-muted-foreground">
                                운송장:{" "}
                                {latestLinkedApplication.shippingInfo?.selfShip
                                  ?.trackingNo ?? "미등록"}
                              </p>
                            </div>
                          )}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-transparent"
                            asChild
                          >
                            <Link
                              href={`/admin/applications/stringing/${linkedStringingAppId}`}
                            >
                              신청서 상세 보기
                            </Link>
                          </Button>

                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={() =>
                              router.push(
                                `/admin/applications/stringing/${linkedStringingAppId}/shipping-update`,
                              )
                            }
                          >
                            <Truck className="mr-2 h-4 w-4" />
                            {isVisitPickup
                              ? "수령 준비 정보 등록/수정"
                              : "라켓 발송 정보 확인/수정"}
                          </Button>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          주문(상품) 운송장 대신 신청서의 라켓 발송 정보를
                          기준으로 관리합니다.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {isVisitPickup ? "수령 방법" : "배송 방법"}
                        </p>
                        <p className="font-semibold text-foreground">
                          {shippingMethodLabel}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          예상 수령일
                        </p>
                        <p className="font-semibold text-foreground">
                          {orderDetail.shippingInfo.estimatedDate
                            ? formatDate(orderDetail.shippingInfo.estimatedDate)
                            : "미등록"}
                        </p>
                      </div>
                    </div>

                    {!showDeliveryOnlyFields && (
                      <p className="text-sm text-muted-foreground">
                        방문 수령 주문은 준비 완료 안내 후 매장에서 수령
                        처리합니다.
                      </p>
                    )}

                    {showDeliveryOnlyFields &&
                      orderDetail.shippingInfo.invoice?.trackingNumber && (
                        <>
                          <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                택배사
                              </p>
                              <p className="font-semibold text-foreground">
                                {{
                                  cj: "CJ 대한통운",
                                  hanjin: "한진택배",
                                  logen: "로젠택배",
                                  post: "우체국택배",
                                  etc: "기타",
                                }[orderDetail.shippingInfo.invoice.courier] ||
                                  "미지정"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                운송장 번호
                              </p>
                              <p className="font-semibold text-foreground">
                                {
                                  orderDetail.shippingInfo.invoice
                                    .trackingNumber
                                }
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 결제 정보 */}
            <Card className="overflow-hidden border-0 bg-muted/30 shadow-xl ring-ring xl:col-span-6">
              <CardHeader className="bg-muted/30 border-b pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <span>결제 정보</span>
                  </div>
                  {isEditMode && (
                    <Edit3 className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardTitle>
              </CardHeader>

              {editingPayment ? (
                <CardContent className="p-4 lg:p-5">
                  <PaymentEditForm
                    initialData={{ total: orderDetail.total }}
                    orderId={orderId}
                    onSuccess={() => {
                      mutateOrder();
                      mutateHistory();
                      setEditingPayment(false);
                    }}
                    onCancel={() => setEditingPayment(false)}
                  />
                </CardContent>
              ) : (
                <>
                  <CardContent className="p-4 lg:p-5">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 p-3 bg-muted dark:bg-card/70 rounded-lg border border-border">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            결제 상태
                          </p>
                          {(() => {
                            const pay = getPaymentStatusBadgeSpec(
                              orderDetail.paymentStatus,
                            );
                            return (
                              <Badge
                                variant={pay.variant}
                                className={cn(badgeBase, badgeSizeSm)}
                              >
                                {orderDetail.paymentStatus}
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="rounded-md border border-border bg-card/80 p-4 text-sm shadow-sm dark:bg-card/60">
                        <PaymentMethodDetail
                          method={orderDetail.paymentMethod || "무통장입금"}
                          bankKey={orderDetail.paymentBank}
                          depositor={orderDetail.shippingInfo?.depositor}
                        />
                      </div>

                      <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg border border-border">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            결제 금액
                          </p>
                          <p className="text-xl font-bold text-primary">
                            {formatCurrency(orderDetail.total)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  {isEditMode && (
                    <CardFooter className="flex justify-center bg-muted/50 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPayment(true)}
                        className="hover:bg-muted border-border"
                      >
                        수정하기
                      </Button>
                    </CardFooter>
                  )}
                </>
              )}
            </Card>

            {/* 주문 항목 */}
            <Card className="overflow-hidden border-0 bg-muted/30 shadow-xl ring-ring xl:col-span-6">
              <CardHeader className="bg-muted/30 border-b pb-3">
                <CardTitle className="flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5 text-foreground" />
                  주문 항목
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 lg:p-5">
                <div className="space-y-4">
                  {orderDetail.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 bg-muted rounded-xl hover:bg-muted dark:hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">
                          {item.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          수량: {item.quantity}개
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">
                          {formatCurrency(item.price)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          소계: {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 방문 수령 주문은 배송 요청사항 카드를 숨김 */}
          {showDeliveryOnlyFields && (
            <Card className="mt-6 mb-6 overflow-hidden border-0 bg-muted/30 shadow-xl ring-ring xl:col-span-6">
              <CardHeader className="bg-muted/30 border-b pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span>배송 요청사항</span>
                  {isEditMode && (
                    <Edit3 className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardTitle>
                <CardDescription>
                  사용자가 결제 시 입력한 배송 관련 요청사항입니다.
                </CardDescription>
              </CardHeader>
              {editingRequest ? (
                <CardContent className="p-4 lg:p-5">
                  <RequestEditForm
                    initialData={orderDetail.shippingInfo.deliveryRequest || ""}
                    orderId={orderId}
                    onSuccess={() => {
                      mutateOrder();
                      mutateHistory();
                      setEditingRequest(false);
                    }}
                    onCancel={() => setEditingRequest(false)}
                  />
                </CardContent>
              ) : (
                <>
                  <CardContent className="p-4 lg:p-5">
                    {orderDetail.shippingInfo.deliveryRequest ? (
                      <div className="bg-muted border border-border rounded-lg p-4">
                        <p className="text-foreground whitespace-pre-line">
                          {orderDetail.shippingInfo.deliveryRequest}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic">
                        요청사항이 입력되지 않았습니다.
                      </p>
                    )}
                  </CardContent>
                  {isEditMode && (
                    <CardFooter className="flex justify-center bg-muted/50 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingRequest(true)}
                        className="hover:bg-muted border-border"
                      >
                        수정하기
                      </Button>
                    </CardFooter>
                  )}
                </>
              )}
            </Card>
          )}

          {/* 처리 이력 */}
          <Card className="overflow-hidden border-0 bg-muted/30 shadow-xl ring-ring xl:col-span-6">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>주문 이력</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 lg:p-5">
              <OrderHistory
                orderId={orderId}
                shippingMethod={orderDetail.shippingInfo}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
