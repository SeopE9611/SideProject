"use client";

import ApplicationStatusBadge from "@/app/features/stringing-applications/components/ApplicationStatusBadge";
import { ApplicationStatusSelect } from "@/app/features/stringing-applications/components/ApplicationStatusSelect";
import CustomerEditForm from "@/app/features/stringing-applications/components/CustomerEditForm";
import PaymentEditForm from "@/app/features/stringing-applications/components/PaymentEditForm";
import PaymentMethodDetail from "@/app/features/stringing-applications/components/PaymentMethodDetail";
import RequirementsEditForm from "@/app/features/stringing-applications/components/RequirementsEditForm";
import StringInfoEditForm from "@/app/features/stringing-applications/components/StringInfoEditForm";
import StringingApplicationHistory from "@/app/features/stringing-applications/components/StringingApplicationHistory";
import { normalizeCollection } from "@/app/features/stringing-applications/lib/collection";
import {
  collectionMethodLabel,
  getStringingAddressReadLabels,
  orderShippingMethodLabel,
} from "@/app/features/stringing-applications/lib/fulfillment-labels";
import { useStringingStore } from "@/app/store/stringingStore";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import AdminCancelRequestCard from "@/components/admin/AdminCancelRequestCard";
import AdminCompactField from "@/components/admin/AdminCompactField";
import AdminInlineEmpty from "@/components/admin/AdminInlineEmpty";
import AdminDetailSectionNav from "@/components/admin/AdminDetailSectionNav";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import AdminInternalNotesCard from "@/components/admin/AdminInternalNotesCard";
import AdminNextActionPanel from "@/components/admin/AdminNextActionPanel";
import AdminStatusCard from "@/components/admin/AdminStatusCard";
import LinkedDocsCard, { LinkedDocItem } from "@/components/admin/LinkedDocsCard";
import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero, SummaryCard } from "@/components/public";
import ServiceReviewCTA from "@/components/reviews/ServiceReviewCTA";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { inferNextActionForOperationItem } from "@/lib/admin/next-action-guidance";
import {
  badgeBase,
  badgeSizeSm,
  badgeToneClass,
  getPaymentStatusBadgeSpec,
  getShippingMethodBadge,
} from "@/lib/badge-style";
import {
  buildAdminCancelRequestView,
  normalizeAdminCancelRequestStatus,
} from "@/lib/cancel-request/admin-cancel-request-view";
import { readCancelRequestError } from "@/lib/cancel-request/refund-account-client";
import { stringColorLabel } from "@/lib/constants";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { formatGaugeLabel } from "@/lib/formatGaugeLabel";
import { normalizeOrderShippingMethod } from "@/lib/order-shipping";
import { getCourierDisplayName } from "@/lib/shipping/courier-map";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Edit3,
  Pencil,
  Settings,
  ShoppingCart,
  Target,
  Ticket,
  Truck,
  User,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import useSWR from "swr";

const CancelStringingDialog = dynamic(
  () => import("@/app/mypage/applications/_components/CancelStringingDialog"),
  { loading: () => null },
);

interface Props {
  id: string;
  baseUrl: string;
  backUrl?: string /** 뒤로 가기 링크(관리자 기본: '/admin/orders') */;
  isAdmin?: boolean /** 관리자 여부(기본: true) */;
  userEditableStatuses?: string[] /** 일반 사용자가 편집 가능한 상태 */;
}

interface ApplicationDetail {
  id: string;
  userConfirmedAt?: string | null;
  orderId?: string;
  rentalId?: string;
  orderCancelStatus?: string;
  orderStatus?: string | null;
  orderPaymentStatus?: string | null;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    addressDetail: string;
    postalCode: string;
  };
  requestedAt: string;
  submittedAt?: string;
  status: string;
  paymentStatus?: string | null;
  paymentSource?: string | null;
  linkedPayment?: {
    source: "order" | "rental" | "application" | "package" | null;
    status: string | null;
    method: string | null;
    provider?: string | null;
    easyPayProvider?: string | null;
    tid?: string | null;
    bank?: string | null;
    depositor?: string | null;
    cardDisplayName?: string | null;
    cardCompany?: string | null;
    cardLabel?: string | null;
    approvedAt?: string | null;
    niceSync?: {
      lastSyncedAt?: string | null;
      pgStatus?: string | null;
      source?: string | null;
      resultCode?: string | null;
      resultMsg?: string | null;
      canceledAt?: string | null;
      cancelAmount?: number | null;
    } | null;
    rawSummary?: {
      orderId?: string | null;
      resultCode?: string | null;
      resultMsg?: string | null;
      goodsName?: string | null;
    } | null;
  } | null;
  totalPrice: number;
  history?: { status: string; date: string; description: string }[];
  cancelRequest?: {
    status: "요청" | "승인" | "거절";
    reasonCode?: string;
    reasonText?: string;
    requestedAt?: string;
    approvedAt?: string;
    rejectedAt?: string;
    rejectedReason?: string;
    refundAccount?: {
      bank: string;
      account: string;
      holder: string;
    };
  } | null;
  updatedAt?: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  linkedOrderItems?: Array<{
    id: string;
    productName: string;
    quantity: number;
    price?: number | null;
    stringPrice?: number | null;
    stringingFee?: number | null;
    selectedGauge?: string | null;
    selectedColor?: string | null;
    selectedColorLabel?: string | null;
    stringName?: string | null;
    racketName?: string | null;
  }>;
  stringDetails: {
    preferredDate: string;
    preferredTime: string;
    stringTypes: string[];
    customStringName?: string;
    racketType: string;
    requirements?: string;
  };
  visitSlotCount?: number | null;
  visitDurationMinutes?: number | null;
  lines?: Array<{
    id?: string;
    racketType?: string;
    racketLabel?: string;
    stringName?: string;
    tensionMain?: string;
    tensionCross?: string;
    note?: string;
  }>;
  shippingInfo?: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    addressDetail?: string;
    postalCode: string;
    depositor?: string;
    bank?: string;
    deliveryRequest?: string;
    shippingMethod?: string;
    collectionMethod?: string;
    estimatedDate?: string;
    invoice?: {
      courier: string;
      trackingNumber: string;
      shippedAt?: string;
    };
    selfShip?: {
      courier?: string;
      trackingNo?: string;
      shippedAt?: string;
      note?: string;
    };
  } | null;
  purchasedStrings: {
    id: string;
    name: string;
    mountingFee: number;
  }[];
  orderStrings: {
    id: string;
    name: string;
    mountingFee: number;
  }[];
  meta?: {
    selectedGauge?: string | null;
    selectedColor?: string | null;
    selectedColorLabel?: string | null;
    selectedColorHex?: string | null;
    selectedColorImage?: string | null;
  };
  stockDeduction?: {
    mode?: string;
    colorValue?: string | null;
    gaugeValue?: string | null;
  } | null;
  stockRestore?: {
    variantStockRestoredAt?: string | null;
    variantStockRestoreReason?: string | null;
  } | null;

  packageInfo?: {
    applied: boolean;
    useCount: number;
    passId?: string | null;
    passTitle?: string | null;
    packageSize?: number | null;
    usedCount?: number | null;
    remainingCount?: number | null;
    redeemedAt?: string | null;
    expiresAt?: string | null;
  };
  // service_pass_consumptions 기반 패키지 차감 이력
  packageConsumptions?: Array<{
    id: string;
    passId: string;
    usedAt: string;
    count: number;
    reverted?: boolean;
  }>;

  // 고객 발송 라켓/운송장 필요 여부 (서버에서 내려줌)
  inboundRequired?: boolean;
  needsInboundTracking?: boolean;
  orderHasRacket?: boolean;
}
type AdminNextActionTone = "urgent" | "warning" | "info" | "success";
type AdminNextActionGuide = {
  tone: AdminNextActionTone;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

// 스트링 교체 서비스용 운송장 조회 URL 헬퍼
// 코드 + 운송장번호 → 조회 URL
// 코드/라벨 모두 대응하는 운송장 조회 URL 헬퍼
const buildTrackingUrl = (courier?: string | null, trackingNumber?: string | null) => {
  if (!trackingNumber) return null;
  const no = trackingNumber.trim();
  if (!no) return null;

  const c = (courier ?? "").toLowerCase();

  // CJ 대한통운 (코드: cj / 라벨: CJ대한통운)
  if (c.includes("cj") || c.includes("cj대한통운")) {
    return `https://trace.cjlogistics.com/web/detail.jsp?slipno=${encodeURIComponent(no)}`;
  }

  // 우체국택배 (코드: post)
  if (c.includes("우체국") || c === "post") {
    return `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${encodeURIComponent(no)}`;
  }

  // 한진택배 (코드: hanjin)
  if (c.includes("한진") || c === "hanjin") {
    return `https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&wblnum=${encodeURIComponent(no)}`;
  }

  // 로젠택배 (코드: logen)
  if (c.includes("로젠") || c === "logen") {
    return `https://www.ilogen.com/web/personal/trace/${encodeURIComponent(no)}`;
  }

  // 그 외(롯데/경동/기타)는 일단 기본값: CJ 페이지로 통일
  return `https://trace.cjlogistics.com/web/detail.jsp?slipno=${encodeURIComponent(no)}`;
};

// 코드 → 한글 라벨
const getCourierLabel = (courier?: string | null) => {
  const normalized = courier?.trim();
  return normalized ? getCourierDisplayName(normalized) : "택배사 미입력";
};

// 시간(시/분)을 2자리 문자열로 포맷
const pad2 = (n: number) => String(n).padStart(2, "0");

const toShortApplicationId = (value?: string | null) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "-";
  return normalized.slice(-6).toUpperCase();
};

/**
 * 방문 예약 일시를 "YYYY-MM-DD HH:mm ~ HH:mm (n슬롯 / 총 m분)" 형태로 포맷.
 *
 * - preferredDate / preferredTime 이 비어 있으면 간단한 문구만 반환
 * - durationMinutes 가 없으면 "YYYY-MM-DD HH:mm"까지만,
 * - slotCount 가 있으면 "(n슬롯 / 총 m분)" 꼬리를 붙여줌.
 */
const formatVisitTimeRange = (
  preferredDate?: string,
  preferredTime?: string,
  durationMinutes?: number | null,
  slotCount?: number | null,
): string => {
  if (!preferredDate || !preferredTime) {
    return "예약 일시 미입력";
  }

  // HH:mm 파싱
  const [hh, mm] = preferredTime.split(":");
  const h = Number(hh);
  const m = Number(mm);

  // 시간이 이상하거나 duration이 없으면 그냥 "날짜 + 시작시간"만
  if (!Number.isFinite(h) || !Number.isFinite(m) || !durationMinutes || durationMinutes <= 0) {
    return `${preferredDate} ${preferredTime}`;
  }

  const startTotal = h * 60 + m;
  const endTotal = startTotal + durationMinutes;

  // 단순하게 24시간 기준으로 mod 처리 (자정 넘는 극단 케이스도 안전하게 표시)
  const endH = Math.floor(endTotal / 60) % 24;
  const endM = endTotal % 60;
  const endTimeStr = `${pad2(endH)}:${pad2(endM)}`;

  const baseRange = `${preferredDate} ${preferredTime} ~ ${endTimeStr}`;

  if (slotCount && slotCount > 0) {
    return `${baseRange} (${slotCount}슬롯 / 총 ${durationMinutes}분)`;
  }
  return `${baseRange} (총 ${durationMinutes}분)`;
};

export default function StringingApplicationDetailClient({
  id,
  baseUrl,
  backUrl = "/admin/orders",
  isAdmin = true,
  userEditableStatuses = ["검토 중", "접수완료"],
}: Props) {
  const router = useRouter();

  const historyMutateRef = useRef<(() => Promise<any>) | undefined>(undefined);
  // 전역 편집 모드 토글
  const [isEditMode, setIsEditMode] = useState(false);
  // 고객 정보 카드 편집 토글
  const [editingCustomer, setEditingCustomer] = useState(false);
  // 결제정보 편집 토글
  const [editingPayment, setEditingPayment] = useState(false);
  // 신청 스트링 정보 모달 상태
  const [isStringModalOpen, setIsStringModalOpen] = useState(false);
  // 요청사항 편집 모드
  const [editingRequirements, setEditingRequirements] = useState(false);

  const [isPending, startTransition] = useTransition();

  // 신청 취소 요청 모달 상태
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  // 관리자: 취소 요청 거절 모달 상태
  const [isApproveCancelDialogOpen, setIsApproveCancelDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejectSubmitting, setIsRejectSubmitting] = useState(false);
  const [isAdminCancelDialogOpen, setIsAdminCancelDialogOpen] = useState(false);
  const [adminCancelReason, setAdminCancelReason] = useState("");
  const [isAdminCancelSubmitting, setIsAdminCancelSubmitting] = useState(false);

  // 취소 요청 철회 로딩 상태
  const [isWithdrawingCancel, setIsWithdrawingCancel] = useState(false);

  // 교체 확정 전용 로딩 상태
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false);
  const [isLineDetailsExpanded, setIsLineDetailsExpanded] = useState(isAdmin);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isSyncingNice, setIsSyncingNice] = useState(false);

  // 1) 버튼에서 모달 여는 함수
  const handleOpenCancelDialog = () => {
    if (isCancelled || isCancelRequested) return;
    setIsCancelDialogOpen(true);
  };

  // 2) 모달에서 "취소 요청하기" 눌렀을 때 실제 요청
  const handleConfirmCancelRequest = (params: {
    reasonCode: string;
    reasonText?: string;
    refundAccount?: {
      bank: string;
      account: string;
      holder: string;
    };
  }) => {
    const { reasonCode, reasonText, refundAccount } = params;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/applications/stringing/${applicationId}/cancel-request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reasonCode,
            reasonText,
            ...(refundAccount ? { refundAccount } : {}),
          }),
          credentials: "include",
        });

        if (!res.ok) {
          const parsed = await readCancelRequestError(res, "취소 요청 실패");
          console.error("cancel-request failed", res.status, parsed);
          throw new Error(parsed.message || "취소 요청 실패");
        }

        showSuccessToast(
          "취소 요청이 정상적으로 접수되었습니다. 관리자 확인 후 결과가 반영됩니다.",
        );
        await mutate();
        if (historyMutateRef.current) {
          await historyMutateRef.current();
        }
        setIsCancelDialogOpen(false);
      } catch (err) {
        console.error(err);
        showErrorToast(err instanceof Error ? err.message : "취소 요청 중 오류가 발생했습니다.");
      }
    });
  };

  // 사용자: 이미 넣어둔 취소 요청을 철회
  const handleWithdrawCancelRequest = async () => {
    if (!data?.id) return;

    if (!window.confirm("이미 제출한 취소 요청을 철회하시겠습니까?")) {
      return;
    }

    try {
      setIsWithdrawingCancel(true);

      const res = await fetch(`/api/applications/${data.id}/cancel-request-withdraw`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        console.error("cancel-request-withdraw failed", res.status, msg);
        throw new Error("취소 요청 철회 실패");
      }

      showSuccessToast("취소 요청을 철회했습니다.");

      // 상세 + 이력 모두 갱신
      await mutate();
      if (historyMutateRef.current) {
        await historyMutateRef.current();
      }
    } catch (err) {
      console.error(err);
      showErrorToast("취소 요청 철회 중 오류가 발생했습니다.");
    } finally {
      setIsWithdrawingCancel(false);
    }
  };

  // 관리자: 취소 요청 승인
  const handleAdminApproveCancel = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/applications/stringing/${applicationId}/cancel-approve`, {
          method: "POST",
          credentials: "include",
        });

        if (!res.ok) {
          const parsed = await res.json().catch(() => null);
          const message =
            parsed && typeof parsed.message === "string"
              ? parsed.message
              : parsed && typeof parsed.error === "string"
                ? parsed.error
                : "취소 승인에 실패했습니다.";

          console.error("cancel-approve failed", res.status, parsed);
          throw new Error(message);
        }

        showSuccessToast("취소 요청을 승인했습니다.");
        await mutate();
        if (historyMutateRef.current) {
          await historyMutateRef.current();
        }
      } catch (err) {
        console.error(err);
        showErrorToast(err instanceof Error ? err.message : "취소 승인 중 오류가 발생했습니다.");
      }
    });
  };

  // 관리자: 취소 요청 거절 버튼 클릭
  const handleAdminRejectCancel = () => {
    if (!isCancelRequested || isCancelled) return;

    // 이전에 입력한 내용 초기화
    setRejectReason("");
    setIsRejectDialogOpen(true);
  };

  // 모달 안에서 "거절 확정" 버튼 클릭 시 실제 API 호출
  const handleConfirmRejectCancel = () => {
    const reason = rejectReason.trim();

    startTransition(async () => {
      try {
        setIsRejectSubmitting(true);

        const res = await fetch(`/api/applications/stringing/${applicationId}/cancel-reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
          credentials: "include",
        });

        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          console.error("cancel-reject failed", res.status, msg);
          throw new Error("취소 거절 실패");
        }

        showSuccessToast("취소 요청을 거절했습니다.");
        await mutate();
        if (historyMutateRef.current) {
          await historyMutateRef.current();
        }

        // 모달 닫기 + 입력값 초기화
        setIsRejectDialogOpen(false);
        setRejectReason("");
      } catch (err) {
        console.error(err);
        showErrorToast("취소 거절 중 오류가 발생했습니다.");
      } finally {
        setIsRejectSubmitting(false);
      }
    });
  };

  const handleConfirmAdminCancel = () => {
    const reason = adminCancelReason.trim();
    if (!reason) {
      showErrorToast("관리자 취소 사유를 입력해주세요.");
      return;
    }

    startTransition(async () => {
      try {
        setIsAdminCancelSubmitting(true);

        const res = await fetch(`/api/applications/stringing/${applicationId}/admin-cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
          credentials: "include",
        });

        if (!res.ok) {
          const parsed = await res.json().catch(() => null);
          const message =
            parsed && typeof parsed.message === "string"
              ? parsed.message
              : parsed && typeof parsed.error === "string"
                ? parsed.error
                : "신청 직접 취소에 실패했습니다.";
          console.error("admin-cancel failed", res.status, parsed);
          throw new Error(message);
        }

        showSuccessToast("신청을 직접 취소했습니다.");
        await mutate();
        if (historyMutateRef.current) {
          await historyMutateRef.current();
        }
        router.refresh();
        setIsAdminCancelDialogOpen(false);
        setAdminCancelReason("");
      } catch (err) {
        console.error(err);
        showErrorToast(
          err instanceof Error ? err.message : "신청 직접 취소 중 오류가 발생했습니다.",
        );
      } finally {
        setIsAdminCancelSubmitting(false);
      }
    });
  };

  const handleConfirmExchange = async () => {
    if (!canConfirmExchange || isConfirmSubmitting) return;

    if (!window.confirm("교체 작업을 확정하시겠습니까?\n확정 후에는 되돌릴 수 없습니다.")) return;

    try {
      setIsConfirmSubmitting(true);

      const res = await fetch(`${baseUrl}/api/applications/stringing/${applicationId}/confirm`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        console.error("confirm failed", res.status, msg);
        throw new Error("confirm failed");
      }

      showSuccessToast("교체 확정이 완료되었습니다.");
      await mutate();
      await historyMutateRef.current?.();
    } catch (e) {
      console.error(e);
      showErrorToast("교체 확정 중 오류가 발생했습니다.");
    } finally {
      setIsConfirmSubmitting(false);
    }
  };

  // // 기존 store 아이디
  // const storeId = useStringingStore((state) => state.selectedApplicationId);
  // // 새로고침 대비 fallback: prop 으로 내려준 id 를 쓰거나, storeId 사용
  // const applicationId = storeId ?? id;

  const applicationId = id;

  // store가 비어 있을 땐 id 로 채워두면 이후 내비게이션 시에도 동일하게 동작
  useEffect(() => {
    useStringingStore.setState({ selectedApplicationId: id });
  }, [id]);
  const { data, error, isLoading, mutate } = useSWR<ApplicationDetail>(
    applicationId ? `${baseUrl}/api/applications/stringing/${applicationId}` : null,
    authenticatedSWRFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const handleNiceSync = async () => {
    if (!data?.id || isSyncingNice) return;
    setIsSyncingNice(true);
    try {
      const res = await fetch(`/api/applications/stringing/${data.id}/payment-sync`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "PG 상태 재동기화에 실패했습니다.");
      }
      await mutate();
      showSuccessToast("결제 상태 재동기화를 완료했습니다.");
    } catch (error: any) {
      showErrorToast(error?.message || "PG 상태 재동기화 중 오류가 발생했습니다.");
    } finally {
      setIsSyncingNice(false);
    }
  };
  useEffect(() => {
    const lineCount = Array.isArray(data?.lines) ? data.lines.length : 0;
    setIsLineDetailsExpanded(lineCount <= 3);
  }, [applicationId, data?.lines]);

  const renderInitialLoading = () => (
    <main className="w-full">
      <div className={cn(isAdmin && "mx-auto w-full max-w-[1280px] px-3 py-4 bp-sm:px-4 bp-md:px-3 lg:px-5 lg:py-5")}>
        <SiteContainer
          variant={isAdmin ? "full" : "wide"}
          className={cn(
            isAdmin
              ? "space-y-6 px-0 bp-sm:px-0 bp-md:px-0 bp-lg:px-0"
              : "space-y-5 px-0 py-4 bp-sm:space-y-6 bp-sm:px-4 bp-sm:py-5 bp-md:px-6 bp-lg:px-0",
          )}
        >
          <div className={cn("mx-auto w-full", isAdmin ? "max-w-[1500px]" : "max-w-7xl")}>
            <div className="mb-6 rounded-2xl border-0 bg-card p-4 shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50 bp-sm:mb-8 bp-sm:p-6 bp-md:p-8 lg:p-6">
              <div className="space-y-3">
                <Skeleton className="h-8 w-52" />
                <Skeleton className="h-4 w-72 max-w-full" />
                <div className="flex flex-wrap gap-2 pt-1">
                  <Skeleton className="h-9 w-40" />
                  <Skeleton className="h-9 w-32" />
                </div>
              </div>
            </div>

            <div className={cn("grid gap-4 md:grid-cols-2", isAdmin && "xl:grid-cols-12")}>
              <Card
                className={cn(
                  "overflow-hidden border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50",
                  isAdmin && "xl:col-span-8",
                )}
              >
                <CardHeader
                  className="space-y-2 border-b border-border/70 bg-secondary/30 p-4 bp-sm:p-5"
                >
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-72 max-w-full" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[90%]" />
                  <Skeleton className="h-4 w-[75%]" />
                </CardContent>
              </Card>

              <Card
                className={cn(
                  "overflow-hidden border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50",
                  isAdmin && "xl:col-span-4",
                )}
              >
                <CardHeader
                  className="space-y-2 border-b border-border/70 bg-secondary/30 p-4 bp-sm:p-5"
                >
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-56 max-w-full" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[85%]" />
                  <Skeleton className="h-4 w-[70%]" />
                </CardContent>
              </Card>
            </div>
          </div>
        </SiteContainer>
      </div>
    </main>
  );

  if (error)
    return (
      <AsyncState
        kind="error"
        tone={isAdmin ? "admin" : "user"}
        variant="page-center"
        resourceName="신청서 상세"
        onAction={() => {
          void mutate();
        }}
      />
    );
  if (!data) {
    if (isLoading) {
      return renderInitialLoading();
    }

    return (
      <AsyncState
        kind="empty"
        tone={isAdmin ? "admin" : "user"}
        variant="page-center"
        resourceName="신청서 상세"
        title="신청서 정보를 찾을 수 없습니다"
        description="신청서 ID를 확인한 뒤 다시 시도해 주세요."
      />
    );
  }

  // 관리자이거나(isAdmin), 또는 상태가 userEditableStatuses에 포함될 때를 판단
  const isOrderLinkedApplication = Boolean(data.orderId);
  const isRentalLinkedApplication = Boolean(
    data.rentalId ||
    String(data.paymentSource ?? "")
      .trim()
      .startsWith("rental:"),
  );
  const isLinkedApplication = isOrderLinkedApplication || isRentalLinkedApplication;
  const isEditableAllowed =
    !isRentalLinkedApplication && (isAdmin || userEditableStatuses.includes(data.status));

  // 요약 표시용 파생 값
  const stringTypeCount = data.stringDetails?.stringTypes?.length ?? 0;

  // 패키지 차감 총 회수 (이력 카드 상단에 표시 용도)
  const totalPackageConsumed =
    data.packageConsumptions?.reduce((sum, c) => sum + (c.count ?? 1), 0) ?? 0;

  // 라켓 자루 수 추정: 현재 racketType 에 '라켓1, 라켓2' 형태라면 split 로 계산
  const racketCount =
    Array.isArray(data.lines) && data.lines.length > 0
      ? data.lines.length
      : data.stringDetails?.racketType
        ? data.stringDetails.racketType.split(",").filter((s) => s.trim().length > 0).length
        : 1;

  // 총 장착비 (백엔드 totalPrice 신뢰)
  const totalPrice = data.totalPrice ?? 0;
  const lineCount = Array.isArray(data.lines) ? data.lines.length : 0;
  const selectedGauge = String(data.meta?.selectedGauge ?? "").trim();
  const selectedColorLabel = String(
    data.meta?.selectedColorLabel ?? data.meta?.selectedColor ?? "",
  ).trim();
  const selectedColorHex = String(data.meta?.selectedColorHex ?? "").trim();

  const groupedItemSummary = new Map<
    string,
    { id: string; name: string; price: number; quantity: number }
  >();
  for (const item of data.items ?? []) {
    const key = `${item.id}::${item.name}::${item.price}`;
    const prev = groupedItemSummary.get(key);
    if (prev) {
      prev.quantity += item.quantity;
    } else {
      groupedItemSummary.set(key, {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      });
    }
  }
  const itemSummary = Array.from(groupedItemSummary.values()).map((it) => ({
    ...it,
    subtotal: it.price * it.quantity,
  }));
  const linkedOrderItems = Array.isArray(data.linkedOrderItems) ? data.linkedOrderItems : [];

  const lineSummaryLines = Array.isArray(data.lines) ? data.lines : [];
  const lineSummaryStringKinds = new Set(
    lineSummaryLines.map((line) => String(line.stringName ?? "").trim()).filter(Boolean),
  );
  const lineSummary = {
    racketCount: lineSummaryLines.length,
    stringTypeCount: lineSummaryStringKinds.size,
    tensionFilledCount: lineSummaryLines.filter(
      (line) =>
        String(line.tensionMain ?? "").trim().length > 0 ||
        String(line.tensionCross ?? "").trim().length > 0,
    ).length,
    notedCount: lineSummaryLines.filter((line) => String(line.note ?? "").trim().length > 0).length,
  };

  const isCancelled = data.status === "취소";
  const paymentSourceRaw = String(data.paymentSource ?? "").trim();
  const linkedRentalId =
    data.rentalId ??
    (paymentSourceRaw.startsWith("rental:") ? paymentSourceRaw.slice("rental:".length) : null);
  const linkedAdminHref = data.orderId
    ? `/admin/orders/${data.orderId}`
    : linkedRentalId
      ? `/admin/rentals/${encodeURIComponent(String(linkedRentalId))}`
      : null;
  const linkedStageCtaLabel = data.orderId ? "주문에서 진행 단계 변경" : "대여에서 진행 단계 확인";
  const applicationContext = isRentalLinkedApplication
    ? {
        label: "대여 연결 하위 작업",
        title: "대여에 포함된 교체 작업",
        description:
          "이 작업은 대여 상세와 연결되어 있습니다. 대여 흐름 안에서 입고·작업·인도 상태를 함께 확인하세요.",
        payment: "결제는 대여 결제에 포함됨",
      }
    : isOrderLinkedApplication
      ? {
          label: "주문 연결 하위 작업",
          title: "주문에 포함된 교체 작업",
          description:
            "이 작업은 주문 상세와 연결되어 있습니다. 결제는 주문에서 처리되며, 진행 단계는 주문 상세의 연결 진행 단계와 함께 확인하세요.",
          payment: "결제는 주문 결제에 포함됨",
        }
      : {
          label: "단독 교체서비스 신청서",
          title: "교체서비스 신청서",
          description: "이 신청서 자체가 대표 업무입니다. 접수·작업·완성 라켓 배송/수령을 이 화면에서 처리합니다.",
          payment: "결제는 이 신청서에서 처리합니다.",
        };
  const effectiveStockDeduction =
    data.stockDeduction ??
    (data as any).stringing?.stockDeduction ??
    (data as any).selectedString?.stockDeduction ??
    (data as any).stringProduct?.stockDeduction ??
    null;
  const effectiveStockRestore = data.stockRestore ?? (data as any).stringing?.stockRestore ?? null;
  const isVariantStockMode = effectiveStockDeduction?.mode === "variant";
  const linkedPayment = data.linkedPayment ?? null;
  const packageApplied = Boolean(data.packageInfo?.applied);
  const hasOrderLinkedPayment =
    paymentSourceRaw.startsWith("order:") &&
    Boolean(linkedPayment) &&
    linkedPayment?.source === "order";
  const hasRentalLinkedPayment =
    paymentSourceRaw.startsWith("rental:") &&
    Boolean(linkedPayment) &&
    linkedPayment?.source === "rental";
  const isLinkedPayment = hasOrderLinkedPayment || hasRentalLinkedPayment;
  const useStandaloneBankFallback = !isLinkedPayment && !packageApplied;

  const paymentStatus = packageApplied
    ? (linkedPayment?.status ?? "패키지 적용 완료")
    : hasOrderLinkedPayment || hasRentalLinkedPayment
      ? (linkedPayment?.status ?? data.orderPaymentStatus ?? data.paymentStatus ?? "결제대기")
      : (data.paymentStatus ?? "결제대기");
  const linkedPaymentContextLabel = packageApplied
    ? "패키지 차감"
    : isOrderLinkedApplication || paymentSourceRaw.startsWith("order:")
      ? "주문 결제에 포함됨"
      : isRentalLinkedApplication || paymentSourceRaw.startsWith("rental:")
        ? "대여 결제에 포함됨"
        : paymentStatus;
  const shouldShowLinkedPaymentContextBadge =
    packageApplied ||
    isLinkedApplication ||
    isLinkedPayment ||
    paymentSourceRaw.startsWith("order:") ||
    paymentSourceRaw.startsWith("rental:");
  const paymentHeaderBadgeLabel = shouldShowLinkedPaymentContextBadge
    ? linkedPaymentContextLabel
    : paymentStatus;
  const normalizedPaymentProvider = String(linkedPayment?.provider ?? "")
    .trim()
    .toLowerCase();
  const canSyncStandaloneNicePayment =
    isAdmin &&
    !isLinkedPayment &&
    normalizedPaymentProvider === "nicepay" &&
    Boolean(String(linkedPayment?.tid ?? "").trim());
  const needsCancelRefundAccount =
    !packageApplied && paymentStatus === "결제완료" && normalizedPaymentProvider !== "nicepay";
  const noCancelRefundAccountMessage = packageApplied
    ? "패키지 사용 신청은 환불계좌 입력 없이 취소 요청할 수 있습니다. 승인 시 사용 회차 복원 기준으로 처리됩니다."
    : normalizedPaymentProvider === "nicepay"
      ? "카드 결제 취소는 환불계좌 없이 요청할 수 있습니다. 관리자 승인 후 결제사 취소 또는 주문 취소 흐름에 따라 처리됩니다."
      : "이 신청은 환불계좌 입력 없이 취소 요청할 수 있습니다.";

  // 취소 요청 상태 (한글/영문 모두 허용)
  const rawCancelStatus = normalizeAdminCancelRequestStatus(
    (data.cancelRequest?.status ?? null) as string | null,
  );

  const isCancelRequested = rawCancelStatus === "requested";
  // 확정 여부 필드가 서버에서 내려온다는 전제
  const isUserConfirmed = Boolean((data as any).userConfirmedAt);

  // 확정 버튼 노출/활성 조건 (ApplicationsClient 규칙에 맞게 "상태 기반"으로 단순화)
  const confirmableStatuses = [`${"반"}송완료`, "교체완료", "완료"];
  const canConfirmExchange =
    !isAdmin &&
    !isLinkedApplication &&
    !isCancelled &&
    !isCancelRequested &&
    !isUserConfirmed &&
    confirmableStatuses.includes(data.status);
  const showConfirmExchangeButton = !isLinkedApplication && (canConfirmExchange || isUserConfirmed);
  // 라켓 종류 요약 문자열 (라인 기반 집계 우선)
  const racketTypeCountMap = new Map<string, number>();
  for (const line of Array.isArray(data.lines) ? data.lines : []) {
    const racketName = String(line.racketType ?? line.racketLabel ?? "").trim();
    if (!racketName) continue;
    racketTypeCountMap.set(racketName, (racketTypeCountMap.get(racketName) ?? 0) + 1);
  }
  const racketTypeSummaryFromLines = Array.from(racketTypeCountMap.entries())
    .map(([name, count]) => `${name} ${count}자루`)
    .join(", ");
  const racketTypeSummary =
    racketTypeSummaryFromLines ||
    (data.stringDetails?.racketType && data.stringDetails.racketType.trim().length > 0
      ? data.stringDetails.racketType.trim()
      : "입력된 라켓 정보 없음");

  // 주문 취소 요청 여부
  const hasOrderCancelRequested =
    data.orderCancelStatus === "requested" || data.orderCancelStatus === "요청";

  const canAdminDirectCancel =
    isAdmin &&
    !isCancelled &&
    !isLinkedApplication &&
    !hasOrderCancelRequested &&
    !isCancelRequested &&
    ["검토 중", "접수완료"].includes(data.status);

  const backQuery = new URLSearchParams(backUrl.split("?")[1] ?? "");
  const ordersScope = backQuery.get("scope");
  const flowQuery = new URLSearchParams();
  flowQuery.set("from", "orders");
  if (ordersScope) {
    flowQuery.set("scope", ordersScope);
  }

  // 연결 문서(표시 전용)
  const linkedDocs: LinkedDocItem[] = [];
  if (data.orderId) {
    linkedDocs.push({
      kind: "order",
      id: String(data.orderId),
      href: isAdmin
        ? `/admin/orders/${data.orderId}`
        : `/mypage?tab=orders&flowType=order&flowId=${data.orderId}&${flowQuery.toString()}&focus=stringing`,
      subtitle: "연결된 주문",
    });
  }
  if (linkedRentalId) {
    const rid = String(linkedRentalId);
    linkedDocs.push({
      kind: "rental",
      id: rid,
      href: isAdmin
        ? `/admin/rentals/${encodeURIComponent(rid)}`
        : `/mypage?tab=orders&flowType=rental&flowId=${encodeURIComponent(rid)}&${flowQuery.toString()}&focus=stringing`,
      subtitle: "연결된 대여",
    });
  }

  const linkedDocsDescription =
    linkedDocs.length === 0
      ? undefined
      : linkedDocs.length === 2
        ? "이 신청은 주문 및 대여와 연결되어 있습니다. 연결 문서의 결제·배송·취소 흐름을 함께 확인하세요."
        : data.orderId
          ? "이 신청은 주문에서 생성되었습니다. 주문 상세에서 결제·배송·최종 취소 흐름을 함께 확인하세요."
          : "이 신청은 대여에서 생성되었습니다. 대여 상세에서 결제·배송·취소 흐름을 함께 확인하세요.";

  const paymentMethodRaw = packageApplied
    ? linkedPayment?.method
    : hasOrderLinkedPayment || hasRentalLinkedPayment
      ? linkedPayment?.method
      : (linkedPayment?.method ?? "무통장입금");

  // 관리자용 취소 요청 정보 (주문 상세와 동일 패턴)
  const cancelInfo = buildAdminCancelRequestView(data.cancelRequest, "application");
  // 자가발송/운송장 등록 여부 계산
  // 고객 발송 라켓 기준은 collectionMethod만 사용
  const collectionMethodRaw = data.shippingInfo?.collectionMethod ?? null;
  const cm = normalizeCollection(collectionMethodRaw ?? "self_ship");
  const isSelfShip = cm === "self_ship";
  const isVisit = cm === "visit";
  const customerAddressReadLabels = getStringingAddressReadLabels(cm);
  const customerAddressLabel = customerAddressReadLabels.primaryLabel;
  const customerAddressValue = isVisit
    ? customerAddressReadLabels.primaryValue
    : data.customer?.address?.trim() || "정보 없음";
  const customerAddressSubLabel = customerAddressReadLabels.secondaryLabel;
  const customerAddressSubValue = isVisit
    ? customerAddressReadLabels.secondaryValue
    : data.customer?.postalCode?.trim() || null;

  // 서버에서 내려준 값 우선 사용 (라켓 구매/대여 연결이면 false로 내려옴)
  const inboundRequired = data.inboundRequired ?? true;
  const needsInboundTracking =
    !isLinkedApplication && (data.needsInboundTracking ?? (inboundRequired && isSelfShip));

  // 작업 완료 후 완성 라켓 배송/인도 방식은 shippingMethod로 별도 유지
  const shippingMethod = data.shippingInfo?.shippingMethod;

  // 관리자 상세에서 “수령/배송(매장 → 고객 반환)”을 한눈에 보기 위한 배지
  const shippingMethodBadge = getShippingMethodBadge(data as any);

  // 연결 주문에서 선택된 “수령방식(방문/택배/퀵)” 배지
  // - handleGetStringingApplication에서 linkedOrderPickupMethod를 내려주므로,
  // 신청서 상세에서도 같은 수령방식을 표시할 수 있다.
  const linkedOrderPickupMethod = (data as any)?.linkedOrderPickupMethod as
    | "visit"
    | "delivery"
    | "quick"
    | null
    | undefined;
  const linkedOrderPickupBadge = linkedOrderPickupMethod
    ? getShippingMethodBadge({
        shippingInfo: { shippingMethod: linkedOrderPickupMethod },
      } as any)
    : null;

  // 방문 예약인 경우에만 의미 있는 희망 일시 라벨
  const visitTimeLabel = isVisit
    ? formatVisitTimeRange(
        data.stringDetails.preferredDate,
        data.stringDetails.preferredTime,
        data.visitDurationMinutes ?? null,
        data.visitSlotCount ?? null,
      )
    : "예약 불필요";

  const selfShip = data.shippingInfo?.selfShip;
  const hasTracking = Boolean(selfShip?.trackingNo);
  const inboundTrackingHref = `/services/applications/${data.id}/shipping?${new URLSearchParams({
    return: `/mypage?tab=orders&flowType=application&flowId=${data.id}&${flowQuery.toString()}`,
  }).toString()}`;
  const invoice = data.shippingInfo?.invoice;
  const isCourierShipping = normalizeOrderShippingMethod(shippingMethod) === "courier";

  const hasStoreShippingInfo =
    Boolean(shippingMethod) || Boolean(invoice?.trackingNumber) || Boolean(invoice?.shippedAt);

  const appGuide = inferNextActionForOperationItem({
    kind: "stringing_application",
    statusLabel: data.status,
    paymentLabel: paymentStatus,
    hasInboundTracking: hasTracking,
  });
  const lowerStatus = String(data.status ?? "").toLowerCase();
  const hasCancelRequest =
    normalizeAdminCancelRequestStatus(data.cancelRequest?.status) === "requested";
  const hasLinkedDocs = linkedDocs.length > 0;
  const needsShippingCheck = !isLinkedApplication && isCourierShipping && !invoice?.trackingNumber;
  const nextActionGuide: AdminNextActionGuide = hasCancelRequest
    ? {
        tone: "urgent",
        title: "취소 요청 검토 필요",
        description: "취소 요청 카드 기준으로 승인/거절 여부를 먼저 판단하세요.",
      }
    : hasLinkedDocs
      ? {
          tone: "info",
          title: data.orderId
            ? "주문 상세의 연결 진행 단계 확인"
            : "대여 상세의 연결 진행 단계 확인",
          description: data.orderId
            ? "이 작업은 주문에 포함된 하위 작업입니다. 주문 상세의 연결 진행 단계에서 상태를 함께 변경하세요."
            : "이 작업은 대여에 포함된 하위 작업입니다. 대여 상세의 연결 진행 단계에서 상태를 함께 변경하세요.",
          actionLabel: data.orderId ? "주문에서 진행 단계 변경" : "대여에서 진행 단계 확인",
          actionHref: linkedAdminHref ?? undefined,
        }
      : lowerStatus.includes("접수") || lowerStatus.includes("검토")
        ? {
            tone: "warning",
            title: "신청 내용 검토 필요",
            description: "요청 스트링/장력/수령 방식을 확인한 뒤 작업 단계를 진행하세요.",
          }
        : lowerStatus.includes("작업")
          ? {
              tone: "info",
              title: "교체 진행 상태 확인",
              description: "작업 진행 상태와 수령/배송 준비 상태를 함께 점검하세요.",
            }
          : lowerStatus.includes("교체완료") || lowerStatus === "완료"
            ? {
                tone: "success",
                title: "완료 처리 및 이력 확인",
                description: "완료 처리 후 연결 문서 반영 여부와 변경 이력을 확인하세요.",
              }
            : needsShippingCheck
              ? {
                  tone: "warning",
                  title: "완성 라켓 운송장 확인",
                  description: "작업 완료 후 완성 라켓 운송장 입력 여부를 확인하세요.",
                  actionLabel: "완성 라켓 운송장 등록/수정",
                  actionHref: `/admin/applications/stringing/${data.id}/shipping-update`,
                }
              : {
                  tone: "success",
                  title: "추가 조치 필요 없음",
                  description: "현재 기준으로 즉시 필요한 추가 조치는 없습니다.",
                };
  const recommendedActions = [
    {
      label: isLinkedApplication ? "결제 문맥 확인" : "결제 정보 확인",
      href: "#admin-stringing-payment",
      show: true,
    },
    {
      label: "물류 정보 확인",
      href: "#admin-stringing-shipping",
      show: true,
    },
    {
      label: "취소 요청 확인",
      href: "#admin-stringing-cancel-request",
      show: hasCancelRequest,
    },
    { label: "처리 이력 보기", href: "#admin-stringing-history", show: true },
  ].filter((action) => action.show);

  const latestProcessingHistory = Array.isArray(data.history)
    ? ([...data.history].sort((a, b) => {
        const aTime = new Date(a.date).getTime();
        const bTime = new Date(b.date).getTime();
        return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
      })[0] ?? null)
    : null;

  const latestProcessingDate = latestProcessingHistory?.date
    ? new Date(latestProcessingHistory.date).toLocaleString("ko-KR")
    : "-";

  // 일반 사용자도 편집 가능 상태일 때만 노출하고, 완료/취소 등엔 비활성화
  const completedLikeStatuses = ["교체완료", `${"반"}송완료`, "완료", "DONE", "취소"];
  const canEditSelfShip =
    (isAdmin || (userEditableStatuses ?? []).includes(data.status)) &&
    !completedLikeStatuses.includes(data.status);
  const shouldShowReturnMethod = !(data.orderId && data.orderHasRacket === true);
  const userNextTodo =
    !isAdmin && !isLinkedApplication && showConfirmExchangeButton && canConfirmExchange
      ? {
          label: "교체서비스 확정",
          ctaLabel: "교체서비스 확정",
          onCtaClick: handleConfirmExchange,
        }
      : !isAdmin && needsInboundTracking && !hasTracking
        ? {
            label: "라켓 발송 운송장 등록",
            ctaLabel: "라켓 발송 운송장 등록",
            ctaHref: inboundTrackingHref,
          }
        : !isAdmin && needsInboundTracking && hasTracking
          ? {
              label: "매장 입고 확인을 기다리고 있습니다.",
              description: "등록한 라켓 발송 운송장 기준으로 매장 도착 확인을 기다려주세요.",
            }
          : null;

  const summaryCardClass =
    "flex min-h-[108px] flex-col items-start justify-between gap-2 border-l-2 border-border bg-muted/20 px-3 py-3 bp-sm:px-4";
  const summaryBadgeClass = cn(badgeBase, badgeSizeSm, "inline-flex w-fit self-start");
  const inboundStatusLabel = !inboundRequired
    ? "별도 발송 불필요"
    : isVisit
      ? "방문 접수 예정"
      : hasTracking
        ? "운송장 등록 완료"
        : "운송장 등록 필요";
  const userStatusDescription =
    userNextTodo?.description ??
    (isCancelled
      ? "취소된 신청서입니다. 상태 변경 및 추가 액션이 제한됩니다."
      : isCancelRequested
        ? "취소 요청 처리 중입니다. 관리자 확인 후 결과가 반영됩니다."
        : userNextTodo?.label
          ? "아래 버튼으로 다음 단계를 진행해 주세요."
          : "상세 정보와 진행 이력을 확인해 주세요.");

  const detailGridClass = isAdmin
    ? "grid gap-4 xl:grid-cols-12"
    : "grid gap-5 bp-lg:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.85fr)] bp-lg:items-start";
  const detailColumnClass = isAdmin ? "contents" : "space-y-5";
  const detailCardClass = isAdmin
    ? "overflow-hidden border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50"
    : "overflow-hidden rounded-2xl border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50";
  const detailCardHeaderClass = isAdmin
    ? "border-b border-border/70 bg-secondary/30 p-4 bp-sm:p-5 lg:p-6"
    : "border-b border-border/70 bg-secondary/30 px-4 py-4 bp-sm:px-5 bp-lg:px-6";
  return (
    <main className="w-full">
      {!isAdmin && (
        <PublicPageHero
          eyebrow="마이페이지"
          title="교체서비스 신청 상세"
          description="현재 상태와 다음 행동을 먼저 확인하고, 상세 정보는 필요한 섹션에서 확인하세요."
          className="rounded-2xl border-0 bg-card py-6 shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50 bp-sm:py-8"
          actions={
            <>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 w-full overflow-hidden whitespace-nowrap border-border bg-background hover:border-primary/30 bp-sm:w-auto"
              >
                <Link href={backUrl}>
                  <span className="bp-sm:hidden">목록</span>
                  <span className="hidden bp-sm:inline">신청 목록으로 돌아가기</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant={isEditMode ? "destructive" : "outline"}
                size="sm"
                disabled={!isEditableAllowed}
                className={cn(
                  "h-9 w-full whitespace-nowrap bp-sm:w-auto",
                  !isEditMode && "border-border bg-background hover:bg-primary/10",
                )}
                onClick={() => {
                  if (!isEditableAllowed) return;
                  setIsEditMode((m) => !m);
                  setEditingCustomer(false);
                }}
              >
                <Pencil className="mr-1 h-4 w-4" />
                {isEditMode ? "편집 취소" : "편집 모드"}
              </Button>
            </>
          }
        >
          <div className="flex w-full flex-col gap-5 border-t border-border/70 bg-background/60 pt-4 bp-sm:pt-5">
            <div className="grid gap-4 bp-lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] bp-lg:items-stretch">
              <div className="flex min-w-0 items-start gap-4">
                <div className="shrink-0 rounded-xl bg-primary/10 p-3 ring-1 ring-primary/10">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="break-keep text-ui-body-sm font-medium text-foreground">
                    {applicationContext.label}
                  </p>
                  <p className="break-all text-ui-body-sm text-muted-foreground" title={data.id}>
                    신청번호: #{toShortApplicationId(data.id)}
                  </p>
                  <p className="text-ui-label text-muted-foreground">
                    신청일 {new Date(data.requestedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 border-l-2 border-primary/30 bg-primary/5 px-3 py-3 bp-sm:px-4">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <ApplicationStatusBadge status={data.status} />
                    <span className="text-ui-label text-muted-foreground">현재 상태</span>
                  </div>
                  <p className="break-keep text-ui-body font-semibold text-foreground">
                    {userNextTodo?.label ??
                      (isUserConfirmed
                        ? "교체서비스 확정이 완료되었습니다."
                        : "신청 진행 상태를 확인하고 있습니다.")}
                  </p>
                  <p className="mt-1 break-keep text-ui-body-sm text-muted-foreground">
                    {userStatusDescription}
                  </p>
                </div>
                {userNextTodo?.ctaLabel ? (
                  <Button
                    asChild={Boolean(userNextTodo.ctaHref)}
                    onClick={userNextTodo.onCtaClick}
                    disabled={isConfirmSubmitting}
                    className="w-full shrink-0"
                  >
                    {userNextTodo.ctaHref ? (
                      <Link href={userNextTodo.ctaHref}>{userNextTodo.ctaLabel}</Link>
                    ) : (
                      userNextTodo.ctaLabel
                    )}
                  </Button>
                ) : (
                  <ServiceReviewCTA
                    applicationId={data.id}
                    status={data.status}
                    userConfirmedAt={data.userConfirmedAt ?? null}
                    className="h-10 w-full overflow-hidden whitespace-nowrap"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 bp-md:grid-cols-3">
              <SummaryCard className="border-0 bg-muted/20 shadow-none ring-1 ring-border/40" contentClassName="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-ui-body-sm font-medium text-foreground">신청 요약</span>
                </div>
                <dl className="space-y-2 text-ui-body-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">신청일</dt>
                    <dd className="font-medium text-foreground">
                      {new Date(data.requestedAt).toLocaleDateString()}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">신청 유형</dt>
                    <dd className="text-right font-medium text-foreground">
                      {applicationContext.label}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">총 작업 수</dt>
                    <dd className="font-medium text-foreground">라켓 {racketCount}자루</dd>
                  </div>
                </dl>
              </SummaryCard>
              <SummaryCard className="border-0 bg-muted/20 shadow-none ring-1 ring-border/40" contentClassName="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-ui-body-sm font-medium text-foreground">비용 요약</span>
                </div>
                <p className="text-ui-card-title-lg font-semibold tabular-nums text-foreground">
                  {data.totalPrice.toLocaleString()}원
                </p>
                <p className="mt-2 text-ui-body-sm text-muted-foreground">
                  결제 상태: {paymentHeaderBadgeLabel}
                </p>
              </SummaryCard>
              <SummaryCard
                className="border-0 bg-primary/5 shadow-none ring-1 ring-primary/15"
                contentClassName="p-4"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="text-ui-body-sm font-medium text-foreground">
                    라켓 발송 상태
                  </span>
                </div>
                <p className="break-keep text-ui-card-title-lg font-semibold text-foreground">
                  {inboundStatusLabel}
                </p>
                <p className="mt-2 break-keep text-ui-body-sm text-muted-foreground">
                  {hasTracking
                    ? "등록한 라켓 발송 운송장 기준으로 매장 입고를 확인합니다."
                    : isVisit
                      ? "예약한 일정에 맞춰 매장에 방문해 주세요."
                      : "필요 시 상단 CTA에서 운송장을 등록해 주세요."}
                </p>
              </SummaryCard>
            </div>
          </div>
        </PublicPageHero>
      )}
      <div className={cn(isAdmin && "mx-auto w-full max-w-[1280px] px-3 py-4 bp-sm:px-4 bp-md:px-3 lg:px-5 lg:py-5")}>
        <SiteContainer
          variant={isAdmin ? "full" : "wide"}
          className={cn(
            isAdmin
              ? "space-y-6 px-0 bp-sm:px-0 bp-md:px-0 bp-lg:px-0"
              : "space-y-5 px-0 py-4 bp-sm:space-y-6 bp-sm:px-4 bp-sm:py-5 bp-md:px-6 bp-lg:px-0",
          )}
        >
          {isLoading ? (
            <div className="mx-auto w-full max-w-[1500px] border-l-2 border-primary/30 bg-primary/5 px-4 py-2 text-ui-body-sm text-foreground/80">
              최신 상태를 확인하고 있습니다...
            </div>
          ) : null}
          <div className={cn("mx-auto w-full", isAdmin ? "max-w-[1500px]" : "max-w-7xl")}>
            {/* 관리자 헤더 */}
            {isAdmin && (
              <div
                className={cn("mb-6 rounded-2xl bp-sm:mb-8 p-5 lg:p-6", adminSurface.cardMuted)}
              >
                <div
                  className={cn(
                    "mb-4",
                    isAdmin
                      ? "flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"
                      : "flex flex-col gap-4 bp-lg:flex-row bp-lg:items-center bp-lg:justify-between bp-sm:mb-6",
                  )}
                >
                  <div
                    className={cn(
                      "flex min-w-0 gap-3 sm:gap-4",
                      isAdmin ? "items-center" : "items-start",
                    )}
                  >
                  <div className="shrink-0 rounded-xl bg-primary/10 p-3 ring-1 ring-primary/10">
                    {isAdmin ? (
                      <Settings className="h-8 w-8 text-foreground" />
                    ) : (
                      <Target className="h-8 w-8 text-foreground" />
                    )}
                  </div>
                  <div className={cn("min-w-0", !isAdmin && "space-y-2")}>
                    {!isAdmin && (
                      <div className="text-ui-label font-medium text-primary">마이페이지</div>
                    )}
                    <h1
                      className={cn(
                        "break-keep leading-tight tracking-normal text-foreground",
                        isAdmin
                          ? "text-ui-section-title font-semibold sm:text-ui-page-title lg:text-ui-page-title-lg"
                          : "text-ui-section-title font-semibold sm:text-ui-page-title bp-sm:text-ui-page-title-lg",
                      )}
                    >
                      {isAdmin ? applicationContext.title : "교체서비스 신청 상세"}
                    </h1>
                    {!isAdmin && (
                      <p className="max-w-2xl text-ui-body-sm leading-relaxed text-muted-foreground bp-sm:text-ui-body">
                        현재 상태와 다음 행동을 먼저 확인하고, 라켓·스트링·결제·배송 상세는 필요한
                        섹션에서 확인할 수 있습니다.
                      </p>
                    )}
                    {isAdmin ? (
                      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-ui-body-sm text-foreground/75">
                        <span className="font-medium text-foreground/90">
                          신청 ID: #{toShortApplicationId(data.id)}
                        </span>
                        <span
                          className="max-w-full truncate font-mono text-ui-label"
                          title={data.id}
                        >
                          {data.id}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-ui-label"
                          aria-label="전체 신청 ID 복사"
                          onClick={() => {
                            void navigator.clipboard
                              .writeText(data.id)
                              .then(() => showSuccessToast("신청 ID가 복사되었습니다."))
                              .catch(() => {});
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          복사
                        </Button>
                      </div>
                    ) : (
                      <div className="flex min-w-0 flex-wrap items-center gap-2 text-ui-body-sm text-muted-foreground">
                        <ApplicationStatusBadge status={data.status} />
                        <Badge variant="outline" className={cn(badgeBase, badgeSizeSm, "bg-card")}>
                          {applicationContext.label}
                        </Badge>
                        <span className="break-all font-medium">
                          신청번호: #{toShortApplicationId(data.id)}
                        </span>
                        <span className="tabular-nums">
                          신청일 {new Date(data.requestedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <TooltipProvider>
                  <div
                    className={cn(
                      isAdmin
                        ? "grid w-full grid-cols-1 gap-1.5 bp-sm:grid-cols-2 bp-lg:flex bp-lg:w-auto bp-lg:flex-wrap bp-lg:items-center bp-lg:justify-end bp-sm:[&>*:first-child]:col-span-2 bp-lg:[&>*:first-child]:col-span-1"
                        : "flex w-full flex-col gap-2 bp-sm:w-auto bp-sm:flex-row bp-sm:flex-wrap bp-sm:items-center bp-lg:justify-end",
                    )}
                  >
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 w-full overflow-hidden whitespace-nowrap border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground bp-lg:mr-1 bp-lg:h-9",
                        isAdmin ? "bp-lg:w-auto" : "bp-sm:w-auto",
                      )}
                    >
                      <Link href={backUrl}>
                        <span className="sm:hidden">목록</span>
                        <span className="hidden sm:inline">신청 목록으로 돌아가기</span>
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>

                    {/* 관리자: 매장 발송 운송장 등록/수정 버튼 */}
                    {isAdmin && !isLinkedApplication && (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-9 w-full whitespace-nowrap border-border bg-card hover:bg-muted bp-lg:w-auto"
                      >
                        <Link href={`/admin/applications/stringing/${data.id}/shipping-update`}>
                          <Truck className="mr-1 h-4 w-4" />
                          {invoice?.trackingNumber ? "완성 라켓 운송장 수정" : "완성 라켓 운송장 등록"}
                        </Link>
                      </Button>
                    )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={cn(
                            "inline-block w-full",
                            isAdmin ? "bp-lg:w-auto" : "bp-sm:w-auto",
                          )}
                        >
                          <Button
                            variant={isEditMode ? "destructive" : "outline"}
                            size="sm"
                            disabled={!isEditableAllowed}
                            className={
                              !isEditableAllowed
                                ? cn(
                                    "w-full cursor-not-allowed opacity-50",
                                    isAdmin ? "bp-lg:w-auto" : "bp-sm:w-auto",
                                  )
                                : isEditMode
                                  ? cn("w-full", isAdmin ? "bp-lg:w-auto" : "bp-sm:w-auto")
                                  : cn(
                                      "w-full border-border bg-card hover:bg-muted",
                                      isAdmin ? "bp-lg:w-auto" : "bp-sm:w-auto",
                                    )
                            }
                            onClick={() => {
                              if (!isEditableAllowed) return;
                              setIsEditMode((m) => !m);
                              setEditingCustomer(false);
                            }}
                          >
                            <Pencil className="mr-1 h-4 w-4" />
                            {isEditMode ? "편집 취소" : "편집 모드"}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!isEditableAllowed && (
                        <TooltipContent>현재 상태에서는 편집할 수 없습니다.</TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>

              {/* 신청 요약 정보 */}
              {!isAdmin && (
                <div
                  className={cn(
                  "grid grid-cols-1 gap-3 bp-sm:grid-cols-2",
                  isAdmin
                    ? "md:grid-cols-3 xl:grid-cols-6"
                    : "bp-xl:grid-cols-5 bp-sm:gap-4 bp-lg:gap-5",
                )}
              >
                <div
                  className={
                    isAdmin
                      ? summaryCardClass
                      : "border-l-2 border-border bg-muted/20 px-3 py-3 bp-sm:px-4"
                  }
                >
                  <div className="mb-2 flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span
                      className={cn(
                        "text-ui-body-sm font-medium",
                        isAdmin ? "text-muted-foreground" : "text-foreground",
                      )}
                    >
                      신청일시
                    </span>
                  </div>
                  <p className="text-ui-body font-semibold tabular-nums text-foreground bp-sm:text-ui-card-title-lg">
                    {new Date(data.requestedAt).toLocaleDateString()}
                  </p>
                </div>

                <div
                  className={
                    isAdmin
                      ? summaryCardClass
                      : "border-l-2 border-border bg-muted/20 px-3 py-3 bp-sm:px-4"
                  }
                >
                  <div className="mb-2 flex items-center space-x-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span
                      className={cn(
                        "text-ui-body-sm font-medium",
                        isAdmin ? "text-muted-foreground" : "text-foreground",
                      )}
                    >
                      총 비용
                    </span>
                  </div>
                  <p className="whitespace-nowrap text-ui-body font-semibold tabular-nums text-foreground bp-sm:text-ui-card-title-lg">
                    {data.totalPrice.toLocaleString()}원
                  </p>
                </div>

                <div
                  className={
                    isAdmin
                      ? summaryCardClass
                      : "border-l-2 border-border bg-muted/20 px-3 py-3 bp-sm:px-4"
                  }
                >
                  <div className="mb-2 flex items-center space-x-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span
                      className={cn(
                        "text-ui-body-sm font-medium",
                        isAdmin ? "text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {isAdmin ? "현재 상태" : "신청 유형"}
                    </span>
                  </div>
                  {isAdmin ? (
                    <ApplicationStatusBadge status={data.status} />
                  ) : (
                    <p className="line-clamp-2 break-keep text-ui-body font-semibold leading-snug text-foreground bp-sm:text-ui-card-title-lg">
                      {applicationContext.label}
                    </p>
                  )}
                </div>

                <div
                  className={
                    isAdmin
                      ? summaryCardClass
                      : "border-l-2 border-border bg-muted/20 px-3 py-3 bp-sm:px-4"
                  }
                >
                  <div className="mb-2 flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span
                      className={cn(
                        "text-ui-body-sm font-medium",
                        isAdmin ? "text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {isAdmin ? "결제 문맥" : "총 작업 수"}
                    </span>
                  </div>
                  {isAdmin ? (
                    (() => {
                      const pay = getPaymentStatusBadgeSpec(linkedPaymentContextLabel);
                      return (
                        <Badge variant={pay.variant} className={summaryBadgeClass}>
                          {linkedPaymentContextLabel}
                        </Badge>
                      );
                    })()
                  ) : (
                    <p className="break-words text-ui-body font-semibold tabular-nums text-foreground bp-sm:text-ui-card-title-lg">
                      라켓 {racketCount}자루 · 스트링 {stringTypeCount}종
                    </p>
                  )}
                </div>

                {!isAdmin && (
                  <div className="border-l-2 border-border bg-muted/20 px-3 py-3 bp-sm:px-4">
                    <div className="mb-2 flex items-center space-x-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-ui-body-sm font-medium text-foreground">
                        라켓 발송 상태
                      </span>
                    </div>
                    <p className="line-clamp-2 break-keep text-ui-body font-semibold leading-snug text-foreground bp-sm:text-ui-card-title-lg">
                      {!inboundRequired
                        ? "별도 발송 불필요"
                        : isVisit
                          ? "방문 접수 예정"
                          : hasTracking
                            ? "운송장 등록 완료"
                            : "운송장 등록 필요"}
                    </p>
                  </div>
                )}

                {isAdmin && (
                  <div className={summaryCardClass}>
                    <div className="mb-2 flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-ui-body-sm font-medium text-muted-foreground">
                        희망 일시
                      </span>
                    </div>
                    <p className="break-words text-ui-body font-semibold tabular-nums text-foreground bp-sm:text-ui-card-title-lg">
                      {visitTimeLabel}
                    </p>
                  </div>
                )}
                {isAdmin && (
                  <div className={summaryCardClass}>
                    <div className="flex items-center space-x-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-ui-body-sm font-medium text-muted-foreground">
                        입고 / 반환
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="neutral" className={summaryBadgeClass}>
                        {inboundRequired
                          ? collectionMethodLabel(collectionMethodRaw)
                          : "별도 입고 불필요"}
                      </Badge>
                      {shouldShowReturnMethod && (
                        <Badge className={cn(summaryBadgeClass, shippingMethodBadge.color)}>
                          반환 {shippingMethodBadge.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
              )}

              <div
                className={cn(
                  isAdmin
                    ? "mt-4 flex flex-wrap items-center gap-3 text-ui-body-sm text-foreground"
                    : "mt-4 space-y-2",
                )}
              >
                {isAdmin && (
                  <>
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">라켓 종류</span>
                      <span className="min-w-0 line-clamp-2 break-keep text-ui-body-sm text-foreground">
                        {racketTypeSummary}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Ticket className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">신청 요약</span>
                      <Badge variant="neutral" className={cn(badgeBase, badgeSizeSm)}>
                        스트링 {stringTypeCount}종
                      </Badge>
                      <Badge variant="neutral" className={cn(badgeBase, badgeSizeSm)}>
                        라켓 {racketCount}자루
                      </Badge>
                    </div>
                  </>
                )}
                {data.orderId && (
                  <div className="flex min-w-0 flex-wrap items-center gap-2 text-ui-body-sm text-foreground">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="shrink-0 break-keep font-medium">주문 수령 방식</span>
                    <Badge
                      className={`${badgeBase} ${badgeSizeSm} whitespace-nowrap ${linkedOrderPickupBadge?.color ?? badgeToneClass("danger")}`}
                    >
                      {linkedOrderPickupBadge?.label ?? "선택 없음"}
                    </Badge>
                  </div>
                )}

                {shouldShowReturnMethod && (
                  <div className="flex min-w-0 flex-wrap items-center gap-2 text-ui-body-sm text-foreground">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="shrink-0 break-keep font-medium">
                      {isAdmin ? "완성 라켓 배송 방식" : "완성 라켓 배송/수령 방식"}
                    </span>
                    <Badge
                      className={`${badgeBase} ${badgeSizeSm} whitespace-nowrap ${shippingMethodBadge.color}`}
                    >
                      {shippingMethodBadge.label}
                    </Badge>
                    {shippingMethodBadge.label === "선택 없음" && (
                      <span className="text-ui-label text-foreground/75">
                        {isAdmin
                          ? "완성 라켓 배송 방식이 아직 선택되지 않았습니다."
                          : "완성 라켓 배송/수령 방식이 아직 선택되지 않았습니다."}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 취소 요청 상태 안내 (관리자용) */}
              {isAdmin && cancelInfo && (
                <div id="admin-stringing-cancel-request" className="scroll-mt-6">
                  <AdminCancelRequestCard
                    badgeLabel={cancelInfo.badgeLabel}
                    description={cancelInfo.description}
                    reasonSummary={cancelInfo.reasonSummary}
                    tone={cancelInfo.tone}
                    className="border-solid border-border/80 bg-background/90 shadow-sm"
                    rightSlot={
                      <div className="rounded-md border border-border/60 bg-background px-3 py-2">
                        <p className="text-ui-label font-medium text-muted-foreground">
                          환불 계좌 정보
                        </p>
                        {needsCancelRefundAccount || cancelInfo.refundAccount ? (
                          <dl className="mt-2 space-y-1 text-ui-label text-foreground">
                            <div className="grid gap-1 sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-2">
                              <dt className="break-keep text-muted-foreground">환불 은행</dt>
                              <dd>{cancelInfo.refundAccount?.bankLabel || "미입력"}</dd>
                            </div>
                            <div className="grid gap-1 sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-2">
                              <dt className="break-keep text-muted-foreground">계좌번호</dt>
                              <dd className="break-words font-mono">
                                {cancelInfo.refundAccount?.account || "미입력"}
                              </dd>
                            </div>
                            <div className="grid gap-1 sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-2">
                              <dt className="break-keep text-muted-foreground">예금주</dt>
                              <dd>{cancelInfo.refundAccount?.holder || "미입력"}</dd>
                            </div>
                          </dl>
                        ) : (
                          <p className="mt-2 text-ui-label text-muted-foreground">
                            이 취소 요청은 환불계좌 입력 대상이 아닙니다. 카드 결제/패키지/결제대기
                            건은 별도 계좌 정보 없이 처리됩니다.
                          </p>
                        )}
                      </div>
                    }
                  />
                </div>
              )}
              </div>
            )}

            {isAdmin && (
              <AdminDetailSectionNav
                className="mb-4"
                items={[
                  { href: "#admin-stringing-cancel", label: "처리 작업" },
                  ...(cancelInfo
                    ? [{ href: "#admin-stringing-cancel-request", label: "취소 요청" }]
                    : []),
                  ...(linkedDocs.length > 0
                    ? [{ href: "#admin-stringing-linked-docs", label: "연결 문서" }]
                    : []),
                  { href: "#admin-stringing-spec", label: "작업 정보" },
                  { href: "#admin-stringing-payment", label: "결제정보" },
                  { href: "#admin-stringing-shipping", label: "수령/배송" },
                  { href: "#admin-stringing-request", label: "요청사항" },
                  { href: "#admin-stringing-history", label: "이력" },
                ]}
              />
            )}

            {isAdmin && (
              <section className="mb-6 space-y-4" aria-label="관리자 운영 콘솔">
                <div className={adminSurface.statusGrid}>
                  <AdminStatusCard
                    density="compact"
                    title="작업 상태"
                    value={<ApplicationStatusBadge status={data.status} />}
                    description={isLinkedApplication ? "부모 문서에 포함된 하위 교체 작업입니다." : "이 화면이 대표 처리 화면입니다."}
                    icon={Settings}
                    tone={isCancelled ? "danger" : "primary"}
                  />
                  <AdminStatusCard
                    density="compact"
                    title="결제 문맥"
                    value={linkedPaymentContextLabel}
                    description={packageApplied ? "결제대기가 아니라 패키지 회차 차감으로 처리됩니다." : applicationContext.payment}
                    icon={CreditCard}
                    tone={packageApplied ? "success" : isLinkedApplication ? "primary" : "neutral"}
                  />
                  <AdminStatusCard
                    density="compact"
                    title="접수 / 방문"
                    value={visitTimeLabel}
                    description={`신청일 ${new Date(data.requestedAt).toLocaleDateString()}`}
                    icon={Calendar}
                  />
                 <AdminStatusCard
  density="compact"
  title="라켓 발송 / 완성 라켓 배송"
  value={inboundStatusLabel}
  description={
    shouldShowReturnMethod
      ? isLinkedApplication
        ? isRentalLinkedApplication
          ? "부모 대여의 인도/반납 기준"
          : isOrderLinkedApplication
            ? "부모 주문의 수령 방식 기준"
            : "완성 라켓 배송 방식 정보 없음"
        : `${shippingMethodBadge.label}`
      : "완성 라켓 배송 방식 정보 없음"
  }
  icon={Truck}
  tone={needsInboundTracking && !hasTracking ? "warning" : "neutral"}
/>
                </div>

                <AdminNextActionPanel
                  tone={nextActionGuide.tone}
                  badgeLabel={applicationContext.label}
                  stage={appGuide.stage}
                  nextActionTitle={nextActionGuide.title}
                  nextActionDescription={nextActionGuide.description}
                  primaryAction={
                    nextActionGuide.actionHref && nextActionGuide.actionLabel ? (
                      <Button asChild size="sm" className="justify-center">
                        <Link href={nextActionGuide.actionHref}>{nextActionGuide.actionLabel}</Link>
                      </Button>
                    ) : !isLinkedApplication && !isCancelled ? (
                      <Button asChild size="sm" className="justify-center">
                        <a href="#admin-stringing-cancel">상태 변경 확인</a>
                      </Button>
                    ) : null
                  }
                  secondaryActions={recommendedActions.slice(0, 2).map((action) => (
                    <Button key={`${action.href}-${action.label}`} asChild size="sm" variant="outline" className="bg-transparent">
                      <a href={action.href}>{action.label}</a>
                    </Button>
                  ))}
                  note={
                    isLinkedApplication
                      ? `연결된 ${data.orderId ? "주문" : "대여"}에서 상태 변경·취소·환불을 처리합니다.`
                      : applicationContext.description
                  }
                  footer={
                    <div>
                      <span className="font-medium text-foreground">최근 처리 이력:</span>{" "}
                      {latestProcessingHistory?.status ?? "기록 없음"} · {latestProcessingDate}
                      {latestProcessingHistory?.description ? (
                        <span className="ml-2 text-muted-foreground">{latestProcessingHistory.description}</span>
                      ) : null}
                    </div>
                  }
                />
              </section>
            )}

            {isAdmin && linkedDocs.length > 0 && (
              <div id="admin-stringing-linked-docs" className="scroll-mt-6">
                <LinkedDocsCard
                  title={data.orderId ? "부모 주문으로 이동" : "부모 대여로 이동"}
                  docs={linkedDocs}
                  description="이 신청서는 부모 문서에 포함된 하위 교체 작업입니다. 결제·취소·대표 진행은 부모 문서에서 확인하세요."
                  className="mb-6"
                />
              </div>
            )}

            {/* 상태 카드 */}
            <Card id="admin-stringing-cancel" className={cn(detailCardClass, "mb-6 bp-sm:mb-8")}>
              <CardHeader className={detailCardHeaderClass}>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{isAdmin ? "작업 상태 관리" : "신청 상태"}</CardTitle>
                  <ApplicationStatusBadge status={data.status} />
                </div>
                {isAdmin && (
                  <CardDescription>
                    {isLinkedApplication
                      ? "연결된 주문·대여의 진행 단계에서 상태를 함께 변경하세요. 이 화면에서는 현재 작업 상태를 확인합니다."
                      : "단독 신청서는 접수·작업·완성 라켓 배송/수령 상태를 이 화면에서 직접 관리합니다."}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className={cn(isAdmin ? "p-4 lg:p-5" : "pt-4")}>
                {isAdmin ? (
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
                    <div className="border-y border-border/60 bg-background/40 px-3 py-4 bp-sm:px-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-ui-body-sm font-semibold text-foreground">
                            교체 작업 상태
                          </p>
                          <p className="mt-1 text-ui-label text-foreground/75">
                            {isLinkedApplication
                              ? "연결 작업의 현재 단계를 확인합니다. 상태 변경은 부모 상세의 연결 진행 단계에서 처리하세요."
                              : "이 신청서의 접수·작업·완성 라켓 배송/수령 단계를 확인하고 필요한 경우 상태를 변경합니다."}
                          </p>
                        </div>

                        <div className="max-w-[280px]">
                          <ApplicationStatusSelect
                            applicationId={data.id}
                            currentStatus={data.status}
                            onUpdated={async () => {
                              await mutate();
                              if (historyMutateRef.current) {
                                await historyMutateRef.current();
                              }
                            }}
                            disabled={isCancelled || isLinkedApplication}
                          />
                        </div>

                        {isLinkedApplication && linkedAdminHref && (
                          <div className="border-l-2 border-primary/30 bg-primary/5 px-3 py-2 text-ui-label text-foreground/80">
                            <p>
                              {linkedRentalId
                                ? "이 작업은 대여에 포함되어 있습니다. 대여 상세의 연결 진행 단계에서 상태를 함께 변경하세요."
                                : "이 작업은 주문에 포함되어 있습니다. 주문 상세의 연결 진행 단계에서 상태를 함께 변경하세요."}
                            </p>
                            <Button asChild size="sm" variant="outline" className="mt-2">
                              <Link href={linkedAdminHref}>{linkedStageCtaLabel}</Link>
                            </Button>
                          </div>
                        )}

                        <div className="text-ui-label text-foreground/75 space-y-1">
                          {isCancelled ? (
                            <p>취소된 신청서입니다. 상태 변경 및 추가 운영 액션이 제한됩니다.</p>
                          ) : isCancelRequested ? (
                            <p>취소 요청 처리 중입니다. 승인 또는 거절 후 이력에 반영됩니다.</p>
                          ) : (
                            <>
                              <p>
                                {new Date(data.requestedAt).toLocaleDateString()}에 접수된
                                신청입니다.
                              </p>
                              <p>
                                {isOrderLinkedApplication
                                  ? "이 교체서비스는 연결된 주문의 구매확정과 함께 처리됩니다."
                                  : isRentalLinkedApplication
                                    ? "이 교체서비스는 연결된 대여의 수령확인과 함께 처리됩니다."
                                    : "단독 교체서비스는 이 화면에서 확정할 수 있습니다."}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-y border-border/60 bg-background/40 px-3 py-4 bp-sm:px-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-ui-body-sm font-semibold text-foreground">운영 액션</p>
                          <p className="mt-1 text-ui-label text-foreground/75">
                            고객 취소 요청 승인/거절을 처리합니다. 처리 후 신청 상태와 연결
                            주문·패키지 이력이 변경될 수 있으니 처리 전 확인해주세요.
                          </p>
                        </div>

                        <div className="flex min-h-[40px] flex-wrap items-center gap-2">
                          {isCancelled ? (
                            <div className="border-l-2 border-border bg-muted/30 px-3 py-2 text-ui-body-sm text-foreground/80">
                              취소된 신청서입니다. 추가 액션이 불가능합니다.
                            </div>
                          ) : isCancelRequested &&
                            !hasOrderCancelRequested &&
                            !isLinkedApplication ? (
                            <>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setIsApproveCancelDialogOpen(true)}
                                disabled={isPending}
                              >
                                <XCircle className="mr-1 h-4 w-4" />
                                취소 승인
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleAdminRejectCancel}
                                disabled={isPending}
                              >
                                취소 거절
                              </Button>
                            </>
                          ) : canAdminDirectCancel ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setIsAdminCancelDialogOpen(true)}
                              disabled={isPending}
                            >
                              <XCircle className="mr-1 h-4 w-4" />
                              신청 직접 취소
                            </Button>
                          ) : (
                            <div className="border-l-2 border-border bg-muted/30 px-3 py-2 text-ui-body-sm text-foreground/80">
                              {isLinkedApplication
                                ? "연결 신청서의 취소/환불은 연결된 주문/대여 상세에서 처리해야 합니다."
                                : hasOrderCancelRequested
                                  ? "연결 주문에 취소 요청이 있어 주문 상세에서 최종 처리해야 합니다."
                                  : "현재 진행 가능한 관리자 취소 액션이 없습니다."}
                            </div>
                          )}
                        </div>

                        {hasOrderCancelRequested && !isCancelled && (
                          <p className="text-ui-label text-destructive">
                            이 신청이 연결된 주문에 이미 취소 요청이 걸려 있습니다. 최종 취소
                            승인/거절은 주문 상세 화면에서 처리해 주세요.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 bp-lg:flex-row bp-lg:items-center bp-lg:justify-between">
                    {/* 왼쪽: 안내 문구 */}
                    <div className="text-ui-body-sm text-foreground/80">
                      {isCancelled && (
                        <span className="italic">
                          취소된 신청서입니다. 상태 변경 및 취소가 불가능합니다.
                        </span>
                      )}

                      {!isCancelled && isCancelRequested && (
                        <span className="italic">
                          취소 요청 처리 중입니다. 관리자 확인 후 결과가 반영됩니다.
                        </span>
                      )}

                      {!isCancelled && !isCancelRequested && (
                        <span>
                          {new Date(data.requestedAt).toLocaleDateString()}에 접수된 신청입니다.
                        </span>
                      )}
                      {!isCancelled &&
                        !isCancelRequested &&
                        !isLinkedApplication &&
                        !canConfirmExchange &&
                        !isUserConfirmed && (
                          <span className="block">
                            교체 완료 후 교체서비스 확정을 진행할 수 있습니다.
                          </span>
                        )}
                    </div>

                    {!isAdmin && isOrderLinkedApplication && (
                      <p className="max-w-xl text-ui-body-sm text-muted-foreground">
                        이 교체서비스는 연결된 주문의 구매확정과 함께 처리됩니다.
                      </p>
                    )}

                    {!isAdmin && isRentalLinkedApplication && (
                      <p className="max-w-xl text-ui-body-sm text-muted-foreground">
                        이 교체서비스는 연결된 대여의 수령확인과 함께 처리됩니다.
                      </p>
                    )}

                    <div className="grid w-full grid-cols-1 gap-2 bp-sm:w-auto bp-sm:grid-cols-2 bp-lg:flex bp-lg:justify-end">
                      {/* 사용자: 아직 취소 요청 전 → "신청 취소 요청" 버튼 */}
                      {!isAdmin &&
                        !isRentalLinkedApplication &&
                        !isCancelled &&
                        !isCancelRequested && (
                          <Button
                            variant="destructive"
                            onClick={handleOpenCancelDialog}
                            disabled={isPending}
                            className="w-full"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            신청 취소 요청
                          </Button>
                        )}

                      {/* 사용자: 이미 취소 요청 상태 → "취소 요청 철회" 버튼 */}
                      {!isAdmin &&
                        !isRentalLinkedApplication &&
                        !isCancelled &&
                        isCancelRequested && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleWithdrawCancelRequest}
                            disabled={isWithdrawingCancel}
                            className="w-full border-border text-primary hover:bg-muted hover:text-primary"
                          >
                            {isWithdrawingCancel ? "취소 요청 철회 중..." : "취소 요청 철회"}
                          </Button>
                        )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {!isAdmin && linkedDocs.length > 0 && (
              <LinkedDocsCard
                docs={linkedDocs}
                description={linkedDocsDescription}
                className="mb-4"
              />
            )}

            <div className={detailGridClass}>
              <div className={cn(detailColumnClass, !isAdmin && "bp-lg:order-1")}>
              {/* 스트링 정보 */}
              <Card
                id="admin-stringing-spec"
                className={cn(
                  detailCardClass,
                  isAdmin && "xl:col-span-12",
                )}
              >
                <CardHeader
                  className={cn(
                    detailCardHeaderClass,
                    isAdmin
                      ? "flex flex-row items-center gap-2"
                      : "flex flex-col items-center py-4",
                  )}
                >
                  <ShoppingCart
                    className={cn("text-foreground", isAdmin ? "h-5 w-5" : "w-6 h-6")}
                  />
                  <CardTitle
                    className={cn("text-ui-card-title-lg font-semibold", !isAdmin && "mt-2")}
                  >
                    {isAdmin ? "신청 스트링 정보" : "라켓·스트링별 작업 정보"}
                  </CardTitle>
                </CardHeader>

                <div className="mx-4 mb-3 mt-3 border-y border-border/70 bg-muted/30 px-3 py-3 dark:bg-background bp-sm:mx-6 bp-sm:mt-4 bp-sm:px-4">
                  <div className="flex flex-col gap-3 bp-lg:flex-row bp-lg:items-center bp-lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="neutral"
                        className="px-3 py-1 text-ui-label sm:text-ui-body-sm font-medium"
                      >
                        스트링 {stringTypeCount}종
                      </Badge>
                      <Badge
                        variant="neutral"
                        className="px-3 py-1 text-ui-label sm:text-ui-body-sm font-medium"
                      >
                        라켓 {racketCount}자루
                      </Badge>
                    </div>

                    <div className="text-ui-label sm:text-ui-body-sm font-semibold text-primary">
                      총 장착비 {totalPrice.toLocaleString()}원
                    </div>
                  </div>
                </div>

                <CardContent className="px-4 pb-4 bp-lg:px-6 bp-lg:pb-6">
                  <div className={cn("space-y-4", !isAdmin && "space-y-5 bp-lg:space-y-6")}>
                    <section className="flex flex-col gap-2 border-b border-dashed border-border pb-4 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
                      <div className="flex items-center gap-2 text-foreground">
                        <Calendar className="w-5 h-5" />
                        <span className="font-medium">희망 일시</span>
                      </div>
                      <div className="break-keep text-ui-body-sm text-foreground bp-sm:text-right">
                        {visitTimeLabel}
                      </div>
                    </section>

                    {(selectedGauge || selectedColorLabel) && (
                      <section className="space-y-2 border-b border-dashed border-border pb-4">
                        <div className="flex items-center gap-2 text-foreground">
                          <Target className="w-5 h-5" />
                          <span className="font-medium">옵션 정보</span>
                        </div>
                        <div className="space-y-1.5 text-ui-body-sm text-foreground/80">
                          {selectedGauge && <p>게이지(굵기): {selectedGauge}</p>}
                          {selectedColorLabel && (
                            <p className="flex items-center gap-2">
                              <span>색상:</span>
                              {selectedColorHex && (
                                <span
                                  className="h-3 w-3 rounded-full border border-border bg-muted"
                                  aria-hidden="true"
                                  title={selectedColorHex}
                                />
                              )}
                              <span>{selectedColorLabel}</span>
                            </p>
                          )}
                        </div>
                      </section>
                    )}
                    {data.orderId && linkedOrderItems.length > 0 && (
                      <section className="space-y-3 border-b border-dashed border-border pb-4">
                        <div className="flex items-center gap-2 text-foreground">
                          <ShoppingCart className="w-5 h-5" />
                          <span className="font-medium">연결 주문 상품</span>
                        </div>
                        <div className="space-y-2">
                          {linkedOrderItems.map((item, index) => {
                            const colorLabel = item.selectedColorLabel || item.selectedColor;
                            return (
                              <div
                                key={`${item.id}-${index}`}
                                className="border-t border-border/70 py-3 text-ui-body-sm first:border-t-0"
                              >
                                <div className="flex flex-col gap-1 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
                                  <div className="min-w-0">
                                    <p className="break-keep font-medium text-foreground">
                                      {item.productName}
                                    </p>
                                    {item.stringName && (
                                      <p className="text-ui-label text-foreground/75">
                                        선택 스트링: {item.stringName}
                                      </p>
                                    )}
                                  </div>
                                  <span className="shrink-0 text-ui-label text-foreground/70">
                                    수량 {item.quantity}개
                                  </span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-ui-label text-foreground/75">
                                  {item.selectedGauge && <span>게이지(굵기): {item.selectedGauge}</span>}
                                  {colorLabel && <span>색상: {colorLabel}</span>}
                                  {typeof item.price === "number" && (
                                    <span>상품가: {item.price.toLocaleString()}원</span>
                                  )}
                                  {typeof item.stringPrice === "number" && (
                                    <span>스트링 가격: {item.stringPrice.toLocaleString()}원</span>
                                  )}
                                  {typeof item.stringingFee === "number" && (
                                    <span>장착비: {item.stringingFee.toLocaleString()}원</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    )}
                    {isAdmin && (
                      <section className="space-y-2 border-b border-dashed border-border pb-4">
                        <div className="flex items-center gap-2 text-foreground">
                          <Target className="w-5 h-5" />
                          <span className="font-medium">재고 운영 정보</span>
                        </div>
                        <div className="space-y-1.5 text-ui-body-sm text-foreground/80">
                          <p>
                            <span className="font-medium text-foreground">재고 차감 방식:</span>{" "}
                            {isVariantStockMode ? "색상×게이지(굵기) 조합 재고" : "기존 재고 방식"}
                          </p>
                          <p>
                            {isVariantStockMode
                              ? `선택한 색상과 게이지(굵기) 조합 기준으로 재고가 차감되었습니다. (색상 ${stringColorLabel(effectiveStockDeduction?.colorValue) || "-"} / 게이지(굵기) ${formatGaugeLabel(effectiveStockDeduction?.gaugeValue) || "-"})`
                              : "기존 색상/게이지(굵기) 재고 기준으로 처리된 신청서입니다."}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">조합 재고 복구:</span>{" "}
                            {effectiveStockRestore?.variantStockRestoredAt
                              ? "복구 완료"
                              : "복구 정보 없음"}
                          </p>
                          {effectiveStockRestore?.variantStockRestoredAt ? (
                            <p>
                              {new Date(
                                effectiveStockRestore.variantStockRestoredAt,
                              ).toLocaleString()}
                              {effectiveStockRestore.variantStockRestoreReason
                                ? ` · ${effectiveStockRestore.variantStockRestoreReason}`
                                : ""}
                            </p>
                          ) : isVariantStockMode && isCancelled ? (
                            <p className="text-muted-foreground">
                              취소 처리 데이터에서 조합 재고 복구 시각이 확인되지 않았습니다.
                            </p>
                          ) : null}
                        </div>
                      </section>
                    )}

                    {/* 섹션 2: 라켓·스트링별 작업 정보 */}
                    {Array.isArray(data.lines) && data.lines.length > 0 && (
                      <section className="space-y-3">
                        <div className="flex items-center gap-2 text-foreground">
                          <Target className="w-5 h-5" />
                          <span className="font-medium">라켓·스트링별 작업 정보</span>
                        </div>
                        <div className="space-y-3 border-l-2 border-primary/25 bg-primary/5 px-3 py-3">
                          <div className="grid grid-cols-1 gap-2.5 text-ui-label leading-relaxed text-foreground/75 bp-sm:grid-cols-2 bp-lg:grid-cols-4">
                            <p>라켓 {lineSummary.racketCount}자루</p>
                            <p>스트링 {lineSummary.stringTypeCount}종</p>
                            <p>텐션 입력 {lineSummary.tensionFilledCount}자루</p>
                            <p>메모 {lineSummary.notedCount}자루</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-full bp-sm:w-auto"
                            onClick={() => setIsLineDetailsExpanded((prev) => !prev)}
                          >
                            {isLineDetailsExpanded
                              ? "작업 상세 접기"
                              : `작업 상세 ${lineCount}건 보기`}
                          </Button>
                        </div>

                        {isLineDetailsExpanded && (
                          <div className="space-y-3">
                            {data.lines.map((line, index) => (
                              <div
                                key={line.id ?? index}
                                className="min-w-0 border-t border-border/70 py-3 first:border-t-0 bp-sm:py-3.5"
                              >
                                {/* 라켓 이름 + 순번 */}
                                <div className="mb-2 flex flex-col gap-2 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
                                  <p className="min-w-0 break-words font-medium text-foreground">
                                    라켓 {index + 1}
                                    {line.racketType ? ` · ${line.racketType}` : ""}
                                  </p>
                                  {(line.tensionMain || line.tensionCross) && (
                                    <Badge
                                      variant="info"
                                      className="whitespace-normal break-keep px-2 py-1 text-left text-ui-label"
                                    >
                                      텐션 {line.tensionMain ? `${line.tensionMain}LB` : "-"} /{" "}
                                      {line.tensionCross ? `${line.tensionCross}LB` : "-"}
                                    </Badge>
                                  )}
                                </div>

                                {/* 스트링 이름 */}
                                {line.stringName && (
                                  <p className="min-w-0 break-words text-ui-label leading-relaxed text-foreground">
                                    스트링: <span className="font-medium">{line.stringName}</span>
                                  </p>
                                )}

                                {/* 라켓별 메모 */}
                                {line.note && (
                                  <p className="mt-2 break-words text-ui-label leading-relaxed text-foreground/75">
                                    메모: {line.note}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    )}

                    {/* 섹션 3: 장착 상품 정보 (스트링 상품 리스트) */}
                    {itemSummary.length > 0 && (
                      <section className="space-y-2">
                        <div className="flex items-center gap-2 text-foreground">
                          <ShoppingCart className="w-5 h-5" />
                          <span className="break-keep font-medium">장착 상품 정보</span>
                        </div>

                        <div className="hidden overflow-hidden rounded-xl ring-1 ring-ring bg-card dark:ring-ring dark:bg-background bp-lg:block">
                          {/* 헤더 행 */}
                          <div className="grid grid-cols-[minmax(0,1.6fr)_80px_100px_110px] px-4 py-2 text-ui-label font-semibold text-muted-foreground bg-muted dark:bg-card">
                            <span>상품명</span>
                            <span className="text-center">총 수량</span>
                            <span className="text-right">단가</span>
                            <span className="text-right">소계</span>
                          </div>

                          {/* 데이터 행 */}
                          {itemSummary.map((item) => (
                            <div
                              key={`${item.id}-${item.name}-${item.price}`}
                              className="grid grid-cols-[minmax(0,1.6fr)_80px_100px_110px] px-4 py-2 text-ui-body-sm border-t border-border/70"
                            >
                              <div className="pr-2">
                                <p className="line-clamp-2 break-keep font-medium text-foreground">
                                  {item.name}
                                </p>
                              </div>
                              <div className="text-center text-ui-label text-foreground/75">
                                x {item.quantity}개
                              </div>
                              <div className="text-right text-foreground">
                                {item.price.toLocaleString()}원
                              </div>
                              <div className="text-right font-medium text-foreground">
                                {item.subtotal.toLocaleString()}원
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-3 bp-lg:hidden">
                          {itemSummary.map((item) => (
                            <div
                              key={`${item.id}-${item.name}-${item.price}-mobile`}
                              className="min-w-0 border-t border-border/70 py-3 text-ui-body-sm first:border-t-0"
                            >
                              <div className="space-y-1">
                                <p className="break-keep text-ui-label font-medium text-muted-foreground">
                                  장착 상품
                                </p>
                                <p className="min-w-0 break-keep font-medium leading-relaxed text-foreground">
                                  {item.name}
                                </p>
                              </div>
                              <div className="mt-3 space-y-1.5 border-l-2 border-border bg-muted/20 px-3 py-2 text-ui-body-sm text-foreground/80">
                                <p className="break-keep">
                                  <span className="text-muted-foreground">수량:</span>{" "}
                                  <span className="font-medium text-foreground">
                                    {item.quantity}개
                                  </span>
                                </p>
                                <p className="break-keep">
                                  <span className="text-muted-foreground">단가:</span>{" "}
                                  <span className="font-medium text-foreground">
                                    {item.price.toLocaleString()}원
                                  </span>
                                </p>
                                <p className="break-keep">
                                  <span className="text-muted-foreground">소계:</span>{" "}
                                  <span className="font-semibold text-primary">
                                    {item.subtotal.toLocaleString()}원
                                  </span>
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* 섹션 4: 라켓 종류 요약 */}
                    <section className="flex flex-col gap-2 border-t border-dashed border-border pt-4 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
                      <div className="flex items-center gap-2 text-foreground">
                        <Target className="w-5 h-5" />
                        <span className="font-medium">라켓 종류</span>
                      </div>
                      <div className="w-full break-keep text-ui-body-sm text-foreground bp-sm:max-w-xs bp-sm:text-right">
                        {racketTypeSummary}
                      </div>
                    </section>
                  </div>
                </CardContent>

                {/* 수정 버튼 */}
                {isEditMode && (
                  <CardFooter className="flex justify-center pt-2 bg-muted/20">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsStringModalOpen(true)}
                      className="hover:bg-muted border-border"
                    >
                      스트링 정보 수정
                    </Button>
                  </CardFooter>
                )}

                <Dialog open={isStringModalOpen} onOpenChange={setIsStringModalOpen}>
                  <DialogTrigger asChild></DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogTitle className="text-ui-section-title font-semibold mb-4">
                      신청 스트링 정보 수정
                    </DialogTitle>
                    <StringInfoEditForm
                      id={data.id}
                      initial={{
                        desiredDateTime:
                          data.stringDetails.preferredDate && data.stringDetails.preferredTime
                            ? `${data.stringDetails.preferredDate}T${data.stringDetails.preferredTime}`
                            : "",
                        stringTypes: data.stringDetails.stringTypes,
                        customStringName: data.stringDetails.customStringName,
                        racketType: data.stringDetails.racketType,
                      }}
                      stringOptions={data.purchasedStrings}
                      onDone={() => setIsStringModalOpen(false)}
                      mutateData={mutate}
                      mutateHistory={() => historyMutateRef.current?.()}
                      /** 필드 제한: 관리자 전체, 일반 사용자는 desiredDateTime만 */
                      fields={
                        isAdmin
                          ? ["desiredDateTime", "stringType", "racketType"]
                          : ["desiredDateTime"]
                      }
                    />
                    <DialogClose asChild>
                      <Button variant="outline" className="mt-4 bg-transparent">
                        닫기
                      </Button>
                    </DialogClose>
                  </DialogContent>
                </Dialog>
              </Card>

              {!isAdmin && (
                <Card className={detailCardClass}>
                  <CardHeader className={detailCardHeaderClass}>
                    <CardTitle className="flex items-center gap-2 text-ui-card-title-lg font-semibold">
                      <Truck className="h-5 w-5 text-primary" />
                      라켓 발송·완성 라켓 배송 정보
                    </CardTitle>
                    <CardDescription>
                      매장으로 보내는 라켓 발송과 작업 완료 후 완성 라켓 배송 정보를 구분해
                      확인하세요.
                    </CardDescription>
                  </CardHeader>
                  <details className="group bp-md:block">
                    <summary className="mx-3 my-2 min-h-11 cursor-pointer rounded-lg px-3 py-2 text-ui-body-sm font-semibold text-foreground shadow-sm ring-1 ring-border/50 transition-colors hover:bg-muted/30 bp-md:hidden">배송/발송 정보</summary>
                  <CardContent className="hidden gap-5 p-4 group-open:grid bp-md:grid bp-sm:p-6 bp-xl:grid-cols-2">
                    <div className="min-w-0 border-l-2 border-primary/25 bg-primary/5 px-3 py-3 leading-relaxed bp-sm:px-4">
                      <p className="text-ui-body-sm font-semibold text-foreground">라켓 발송</p>
                      <p className="mt-1 text-ui-label text-foreground/75">
                        {inboundRequired
                          ? isVisit
                            ? "방문 예약 일시에 맞춰 라켓을 가져와 주세요."
                            : "라켓 발송 운송장과 라켓 입고 여부를 확인합니다."
                          : "연결 주문/대여 기준으로 별도 입고가 필요하지 않습니다."}
                      </p>
                      <div className="mt-3 space-y-2 text-ui-body-sm text-foreground/80">
                        <p>
                          입고 방식:{" "}
                          <span className="font-medium text-foreground">
                            {inboundRequired
                              ? collectionMethodLabel(collectionMethodRaw)
                              : "입고 불필요"}
                          </span>
                        </p>
                        {isVisit && (
                          <p>
                            방문 예약:{" "}
                            <span className="font-medium text-foreground">{visitTimeLabel}</span>
                          </p>
                        )}
                        {isSelfShip &&
                          inboundRequired &&
                          (hasTracking ? (
                            <p>
                              운송장:{" "}
                              <a
                                href={
                                  buildTrackingUrl(selfShip?.courier, selfShip?.trackingNo) ?? "#"
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="break-all underline underline-offset-2"
                              >
                                {selfShip?.trackingNo}
                              </a>
                            </p>
                          ) : (
                            <p>등록된 운송장이 없습니다.</p>
                          ))}
                      </div>
                      {needsInboundTracking && hasTracking && (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="mt-3 w-full bp-sm:w-auto"
                        >
                          <Link href={inboundTrackingHref}>라켓 발송 운송장 수정</Link>
                        </Button>
                      )}
                    </div>

                    <div className="min-w-0 border-l-2 border-primary/25 bg-primary/5 px-3 py-3 leading-relaxed bp-sm:px-4">
                      <p className="text-ui-body-sm font-semibold text-foreground">
                        완성 라켓 배송
                      </p>
                      <p className="mt-1 text-ui-label text-foreground/75">
                        작업 완료 후 완성 라켓 배송 운송장 또는 방문 수령 정보를 확인합니다.
                      </p>
                      <div className="mt-3 space-y-2 text-ui-body-sm text-foreground/80">
                        <p>
                          배송/수령 방식:{" "}
                          <span className="font-medium text-foreground">
                            {shouldShowReturnMethod
                              ? shippingMethodBadge.label
                              : "연결 주문 수령 방식 기준"}
                          </span>
                        </p>
                        {isCourierShipping && invoice?.trackingNumber ? (
                          <p>
                            완성 라켓 배송 운송장:{" "}
                            <a
                              href={
                                buildTrackingUrl(invoice.courier, invoice.trackingNumber) ??
                                undefined
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="break-all underline underline-offset-2"
                            >
                              {invoice.trackingNumber}
                            </a>
                          </p>
                        ) : hasStoreShippingInfo ? (
                          <p>
                            예정일:{" "}
                            {data.shippingInfo?.estimatedDate
                              ? new Date(data.shippingInfo.estimatedDate).toLocaleDateString(
                                  "ko-KR",
                                )
                              : "-"}
                          </p>
                        ) : (
                          <AdminInlineEmpty>완성 라켓 배송 정보 미등록</AdminInlineEmpty>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  </details>
                </Card>
              )}

              {/* 요청사항 카드 */}
              <Card
                id="admin-stringing-request"
                className={cn(
                  detailCardClass,
                  isAdmin && "xl:col-span-12",
                )}
              >
                <CardHeader className={detailCardHeaderClass}>
                  <CardTitle className="flex items-center justify-between">
                    <span>요청사항</span>
                    {isEditMode && <Edit3 className="h-4 w-4 text-muted-foreground" />}
                  </CardTitle>
                </CardHeader>
                <details className="group bp-md:block">
                  <summary className="mx-3 my-2 min-h-11 cursor-pointer rounded-lg px-3 py-2 text-ui-body-sm font-semibold text-foreground shadow-sm ring-1 ring-border/50 transition-colors hover:bg-muted/30 bp-md:hidden">요청사항</summary>
                <CardContent className="hidden p-4 group-open:block bp-md:block bp-lg:p-6">
                  {editingRequirements ? (
                    <RequirementsEditForm
                      initial={data.stringDetails.requirements ?? ""}
                      resourcePath={`${baseUrl}/api/applications/stringing`}
                      entityId={data.id}
                      onSuccess={() => {
                        mutate();
                        historyMutateRef.current?.();
                        setEditingRequirements(false);
                      }}
                      onCancel={() => setEditingRequirements(false)}
                    />
                  ) : data.stringDetails.requirements?.trim() ? (
                    <div className="border-l-2 border-border bg-muted/20 px-3 py-3 bp-sm:px-4">
                      <p className="whitespace-pre-wrap break-words leading-relaxed text-foreground">
                        {data.stringDetails.requirements}
                      </p>
                    </div>
                  ) : (
                    <AdminInlineEmpty>요청사항 없음</AdminInlineEmpty>
                  )}
                </CardContent>
                </details>
                {!editingRequirements && isEditMode && (
                  <CardFooter className="flex justify-center bg-muted/20">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingRequirements(true)}
                      className="hover:bg-warning/10 dark:hover:bg-warning/15 border-border"
                    >
                      요청사항 수정
                    </Button>
                  </CardFooter>
                )}
              </Card>

              {/* 신청 타임라인: 마이페이지 전용 */}
              {!isAdmin && (
                <Card className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
                  <CardHeader className="rounded-t-2xl border-b border-border bg-muted/20 pb-3">
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <span>신청 타임라인</span>
                    </CardTitle>
                    <CardDescription>
                      접수, 라켓 발송, 작업, 완성 라켓 배송/수령, 확정까지의 진행 흐름을 확인할 수 있습니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 bp-lg:p-6">
                    <div className="flex flex-col gap-3 border-l-2 border-primary/30 bg-primary/5 px-3 py-3 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between bp-sm:px-4">
                      <div className="min-w-0">
                        <p className="text-ui-body-sm font-medium text-foreground">
                          현재 {data?.status ? data.status : "상태 확인 중"}
                        </p>
                        <p className="mt-1 text-ui-label text-foreground/75">
                          자세한 접수·배송 흐름은 필요할 때 펼쳐 확인하세요.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full bp-sm:w-auto"
                        onClick={() => setIsTimelineExpanded((prev) => !prev)}
                      >
                        {isTimelineExpanded ? "진행 흐름 접기" : "진행 흐름 보기"}
                      </Button>
                    </div>
                    {isTimelineExpanded && (
                      <div className="space-y-4">
                      {/* 신청 접수 */}
                      <div className="flex items-start gap-3 border-t border-border/60 py-3 first:border-t-0 bp-sm:gap-4 bp-sm:py-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-ui-body-sm font-medium text-foreground">신청 접수</p>
                          <p className="text-ui-body-sm text-foreground/80">
                            {data?.requestedAt
                              ? new Date(data.requestedAt).toLocaleString("ko-KR")
                              : "-"}
                          </p>
                        </div>
                      </div>

                      {/* 자가 발송(사용자 → 매장) */}
                      {selfShip?.trackingNo && (
                        <div className="flex items-start gap-3 border-t border-border/60 py-3 first:border-t-0 bp-sm:gap-4 bp-sm:py-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                            <Truck className="h-5 w-5 text-foreground" />
                          </div>
                          <div className="flex-1">
                            <p className="text-ui-body-sm font-medium text-foreground">
                              라켓 발송 운송장 등록
                            </p>
                            {/* 날짜 */}
                            <p className="mt-1 text-ui-body-sm text-foreground/80">
                              {selfShip.shippedAt
                                ? new Date(selfShip.shippedAt).toLocaleDateString("ko-KR")
                                : "운송장 번호가 등록되었습니다."}
                            </p>
                            {/* 택배사 + 운송장번호 + 조회 링크 */}
                            <p className="mt-1 break-words text-ui-body-sm text-foreground/80">
                              {getCourierLabel(selfShip.courier) + " · "}
                              <a
                                href={
                                  buildTrackingUrl(selfShip.courier, selfShip.trackingNo) ?? "#"
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="break-all underline underline-offset-2"
                              >
                                {selfShip.trackingNo}
                              </a>
                            </p>
                          </div>
                        </div>
                      )}
                      {/* 매장 발송(매장 → 사용자) */}
                      {invoice?.trackingNumber && (
                        <div className="flex items-start gap-3 border-t border-border/60 py-3 first:border-t-0 bp-sm:gap-4 bp-sm:py-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                            <Truck className="h-5 w-5 text-primary dark:text-foreground" />
                          </div>
                          <div className="flex-1">
                            <p className="text-ui-body-sm font-medium text-foreground">
                              완성 라켓 배송 운송장 등록
                            </p>
                            <p className="mt-1 text-ui-body-sm text-foreground/80">
                              {invoice.shippedAt
                                ? new Date(invoice.shippedAt).toLocaleDateString("ko-KR")
                                : "완성 라켓 배송을 위한 운송장 번호가 등록되었습니다."}
                            </p>
                            <p className="mt-1 break-words text-ui-body-sm text-foreground/80">
                              {getCourierLabel(invoice.courier) + " · "}
                              <a
                                href={
                                  buildTrackingUrl(invoice.courier, invoice.trackingNumber) ?? "#"
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="break-all underline underline-offset-2"
                              >
                                {invoice.trackingNumber}
                              </a>
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 전체 상태 요약 */}
                      <div className="flex items-start gap-3 border-t border-border/60 py-3 first:border-t-0 bp-sm:gap-4 bp-sm:py-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                          <CheckCircle2 className="h-5 w-5 text-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-ui-body-sm font-medium text-foreground">현재 상태</p>
                          <p className="text-ui-body-sm text-foreground/80">
                            {data?.status ? `현재 상태: ${data.status}` : "상태 정보가 없습니다."}
                          </p>
                          {data?.updatedAt && (
                            <p className="mt-1 text-ui-label text-foreground/75">
                              마지막 변경: {new Date(data.updatedAt).toLocaleString("ko-KR")}
                            </p>
                          )}
                        </div>
                      </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              {applicationId && !isAdmin && (
                <Card className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
                  <CardHeader className="rounded-t-2xl border-b border-border bg-muted/20 pb-3">
                    <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-ui-card-title-lg font-semibold">
                          <Clock className="h-5 w-5 text-primary" />
                          처리 이력
                        </CardTitle>
                        <CardDescription className="mt-1">
                          상태 변경과 처리 기록은 필요할 때만 펼쳐 확인하세요.
                        </CardDescription>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full bp-sm:w-auto"
                        onClick={() => setIsHistoryExpanded((prev) => !prev)}
                      >
                        {isHistoryExpanded ? "처리 이력 접기" : "처리 이력 보기"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className={cn("p-4 bp-lg:p-6", !isHistoryExpanded && "hidden")}>
                    <div id="stringing-history">
                      <StringingApplicationHistory
                        applicationId={applicationId}
                        isAdmin={isAdmin}
                        onHistoryMutate={(mutateFn) => {
                          historyMutateRef.current = mutateFn;
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
              </div>

              <aside className={cn(detailColumnClass, !isAdmin && "bp-lg:order-2 bp-lg:sticky bp-lg:top-24")}>
              {/* 결제 정보 */}
              <Card
                id="admin-stringing-payment"
                className={cn(
                  detailCardClass,
                  isAdmin && "xl:col-span-6",
                )}
              >
                <CardHeader
                  className={cn(
                    detailCardHeaderClass,
                    "flex flex-row items-center justify-between space-y-0",
                    !isAdmin && "pb-2",
                  )}
                >
                  <CardTitle className="text-ui-card-title-lg font-semibold flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" /> 결제 정보
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    {(() => {
                      const pay = getPaymentStatusBadgeSpec(paymentHeaderBadgeLabel);
                      return (
                        <Badge variant={pay.variant} className={cn(badgeBase, badgeSizeSm)}>
                          {paymentHeaderBadgeLabel}
                        </Badge>
                      );
                    })()}
                    {isEditMode && <Edit3 className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </CardHeader>

                <CardContent className={cn("p-4 bp-lg:p-6", !isAdmin && "py-3 bp-lg:py-5")}>
                  {editingPayment ? (
                    <PaymentEditForm
                      initialData={{
                        depositor: data.shippingInfo?.depositor || "",
                      }}
                      resourcePath={`${baseUrl}/api/applications/stringing`}
                      entityId={data.id}
                      onSuccess={() => {
                        mutate(); // 상세 데이터 갱신
                        historyMutateRef.current?.(); // 처리 이력 컴포넌트 갱신
                        setEditingPayment(false); // 폼 닫기
                      }}
                      onCancel={() => setEditingPayment(false)}
                    />
                  ) : (
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <AdminCompactField
                          label="총 결제 금액"
                          value={`${data.totalPrice.toLocaleString()}원`}
                          valueClassName="font-semibold text-primary"
                        />
                        <AdminCompactField
                          label="결제 상태"
                          value={(() => {
                            const pay = getPaymentStatusBadgeSpec(paymentHeaderBadgeLabel);
                            return (
                              <Badge variant={pay.variant} className={cn(badgeBase, badgeSizeSm)}>
                                {paymentHeaderBadgeLabel}
                              </Badge>
                            );
                          })()}
                        />
                        <AdminCompactField label="결제 방식" value={paymentMethodRaw} />
                      </div>
                      <details className="group border-y border-border/60 bg-background/60 py-1">
                        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-3 py-2 text-ui-body-sm font-medium text-foreground transition-colors hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
                          입금/PG 상세 정보
                          <span className="text-ui-label font-medium text-muted-foreground group-open:hidden">
                            펼치기
                          </span>
                          <span className="hidden text-ui-label font-medium text-muted-foreground group-open:inline">
                            접기
                          </span>
                        </summary>
                        <div className="mt-1 border-t border-border/60 p-3 text-ui-body-sm">
                          <PaymentMethodDetail
                            method={paymentMethodRaw}
                            bankKey={
                            useStandaloneBankFallback
                              ? (linkedPayment?.bank ?? data.shippingInfo?.bank ?? undefined)
                              : (linkedPayment?.bank ?? undefined)
                          }
                            depositor={
                            useStandaloneBankFallback
                              ? (linkedPayment?.depositor ??
                                data.shippingInfo?.depositor ??
                                undefined)
                              : (linkedPayment?.depositor ?? undefined)
                          }
                            isPackageApplied={packageApplied}
                            paymentProvider={linkedPayment?.provider}
                            easyPayProvider={linkedPayment?.easyPayProvider}
                            paymentStatus={paymentStatus}
                            paymentTid={linkedPayment?.tid}
                            paymentCardDisplayName={linkedPayment?.cardDisplayName}
                            paymentCardCompany={linkedPayment?.cardCompany}
                            paymentCardLabel={linkedPayment?.cardLabel}
                            approvedAt={linkedPayment?.approvedAt ?? null}
                            paymentNiceSync={linkedPayment?.niceSync ?? null}
                            niceOrderId={linkedPayment?.rawSummary?.orderId ?? null}
                            showAdminPgDetails={isAdmin}
                          />
                          {canSyncStandaloneNicePayment && (
                          <div className="mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleNiceSync}
                              disabled={isSyncingNice}
                            >
                              {isSyncingNice ? "PG 상태 동기화 중..." : "PG 상태 다시 확인"}
                            </Button>
                          </div>
                        )}
                          {isLinkedApplication && (
                            <p className="mt-2 border-l-2 border-primary/30 bg-primary/5 px-3 py-2 text-ui-body-sm leading-relaxed text-foreground/80">
                              {isOrderLinkedApplication
                                ? "주문 결제에 포함됨: 이 교체 작업의 결제는 연결 주문에서 처리합니다."
                                : "대여 결제에 포함됨: 이 교체 작업의 결제는 연결 대여에서 처리합니다."}
                            </p>
                          )}
                        </div>
                      </details>
                      {/* 패키지 사용 요약 */}
                      {data.packageInfo && (
                        <div
                          className={
                            data.packageInfo.applied
                              ? "border-l-2 border-primary/30 bg-primary/5 px-3 py-3 dark:bg-muted"
                              : "border-l-2 border-border bg-muted/20 px-3 py-3 dark:bg-background"
                          }
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 shrink-0">
                              <Ticket className="h-4 w-4 text-foreground" />
                            </div>
                            <div className="min-w-0 flex-1 text-ui-label leading-relaxed">
                              <div className="mb-1 flex min-w-0 flex-col items-start gap-1.5 bp-sm:flex-row bp-sm:items-center bp-sm:gap-2">
                                <span className="break-keep whitespace-normal font-semibold text-foreground">
                                  패키지 사용
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "whitespace-normal break-keep text-left leading-relaxed",
                                    data.packageInfo.applied
                                      ? "border-border text-foreground"
                                      : "border-border text-muted-foreground",
                                  )}
                                >
                                  {data.packageInfo.applied
                                    ? "이번 신청에 패키지 적용"
                                    : "이번 신청에는 패키지 미사용"}
                                </Badge>
                              </div>

                              {/* 본문 설명 */}
                              {data.packageInfo.applied ? (
                                <p className="break-keep text-foreground">
                                  이번 신청에서 패키지{" "}
                                  <span className="font-semibold">
                                    {data.packageInfo.useCount}회
                                  </span>
                                  가 차감되었습니다.
                                </p>
                              ) : (
                                <p className="break-words text-muted-foreground">
                                  이 신청은 패키지 기준으로는{" "}
                                  <span className="font-semibold">
                                    {data.packageInfo.useCount}회
                                  </span>
                                  에 해당하지만, 실제로 패키지는 사용되지 않았습니다.
                                </p>
                              )}

                              {/* 패스 정보가 있는 경우에만 상세 숫자 표시 */}
                              {data.packageInfo.passId && (
                                <div className="mt-2 flex flex-wrap gap-2 text-ui-body-sm text-foreground/75 [&>span]:break-keep">
                                  {data.packageInfo.passTitle && (
                                    <span className="font-medium">
                                      {data.packageInfo.passTitle}
                                    </span>
                                  )}
                                  {typeof data.packageInfo.packageSize === "number" && (
                                    <span>총 {data.packageInfo.packageSize}회</span>
                                  )}
                                  {typeof data.packageInfo.usedCount === "number" && (
                                    <span>사용 {data.packageInfo.usedCount}회</span>
                                  )}
                                  {typeof data.packageInfo.remainingCount === "number" && (
                                    <span>잔여 {data.packageInfo.remainingCount}회</span>
                                  )}
                                  {data.packageInfo.expiresAt && (
                                    <span>
                                      만료일{" "}
                                      {new Date(data.packageInfo.expiresAt).toLocaleDateString(
                                        "ko-KR",
                                      )}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 패키지 사용 카드 아래에 차감 이력 표시 */}
                      {data.packageConsumptions && data.packageConsumptions.length > 0 && (
                        <div className="mt-3 border-t border-dashed border-border bg-muted/20 px-3 py-2 text-ui-label text-foreground/60 dark:bg-muted/30">
                          <div className="mb-1 flex flex-col gap-1 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
                            <div className="flex items-center gap-1 break-keep">
                              <Clock className="h-3.5 w-3.5 text-foreground" />
                              <span className="font-semibold">패키지 차감 이력</span>
                            </div>
                            <span className="text-ui-body-sm text-foreground/75">
                              총 {totalPackageConsumed}회
                            </span>
                          </div>
                          <ul className="space-y-1.5">
                            {data.packageConsumptions.map((c) => (
                              <li
                                key={c.id}
                                className="flex flex-col gap-0.5 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between"
                              >
                                <span className="text-ui-body-sm text-foreground/75">
                                  {new Date(c.usedAt).toLocaleString("ko-KR", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}
                                </span>
                                <span className="text-ui-micro font-medium text-primary">
                                  {c.count ?? 1}회 사용
                                  {c.reverted && (
                                    <span className="ml-1 text-ui-label text-destructive">
                                      (복원됨)
                                    </span>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    </div>
                  )}
                </CardContent>

                {!editingPayment && isEditMode && (
                  <CardFooter className="flex justify-center bg-muted/20">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingPayment(true)}
                      className="hover:bg-muted border-border"
                    >
                      결제 정보 수정
                    </Button>
                  </CardFooter>
                )}
              </Card>

              {/* 고객 정보 */}
              <Card
                className={cn(
                  detailCardClass,
                  isAdmin && "xl:col-span-6",
                )}
              >
                <CardHeader className={detailCardHeaderClass}>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-primary" />
                      <span>{isAdmin ? "고객 정보" : "신청자 정보"}</span>
                    </div>
                    {isEditMode && <Edit3 className="h-4 w-4 text-muted-foreground" />}
                  </CardTitle>
                </CardHeader>
                <CardContent className={cn("p-4 bp-lg:p-6", !isAdmin && "py-3 bp-lg:py-5")}>
                  {editingCustomer ? (
                    <CustomerEditForm
                      initialData={{
                        name: data.customer.name ?? "이름 미입력",
                        email: data.customer.email ?? "이메일 미입력",
                        phone: data.customer?.phone ?? "전화번호 미입력",
                        address: data.customer?.address ?? "주소 미입력",
                        addressDetail: data.customer?.addressDetail ?? "상세 주소 미입력",
                        postalCode: data.customer?.postalCode ?? "우편번호 미입력",
                      }}
                      resourcePath={`${baseUrl}/api/applications/stringing`}
                      entityId={data.id}
                      onSuccess={() => {
                        mutate(); // 상세 데이터 갱신
                        historyMutateRef.current?.(); // 이력 갱신
                        setEditingCustomer(false); // 폼 닫기
                      }}
                      onCancel={() => setEditingCustomer(false)}
                    />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <AdminCompactField
                        label="이름"
                        value={data.customer.name}
                        emptyValue="이름 미등록"
                      />
                      <AdminCompactField
                        label="이메일"
                        value={data.customer.email}
                        emptyValue="이메일 미등록"
                        valueClassName="break-all"
                      />
                      <AdminCompactField
                        label="전화번호"
                        value={data.customer?.phone}
                        emptyValue="전화번호 미등록"
                      />
                      <AdminCompactField
                        label={customerAddressLabel}
                        value={
                          customerAddressValue && customerAddressValue !== "정보 없음" ? (
                            <>
                              <span>{customerAddressValue}</span>
                              {!isVisit && data.customer?.addressDetail ? (
                                <span className="mt-1 block text-foreground/80">
                                  {data.customer.addressDetail}
                                </span>
                              ) : null}
                              {customerAddressSubValue ? (
                                <span className="mt-1 block text-foreground/70">
                                  {customerAddressSubLabel}: {customerAddressSubValue}
                                </span>
                              ) : null}
                            </>
                          ) : null
                        }
                        emptyValue="주소 미등록"
                        className="sm:col-span-2"
                      />
                    </div>
                  )}
                </CardContent>

                {!editingCustomer && isEditMode && (
                  <CardFooter className="pt-2 flex justify-center bg-muted/20">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingCustomer(true)}
                      className="hover:bg-muted border-border"
                    >
                      고객 정보 수정
                    </Button>
                  </CardFooter>
                )}
              </Card>

              </aside>
            </div>
            {/* 관리자 전용 운송장 정보 카드 */}
            <div className="mt-6 space-y-4 bp-sm:mt-8 bp-sm:space-y-6">


              {isAdmin && !isLinkedApplication && (
                <Card id="admin-stringing-shipping" className={cn(detailCardClass, "mb-8")}>
                  <CardHeader
                    className={cn(detailCardHeaderClass, "flex flex-row items-center gap-2")}
                  >
                    <Truck className="h-5 w-5 text-foreground" />
                    <CardTitle className="text-ui-card-title-lg font-semibold">
                      라켓 발송·완성 라켓 배송 정보
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="grid gap-4 p-4 md:grid-cols-2 bp-sm:p-6">
                    {/* 자가 발송(사용자 → 매장) */}
                    <div className="border-l-2 border-border bg-background/60 px-3 py-3 bp-sm:px-4">
                      <p className="text-ui-body-sm font-semibold text-foreground">
                        고객 발송 라켓
                      </p>
                      <p className="mt-1 text-ui-label text-foreground/75">
                        라켓 발송 운송장과 라켓 입고 확인에 필요한 정보를 확인합니다.
                      </p>
                      {data.shippingInfo?.selfShip?.trackingNo ? (
                        <div className="mt-2 space-y-1 text-ui-body-sm text-foreground">
                          <p>택배사: {getCourierLabel(data.shippingInfo.selfShip.courier)}</p>
                          <p>
                            운송장:
                            <a
                              href={
                                buildTrackingUrl(
                                  data.shippingInfo.selfShip.courier,
                                  data.shippingInfo.selfShip.trackingNo,
                                ) ?? "#"
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="underline underline-offset-2"
                            >
                              {data.shippingInfo.selfShip.trackingNo}
                            </a>
                          </p>
                          <p>
                            발송일:{" "}
                            {data.shippingInfo.selfShip.shippedAt
                              ? new Date(data.shippingInfo.selfShip.shippedAt).toLocaleDateString(
                                  "ko-KR",
                                )
                              : "-"}
                          </p>
                        </div>
                      ) : (
                        <AdminInlineEmpty className="mt-2">라켓 발송 운송장 미등록</AdminInlineEmpty>
                      )}
                    </div>

                    {/* 매장 발송(매장 → 사용자) */}
                    <div className="border-l-2 border-border bg-background/60 px-3 py-3 bp-sm:px-4">
                      <p className="text-ui-body-sm font-semibold text-foreground">
                        작업 완료 후 완성 라켓 운송장
                      </p>
                      {hasStoreShippingInfo ? (
                        <div className="mt-2 space-y-1 text-ui-body-sm text-foreground">
                          {isCourierShipping && invoice?.trackingNumber ? (
                            <>
                              <p>택배사: {getCourierLabel(invoice.courier)}</p>
                              <p>
                                운송장:
                                <a
                                  href={
                                    buildTrackingUrl(invoice.courier, invoice.trackingNumber) ??
                                    undefined
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline underline-offset-2"
                                >
                                  {invoice.trackingNumber}
                                </a>
                              </p>
                              <p>
                                발송일:{" "}
                                {invoice.shippedAt
                                  ? new Date(invoice.shippedAt).toLocaleDateString("ko-KR")
                                  : "-"}
                              </p>
                            </>
                          ) : (
                            <>
                              <p>
                                배송 방식:{" "}
                                {shippingMethod
                                  ? orderShippingMethodLabel(shippingMethod)
                                  : "미입력"}
                              </p>
                              <p>
                                예정일:{" "}
                                {data.shippingInfo?.estimatedDate
                                  ? new Date(data.shippingInfo.estimatedDate).toLocaleDateString(
                                      "ko-KR",
                                    )
                                  : "-"}
                              </p>
                              <p className="text-ui-label text-foreground/75">
                                운송장 번호는 발급되지 않는 배송 방식입니다.
                              </p>
                            </>
                          )}
                        </div>
                      ) : (
                        <AdminInlineEmpty className="mt-2">완성 라켓 배송 정보 미등록</AdminInlineEmpty>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {isAdmin && applicationId && (
                <div className="mt-6">
                  <AdminInternalNotesCard
                    targetType="stringingApplication"
                    targetId={applicationId}
                  />
                </div>
              )}
              {/* 처리 이력 */}
              {isAdmin && applicationId && (
                <div id="admin-stringing-history" className="mt-6">
                  <StringingApplicationHistory
                    applicationId={applicationId}
                    isAdmin={isAdmin}
                    onHistoryMutate={(mutateFn) => {
                      historyMutateRef.current = mutateFn;
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </SiteContainer>
      </div>

      {isAdmin && (
        <AdminConfirmDialog
          open={isApproveCancelDialogOpen}
          title="취소 요청을 승인할까요?"
          description={
            "고객의 교체서비스 신청 취소 요청을 승인합니다.\n연결된 주문·패키지 사용 이력·결제 상태에 영향을 줄 수 있으므로 연결 문서와 결제 상태를 먼저 확인해주세요.\n처리 후 신청 상태가 변경되며, 관련 처리 이력에 남습니다."
          }
          severity="danger"
          confirmText="취소 승인"
          onOpenChange={setIsApproveCancelDialogOpen}
          onConfirm={() => {
            void handleAdminApproveCancel();
          }}
          onCancel={() => setIsApproveCancelDialogOpen(false)}
          eventKey="admin-stringing-cancel-approve-confirm"
          eventMeta={{ applicationId: data?.id ?? applicationId }}
        />
      )}

      {/* 관리자: 취소 요청 거절 모달 */}
      {isAdmin && (
        <Dialog
          open={isRejectDialogOpen}
          onOpenChange={(open) => {
            setIsRejectDialogOpen(open);
            if (!open) {
              setRejectReason("");
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogTitle className="text-ui-card-title-lg font-semibold">
              취소 요청을 거절할까요?
            </DialogTitle>
            <p className="mt-2 text-ui-body-sm text-foreground/80">
              고객의 교체서비스 신청 취소 요청을 거절합니다. 신청은 기존 처리 흐름을 유지하며,
              필요한 경우 거절 사유를 남겨 처리 이력으로 관리할 수 있습니다.
            </p>

            <div className="mt-4 space-y-2">
              <label className="block text-ui-body-sm font-medium text-foreground">
                거절 사유 (선택 입력)
              </label>
              <textarea
                className="mt-1 w-full min-h-[90px] rounded-md border border-input bg-background px-3 py-2 text-ui-body-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="예: 이미 작업이 진행되어 취소가 불가능한 상태입니다."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsRejectDialogOpen(false)}
                disabled={isRejectSubmitting}
              >
                닫기
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmRejectCancel}
                disabled={isRejectSubmitting}
              >
                {isRejectSubmitting ? "처리 중..." : "거절 확정"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 관리자: 신청 직접 취소 모달 */}
      {isAdmin && (
        <Dialog
          open={isAdminCancelDialogOpen}
          onOpenChange={(open) => {
            setIsAdminCancelDialogOpen(open);
            if (!open) {
              setAdminCancelReason("");
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogTitle className="text-ui-card-title-lg font-semibold">
              신청을 직접 취소할까요?
            </DialogTitle>
            <p className="mt-2 text-ui-body-sm text-foreground/80">
              고객 취소 요청 없이 관리자가 단독 교체서비스 신청을 취소합니다. 취소 후 신청 상태는
              취소로 변경되며 처리 이력에 사유가 남습니다.
            </p>
            <p className="mt-2 text-ui-body-sm text-foreground/80">
              카드/NICEPAY 결제완료 건은 취소 처리 시 결제사 취소가 함께 진행됩니다. 결제사 취소에
              실패하면 신청 상태는 변경되지 않습니다.
            </p>
            <p className="mt-1 text-ui-body-sm text-foreground/80">
              무통장 결제완료 건은 관리자 확인 후 결제취소 상태로 전환됩니다.
            </p>
            {packageApplied && (
              <p className="mt-1 text-ui-body-sm text-foreground/80">
                패키지 사용 신청은 취소 처리 시 사용 회차 복원 기준으로 처리됩니다.
              </p>
            )}

            <div className="mt-4 space-y-2">
              <label className="block text-ui-body-sm font-medium text-foreground">
                취소 사유 <span className="text-destructive">*</span>
              </label>
              <textarea
                className="mt-1 w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-ui-body-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="예: 고객과 유선 확인 후 신청 취소 처리"
                value={adminCancelReason}
                onChange={(e) => setAdminCancelReason(e.target.value)}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAdminCancelDialogOpen(false)}
                disabled={isAdminCancelSubmitting}
              >
                닫기
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmAdminCancel}
                disabled={isAdminCancelSubmitting || adminCancelReason.trim().length === 0}
              >
                {isAdminCancelSubmitting ? "처리 중..." : "신청 직접 취소"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <CancelStringingDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        onConfirm={handleConfirmCancelRequest}
        isSubmitting={isPending}
        needsRefundAccount={needsCancelRefundAccount}
        noRefundAccountMessage={noCancelRefundAccountMessage}
      />
    </main>
  );
}
