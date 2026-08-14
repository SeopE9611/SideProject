"use client";

import {
  AlertTriangle,
  BellRing,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  Inbox,
  Link2,
  RefreshCw,
  Search,
  Siren,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

import { adminDataTable } from "@/components/admin/AdminDataTable";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import AdminReferencePopover from "@/components/admin/AdminReferencePopover";
import AdminRowActionMenu from "@/components/admin/AdminRowActionMenu";
import AdminSummaryCard from "@/components/admin/AdminSummaryCard";
import { Section, SectionBody, SectionHeader } from "@/components/admin/Section";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { AdminSemanticBadge as Badge } from "@/components/admin/AdminSemanticBadge";
import AsyncState from "@/components/system/AsyncState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { opsKindLabel } from "@/lib/admin-ops-taxonomy";
import { adminMutator, getAdminErrorMessage } from "@/lib/admin/adminFetcher";
import { inferNextActionForOperationGroup } from "@/lib/admin/next-action-guidance";
import {
  formatElapsedText,
  getElapsedHours,
  resolveOperationsSlaLevel,
} from "@/lib/admin/operations-sla";
import { buildQueryString } from "@/lib/admin/urlQuerySync";
import {
  badgeBase,
  badgeSizeSm,
  badgeToneClass,
  getApplicationStatusBadgeSpec,
  getOrderStatusBadgeSpec,
  getPaymentStatusBadgeSpec,
  getRentalStatusBadgeSpec,
  getWorkflowMetaBadgeSpec,
} from "@/lib/badge-style";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { shortenId } from "@/lib/shorten";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { AppsInTossReconciliationResponse } from "@/types/admin/apps-in-toss-reconciliation";
import type {
  AdminDailyOperationsSummaryResponse,
  AdminOperationsGroup,
  AdminOperationsListResponseDto,
  AdminOperationsSummary,
  OperationGroupCounts,
  OperationSignalCounts,
  OperationTaskCounts,
} from "@/types/admin/operations";
import { copyToClipboard } from "./actions/operationsActions";
import { prevMonthYyyymmKST, type Kind } from "./filters/operationsFilters";
import {
  buildOperationsViewQueryString,
  initOperationsStateFromQuery,
  useSyncOperationsQuery,
  type FlowValue,
} from "./hooks/useOperationsQueryState";
import { formatKST, type OpItem, type ReviewLevel } from "./table/operationsTableUtils";

const won = (n: number) => (n || 0).toLocaleString("ko-KR") + "원";

type NavigationBadgeCounts = Partial<Record<"offline" | "academyApplications", number>>;

type NavigationSummaryResponse = {
  counts?: NavigationBadgeCounts;
  operationTaskCounts?: Partial<OperationTaskCounts>;
  operationGroupCounts?: Partial<OperationGroupCounts>;
  operationSignalCounts?: Partial<OperationSignalCounts>;
};

const PAGE_COPY = {
  title: "운영 업무",
  description: "대표 업무와 결제·정산 확인 항목을 구분해 남은 운영 업무를 확인합니다.",
  dailyTodoTitle: "남은 대표 업무",
  dailyTodoLabels: {
    urgent: "긴급",
    caution: "확인 필요",
    pending: "미처리",
  },
  actionsTitle: "도움말",
  actions: [
    {
      title: "주의(오류) 우선 처리",
      description: "데이터 연결/무결성 오류 신호를 먼저 점검해 운영 리스크를 줄입니다.",
    },
    {
      title: "확인 필요 항목 점검",
      description: "오류는 아니지만 운영 확인이 필요한 건의 검수 사유를 빠르게 확인합니다.",
    },
    {
      title: "상세 이동",
      description: "주문·신청서·대여 상세 화면으로 즉시 이동합니다.",
    },
    {
      title: "정산 관리 이동",
      description: "지난달 기준 정산 화면으로 빠르게 이동해 마감합니다.",
    },
  ],
};

const OPERATOR_TERM_MAP: Array<[RegExp, string]> = [
  [/\bpaymentStatus\b/gi, "결제 상태 정보"],
  [/\bpaymentSource\b/gi, "결제 연결 정보"],
  [/\bREVIEW_INFO\b/g, "자동 계산 정보"],
  [/\bderived\b/gi, "주문 정보를 기준으로 계산된"],
  [/\bsignal\b/gi, "확인 신호"],
  [/\bwarn\b/gi, "주의"],
  [/\bpending\b/gi, "미처리"],
];

const FLOW_LABEL_BY_ID: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, string> = {
  1: "레거시 · 스트링 단품 구매",
  2: "스트링 구매 + 교체서비스 신청(통합)",
  3: "교체서비스 단일 신청",
  4: "레거시 · 라켓 단품 구매",
  5: "라켓 구매 + 스트링 선택 + 교체서비스 신청(통합)",
  6: "레거시 · 라켓 단품 대여",
  7: "라켓 대여 + 스트링 선택 + 교체서비스 신청(통합)",
  8: "패키지 구매",
};

function toOperatorSentence(text?: string | null) {
  if (!text) return "";
  let next = text;
  for (const [pattern, replacement] of OPERATOR_TERM_MAP) {
    next = next.replace(pattern, replacement);
  }
  return next
    .replace(
      /신청서 paymentStatus가 비어 있어 파생 결제상태를 사용했습니다\./gi,
      "신청서에 결제 정보가 비어 있어, 주문 정보를 기준으로 결제 상태를 표시했습니다.",
    )
    .replace(/파생 결제상태/gi, "주문 정보를 기준으로 계산한 결제 상태")
    .trim();
}

function flowLabelText(item: OpItem) {
  return item.flowLabel?.trim() || FLOW_LABEL_BY_ID[item.flow] || "미분류";
}

function groupNextActionText(group: {
  guide: { nextAction?: string | null };
  anchor: OpItem;
  cancelRequested: boolean;
  reviewLevel?: ReviewLevel;
}) {
  // 취소 요청은 다른 안내보다 우선합니다.
  if (group.cancelRequested) {
    return "취소 요청 처리 필요";
  }

  // 교체서비스 포함 주문인데 아직 신청서가 없는 경우
  if (group.anchor.needsStringingApplication) {
    // 결제 확인과 신청서 확인이 모두 필요한 경우
    if (group.anchor.paymentNeedsCheck && group.anchor.paymentActionLabel) {
      return `${group.anchor.paymentActionLabel} · 교체서비스 신청서 접수 확인`;
    }

    return "교체서비스 신청서 접수 확인";
  }

  // 일반 주문에서 결제 확인만 필요한 경우
  if (
    group.anchor.kind === "order" &&
    group.anchor.paymentNeedsCheck &&
    group.anchor.paymentActionLabel
  ) {
    return group.anchor.paymentActionLabel;
  }

  // 그 외에는 기존 업무 가이드를 사용합니다.
  if (group.guide.nextAction?.trim()) {
    return toOperatorSentence(group.guide.nextAction);
  }

  if (group.reviewLevel === "info") {
    return "자동 계산 정보 있음";
  }

  return "조치 필요 없음";
}

function getOperationPriorityMeta(input: {
  warn: boolean;
  reviewLevel?: ReviewLevel;
  groupCancelRequested: boolean;
}) {
  if (input.groupCancelRequested) {
    return {
      label: "즉시 처리",
      description: "취소 요청",
      tone: "warning" as const,
    };
  }
  if (input.warn) {
    return {
      label: "주의",
      description: "운영 확인 필요",
      tone: "warning" as const,
    };
  }
  if (input.reviewLevel === "action") {
    return {
      label: "확인 필요",
      description: "검수 필요",
      tone: "info" as const,
    };
  }
  return { label: "정상", description: "일반 처리", tone: "neutral" as const };
}

function statusHeadlineOf(item: OpItem) {
  const status = item.statusDisplayLabel?.trim() || item.statusLabel?.trim() || "";
  const flowLabel = flowLabelText(item);
  const lowerStatus = status.toLowerCase();
  const hasRelated = Boolean(item.related);
  const integratedApplication = item.kind === "stringing_application" && hasRelated;
  const standaloneApplication = item.kind === "stringing_application" && !hasRelated;
  const isCancelRequested = item.cancel?.status === "requested";
  const isCancelProcessing = item.cancel?.status === "approved_pending_pg_cancel";
  const isCancelDone = item.cancel?.status === "approved" || item.cancel?.status === "rejected";

  if (item.kind === "order") {
    if (isCancelProcessing) return "취소 처리중 주문";
    if (isCancelRequested) return "취소 요청 접수 주문";
    if (isCancelDone || lowerStatus.includes("환불")) return "취소/환불 처리 주문";
    if (lowerStatus.includes("구매확정")) return "구매확정 주문";
    if (lowerStatus.includes("배송완료") || lowerStatus.includes("delivered"))
      return "배송 완료 주문";
    if (lowerStatus.includes("배송중") || lowerStatus.includes("shipped")) return "배송 중 주문";
    if (item.paymentNeedsCheck === true) return "결제 확인 필요 주문";
    if (item.needsStringingApplication === true) return "교체서비스 신청서 접수 확인 주문";
    if (
      item.paymentStateKind === "paid" ||
      lowerStatus.includes("결제완료") ||
      lowerStatus.includes("결제 완료")
    )
      return "결제 완료 주문";
    if (
      ["결제대기", "결제 대기", "입금대기", "입금 대기", "미입금", "결제 확인 대기"].some(
        (label) => lowerStatus.includes(label),
      )
    )
      return "결제 확인 필요 주문";
    return status ? `${status} 주문` : "처리 대기 주문";
  }

  if (item.kind === "rental") {
    if (isCancelRequested) return "취소 요청 접수 대여 건";
    if (lowerStatus.includes("반납완료") && !item.depositRefundedAt)
      return "보증금 환불 확인 필요 대여 건";
    if (lowerStatus.includes("반납완료")) return "대여 완료 건";
    if (lowerStatus.includes("대여중") || lowerStatus.includes("out")) return "대여 진행 건";
    if (lowerStatus.includes("대기") || lowerStatus.includes("결제완료"))
      return "대여 시작 전 준비 필요";
    return status ? `${status} 대여 건` : "대여 상태 확인 건";
  }

  if (isCancelRequested) return "취소 요청 접수 신청 건";
  if (lowerStatus.includes("교체완료")) {
    if (flowLabel.includes("신청")) return "신청서 교체 완료 건";
    return standaloneApplication ? "단독 교체 신청 완료 건" : "연결 교체 신청 완료 건";
  }
  if (lowerStatus.includes("검토")) {
    return standaloneApplication ? "단독 교체 신청 검토 건" : "연결 교체 신청 검토 건";
  }
  if (lowerStatus.includes("접수")) {
    return standaloneApplication ? "신청 접수 완료 건" : "연결 신청 접수 건";
  }
  if (lowerStatus.includes("작업")) {
    return standaloneApplication ? "단독 교체 신청 작업 건" : "연결 교체 신청 작업 건";
  }
  if (integratedApplication) return "연결 교체 신청 건";
  if (standaloneApplication) return "단독 교체 신청 건";
  return status ? `${status} 신청서` : "신청서 상태 확인 건";
}

function normalizeOperationStatusLabel(value?: string | null) {
  return String(value ?? "")
    .replace(/\s+/g, "")
    .replace(/[·/_-]/g, "")
    .trim()
    .toLowerCase();
}

type PresetKey = "paymentMismatch" | "integratedReview" | "singleApplication";
type OperationsQuickView =
  | "all"
  | "today"
  | "cancelRequests"
  | "paymentCheck"
  | "shippingMissing"
  | "rentalDue"
  | "linkedReview";

const QUICK_VIEWS: Array<{
  key: OperationsQuickView;
  label: string;
  description: string;
}> = [
  { key: "all", label: "전체", description: "모든 운영 업무를 확인합니다." },
  {
    key: "today",
    label: "대표 업무",
    description: "주문·대여·단독 교체서비스 기준 대표 업무를 확인합니다.",
  },
  {
    key: "cancelRequests",
    label: "취소 요청",
    description: "취소 요청 접수 건을 확인합니다.",
  },
  {
    key: "paymentCheck",
    label: "결제 확인 필요",
    description: "입금 또는 결제 확인이 필요한 처리 항목을 확인합니다.",
  },
  {
    key: "shippingMissing",
    label: "배송 누락",
    description: "배송/운송장 확인이 필요한 건을 확인합니다.",
  },
  {
    key: "rentalDue",
    label: "반납 예정",
    description: "반납 확인이 필요한 대여 업무를 확인합니다.",
  },
  {
    key: "linkedReview",
    label: "연결된 업무",
    description: "주문·신청·대여가 함께 묶인 운영 업무를 확인합니다.",
  },
];

function normalizeText(value?: string | null) {
  return (value ?? "").toLowerCase().trim();
}

function appendQuickViewParam(params: URLSearchParams, view: OperationsQuickView) {
  if (view === "all") {
    params.delete("view");
    return;
  }
  params.set("view", view);
}

function isTodayQueueGroup(group: { groupQueueBucket: string }) {
  return ["urgent", "caution", "pending"].includes(group.groupQueueBucket);
}

function isCancelRequestedGroup(group: { items: OpItem[] }) {
  return group.items.some(
    (item) =>
      item.cancel?.status === "requested" || item.cancel?.status === "approved_pending_pg_cancel",
  );
}

function hasPaymentCheckNeeded(group: { items: OpItem[] }) {
  const excludeKeywords = ["결제완료", "환불완료", "취소완료"];

  const includeKeywords = [
    "결제대기",
    "입금대기",
    "미입금",
    "입금 확인",
    "결제 확인",
    "동기화 필요",
  ];

  return group.items.some((item) => {
    // 일반 주문은 API에서 계산한 구조화된 판정값을 최우선으로 사용합니다.
    if (item.kind === "order" && typeof item.paymentNeedsCheck === "boolean") {
      return item.paymentNeedsCheck;
    }

    // 신청서·대여·패키지는 기존 문자열 기반 판정을 유지합니다.
    const statusText = `${item.statusDisplayLabel ?? ""} ${item.statusLabel ?? ""}`;

    if (excludeKeywords.some((word) => statusText.includes(word))) {
      return false;
    }

    const paymentStatus = normalizeText(item.stage);

    if (paymentStatus.includes("pending") || paymentStatus.includes("unpaid")) {
      return true;
    }

    const combined = `${item.paymentLabel ?? ""} ${statusText} ${item.nextAction ?? ""}`;

    return includeKeywords.some((word) => combined.includes(word));
  });
}

function hasShippingMissing(group: { items: OpItem[] }) {
  const excludeKeywords = ["배송완료", "수령완료", "방문 수령 완료", "반납완료"];
  const includeKeywords = [
    "운송장",
    "배송 등록",
    "운송장 등록",
    "배송 필요",
    "발송 필요",
    "출고 필요",
    "인도 필요",
    "인도 운송장",
    "인도 정보",
    "배송 누락",
  ];
  return group.items.some((item) => {
    const statusText = `${item.statusDisplayLabel ?? ""} ${item.statusLabel ?? ""}`;
    if (excludeKeywords.some((word) => statusText.includes(word))) return false;
    const warnText = (item.warnReasons ?? []).join(" ");
    const nextActionText = item.nextAction ?? "";
    const combined = `${statusText} ${warnText} ${nextActionText}`;
    const needsTracking = item.hasShippingInfo === false || item.hasOutboundTracking === false;
    if (needsTracking && includeKeywords.some((word) => combined.includes(word))) return true;
    return includeKeywords.some((word) => warnText.includes(word) || nextActionText.includes(word));
  });
}

function hasRentalDue(group: { items: OpItem[] }) {
  const includeStageKeywords = ["overdue", "duesoon", "returndue", "active", "ongoing"];
  const includeStatusKeywords = ["대여중", "반납대기", "반납예정"];
  const includeActionKeywords = ["반납 확인", "반납확인", "반납 예정", "반납 필요"];
  const excludeKeywords = ["반납완료", "완료", "환불완료"];
  return group.items.some((item) => {
    if (item.kind !== "rental") return false;
    const combined = `${item.statusDisplayLabel ?? ""} ${item.statusLabel ?? ""} ${item.nextAction ?? ""}`;
    const isReturned = combined.toLowerCase().includes("returned") || combined.includes("반납완료");
    const hasDepositRefundSignal =
      item.signals?.some((signal) => signal.code === "RENTAL_DEPOSIT_REFUND_REQUIRED") === true;
    const needsDepositRefund =
      !item.depositRefundedAt &&
      (hasDepositRefundSignal || (isReturned && combined.includes("보증금")));
    if (needsDepositRefund) return true;
    if (excludeKeywords.some((word) => combined.includes(word))) return false;
    const stage = normalizeText(item.stage);
    if (includeStageKeywords.some((word) => stage.includes(word))) return true;
    if (includeStatusKeywords.some((word) => combined.includes(word))) return true;
    return includeActionKeywords.some((word) => (item.nextAction ?? "").includes(word));
  });
}

function isLinkedWorkGroup(group: { items: OpItem[] }) {
  return group.items.some((item) => Boolean(item.related)) || group.items.length > 1;
}

const PRESET_CONFIG: Record<
  PresetKey,
  {
    label: string;
    helperText: string;
    priorityReason: string;
    nextAction: string;
    params: Partial<{
      q: string;
      kind: "all" | Kind;
      flow: FlowValue;
      integrated: "all" | "1" | "0";
      warn: boolean;
    }>;
    isActive: (state: {
      integrated: "all" | "1" | "0";
      flow: FlowValue;
      kind: "all" | Kind;
      onlyWarn: boolean;
    }) => boolean;
  }
> = {
  paymentMismatch: {
    label: "주의(오류) 우선 점검",
    helperText: "데이터 연결/무결성 오류(주의) 건을 우선 처리하는 뷰입니다.",
    priorityReason:
      "주의는 실제 데이터 오류 신호이므로 CS·정산 이슈로 확산되기 전에 우선 조치가 필요합니다.",
    nextAction:
      "연결 누락/불일치 원인을 확인해 문서를 재연결하거나 상태를 정정하고 조치 이력을 남기세요.",
    params: { warn: true, integrated: "all", flow: "all", kind: "all" },
    isActive: ({ onlyWarn }) => onlyWarn,
  },
  integratedReview: {
    label: "연결 주문 확인",
    helperText: "주문/대여와 신청서가 연결된 통합 건만 모아 확인합니다.",
    priorityReason: "연결 구조가 복잡해 문서 누락/상태 불일치가 가장 자주 발생합니다.",
    nextAction: "앵커 문서 기준으로 연결 문서의 상태·금액·정산 대상 월을 차례대로 검수하세요.",
    params: { integrated: "1", flow: "all", kind: "all", warn: false },
    isActive: ({ integrated, flow, kind, onlyWarn }) =>
      integrated === "1" && flow === "all" && kind === "all" && !onlyWarn,
  },
  singleApplication: {
    label: "단독 신청서 처리",
    helperText: "연결되지 않은 교체서비스 신청서만 빠르게 처리합니다.",
    priorityReason:
      "단독 신청서는 후속 주문/대여 연결이 없어 처리 누락 시 장기 미처리로 남기 쉽습니다.",
    nextAction: "미처리 사유를 우선 확인하고 담당자 배정 또는 상태 업데이트를 즉시 진행하세요.",
    params: {
      integrated: "0",
      flow: "3",
      kind: "stringing_application",
      warn: false,
    },
    isActive: ({ integrated, flow, kind, onlyWarn }) =>
      integrated === "0" && flow === "3" && kind === "stringing_application" && !onlyWarn,
  },
};

// 운영함 상단에서 "정산 관리"로 바로 이동할 때 사용할 기본 YYYYMM(지난달, KST 기준)
// 그룹 createdAt(ISO) → KST 기준 yyyymm(예: 202601)
// 그룹(묶음) 만들기 유틸
// - 연결된 건을 "한 묶음"으로 묶어서 운영자가 한눈에 인지하게 하는 목적
// - 그룹 키는 "앵커(주문/대여)" 기준으로 통일
// =========================
type OpGroup = {
  key: string;
  anchor: OpItem; // 대표(앵커) row: order > rental > application 우선
  createdAt: string | null; // 그룹 최신 시간(정렬/표시용)
  items: OpItem[]; // anchor 포함
  kinds: Kind[]; // 그룹에 포함된 종류(주문/신청서/대여)
};

const KIND_PRIORITY: Record<Kind, number> = {
  order: 0,
  rental: 1,
  stringing_application: 2,
  package_purchase: 3,
};

/**
 * 그룹 금액 표시 원칙(매출/정산 사고 방지)
 * - 그룹(연결됨)에서는 "대표 1개 금액"만 보여주면 누락/중복 해석 위험이 큼
 * - 그래서 그룹 row에서 "종류별 금액을 각각 1번만" 노출한다.
 * - 합계(주문+신청서…)는 시스템 정책이 확정되기 전까지 계산/표시하지 않는다.
 */
function pickOnePerKind(items: OpItem[]) {
  const byKind = new Map<Kind, OpItem>();
  for (const it of items) {
    const cur = byKind.get(it.kind);
    if (!cur) {
      byKind.set(it.kind, it);
      continue;
    }
    // 같은 kind가 여러 개면, createdAt 최신 것을 대표로(안전한 기본값)
    const t1 = cur.createdAt ? new Date(cur.createdAt).getTime() : 0;
    const t2 = it.createdAt ? new Date(it.createdAt).getTime() : 0;
    if (t2 >= t1) byKind.set(it.kind, it);
  }
  return (["order", "rental", "stringing_application", "package_purchase"] as Kind[])
    .map((k) => byKind.get(k))
    .filter(Boolean) as OpItem[];
}

function isWarnGroup(g: { items: OpItem[] }) {
  return (g.items ?? []).some((it) => it.warn === true || (it.warnReasons?.length ?? 0) > 0);
}

function cancelBadgeSpec(status?: NonNullable<OpItem["cancel"]>["status"]) {
  if (status === "requested")
    return {
      label: "취소요청",
      spec: getWorkflowMetaBadgeSpec("cancel_requested"),
    };
  if (status === "approved_pending_pg_cancel")
    return { label: "취소처리중", spec: getPaymentStatusBadgeSpec("결제대기") };
  if (status === "approved") return { label: "취소승인", spec: getPaymentStatusBadgeSpec("환불") };
  if (status === "rejected")
    return { label: "취소거절", spec: getPaymentStatusBadgeSpec("결제대기") };
  return null;
}

function cancelQuickSignalSpec(cancel?: OpItem["cancel"]): {
  label: "계좌확인 필요" | "검토 가능" | "PG 취소대기";
  tone: "warning" | "success";
  tooltipCopy: string;
} | null {
  if (cancel?.status === "approved_pending_pg_cancel") {
    return {
      label: "PG 취소대기",
      tone: "warning",
      tooltipCopy: "NICE 입금 후 취소 완료 여부와 PG 상태 확인이 필요합니다.",
    };
  }
  if (cancel?.status !== "requested") return null;
  if (cancel.refundAccountReady === true) {
    return {
      label: "검토 가능",
      tone: "success",
      tooltipCopy: "환불 계좌 준비가 완료되어 검토 가능합니다.",
    };
  }
  return {
    label: "계좌확인 필요",
    tone: "warning",
    tooltipCopy: "환불 계좌 확인이 필요합니다.",
  };
}

function isActionableSignal(signal: AdminOperationsGroup["signals"][number]) {
  return signal.level !== "info";
}

function visibleSignalSummary(signals: AdminOperationsGroup["signals"], max = 3) {
  const actionableSignals = (signals ?? []).filter(isActionableSignal);
  const visible = actionableSignals.slice(0, max);
  const hiddenCount = Math.max(0, actionableSignals.length - visible.length);
  return { visible, hiddenCount };
}

const thClasses = cn(adminDataTable.head, "border-b border-border/30");
const tdClasses = cn(adminDataTable.cellTop, "border-b border-border/30");
const th = thClasses;
const td = tdClasses;

// 액션 컬럼은 본문 셀이 sticky(right)로 고정되어 있으므로,
// 헤더도 동일하게 sticky 처리해 가로 스크롤 시 컬럼 머리글이 어긋나지 않게 맞춘다.
// 단, header 배경색은 thead의 bg-muted/50과 동일 톤을 써서 "액션"만 색이 달라 보이는 현상을 방지.
const stickyActionHeadClass =
  "sticky right-0 z-20 border-l border-border/60 bg-muted/20 text-right";

export default function OperationsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  /**
   * replaceNoScroll
   * - 필터 변경 시 URL(쿼리스트링)을 동기화하면서도 스크롤을 상단으로 올리지 않기 위한 래퍼 함수.
   * - Next.js App Router의 router.replace는 기본적으로 네비게이션으로 간주되어 스크롤이 튈 수 있음.
   * - { scroll: false } 옵션을 주면 "URL만 변경"하고 현재 스크롤 위치를 유지.
   *
   * useCallback을 쓰는 이유
   * - 이 함수는 컴포넌트 렌더 때마다 새로 생성되면(참조값 변경),
   *   useSyncOperationsQuery 내부의 useEffect/debounce 의존성에 걸려
   *   불필요한 재실행/타이머 리셋이 발생할 수 있음.
   * - useCallback으로 함수 참조를 안정화해서
   *   "필터 값이 바뀔 때만" 의도대로 URL 동기화가 일어나게 함.
   */
  const replaceNoScroll = useCallback(
    (url: string) => {
      router.replace(url, { scroll: false });
    },
    [router],
  );

  const [q, setQ] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [kind, setKind] = useState<"all" | Kind>("all");
  const [flow, setFlow] = useState<FlowValue>("all");
  const [integrated, setIntegrated] = useState<"all" | "1" | "0">("all"); // 1=통합만, 0=단독만
  const [onlyWarn, setOnlyWarn] = useState(false);
  const [warnFilter, setWarnFilter] = useState<
    "all" | "warn" | "caution" | "review" | "pending" | "clean"
  >("all");
  const [warnSort, setWarnSort] = useState<"default" | "warn_first" | "safe_first">("default");
  const [page, setPage] = useState(1);
  const [showActionsGuide, setShowActionsGuide] = useState(false);
  const [isFilterScrolled, setIsFilterScrolled] = useState(false);
  const [displayDensity, setDisplayDensity] = useState<"default" | "compact">("default");
  const [activeQuickView, setActiveQuickView] = useState<OperationsQuickView>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isRefreshingList, setIsRefreshingList] = useState(false);
  const [syncingNiceOrderId, setSyncingNiceOrderId] = useState<string | null>(null);

  const replaceSyncedOperationsUrl = useCallback(
    (url: string) => {
      const [base, query = ""] = url.split("?");
      const params = new URLSearchParams(query);

      appendQuickViewParam(params, activeQuickView);

      const nextQuery = params.toString();
      replaceNoScroll(nextQuery ? `${base}?${nextQuery}` : base);
    },
    [activeQuickView, replaceNoScroll],
  );

  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const defaultPageSize = 50;
  // 주의(오류)만 보기에서는 "놓침"을 줄이기 위해 조회 범위를 넓힘(표시/운영 안전 목적)
  // - API/스키마 변경 없음 (그냥 pageSize 파라미터만 키움)
  const effectivePageSize = onlyWarn ? 200 : defaultPageSize;

  // 상단 CTA: 정산 관리로 빠르게 이동할 수 있도록 지난달(YYYYMM)을 기본 세팅
  const settlementYyyymm = useMemo(() => prevMonthYyyymmKST(), []);
  const settlementsHref = useMemo(
    () => `/admin/settlements?yyyymm=${settlementYyyymm}`,
    [settlementYyyymm],
  );

  // 1) 최초 1회: URL → 상태 주입(새로고침 대응)
  useEffect(() => {
    const queryFromUrl = sp.get("q") ?? "";
    const viewFromUrl = sp.get("view");
    initOperationsStateFromQuery(sp, {
      setQ,
      setKind,
      setFlow,
      setIntegrated,
      setOnlyWarn,
      setWarnFilter,
      setWarnSort,
      setPage,
    });
    const matched = QUICK_VIEWS.find((view) => view.key === viewFromUrl);
    setActiveQuickView(matched?.key ?? "all");
    setInputValue((prev) => (queryFromUrl === q ? prev : queryFromUrl));
  }, [sp]);

  useEffect(() => {
    if (inputValue === q) return;
    const timer = window.setTimeout(() => {
      setQ(inputValue);
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [inputValue, q]);

  useEffect(() => {
    if (!onlyWarn) return;
    if (warnFilter === "warn") return;
    setWarnFilter("warn");
    setPage(1);
  }, [onlyWarn, warnFilter]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setIsFilterScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 2) 상태 → URL 동기화
  /**
   * useSyncOperationsQuery는 필터 상태가 변하면 URL에 반영(쿼리스트링 sync)하는 역할.
   * 검색어(q)는 inputValue -> q 단계에서 먼저 400ms 디바운스가 적용된다.
   * 여기서 replace를 scroll:false 버전으로 넘겨서, 필터 변경 시 화면이 위로 튀지 않게 함.
   */
  useSyncOperationsQuery(
    { q, kind, flow, integrated, onlyWarn, warnFilter, warnSort, page },
    pathname,
    replaceSyncedOperationsUrl,
  );

  // 3) API 키 구성
  const queryString = buildQueryString({
    q: q.trim() || undefined,
    kind,
    flow,
    integrated,
    warnFilter,
    warnSort,
    page,
    pageSize: effectivePageSize,
    warn: onlyWarn ? "1" : undefined,
  });
  const key = `/api/admin/operations?${queryString}`;
  const navigationSummaryKey = "/api/admin/navigation-summary";
  const { cache } = useSWRConfig();
  const navigationSummary = cache.get(navigationSummaryKey)?.data as
    | NavigationSummaryResponse
    | undefined;

  const { data, isLoading, error, mutate } = useSWR<AdminOperationsListResponseDto>(
    key,
    authenticatedSWRFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      dedupingInterval: 30_000,
      keepPreviousData: true,
    },
  );
  const { data: dailySummary, error: dailySummaryError } =
    useSWR<AdminDailyOperationsSummaryResponse>(
      "/api/admin/operations/daily-summary",
      authenticatedSWRFetcher,
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        shouldRetryOnError: false,
        dedupingInterval: 60_000,
      },
    );
  const { data: appsInTossReconciliation, isLoading: isAppsInTossLoading } = useSWR<AppsInTossReconciliationResponse>(
    "/api/admin/apps-in-toss/reconciliation?issueType=all&environment=all&page=1&limit=1",
    authenticatedSWRFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      dedupingInterval: 60_000,
    },
  );
  const totalGroups = data?.pagination?.totalGroups;
  const pageSize = data?.pagination?.pageSize ?? effectivePageSize;
  const totalPages =
    typeof totalGroups === "number" ? Math.max(1, Math.ceil(totalGroups / pageSize)) : null;

  // 서버 groups를 단일 source of truth로 사용한다.
  const groups = useMemo(() => {
    if (!Array.isArray(data?.groups)) return [];
    return data.groups
      .filter((group) => Array.isArray(group.items) && group.items.length > 0)
      .map((group) => {
        const anchor =
          group.items.find(
            (item) => item.id === group.anchorId && item.kind === group.anchorKind,
          ) ?? group.items[0]!;
        const kinds = Array.from(new Set(group.items.map((x) => x.kind))).sort(
          (a, b) => KIND_PRIORITY[a] - KIND_PRIORITY[b],
        );
        return {
          key: group.groupKey,
          anchor,
          createdAt: group.createdAt,
          items: group.items,
          kinds,
          primarySignal: group.primarySignal,
          signals: group.signals ?? [],
          groupReviewLevel: group.groupReviewLevel ?? "none",
          groupNeedsReview: Boolean(group.groupNeedsReview),
          groupQueueBucket: group.groupQueueBucket ?? "clean",
          linkedFlowStatusIssue: group.linkedFlowStatusIssue ?? null,
        };
      });
  }, [data?.groups]);
  const hasResolvedGroups = !isLoading && !error && Array.isArray(data?.groups);
  const groupsToRender = useMemo(() => {
    return groups.map((group) => {
      return {
        ...group,
        warn: group.groupQueueBucket === "urgent" || isWarnGroup(group),
        reviewLevel: group.groupReviewLevel as ReviewLevel,
        needsReview: group.groupNeedsReview,
      };
    });
  }, [groups]);
  const quickViewFilteredGroups = useMemo(() => {
    if (activeQuickView === "all") return groupsToRender;
    return groupsToRender.filter((group) => {
      const items = group.items ?? [];
      switch (activeQuickView) {
        case "today":
          return isTodayQueueGroup(group);
        case "cancelRequests":
          return isCancelRequestedGroup(group);
        case "paymentCheck":
          return hasPaymentCheckNeeded(group);
        case "shippingMissing":
          return hasShippingMissing(group);
        case "rentalDue":
          return hasRentalDue(group);
        case "linkedReview":
          return isLinkedWorkGroup(group);
        default:
          return true;
      }
    });
  }, [activeQuickView, groupsToRender]);
  const shouldShowEmptyState = hasResolvedGroups && quickViewFilteredGroups.length === 0;

  async function handleRefreshList() {
    setIsRefreshingList(true);
    try {
      await mutate();
      showSuccessToast("운영업무 목록을 새로고침했습니다.");
    } catch (error: any) {
      showErrorToast(error?.message || "운영업무 목록 새로고침에 실패했습니다.");
    } finally {
      setIsRefreshingList(false);
    }
  }

  async function handleNicePaymentSync(orderId: string) {
    if (syncingNiceOrderId) return;
    setSyncingNiceOrderId(orderId);
    try {
      const json = await adminMutator<{ success?: boolean; error?: string }>(
        `/api/admin/payments/nice/sync/${orderId}`,
        { method: "POST" },
      );
      if (json?.success === false) {
        throw new Error(json?.error || "PG 상태 확인에 실패했습니다.");
      }
      await mutate();
      showSuccessToast("PG 결제 상태를 확인했습니다.");
    } catch (error: any) {
      showErrorToast(`PG 상태 확인 실패: ${getAdminErrorMessage(error)}`);
    } finally {
      setSyncingNiceOrderId(null);
    }
  }

  const shouldShowGlobalError = Boolean(error) && !Array.isArray(data?.groups);

  const todayTodoCount: AdminOperationsSummary | null =
    data?.summaryAll ?? (data ? { urgent: 0, caution: 0, pending: 0 } : null);

  const shareViewHref = useMemo(() => {
    const qs = buildOperationsViewQueryString({
      q,
      kind,
      flow,
      integrated,
      onlyWarn,
      warnFilter,
      warnSort,
      page,
    });
    const params = new URLSearchParams(qs);
    appendQuickViewParam(params, activeQuickView);
    const nextQs = params.toString();
    return nextQs ? `${pathname}?${nextQs}` : pathname;
  }, [activeQuickView, flow, integrated, kind, onlyWarn, page, pathname, q, warnFilter, warnSort]);
  const shareViewFullHref = useMemo(() => {
    if (typeof window === "undefined") return shareViewHref;
    return `${window.location.origin}${shareViewHref}`;
  }, [shareViewHref]);

  function applyPreset(
    next: Partial<{
      q: string;
      kind: typeof kind;
      flow: typeof flow;
      integrated: typeof integrated;
      warn: boolean;
    }>,
  ) {
    if (next.q !== undefined) {
      setQ(next.q);
      setInputValue(next.q);
    }
    if (next.kind !== undefined) setKind(next.kind);
    if (next.flow !== undefined) setFlow(next.flow);
    if (next.integrated !== undefined) setIntegrated(next.integrated);
    if (next.warn !== undefined) setOnlyWarn(next.warn);
    setPage(1);
  }

  async function copyShareViewLink() {
    await copyToClipboard(shareViewFullHref);
    setShareLinkCopied(true);
    setTimeout(() => setShareLinkCopied(false), 1200);
  }

  function reset() {
    setQ("");
    setInputValue("");
    setKind("all");
    setFlow("all");
    setIntegrated("all");
    setOnlyWarn(false);
    setWarnFilter("all");
    setWarnSort("default");
    setActiveQuickView("all");
    setPage(1);
    /**
     * reset도 URL을 초기화하지만,
     * "초기화 버튼 누를 때마다 화면이 위로 튀는 것"이 싫다면 scroll:false로 동일하게 처리.
     * (만약 reset 시에는 위로 올리고 싶다면 이 줄만 scroll:true로 분리하면 됨)
     */
    router.replace(pathname, { scroll: false });
  }
  function scrollToOperationsList() {
    requestAnimationFrame(() => {
      document.getElementById("operations-list")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function applyQuickView(view: OperationsQuickView) {
    setActiveQuickView(view);
    scrollToOperationsList();
    const nextParams = new URLSearchParams(sp.toString());
    appendQuickViewParam(nextParams, view);
    const nextQuery = nextParams.toString();
    replaceNoScroll(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }

  function clearPresetMode() {
    applyPreset({ integrated: "all", flow: "all", kind: "all", warn: false });
    setWarnFilter("all");
    setWarnSort("default");
  }

  // 프리셋 버튼 "활성" 판정(현재 필터 상태가 프리셋과 일치하는지)
  const presetActive = {
    paymentMismatch: PRESET_CONFIG.paymentMismatch.isActive({
      integrated,
      flow,
      kind,
      onlyWarn,
    }),
    integratedReview: PRESET_CONFIG.integratedReview.isActive({
      integrated,
      flow,
      kind,
      onlyWarn,
    }),
    singleApplication: PRESET_CONFIG.singleApplication.isActive({
      integrated,
      flow,
      kind,
      onlyWarn,
    }),
  };

  const activePresetKey = useMemo(() => {
    if (presetActive.paymentMismatch) return "paymentMismatch" as const;
    if (presetActive.integratedReview) return "integratedReview" as const;
    if (presetActive.singleApplication) return "singleApplication" as const;
    return null;
  }, [presetActive.integratedReview, presetActive.paymentMismatch, presetActive.singleApplication]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (q.trim()) count += 1;
    if (kind !== "all") count += 1;
    if (flow !== "all") count += 1;
    if (integrated !== "all") count += 1;
    if (onlyWarn) count += 1;
    if (warnFilter !== "all") count += 1;
    if (warnSort !== "default") count += 1;
    return count;
  }, [flow, integrated, kind, onlyWarn, q, warnFilter, warnSort]);
  const activeQuickViewMeta = useMemo(
    () => QUICK_VIEWS.find((view) => view.key === activeQuickView) ?? QUICK_VIEWS[0],
    [activeQuickView],
  );

  useEffect(() => {
    if (activeFilterCount > 0) {
      setShowAdvancedFilters(true);
    }
  }, [activeFilterCount]);

  const taskCounts =
    data?.operationSignalCounts ??
    navigationSummary?.operationSignalCounts ??
    navigationSummary?.operationTaskCounts;
  const groupCounts = data?.operationGroupCounts ?? navigationSummary?.operationGroupCounts;
  const representativeTodayCount =
    groupCounts?.todayRepresentativeTasks ??
    dailySummary?.operationGroupCounts?.todayRepresentativeTasks ??
    (todayTodoCount
      ? todayTodoCount.urgent + todayTodoCount.caution + todayTodoCount.pending
      : undefined);
  const representativeTotalCount =
    groupCounts?.totalRepresentativeTasks ??
    dailySummary?.operationGroupCounts?.totalRepresentativeTasks ??
    dailySummary?.remaining.total;
  const practicalTaskCards = useMemo(() => {
    return [
      {
        title: "취소 요청",
        count: taskCounts?.cancelRequests ?? 0,
        description: "취소 요청과 환불 정보를 우선 확인",
        action: "취소 요청 검토",
        onClick: () => applyQuickView("cancelRequests"),
        tone: "danger" as const,
      },
      {
        title: "결제 확인 신호",
        count: taskCounts?.paymentCheck ?? 0,
        description: "입금·결제 확인이 필요한 대표 업무",
        action: "결제 확인 처리",
        onClick: () => applyQuickView("paymentCheck"),
        tone: "warning" as const,
      },
      {
        title: "패키지 결제 확인",
        count: taskCounts?.packagePaymentCheck ?? 0,
        description: "입금 확인 후 이용권 활성화",
        action: "패키지 결제 확인",
        onClick: () => {
          router.push("/admin/packages?preset=payment-check");
        },
        tone: "warning" as const,
      },
      {
        title: "배송/반송 정보 신호",
        count: taskCounts?.shippingMissing ?? 0,
        description: "운송장·방문 수령 정보 등록 필요",
        action: "운송장 등록 필요",
        onClick: () => applyQuickView("shippingMissing"),
        tone: "warning" as const,
      },
      {
        title: "교체 작업 단계 신호",
        count: taskCounts?.stringingWork ?? 0,
        description: "교체 작업 진행 단계 확인",
        action: "교체 단계 처리",
        onClick: () => {
          setKind("stringing_application");
          setPage(1);
        },
        tone: "info" as const,
      },
      {
        title: "대여 반납",
        count: taskCounts?.rentalDue ?? 0,
        description: "반납·연체·보증금 환불 확인",
        action: "바로 처리",
        onClick: () => applyQuickView("rentalDue"),
        tone: "warning" as const,
      },
      {
        title: "연결 오류 확인",
        count: taskCounts?.linkedReview ?? 0,
        description: "연결 문서 상태 불일치 점검",
        action: "바로 처리",
        onClick: () => applyQuickView("linkedReview"),
        tone: "warning" as const,
      },
    ];
  }, [router, taskCounts]);

  const activeKpi = useMemo(() => {
    if (warnFilter === "warn") return "urgent";
    if (warnFilter === "caution") return "caution";
    if (warnFilter === "pending") return "pending";
    return null;
  }, [warnFilter]);

  const dailySummaryValue = (value?: number) =>
    typeof value === "number" ? `${value.toLocaleString("ko-KR")}건` : "-";
  const dailySummaryInlineValue = (label: string, value?: number) =>
    `${label} ${typeof value === "number" ? value.toLocaleString("ko-KR") : "-"}`;
  const dailySummaryStatusMessage = dailySummaryError
    ? "마감 요약을 불러오지 못했습니다. 기존 업무 목록은 계속 사용할 수 있습니다."
    : dailySummary
      ? dailySummary.attention.message
      : "불러오는 중...";

  return (
    <AdminPageShell variant="wide">
      {shouldShowGlobalError && (
        <AsyncState
          kind="error"
          tone="admin"
          variant="inline"
          resourceName="운영 데이터"
          className="mb-3"
          onAction={() => {
            void mutate();
          }}
        />
      )}
      {/* 페이지 헤더 */}
      <div className="w-full">
        <AdminPageHeader
          variant="compact"
          title={PAGE_COPY.title}
          description={PAGE_COPY.description}
          icon={Inbox}
          scope="운영 통합 센터"
          helperText="긴급 업무부터 확인하고 바로 처리할 수 있습니다."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={isRefreshingList}
                onClick={() => {
                  void handleRefreshList();
                }}
              >
                <RefreshCw
                  className={cn("mr-1.5 h-3.5 w-3.5", isRefreshingList && "animate-spin")}
                />
                {isRefreshingList ? "새로고침 중..." : "목록 새로고침"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setShowActionsGuide((prev) => !prev)}
              >
                {showActionsGuide ? "도움말 닫기" : "도움말 보기"}
              </Button>
            </div>
          }
        />

        {showActionsGuide && (
          <dl className={cn(adminSurface.fieldPanelMuted, "space-y-1.5")}>
            {PAGE_COPY.actions.map((action) => (
              <div key={action.title} className="flex flex-wrap gap-x-2">
                <dt className={adminTypography.panelTitle}>{action.title}</dt>
                <dd className={cn("min-w-0 flex-1", adminTypography.body)}>{action.description}</dd>
              </div>
            ))}
          </dl>
        )}

        <Section variant="plain" className="mt-3 space-y-2">
          <SectionHeader
            title="지금 확인할 업무"
            className="border-0 bg-transparent px-0 py-0"
            aside={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className={adminTypography.bodyStrong}>
                  처리 필요 총 {dailySummaryValue(representativeTotalCount ?? representativeTodayCount)}
                </span>
                <Button type="button" size="sm" variant="outline" onClick={() => applyQuickView("today")}>
                  오늘 업무 보기
                </Button>
              </div>
            }
          />
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <AdminSummaryCard
              title={PAGE_COPY.dailyTodoLabels.urgent}
              value={todayTodoCount ? `${todayTodoCount.urgent}건` : "-"}
              description="오류 또는 긴급 확인이 필요한 항목"
              icon={Siren}
              tone="danger"
              compact
              active={activeKpi === "urgent"}
              onAction={() => {
                setWarnFilter("warn");
                setOnlyWarn(false);
                setPage(1);
                scrollToOperationsList();
              }}
            />
            <AdminSummaryCard
              title={PAGE_COPY.dailyTodoLabels.caution}
              value={todayTodoCount ? `${todayTodoCount.caution}건` : "-"}
              description="운영자 확인이 필요한 항목"
              icon={BellRing}
              tone="warning"
              compact
              active={activeKpi === "caution"}
              onAction={() => {
                setOnlyWarn(false);
                setWarnFilter("caution");
                setPage(1);
                scrollToOperationsList();
              }}
            />
            <AdminSummaryCard
              title={PAGE_COPY.dailyTodoLabels.pending}
              value={todayTodoCount ? `${todayTodoCount.pending}건` : "-"}
              description="아직 처리가 시작되지 않은 항목"
              icon={ClipboardCheck}
              tone="info"
              compact
              active={activeKpi === "pending"}
              onAction={() => {
                setOnlyWarn(false);
                setWarnFilter("pending");
                setPage(1);
                scrollToOperationsList();
              }}
            />
          </div>
        </Section>

        <details className={cn(adminSurface.card, "mt-3 overflow-hidden")}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-ui-body-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              업무 참고
            </span>
            <span className="text-ui-label font-normal text-muted-foreground">
              대표 업무 합계에 더하지 않는 유형별 참고 신호 · 필요할 때 펼쳐 확인
            </span>
          </summary>
          <div className="space-y-4 border-t border-border/60 p-3">
            <section aria-labelledby="operation-reference-types">
              <h2 id="operation-reference-types" className={adminTypography.panelTitle}>
                업무 유형별 현황
              </h2>
              <p className={cn("mt-1", adminTypography.metaMuted)}>
                상단 대표 업무 합계와 별도로 확인하는 운영 신호입니다.
              </p>
              <div className="mt-2 space-y-1.5">
                {!taskCounts || isAppsInTossLoading ? (
                  <p className={adminTypography.metaMuted}>확인 중</p>
                ) : practicalTaskCards.filter((task) => task.count > 0).length === 0 &&
                  (taskCounts.offline ?? 0) === 0 &&
                  (appsInTossReconciliation?.summary.total ?? 0) === 0 &&
                  (taskCounts.academyApplications ?? 0) === 0 ? (
                  <p className={adminTypography.metaMuted}>
                    별도 확인이 필요한 업무 유형이 없습니다.
                  </p>
                ) : (
                  [
                    ...practicalTaskCards,
                    {
                      title: "오프라인 미결제/보정",
                      count: taskCounts.offline ?? 0,
                      description: "미결제·발급 실패·보정 필요 확인",
                      action: "미결제 보정",
                      href: "/admin/offline/reconciliation",
                      tone: "warning" as const,
                    },
                    {
                      title: "Apps in Toss 결제 점검",
                      count: appsInTossReconciliation?.summary.total ?? 0,
                      description: "토스 앱 결제 중 자동 처리 미완료·대사 필요 건 확인",
                      action: "결제 점검 열기",
                      href: "/admin/operations/apps-in-toss-reconciliation",
                      tone: "warning" as const,
                    },
                    {
                      title: "아카데미 상담",
                      count: taskCounts.academyApplications ?? 0,
                      description: "상담 대기·등록 확정 대기 확인",
                      action: "상담 대기 확인",
                      href: "/admin/academy/applications",
                      tone: "info" as const,
                    },
                  ]
                    .filter((task) => task.count > 0)
                    .map((task) => (
                      <div
                        key={task.title}
                        className="flex min-w-0 flex-wrap items-center gap-2 rounded-md border border-border/60 bg-background/50 px-3 py-2"
                      >
                        <div className="min-w-[min(100%,18rem)] flex-1">
                          <p className={cn("break-words", adminTypography.panelTitle)}>{task.title}</p>
                          <p className={cn("break-words", adminTypography.metaMuted)}>
                            {task.description}
                          </p>
                        </div>
                        <Badge variant={task.tone} className="shrink-0 whitespace-nowrap">
                          {task.count.toLocaleString("ko-KR")}건
                        </Badge>
                        {"href" in task && task.href ? (
                          <Button asChild size="sm" variant="outline" className="w-fit shrink-0">
                            <Link href={task.href}>{task.action}</Link>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="w-fit shrink-0"
                            onClick={"onClick" in task ? task.onClick : undefined}
                          >
                            {task.action}
                          </Button>
                        )}
                      </div>
                    ))
                )}
              </div>
            </section>

            <section aria-labelledby="operation-processing-order">
              <h2 id="operation-processing-order" className={adminTypography.panelTitle}>
                처리 순서
              </h2>
              <ol className={cn("mt-2 space-y-1.5", adminTypography.metaMuted)}>
                <li><span className="font-semibold text-foreground">1. 주의 업무</span> — 취소 요청과 결제 확인을 먼저 처리합니다.</li>
                <li><span className="font-semibold text-foreground">2. 패키지</span> — 패키지 결제 확인은 패키지 목록에서 분리 확인합니다.</li>
                <li><span className="font-semibold text-foreground">3. 배송·교체</span> — 배송/반송 미등록과 교체 작업 단계를 확인합니다.</li>
                <li><span className="font-semibold text-foreground">4. 마감 업무</span> — 대여 반납, 오프라인 보정, 상담 대기를 마감합니다.</li>
              </ol>
            </section>

            <section aria-labelledby="operation-daily-close">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="operation-daily-close" className={adminTypography.panelTitle}>
                  오늘 업무 마감
                </h2>
                <Badge variant="neutral">{dailySummary?.date ?? "오늘"}</Badge>
              </div>
              <dl className="mt-2 divide-y divide-border/60 rounded-md border border-border/60 bg-background/50 px-3">
                <div className="flex flex-wrap justify-between gap-2 py-2">
                  <dt className={adminTypography.bodyStrong}>오늘 상태 변경 참고</dt>
                  <dd className="min-w-0 text-right">
                    <span className={adminTypography.kpiValue}>{dailySummaryValue(dailySummary?.completedToday.total)}</span>
                    <p className={adminTypography.metaMuted}>
                      {dailySummary
                        ? [
                            dailySummaryInlineValue("주문", dailySummary.completedToday.orders),
                            dailySummaryInlineValue("교체", dailySummary.completedToday.stringingApplications),
                            dailySummaryInlineValue("대여", dailySummary.completedToday.rentals),
                            dailySummaryInlineValue("오프라인", dailySummary.completedToday.offline),
                            dailySummaryInlineValue("아카데미", dailySummary.completedToday.academyApplications),
                          ].join(" · ")
                        : dailySummaryError ? "요약을 불러오지 못했습니다." : "불러오는 중..."}
                    </p>
                  </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2 py-2">
                  <dt className={adminTypography.bodyStrong}>남은 대표 업무</dt>
                  <dd className="min-w-0 text-right">
                    <span className={adminTypography.kpiValue}>
                      {dailySummaryValue(dailySummary?.operationGroupCounts?.totalRepresentativeTasks ?? representativeTotalCount)}
                    </span>
                    <p className={adminTypography.metaMuted}>
                      {dailySummary
                        ? [
                            dailySummaryInlineValue("취소", dailySummary.remaining.cancelRequests),
                            dailySummaryInlineValue("결제", dailySummary.remaining.paymentCheck),
                            dailySummaryInlineValue("배송", dailySummary.remaining.shippingMissing),
                            dailySummaryInlineValue("교체", dailySummary.remaining.stringingWork),
                            dailySummaryInlineValue("반납", dailySummary.remaining.rentalDue),
                          ].join(" · ")
                        : dailySummaryError ? "요약을 불러오지 못했습니다." : "불러오는 중..."}
                    </p>
                  </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2 py-2">
                  <dt className={adminTypography.bodyStrong}>확인 항목</dt>
                  <dd className="text-right">
                    <span className={adminTypography.kpiValue}>
                      {dailySummaryValue(dailySummary?.remaining.packagePaymentCheck ?? taskCounts?.packagePaymentCheck)}
                    </span>
                    <p className={adminTypography.metaMuted}>패키지 처리 대상은 전체 대표 업무 합계에 포함됩니다.</p>
                  </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2 py-2">
                  <dt className={adminTypography.bodyStrong}>마감 전 확인</dt>
                  <dd className="min-w-0 text-right">
                    <p className={adminTypography.bodyStrong}>
                      긴급 {dailySummaryValue(dailySummary?.attention.urgentRemaining)} / 확인 {dailySummaryValue(dailySummary?.attention.watchRemaining)}
                    </p>
                    <p className={cn(dailySummaryError ? "text-warning" : "text-muted-foreground", adminTypography.meta)}>
                      {dailySummaryStatusMessage}
                    </p>
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => applyQuickView("cancelRequests")}>긴급 업무 보기</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => applyQuickView("all")}>남은 업무 보기</Button>
                    </div>
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </details>

        <div className="mt-2 space-y-2">
          <AdminFilterBar
            className="bg-card shadow-none"
            quickFilters={QUICK_VIEWS.map((view) => (
              <Button
                key={view.key}
                type="button"
                size="sm"
                variant={activeQuickView === view.key ? "default" : "outline"}
                aria-pressed={activeQuickView === view.key}
                onClick={() => applyQuickView(view.key)}
              >
                {view.label}
              </Button>
            ))}
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className={adminTypography.panelTitle}>빠른 보기</p>
                <Badge variant="outline">{activeQuickViewMeta.label}</Badge>
              </div>
            </div>
          </AdminFilterBar>
          <section className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
            <h2 className="text-ui-body-sm font-semibold text-foreground">주의 항목 정밀 검수</h2>
            <p className={cn("mt-1", adminTypography.metaMuted)}>
              결제 불일치, 연결 검수, 단독 신청처럼 추가 확인이 필요한 신호만 좁혀 봅니다.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant={presetActive.paymentMismatch ? "default" : "outline"}
                size="sm"
                aria-pressed={presetActive.paymentMismatch}
                onClick={() => applyPreset(PRESET_CONFIG.paymentMismatch.params)}
                className={cn(
                  "h-9 min-h-9 px-3 text-xs font-semibold",
                  presetActive.paymentMismatch
                    ? "border-primary/70 bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background text-foreground hover:bg-muted/70",
                )}
              >
                {PRESET_CONFIG.paymentMismatch.label}
              </Button>
              <Button
                type="button"
                variant={presetActive.integratedReview ? "default" : "outline"}
                size="sm"
                aria-pressed={presetActive.integratedReview}
                onClick={() => applyPreset(PRESET_CONFIG.integratedReview.params)}
                className={cn(
                  "h-9 min-h-9 px-3 text-xs font-semibold",
                  presetActive.integratedReview
                    ? "border-primary/70 bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background text-foreground hover:bg-muted/70",
                )}
              >
                {PRESET_CONFIG.integratedReview.label}
              </Button>
              <Button
                type="button"
                variant={presetActive.singleApplication ? "default" : "outline"}
                size="sm"
                aria-pressed={presetActive.singleApplication}
                onClick={() => applyPreset(PRESET_CONFIG.singleApplication.params)}
                className={cn(
                  "h-9 min-h-9 px-3 text-xs font-semibold",
                  presetActive.singleApplication
                    ? "border-primary/70 bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background text-foreground hover:bg-muted/70",
                )}
              >
                {PRESET_CONFIG.singleApplication.label}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearPresetMode}
                className="h-9 min-h-9 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                전체 보기
              </Button>
            </div>
          </section>
        </div>
      </div>

      {/* 필터 및 검색 카드 */}
      <div
        className={cn(
          "top-3 z-30 mb-2 transition-all duration-200",
          isFilterScrolled && "shadow-sm",
        )}
      >
        <Card
          className={cn(
            "rounded-xl border-border px-3 py-2 shadow-sm transition-all duration-200",
            onlyWarn
              ? "bg-warning/5 border-warning/20 dark:bg-warning/10 dark:border-warning/30"
              : "bg-card",
            isFilterScrolled && adminSurface.stickyToolbar,
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between gap-3 p-0">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-ui-body-sm">고급 필터</CardTitle>
                {activeFilterCount > 0 ? (
                  <Badge className={cn(badgeBase, badgeSizeSm, badgeToneClass("brand"))}>
                    적용 {activeFilterCount}개
                  </Badge>
                ) : null}
              </div>
              {showAdvancedFilters ? (
                <CardDescription className="mt-0.5 text-ui-label">
                  고객, 문서 ID, 운영 흐름과 문제 유형을 직접 좁힙니다.
                </CardDescription>
              ) : null}
              {error && !shouldShowGlobalError && (
                <p className={cn("mt-1", adminTypography.warning)}>
                  검색 결과를 새로 불러오지 못해 이전 결과를 유지 중입니다. 잠시 후 다시 시도해
                  주세요.
                </p>
              )}
            </div>

            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters((prev) => !prev)}
                className="bg-transparent"
              >
                {showAdvancedFilters ? "고급 필터 닫기" : "고급 필터 열기"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={reset}
                className="bg-transparent"
              >
                필터 초기화
              </Button>
            </div>
          </CardHeader>
          {showAdvancedFilters && (
            <CardContent className="space-y-3 px-0 pb-1 pt-3">
              {/* 검색 + 주요 버튼 */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="search"
                    className="pl-8 text-xs h-9 w-full"
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                    }}
                    placeholder="ID, 고객명, 이메일, 요약(상품명/모델명) 검색..."
                  />
                </div>

                <Button
                  type="button"
                  variant={onlyWarn ? "default" : "outline"}
                  size="sm"
                  title={onlyWarn ? "주의(오류) 항목만 조회 중" : "주의(오류) 항목만 모아보기"}
                  className={cn("h-9", !onlyWarn && "bg-transparent")}
                  onClick={() => {
                    setOnlyWarn((v) => {
                      const next = !v;
                      if (next) setWarnFilter("warn");
                      return next;
                    });
                    setPage(1);
                  }}
                >
                  주의(오류)만 보기
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 bg-transparent"
                  onClick={copyShareViewLink}
                >
                  <Link2 className="mr-1.5 h-4 w-4" />
                  {shareLinkCopied ? "링크 복사됨" : "현재 뷰 링크 복사"}
                </Button>

                <Button asChild variant="outline" size="sm" className="h-9 bg-transparent">
                  <Link href={settlementsHref}>정산 관리</Link>
                </Button>
              </div>

              {/* 필터 컴포넌트들 */}
              <div className="grid w-full grid-cols-1 gap-2 border-t border-border pt-2.5 md:grid-cols-2 xl:grid-cols-5">
                <Select
                  value={kind}
                  onValueChange={(v: any) => {
                    setKind(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full min-w-0 text-left">
                    <SelectValue placeholder="종류(전체)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">종류(전체)</SelectItem>
                    <SelectItem value="order">주문</SelectItem>
                    <SelectItem value="stringing_application">신청서</SelectItem>
                    <SelectItem value="rental">대여</SelectItem>
                    <SelectItem value="package_purchase">패키지 구매</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={flow}
                  onValueChange={(v: any) => {
                    setFlow(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full min-w-0 text-left">
                    <SelectValue placeholder="운영 흐름(전체)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">운영 흐름(전체)</SelectItem>
                    <SelectItem value="1">레거시 · 스트링 단품 구매</SelectItem>
                    <SelectItem value="2">스트링 구매 + 교체서비스 신청(통합)</SelectItem>
                    <SelectItem value="3">교체서비스 단일 신청</SelectItem>
                    <SelectItem value="4">레거시 · 라켓 단품 구매</SelectItem>
                    <SelectItem value="5">
                      라켓 구매 + 스트링 선택 + 교체서비스 신청(통합)
                    </SelectItem>
                    <SelectItem value="6">레거시 · 라켓 단품 대여</SelectItem>
                    <SelectItem value="7">
                      라켓 대여 + 스트링 선택 + 교체서비스 신청(통합)
                    </SelectItem>
                    <SelectItem value="8">패키지 구매</SelectItem>
                  </SelectContent>
                </Select>
                <p
                  className={cn(
                    "w-full md:col-span-2 xl:col-span-5",
                    adminTypography.metaMuted,
                  )}
                >
                  레거시 유형은 기존 데이터 확인용이며 신규 접수 흐름은 현재 운영하지 않습니다.
                </p>

                <Select
                  value={integrated}
                  onValueChange={(v: any) => {
                    setIntegrated(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full min-w-0 text-left">
                    <SelectValue placeholder="연결(전체)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">연결(전체)</SelectItem>
                    <SelectItem value="1">통합(연결됨)</SelectItem>
                    <SelectItem value="0">단독</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={warnFilter}
                  onValueChange={(v: any) => {
                    if (onlyWarn && v !== "warn") return;
                    setWarnFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full min-w-0 text-left">
                    <SelectValue placeholder="문제 유형 필터" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="warn">주의만</SelectItem>
                    <SelectItem value="caution" disabled={onlyWarn}>
                      확인 필요 항목
                    </SelectItem>
                    <SelectItem value="review" disabled={onlyWarn}>
                      확인 필요만
                    </SelectItem>
                    <SelectItem value="pending" disabled={onlyWarn}>
                      미처리만
                    </SelectItem>
                    <SelectItem value="clean" disabled={onlyWarn}>
                      정상 항목만
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select value={warnSort} onValueChange={(v: any) => setWarnSort(v)}>
                  <SelectTrigger className="w-full min-w-0 text-left">
                    <SelectValue placeholder="우선순위 정렬" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">우선순위 정렬(기본)</SelectItem>
                    <SelectItem value="warn_first">주의 우선</SelectItem>
                    <SelectItem value="safe_first">정상 항목 우선</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {activePresetKey && (
                <div className="mt-1 grid grid-cols-1 gap-2 rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs text-muted-foreground lg:grid-cols-3">
                  <div>
                    <p className={cn("mb-1", adminTypography.caution)}>현재 결과</p>
                    <p className="text-sm font-medium text-foreground">
                      {typeof totalGroups === "number"
                        ? `${totalGroups.toLocaleString("ko-KR")}건`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className={cn("mb-1", adminTypography.caution)}>우선 처리 이유</p>
                    <p>{PRESET_CONFIG[activePresetKey].helperText}</p>
                  </div>
                  <div>
                    <p className={cn("mb-1", adminTypography.caution)}>다음 처리</p>
                    <p>{PRESET_CONFIG[activePresetKey].nextAction}</p>
                  </div>
                </div>
              )}
              <div className="pt-1">
                <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5 text-xs leading-relaxed text-muted-foreground/90">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                  <span>
                    상태 배지는 목록에 보이는 <strong>주의 / 확인 필요</strong>만 사용합니다. 운영
                    흐름은 각 행 텍스트를 직접 확인하세요.
                  </span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* 업무 목록 카드 */}
      <Card className={adminSurface.tableCard}>
        <CardHeader
          id="operations-list"
          className="scroll-mt-6 border-b border-border bg-muted/15 px-4 py-2.5"
        >
          <div className="flex gap-2 flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className={adminTypography.sectionTitle}>업무 목록</CardTitle>
              {activePresetKey && (
                <Badge className={cn(badgeBase, badgeSizeSm, badgeToneClass("brand"))}>
                  {PRESET_CONFIG[activePresetKey].label}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {typeof totalGroups === "number"
                  ? `총 ${totalGroups.toLocaleString("ko-KR")}건 · ${totalPages ? `${page}/${totalPages}페이지` : "페이지 계산 중"}`
                  : "목록을 불러오는 중…"}
              </p>
                <span className="inline text-xs text-muted-foreground">
                  표시 정보
              </span>
              <div className="inline-flex items-center rounded-md border border-border p-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant={displayDensity === "default" ? "secondary" : "ghost"}
                  className="h-6 px-2 text-xs"
                  onClick={() => setDisplayDensity("default")}
                  aria-pressed={displayDensity === "default"}
                >
                  기본
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={displayDensity === "compact" ? "secondary" : "ghost"}
                  className="h-6 px-2 text-xs"
                  onClick={() => setDisplayDensity("compact")}
                  aria-pressed={displayDensity === "compact"}
                >
                  핵심만
                </Button>
              </div>
              {(activeQuickView !== "all" || activeFilterCount > 0) && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={reset}
                >
                  필터 초기화
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent
          className={cn(
            "p-0",
            isLoading ? "min-h-[240px]" : "min-h-0",
          )}
        >
          {isLoading ? (
            <div>
              <div className="overflow-x-auto">
                <Table className="min-w-[1060px] table-fixed">
                  <TableHeader>
                    <TableRow className={adminSurface.tableRow}>
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <TableHead key={idx} className={thClasses}>
                          <Skeleton className="h-4 w-24" />
                        </TableHead>
                      ))}
                      <TableHead className={cn(thClasses, stickyActionHeadClass, "w-[120px]")}>
                        <Skeleton className="ml-auto h-4 w-16" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <TableRow key={idx}>
                        {Array.from({ length: 4 }).map((_, cellIndex) => (
                          <TableCell key={cellIndex} className={cn(tdClasses, "py-5")}>
                            <Skeleton className="h-5 w-3/4" />
                          </TableCell>
                        ))}
                        <TableCell
                          className={cn(
                            tdClasses,
                            "sticky right-0 z-10 border-l border-border/60 bg-background px-2 py-4",
                          )}
                        >
                          <Skeleton className="ml-auto h-8 w-20" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="min-w-[1010px] table-fixed">
                  <TableHeader>
                    <TableRow className={adminSurface.tableRow}>
                      <TableHead className={cn(thClasses, "w-[150px]")}>주의 / 경과</TableHead>
                      <TableHead className={cn(thClasses, "w-[270px]")}>업무</TableHead>
                      <TableHead className={cn(thClasses, "w-[240px]")}>고객 / 문서</TableHead>
                      <TableHead className={cn(thClasses, "w-[220px]")}>상태 / 금액</TableHead>
                      <TableHead className={cn(thClasses, stickyActionHeadClass, "w-[120px]")}>
                        조치
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quickViewFilteredGroups.map((g, idx) => {
                      const isGroup = g.items.length > 1;
                      const anchorKey = `${g.anchor.kind}:${g.anchor.id}`;
                      const children = g.items.filter((x) => `${x.kind}:${x.id}` !== anchorKey);
                      const groupGuide = inferNextActionForOperationGroup(g.items);
                      const warn = g.warn;
                      const groupCancelRequested = g.items.some(
                        (it) => it.cancel?.status === "requested",
                      );
                      const priorityMeta = getOperationPriorityMeta({
                        warn,
                        reviewLevel: g.reviewLevel,
                        groupCancelRequested,
                      });
                      const nextActionText = groupNextActionText({
                        guide: groupGuide,
                        anchor: g.anchor,
                        cancelRequested: groupCancelRequested,
                        reviewLevel: g.reviewLevel,
                      });
                      const customerName = g.anchor.customer?.name?.trim() || "";
                      const customerEmail = g.anchor.customer?.email?.trim() || "";
                      const docLabel = `${opsKindLabel(g.anchor.kind)} · ${shortenId(g.anchor.id)}`;
                      const scenarioLabel = flowLabelText(g.anchor);
                      const createdAtLabel = formatKST(g.anchor.createdAt ?? g.createdAt);
                      const elapsedHours = getElapsedHours(g.createdAt ?? g.anchor.createdAt);
                      const elapsedText = formatElapsedText(elapsedHours);
                      const slaLevel = resolveOperationsSlaLevel({
                        groupQueueBucket: g.groupQueueBucket,
                        createdAt: g.createdAt ?? g.anchor.createdAt,
                        hasCancel: groupCancelRequested,
                        hasPayment: hasPaymentCheckNeeded(g),
                        hasShipping: hasShippingMissing(g),
                        hasRental: hasRentalDue(g),
                      });
                      const displayedPriorityMeta =
                        slaLevel === "urgent" && priorityMeta.label !== "즉시 처리"
                          ? {
                              label: "긴급",
                              description: "SLA 긴급 기준 초과",
                              tone: "warning" as const,
                            }
                          : priorityMeta.label === "정상" && slaLevel === "watch"
                            ? {
                                label: "확인 필요",
                                description: "SLA 확인 기준 초과",
                                tone: "info" as const,
                              }
                            : priorityMeta;
                      const headline = statusHeadlineOf(g.anchor);
                      const workflowStatusLabel =
                        g.anchor.statusDisplayLabel ?? g.anchor.statusLabel ?? "상태 확인";
                      const paymentStatusLabel =
                        g.anchor.paymentDisplayLabel ?? g.anchor.paymentLabel ?? "";
                      const isDuplicatePaymentStatus =
                        Boolean(paymentStatusLabel) &&
                        normalizeOperationStatusLabel(workflowStatusLabel) ===
                          normalizeOperationStatusLabel(paymentStatusLabel);
                      const workflowStatusBadgeSpec =
                        g.anchor.kind === "order"
                          ? getOrderStatusBadgeSpec(g.anchor.statusLabel ?? workflowStatusLabel)
                          : g.anchor.kind === "rental"
                            ? getRentalStatusBadgeSpec(g.anchor.statusLabel ?? workflowStatusLabel)
                            : g.anchor.kind === "stringing_application"
                              ? getApplicationStatusBadgeSpec(
                                  g.anchor.statusLabel ?? workflowStatusLabel,
                                )
                              : { variant: "neutral" as const };

                      const anchorCancelQuickSignal = cancelQuickSignalSpec(g.anchor.cancel);

                      const rowDensityClass = displayDensity === "compact" ? "py-1.5" : "py-2.5";
                      const primarySignal = visibleSignalSummary(g.signals, 1).visible[0];
                      const cancelBadge = cancelBadgeSpec(g.anchor.cancel?.status);
                      const exceptionLabel =
                        anchorCancelQuickSignal?.label ??
                        (g.anchor.needsStringingApplication ? "교체 신청서 미접수" : null) ??
                        (primarySignal ? toOperatorSentence(primarySignal.title) : null) ??
                        cancelBadge?.label ??
                        null;
                      const rowBaseToneClass = idx % 2 === 0 ? "bg-background" : "bg-muted/[0.12]";
                      const warnEmphasisClass = warn
                        ? "border-l-2 border-l-warning/60 bg-warning/[0.08]"
                        : "border-l-2 border-l-transparent";
                      const stickyActionCellClass = cn(
                        "sticky right-0 z-10 border-l border-border/60",
                        rowBaseToneClass,
                        "group-hover:bg-muted/40",
                      );

                      return (
                        <Fragment key={g.key}>
                          <TableRow
                            className={cn(
                              "group transition-colors hover:bg-muted/40",
                              rowBaseToneClass,
                              warnEmphasisClass,
                            )}
                          >
                            <TableCell className={cn(tdClasses, rowDensityClass)}>
                              <div className={adminDataTable.cellStack}>
                                {displayedPriorityMeta.label !== "정상" ? (
                                  <Badge
                                    className={cn(
                                      badgeBase,
                                      badgeSizeSm,
                                      badgeToneClass(displayedPriorityMeta.tone),
                                    )}
                                  >
                                    {displayedPriorityMeta.label}
                                  </Badge>
                                ) : null}
                                {elapsedText ? (
                                  <span
                                    className={cn(
                                      "block",
                                      slaLevel === "normal"
                                        ? adminDataTable.secondaryText
                                        : adminDataTable.attentionText,
                                    )}
                                    title="접수 시점 기준 경과 시간입니다."
                                  >
                                    {elapsedText}
                                  </span>
                                ) : null}
                                {displayDensity === "default" ? (
                                  <span className={adminDataTable.secondaryLine}>{createdAtLabel}</span>
                                ) : null}
                              </div>
                            </TableCell>

                            <TableCell className={cn(tdClasses, rowDensityClass)}>
                              <div className="min-w-0 space-y-1">
                                <p className={cn("line-clamp-2", adminDataTable.primaryText)}>
                                  {headline}
                                </p>
                                {displayDensity === "default" ? (
                                  <p
                                    className={adminDataTable.secondaryLine}
                                    title={`${opsKindLabel(g.anchor.kind)} · ${scenarioLabel}`}
                                  >
                                    {opsKindLabel(g.anchor.kind)} · {scenarioLabel}
                                    {isGroup ? ` · 연결 ${g.items.length}건` : ""}
                                  </p>
                                ) : null}
                              </div>
                            </TableCell>

                            <TableCell className={cn(tdClasses, rowDensityClass)}>
                              <div className={adminDataTable.cellStack}>
                                <span className={cn("block truncate", adminDataTable.primaryText)}>
                                  {customerName || "-"}
                                </span>
                                <span className={cn(adminDataTable.secondaryLine, "font-mono")}>
                                  {docLabel}
                                </span>
                                <AdminReferencePopover
                                  title="업무 참조 정보"
                                  trigger={
                                    <button type="button" className={adminDataTable.referenceTrigger}>
                                      참조 정보
                                    </button>
                                  }
                                  items={[
                                    {
                                      label: "문서 ID",
                                      value: g.anchor.id,
                                      copyValue: g.anchor.id,
                                    },
                                    {
                                      label: "이메일",
                                      value: customerEmail || null,
                                      copyValue: customerEmail || undefined,
                                    },
                                    ...(children.map((item, itemIndex) => ({
                                      label: `연결 문서${children.length > 1 ? ` ${itemIndex + 1}` : ""}`,
                                      value: item.id,
                                      href: item.href,
                                      copyValue: item.id,
                                    })) ?? []),
                                    {
                                      label: "결제",
                                      value: g.anchor.paymentDisplayLabel ?? g.anchor.paymentLabel ?? null,
                                    },
                                    { label: "금액", value: won(g.anchor.amount) },
                                  ]}
                                />
                              </div>
                            </TableCell>

                            <TableCell className={cn(tdClasses, rowDensityClass)}>
                              <div className={adminDataTable.cellStack}>
                                {!isDuplicatePaymentStatus ? (
                                  <Badge
                                    variant={workflowStatusBadgeSpec.variant}
                                    className={cn(badgeBase, badgeSizeSm)}
                                  >
                                    {workflowStatusLabel}
                                  </Badge>
                                ) : null}
                                {paymentStatusLabel ? (
                                  <Badge
                                    variant={
                                      g.anchor.paymentStateKind === "paid"
                                        ? "success"
                                        : g.anchor.paymentStateKind === "bank_pending" ||
                                            g.anchor.paymentStateKind === "pg_pending" ||
                                            g.anchor.paymentStateKind === "pending"
                                          ? "warning"
                                          : g.anchor.paymentStateKind === "canceled" ||
                                              g.anchor.paymentStateKind === "refunded" ||
                                              g.anchor.paymentStateKind === "failed"
                                            ? "danger"
                                            : "info"
                                    }
                                  >
                                    {paymentStatusLabel}
                                  </Badge>
                                ) : null}
                                <span className={adminTypography.money}>{won(g.anchor.amount)}</span>
                                {exceptionLabel ? (
                                  <p
                                    className={adminDataTable.attentionText}
                                    title={primarySignal ? toOperatorSentence(primarySignal.description) : undefined}
                                  >
                                    {exceptionLabel}
                                  </p>
                                ) : null}
                              </div>
                            </TableCell>

                            <TableCell
                              className={cn(
                                tdClasses,
                                rowDensityClass,
                                "px-2 text-right",
                                stickyActionCellClass,
                              )}
                            >
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  asChild
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 whitespace-nowrap px-2 text-ui-label font-medium text-foreground/80 hover:bg-muted/50 hover:text-foreground focus-visible:ring-2"
                                  title={nextActionText}
                                >
                                  <Link href={g.anchor.href}>상세 확인</Link>
                                </Button>
                                {g.anchor.canSyncNicePayment ? (
                                  <AdminRowActionMenu ariaLabel={`${docLabel} 부가 작업 메뉴 열기`}>
                                    <DropdownMenuItem
                                      className="whitespace-nowrap"
                                      title="NICEPAY의 현재 결제 상태를 다시 조회합니다."
                                      disabled={syncingNiceOrderId === g.anchor.id}
                                      onClick={() => {
                                        void handleNicePaymentSync(g.anchor.id);
                                      }}
                                    >
                                      <CreditCard className="mr-2 h-4 w-4" />
                                      {syncingNiceOrderId === g.anchor.id
                                        ? "확인 중..."
                                        : "PG 상태 확인"}
                                    </DropdownMenuItem>
                                  </AdminRowActionMenu>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        </Fragment>
                      );
                    })}

                    {shouldShowEmptyState && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={5} className="py-10 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Search className="h-8 w-8 text-muted-foreground/50" />
                            <p className={adminTypography.body}>
                              {activeQuickView !== "all"
                                ? "선택한 빠른 보기에 해당하는 운영 업무가 없습니다."
                                : onlyWarn
                                  ? "주의(실제 오류) 조건에 해당하는 결과가 없습니다."
                                  : "결과가 없습니다."}
                            </p>
                            {activeQuickView !== "all" && (
                              <p className={adminTypography.metaMuted}>
                                다른 빠른 보기를 선택하거나 전체 보기로 돌아가세요.
                              </p>
                            )}
                            {activeQuickView !== "all" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => applyQuickView("all")}
                              >
                                전체 보기
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* 페이지네이션 */}
          {totalPages && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {page} / {totalPages} 페이지 (총 {(totalGroups ?? 0).toLocaleString("ko-KR")}그룹)
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 bg-transparent"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  이전
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 bg-transparent"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
