"use client";

import {
  AlertTriangle,
  BellRing,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Inbox,
  Link2,
  Search,
  Siren,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { adminDataTable } from "@/components/admin/AdminDataTable";
import AdminSummaryCard from "@/components/admin/AdminSummaryCard";
import AdminTaskCard from "@/components/admin/AdminTaskCard";
import { Section, SectionBody, SectionHeader } from "@/components/admin/Section";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import AsyncState from "@/components/system/AsyncState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { opsKindLabel } from "@/lib/admin-ops-taxonomy";
import { inferNextActionForOperationGroup } from "@/lib/admin/next-action-guidance";
import {
  formatElapsedText,
  getElapsedHours,
  getSlaBadgeMeta,
  resolveOperationsSlaLevel,
} from "@/lib/admin/operations-sla";
import { buildQueryString } from "@/lib/admin/urlQuerySync";
import {
  badgeBase,
  badgeSizeSm,
  badgeToneClass,
  getPaymentStatusBadgeSpec,
  getWorkflowMetaBadgeSpec,
} from "@/lib/badge-style";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { shortenId } from "@/lib/shorten";
import { adminRichTooltipClass } from "@/lib/tooltip-style";
import { cn } from "@/lib/utils";
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

function amountMeaningText(item: OpItem) {
  const bits: string[] = [];
  if (item.amountNote) bits.push(item.amountNote);
  if (typeof item.amountReference === "number" && item.amountReference > 0) {
    bits.push(`${item.amountReferenceLabel ?? "기준금액"} ${won(item.amountReference)}`);
  }
  return bits.join(" · ");
}

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

const ROW_ACTION_LABELS = {
  copyId: "문서 ID 복사",
} as const;

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

function truncateText(text: string, max = 38) {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function summarizeReasonText(text?: string | null) {
  const normalized = toOperatorSentence(text).replace(/\s+/g, " ").trim();
  if (!normalized) return "연결 문서 확인 필요";

  if (
    normalized.includes("결제") ||
    normalized.includes("paymentStatus") ||
    normalized.includes("결제 상태")
  ) {
    return "결제 정보 확인 필요";
  }
  if (normalized.includes("주문 정보") || normalized.includes("파생")) {
    return "주문 정보 기준으로 표시 중";
  }
  if (normalized.includes("연결") || normalized.includes("문서") || normalized.includes("누락")) {
    return "연결 문서 확인 필요";
  }

  const oneLine = normalized
    .split(/[.!?]\s+/)[0]
    ?.split(" · ")[0]
    ?.trim();
  return truncateText(oneLine || normalized, 34);
}

function flowLabelText(item: OpItem) {
  return item.flowLabel?.trim() || FLOW_LABEL_BY_ID[item.flow] || "미분류";
}

function groupNextActionText(group: {
  guide: { nextAction?: string | null };
  cancelRequested: boolean;
  reviewLevel?: ReviewLevel;
}) {
  if (group.guide.nextAction?.trim()) {
    return toOperatorSentence(group.guide.nextAction);
  }
  if (group.cancelRequested) return "취소 요청 처리 필요";
  if (group.reviewLevel === "info") return "자동 계산 정보 있음";
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
  const isCancelDone = item.cancel?.status === "approved" || item.cancel?.status === "rejected";

  if (item.kind === "order") {
    if (isCancelRequested) return "취소 요청 접수 주문";
    if (isCancelDone || lowerStatus.includes("환불")) return "취소/환불 처리 주문";
    if (lowerStatus.includes("구매확정")) return "구매확정 주문";
    if (lowerStatus.includes("배송완료") || lowerStatus.includes("delivered"))
      return "배송 완료 주문";
    if (lowerStatus.includes("배송중") || lowerStatus.includes("shipped")) return "배송 중 주문";
    if (lowerStatus.includes("결제")) return "결제 대기 주문";
    return status ? `${status} 주문` : "처리 대기 주문";
  }

  if (item.kind === "rental") {
    if (isCancelRequested) return "취소 요청 접수 대여 건";
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
  return group.items.some((item) => item.cancel?.status === "requested");
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
    const statusText = `${item.statusDisplayLabel ?? ""} ${item.statusLabel ?? ""}`;
    if (excludeKeywords.some((word) => statusText.includes(word))) return false;
    const paymentStatus = normalizeText(item.stage);
    if (paymentStatus.includes("pending") || paymentStatus.includes("unpaid")) return true;
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
      flow: "all" | "1" | "2" | "3" | "4" | "5" | "6" | "7";
      integrated: "all" | "1" | "0";
      warn: boolean;
    }>;
    isActive: (state: {
      integrated: "all" | "1" | "0";
      flow: "all" | "1" | "2" | "3" | "4" | "5" | "6" | "7";
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

function cancelBadgeSpec(status?: "none" | "requested" | "approved" | "rejected") {
  if (status === "requested")
    return {
      label: "취소요청",
      spec: getWorkflowMetaBadgeSpec("cancel_requested"),
    };
  if (status === "approved") return { label: "취소승인", spec: getPaymentStatusBadgeSpec("환불") };
  if (status === "rejected")
    return { label: "취소거절", spec: getPaymentStatusBadgeSpec("결제대기") };
  return null;
}

function cancelQuickSignalSpec(cancel?: OpItem["cancel"]): {
  label: "계좌확인 필요" | "검토 가능";
  tone: "warning" | "success";
  tooltipCopy: string;
} | null {
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

type PrimaryActionTarget = {
  href: string;
  label: string;
};

function resolvePrimaryActionTarget(group: {
  anchor: OpItem;
  items: OpItem[];
}): PrimaryActionTarget {
  const { anchor, items } = group;
  const isIntegratedOrder =
    anchor.kind === "order" && items.some((item) => item.kind === "stringing_application");

  if (isIntegratedOrder) {
    return { href: anchor.href, label: "통합 주문 다음 단계" };
  }

  if (anchor.kind === "order") {
    const next = anchor.nextAction ?? "";
    if (next.includes("결제") || next.includes("입금"))
      return { href: anchor.href, label: "주문 결제 확인" };
    if (next.includes("배송") || next.includes("운송장"))
      return { href: anchor.href, label: "배송 정보 등록" };
    if (anchor.cancel?.status === "requested")
      return { href: anchor.href, label: "주문 취소 요청 검토" };
    return { href: anchor.href, label: "주문 상세 확인" };
  }
  if (anchor.kind === "stringing_application") {
    const next = anchor.nextAction ?? "";
    if (next.includes("반송") || next.includes("운송장"))
      return { href: anchor.href, label: "반송 운송장 등록" };
    return { href: anchor.href, label: "교체 작업 상태 확인" };
  }
  if (anchor.kind === "rental") {
    const next = anchor.nextAction ?? "";
    if (next.includes("반납")) return { href: anchor.href, label: "대여 반납 확인" };
    if (next.includes("인도") || next.includes("배송") || next.includes("운송장"))
      return { href: anchor.href, label: "대여 인도 처리" };
    return { href: anchor.href, label: "대여 상세 확인" };
  }
  return { href: anchor.href, label: "패키지 결제 확인" };
}

function isActionableSignal(signal: AdminOperationsGroup["signals"][number]) {
  return signal.level !== "info";
}

function collectActionableReasonBullets(g: {
  anchor: OpItem;
  items: OpItem[];
  signals?: AdminOperationsGroup["signals"];
  linkedFlowStatusIssue?: AdminOperationsGroup["linkedFlowStatusIssue"];
}) {
  const reasons = new Set<string>();
  const addReason = (reason?: string | null) => {
    const value = toOperatorSentence(reason ?? "");
    if (value) reasons.add(value);
  };

  for (const signal of g.signals ?? []) {
    if (!isActionableSignal(signal)) continue;
    addReason(signal.description || signal.nextAction || signal.title);
  }

  for (const it of g.items ?? []) {
    const hasActionableReview = it.reviewLevel === "action" || it.needsReview === true;
    if (hasActionableReview) {
      for (const reason of it.reviewReasons ?? []) addReason(reason);
    }
    for (const reason of it.warnReasons ?? []) addReason(reason);
    for (const reason of it.pendingReasons ?? []) addReason(reason);
    if (it.cancel?.status === "requested") {
      addReason(it.cancel.reason || "취소 요청 처리가 필요합니다.");
    }
  }

  if (g.linkedFlowStatusIssue) addReason(g.linkedFlowStatusIssue.message);

  return Array.from(reasons);
}

function visibleSignalSummary(signals: AdminOperationsGroup["signals"], max = 3) {
  const actionableSignals = (signals ?? []).filter(isActionableSignal);
  const visible = actionableSignals.slice(0, max);
  const hiddenCount = Math.max(0, actionableSignals.length - visible.length);
  return { visible, hiddenCount };
}

function stringSummaryText(item?: OpItem) {
  if (!item?.stringingSummary?.requested) return null;
  const summary = item.stringingSummary;
  const bits = [
    summary.name ?? "스트링 선택됨",
    summary.price ? `요금 ${won(summary.price)}` : null,
    summary.mountingFee ? `교체비 ${won(summary.mountingFee)}` : null,
    summary.applicationStatus ? `신청 ${summary.applicationStatus}` : "신청 상태 확인",
  ]
    .filter(Boolean)
    .join(" / ");
  return bits || "스트링 선택됨";
}

const thClasses = adminDataTable.head;
const tdClasses = adminDataTable.cellTop;
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
  const [flow, setFlow] = useState<"all" | "1" | "2" | "3" | "4" | "5" | "6" | "7">("all");
  const [integrated, setIntegrated] = useState<"all" | "1" | "0">("all"); // 1=통합만, 0=단독만
  const [onlyWarn, setOnlyWarn] = useState(false);
  const [warnFilter, setWarnFilter] = useState<
    "all" | "warn" | "caution" | "review" | "pending" | "clean"
  >("all");
  const [warnSort, setWarnSort] = useState<"default" | "warn_first" | "safe_first">("default");
  const [page, setPage] = useState(1);
  const [openReasons, setOpenReasons] = useState<Record<string, boolean>>({});
  const [showActionsGuide, setShowActionsGuide] = useState(false);
  const [isFilterScrolled, setIsFilterScrolled] = useState(false);
  const [displayDensity, setDisplayDensity] = useState<"default" | "compact">("default");
  const [activeQuickView, setActiveQuickView] = useState<OperationsQuickView>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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

  // 필터/페이지가 바뀌면 확인 이유 펼침 상태를 초기화
  useEffect(() => {
    setOpenReasons({});
  }, [q, kind, flow, integrated, page, onlyWarn, warnFilter, warnSort]);

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
  const cachedNavigationSummary = cache.get(navigationSummaryKey)?.data as
    | NavigationSummaryResponse
    | undefined;

  const { data, isLoading, error, mutate } = useSWR<AdminOperationsListResponseDto>(
    key,
    authenticatedSWRFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
    },
  );
  const { data: navigationSummary } = useSWR<NavigationSummaryResponse>(
    navigationSummaryKey,
    authenticatedSWRFetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      dedupingInterval: 30_000,
      fallbackData: cachedNavigationSummary,
      revalidateIfStale: !cachedNavigationSummary,
    },
  );
  const { data: dailySummary, error: dailySummaryError } =
    useSWR<AdminDailyOperationsSummaryResponse>(
      "/api/admin/operations/daily-summary",
      authenticatedSWRFetcher,
      {
        revalidateOnFocus: false,
        shouldRetryOnError: false,
        dedupingInterval: 30_000,
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
  const groupCounts = navigationSummary?.operationGroupCounts ?? data?.operationGroupCounts;
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

  function toggleReason(key: string) {
    setOpenReasons((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

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
      <div className="mx-auto max-w-[1480px]">
        <AdminPageHeader
          title={PAGE_COPY.title}
          description={PAGE_COPY.description}
          icon={Inbox}
          scope="운영 통합 센터"
          helperText="긴급 업무부터 확인하고 바로 처리할 수 있습니다."
          actions={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowActionsGuide((prev) => !prev)}
            >
              {showActionsGuide ? "도움말 닫기" : "도움말 보기"}
            </Button>
          }
        />

        {showActionsGuide && (
          <div className={cn(adminSurface.fieldPanelMuted, "grid grid-cols-1 gap-1.5 bp-sm:grid-cols-2 bp-lg:grid-cols-4")}>
            {PAGE_COPY.actions.map((action) => (
              <div
                key={action.title}
                className={cn(adminSurface.fieldPanel, "rounded-md px-2 py-1.5")}
              >
                <p className={adminTypography.panelTitle}>{action.title}</p>
                <p className="mt-0.5 line-clamp-1 text-xs leading-snug text-foreground/90">
                  {action.description}
                </p>
              </div>
            ))}
          </div>
        )}

        <Section variant="plain" className="mt-4 space-y-3">
          <SectionHeader
            title="지금 확인할 업무"
            description="긴급, 확인 필요, 미처리 순서로 우선순위를 바로 확인하세요."
            className="border-0 bg-transparent px-0 py-0"
          />
          <div className="grid grid-cols-1 gap-3 bp-sm:grid-cols-2 bp-lg:grid-cols-4">
            <AdminSummaryCard
              title={PAGE_COPY.dailyTodoLabels.urgent}
              value={todayTodoCount ? `${todayTodoCount.urgent}건` : "-"}
              description="오류 또는 긴급 확인이 필요한 항목"
              icon={Siren}
              tone="danger"
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
              active={activeKpi === "pending"}
              onAction={() => {
                setOnlyWarn(false);
                setWarnFilter("pending");
                setPage(1);
                scrollToOperationsList();
              }}
            />
            <AdminSummaryCard
              title="대표 업무 합계"
              value={dailySummaryValue(representativeTodayCount ?? representativeTotalCount)}
              description="주문·대여·단독 교체서비스 기준"
              icon={Inbox}
              actionLabel="오늘 업무 보기"
              active={activeQuickView === "today"}
              onAction={() => applyQuickView("today")}
            />
          </div>
        </Section>

        <div className={cn(adminSurface.card, "mt-4 p-2")}>
          <p className="px-2 pb-2 text-ui-label font-semibold uppercase tracking-widest text-muted-foreground">
            보조 운영 정보
          </p>
          <details className="rounded-xl border border-border/60 bg-muted/20">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-ui-body-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                대표 업무·확인 항목
              </span>
              <span className="text-ui-label font-normal text-muted-foreground">
                전체 신호 보기
              </span>
            </summary>
            <Section className="border-0 shadow-none">
              <SectionHeader
                title="대표 업무와 확인 항목"
                description="운영 업무와 별도 확인 항목을 한눈에 확인합니다."
                aside={
                  <p className="max-w-full break-words text-sm leading-relaxed text-muted-foreground sm:max-w-[360px] sm:text-right">
                    상단 합계와 확인 항목 카드는 집계 기준이 다르며, 검색과 필터는 아래 목록에
                    적용됩니다.
                  </p>
                }
              />
              <SectionBody>
                <div className="grid gap-2 bp-sm:grid-cols-2 bp-lg:grid-cols-4">
                  {practicalTaskCards.map((task) => (
                    <AdminTaskCard
                      key={task.title}
                      title={task.title}
                      count={task.count}
                      description={task.description}
                      tone={task.tone}
                      actionLabel={task.action}
                      onAction={task.onClick}
                    />
                  ))}
                  <AdminTaskCard
                    title="오프라인 미결제/보정"
                    count={taskCounts?.offline ?? 0}
                    description="미결제·발급 실패·보정 필요 확인"
                    tone="warning"
                    actionLabel="미결제 보정"
                    href="/admin/offline/reconciliation"
                  />
                  <AdminTaskCard
                    title="아카데미 상담"
                    count={taskCounts?.academyApplications ?? 0}
                    description="상담 대기·등록 확정 대기 확인"
                    tone="info"
                    actionLabel="상담 대기 확인"
                    href="/admin/academy/applications"
                  />
                </div>
              </SectionBody>
            </Section>
          </details>
          <details className="mt-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-primary" />
                <span>처리 순서</span>
                <Badge className={cn(badgeBase, badgeSizeSm, badgeToneClass("brand"))}>
                  권장 처리 순서
                </Badge>
              </span>
            </summary>
            <p className="mt-1 text-xs text-muted-foreground">
              처음 접속했다면 핵심 순서만 먼저 확인하세요.
            </p>
            <ol className="mt-2 grid gap-1.5 text-xs leading-relaxed text-muted-foreground sm:grid-cols-2">
              <li>
                <span className="font-semibold text-foreground">1.</span> 취소 요청과 결제 확인을
                먼저 처리합니다.
              </li>
              <li>
                <span className="font-semibold text-foreground">2.</span> 패키지 결제 확인은 패키지
                목록에서 분리 확인합니다.
              </li>
              <li>
                <span className="font-semibold text-foreground">3.</span> 배송/반송 미등록과 교체
                작업 단계를 확인합니다.
              </li>
              <li>
                <span className="font-semibold text-foreground">4.</span> 대여 반납, 오프라인 보정,
                상담 대기를 마감합니다.
              </li>
            </ol>
          </details>

          <details className="mt-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-ui-body-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <Inbox className="h-4 w-4 text-primary" />
                오늘 업무 마감
              </span>
              <span className="text-ui-label font-normal text-muted-foreground">마감 참고치</span>
            </summary>
            <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className={adminTypography.panelTitle}>오늘 업무 마감 요약</h2>
                <p className="text-xs text-muted-foreground">
                  오늘 상태 변경 참고치, 남은 대표 업무, 별도 확인 항목을 구분해서 확인합니다.
                </p>
              </div>
              <Badge variant="outline">{dailySummary?.date ?? "오늘"}</Badge>
            </div>

            <div className="mt-3 grid gap-2 bp-sm:grid-cols-2 bp-lg:grid-cols-4">
              <Card className="border-border/50 bg-background/50 shadow-none">
                <CardHeader className="p-2.5 pb-1">
                  <CardTitle className="text-sm font-semibold">오늘 상태 변경 참고</CardTitle>
                  <CardDescription className="text-2xl font-bold text-foreground">
                    {dailySummaryValue(dailySummary?.completedToday.total)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-2.5 pt-0 text-xs leading-snug text-muted-foreground">
                  {dailySummary
                    ? [
                        dailySummaryInlineValue("주문", dailySummary.completedToday.orders),
                        dailySummaryInlineValue(
                          "교체",
                          dailySummary.completedToday.stringingApplications,
                        ),
                        dailySummaryInlineValue("대여", dailySummary.completedToday.rentals),
                        dailySummaryInlineValue("오프라인", dailySummary.completedToday.offline),
                        dailySummaryInlineValue(
                          "아카데미",
                          dailySummary.completedToday.academyApplications,
                        ),
                      ].join(" · ")
                    : dailySummaryError
                      ? "요약을 불러오지 못했습니다."
                      : "불러오는 중..."}
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-background/50 shadow-none">
                <CardHeader className="p-2.5 pb-1">
                  <CardTitle className="text-sm font-semibold">남은 대표 업무</CardTitle>
                  <CardDescription className="text-2xl font-bold text-foreground">
                    {dailySummaryValue(
                      dailySummary?.operationGroupCounts?.totalRepresentativeTasks ??
                        representativeTotalCount,
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-2.5 pt-0 text-xs leading-snug text-muted-foreground">
                  {dailySummary
                    ? [
                        dailySummaryInlineValue("취소", dailySummary.remaining.cancelRequests),
                        dailySummaryInlineValue("결제", dailySummary.remaining.paymentCheck),
                        dailySummaryInlineValue("배송", dailySummary.remaining.shippingMissing),
                        dailySummaryInlineValue("교체", dailySummary.remaining.stringingWork),
                        dailySummaryInlineValue("반납", dailySummary.remaining.rentalDue),
                      ].join(" · ")
                    : dailySummaryError
                      ? "요약을 불러오지 못했습니다."
                      : "불러오는 중..."}
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-background/50 shadow-none">
                <CardHeader className="p-2.5 pb-1">
                  <CardTitle className="text-sm font-semibold">확인 항목</CardTitle>
                  <CardDescription className="text-2xl font-bold text-foreground">
                    {dailySummaryValue(
                      dailySummary?.remaining.packagePaymentCheck ??
                        taskCounts?.packagePaymentCheck,
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-2.5 pt-0 text-xs leading-snug text-muted-foreground">
                  패키지 결제 확인은 대표 업무 합계에서 제외하고 별도 집계합니다.
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-background/50 shadow-none">
                <CardHeader className="p-2.5 pb-1">
                  <CardTitle className="text-sm font-semibold">마감 전 확인</CardTitle>
                  <CardDescription className="text-base font-bold text-foreground">
                    긴급 {dailySummaryValue(dailySummary?.attention.urgentRemaining)} / 확인{" "}
                    {dailySummaryValue(dailySummary?.attention.watchRemaining)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 p-3 pt-0">
                  <p
                    className={cn(
                      "text-xs leading-relaxed",
                      dailySummaryError ? "text-warning" : "text-muted-foreground",
                    )}
                  >
                    {dailySummaryStatusMessage}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 bg-background/70 text-xs"
                      onClick={() => applyQuickView("cancelRequests")}
                    >
                      긴급 업무 보기
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => applyQuickView("all")}
                    >
                      남은 업무 보기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </details>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-card p-2.5">
          <AdminFilterBar
            className="mb-3 rounded-xl bg-background/70 p-3 shadow-none sm:p-4"
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
                <p className="text-sm font-semibold text-foreground">빠른 보기</p>
                <Badge variant="outline">{activeQuickViewMeta.label}</Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-foreground/75">
                {activeQuickViewMeta.description} 자주 처리하는 업무 유형을 한 번에 전환할 수
                있습니다.
              </p>
            </div>
          </AdminFilterBar>
          <details className="mt-2 rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
            <summary className="cursor-pointer text-ui-body-sm font-semibold text-foreground">
              주의 항목 정밀 검수
            </summary>
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
          </details>
        </div>
      </div>

      {/* 필터 및 검색 카드 */}
      <div
        className={cn(
          "top-3 z-30 mb-4 transition-all duration-200",
          isFilterScrolled && "shadow-sm",
        )}
      >
        <Card
          className={cn(
            "rounded-xl border-border px-4 py-4 bp-lg:px-5 shadow-md transition-all duration-200",
            onlyWarn
              ? "bg-warning/5 border-warning/20 dark:bg-warning/10 dark:border-warning/30"
              : "bg-card",
            isFilterScrolled && adminSurface.stickyToolbar,
          )}
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div>
              <CardTitle className="text-ui-body-sm">고급 필터</CardTitle>
              <CardDescription className="mt-0.5 text-ui-label">
                고급 필터는 특정 고객, 문서 ID, 운영 흐름, 문제 유형을 직접 좁힐 때만 사용합니다.
                일반 처리는 위의 대표 업무 큐를 먼저 사용하세요.
              </CardDescription>
              {error && !shouldShowGlobalError && (
                <p className={cn("mt-1", adminTypography.warning)}>
                  검색 결과를 새로 불러오지 못해 이전 결과를 유지 중입니다. 잠시 후 다시 시도해
                  주세요.
                </p>
              )}
              {activeFilterCount > 0 && (
                <>
                  <Badge className={cn(badgeBase, badgeSizeSm, "mt-2 " + badgeToneClass("brand"))}>
                    적용된 필터 {activeFilterCount}개
                  </Badge>
                  <p className={cn("mt-1", adminTypography.metaMuted)}>
                    필터가 켜져 있어 일부 업무만 보입니다.
                  </p>
                </>
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
            <CardContent className="space-y-3">
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
              <div className="grid w-full grid-cols-1 gap-2 border-t border-border pt-2.5 bp-sm:grid-cols-2 bp-md:grid-cols-3 bp-lg:grid-cols-5">
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
                    "w-full bp-sm:col-span-2 bp-md:col-span-3 bp-lg:col-span-5",
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
                <div className="mt-1 grid gap-2 rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs text-muted-foreground bp-sm:grid-cols-3">
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
      <Card className={cn(adminSurface.tableCard, "px-3 py-4 bp-sm:px-4 lg:px-5")}>
        <CardHeader id="operations-list" className="scroll-mt-6 pb-2">
          <div className="flex flex-col gap-2 bp-md:flex-row bp-md:items-center bp-md:justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-medium">업무 목록</CardTitle>
              {activePresetKey && (
                <Badge className={cn(badgeBase, badgeSizeSm, badgeToneClass("brand"))}>
                  {PRESET_CONFIG[activePresetKey].label}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {typeof totalGroups === "number"
                  ? `총 ${totalGroups.toLocaleString("ko-KR")}건 표시됨`
                  : "목록을 불러오는 중…"}
              </p>
              <span className="hidden bp-lg:inline text-xs text-muted-foreground">
                표시 밀도(데스크톱)
              </span>
              <div className="hidden bp-lg:inline-flex items-center rounded-md border border-border p-0.5">
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
                  컴팩트
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">현재 보기</span>
              <Badge variant="outline">{activeQuickViewMeta.label}</Badge>
              <span>{activeQuickViewMeta.description}</span>
              <span className="font-semibold text-foreground">
                {typeof totalGroups === "number"
                  ? `총 ${totalGroups.toLocaleString("ko-KR")}건`
                  : "건수 확인 중"}
              </span>
            </div>
            {(activeQuickView !== "all" || activeFilterCount > 0) && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 self-start px-2 text-xs sm:self-auto"
                onClick={reset}
              >
                필터 초기화
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <div className="text-xs text-muted-foreground">
              {totalPages ? `${page} / ${totalPages} 페이지` : "페이지 계산 중…"}
            </div>
          </div>
        </CardHeader>
        <CardContent className={cn("p-0 pt-2", isLoading || shouldShowEmptyState ? "min-h-[360px]" : "min-h-0")}>
          {isLoading ? (
            <div className="space-y-4 px-4 py-4">
              <div className="hidden bp-lg:block overflow-x-auto">
                <Table className="min-w-[1320px]">
                  <TableHeader>
                    <TableRow className={adminSurface.tableRow}>
                      <TableHead className={cn(thClasses, "w-[24%]")}>
                        <Skeleton className="h-4 w-24" />
                      </TableHead>
                      <TableHead className={cn(thClasses, "w-[42%]")}>
                        <Skeleton className="h-4 w-36" />
                      </TableHead>
                      <TableHead className={cn(thClasses, "w-[18%] text-right")}>
                        <Skeleton className="ml-auto h-4 w-16" />
                      </TableHead>
                      <TableHead className={cn(thClasses, stickyActionHeadClass, "w-[16%]")}>
                        <Skeleton className="ml-auto h-4 w-16" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <TableRow key={idx}>
                        <TableCell className={cn(tdClasses, "py-5")}>
                          <Skeleton className="h-5 w-40" />
                        </TableCell>
                        <TableCell className={cn(tdClasses, "py-5")}>
                          <Skeleton className="h-5 w-3/4" />
                        </TableCell>
                        <TableCell className={cn(tdClasses, "py-5")}>
                          <Skeleton className="ml-auto h-5 w-24" />
                        </TableCell>
                        <TableCell
                          className={cn(
                            tdClasses,
                            "sticky right-0 z-10 border-l border-border/60 bg-background",
                            "py-5",
                          )}
                        >
                          <Skeleton className="ml-auto h-8 w-20" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="bp-lg:hidden space-y-3">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="rounded-lg border border-border bg-card p-4 space-y-3">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="hidden bp-lg:block overflow-x-auto">
                <Table className="min-w-[1180px] table-fixed border-separate [border-spacing-block:0.25rem] [border-spacing-inline:0]">
                  <TableHeader>
                    <TableRow className={adminSurface.tableRow}>
                      <TableHead className={cn(thClasses, "w-[17%]")}>우선순위/업무</TableHead>
                      <TableHead className={cn(thClasses, "w-[28%]")}>문서/고객</TableHead>
                      <TableHead className={cn(thClasses, "w-[27%]")}>상태/다음 작업</TableHead>
                      <TableHead className={cn(thClasses, "w-[16%] text-right")}>
                        금액/접수
                      </TableHead>
                      <TableHead className={cn(thClasses, stickyActionHeadClass, "w-[12%]")}>
                        액션
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
                      const slaMeta = getSlaBadgeMeta(slaLevel, elapsedText);
                      const headline = statusHeadlineOf(g.anchor);
                      const primaryActionTarget = resolvePrimaryActionTarget({
                        anchor: g.anchor,
                        items: g.items,
                      });
                      const anchorCancelQuickSignal = cancelQuickSignalSpec(g.anchor.cancel);
                      const rowDensityClass = displayDensity === "compact" ? "py-1.5" : "py-2";
                      const primarySignal = visibleSignalSummary(g.signals, 1).visible[0];
                      const rowBaseToneClass = idx % 2 === 0 ? "bg-background" : "bg-muted/[0.12]";
                      const warnEmphasisClass = warn
                        ? "border-l-2 border-l-warning/60 bg-warning/[0.08]"
                        : "border-l-2 border-l-transparent";
                      const stickyActionCellClass = cn(
                        "sticky right-0 z-10 border-l border-border/60",
                        rowBaseToneClass,
                        "group-hover:bg-muted/35",
                      );

                      return (
                        <Fragment key={g.key}>
                          <TableRow
                            className={cn(
                              "group transition-colors hover:bg-muted/35",
                              rowBaseToneClass,
                              warnEmphasisClass,
                            )}
                          >
                            <TableCell className={cn(tdClasses, rowDensityClass)}>
                              <div className="min-w-0 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge className={cn(badgeBase, badgeSizeSm, badgeToneClass(priorityMeta.tone))}>
                                    {priorityMeta.label}
                                  </Badge>
                                  <Badge variant="outline" className={cn(badgeBase, badgeSizeSm)}>
                                    {opsKindLabel(g.anchor.kind)}
                                  </Badge>
                                </div>
                                <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
                                  {headline}
                                </p>
                                <p className={cn("line-clamp-1", adminTypography.metaMuted)}>
                                  {isGroup ? `연결 ${g.items.length}건 · ${scenarioLabel}` : scenarioLabel}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell className={cn(tdClasses, rowDensityClass)}>
                              <div className="min-w-0 space-y-1">
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <span className={cn("truncate font-mono", adminTypography.caption)}>{docLabel}</span>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={() => copyToClipboard(g.anchor.id)} title={ROW_ACTION_LABELS.copyId} aria-label={ROW_ACTION_LABELS.copyId}>
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <span className={cn("block truncate", adminTypography.bodyStrong)}>{customerName || "-"}</span>
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <span className={cn("truncate", adminTypography.caption)}>{customerEmail || "이메일 없음"}</span>
                                  {customerEmail && (
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={() => copyToClipboard(customerEmail)} title="이메일 복사" aria-label="이메일 복사">
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                                {isGroup && children[0] && (
                                  <p className={cn("line-clamp-1", adminTypography.caption)}>
                                    연결 {opsKindLabel(children[0].kind)} {shortenId(children[0].id)}{children.length > 1 ? ` 외 ${children.length - 1}건` : ""}
                                  </p>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className={cn(tdClasses, rowDensityClass)}>
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge variant="outline" className={cn(badgeBase, badgeSizeSm)}>
                                    {g.anchor.statusDisplayLabel ??
                                      g.anchor.statusLabel ??
                                      "상태 확인"}
                                  </Badge>
                                  {slaMeta ? (
                                    <Badge
                                      title="접수 시점 기준 경과 시간입니다. 긴급/확인은 운영 우선순위 기준으로 표시됩니다."
                                      variant="outline"
                                      className={cn(badgeBase, badgeSizeSm, slaMeta.className)}
                                    >
                                      {slaMeta.label}
                                    </Badge>
                                  ) : null}
                                </div>
                                {primarySignal ? (
                                  <p className={cn("line-clamp-1 text-warning", adminTypography.caption)} title={toOperatorSentence(primarySignal.description)}>
                                    {toOperatorSentence(primarySignal.title)}
                                  </p>
                                ) : null}
                                <div className="border-l-2 border-primary/30 pl-2.5">
                                  <p className={cn("mb-0.5", adminTypography.caption)}>다음 작업</p>
                                  <p className={cn("line-clamp-2", adminTypography.bodyStrong)}>
                                    {nextActionText}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell
                              className={cn(tdClasses, rowDensityClass, "text-right")}
                            >
                              <div className="flex flex-col items-end gap-1.5">
                                <div className="text-left md:text-right">
                                  <span className="whitespace-nowrap text-xs text-foreground/75">
                                    {isGroup ? "대표 문서 금액" : opsKindLabel(g.anchor.kind)}
                                  </span>
                                  <p className="whitespace-nowrap text-ui-body-sm font-semibold tracking-normal text-foreground">
                                    {won(g.anchor.amount)}
                                  </p>
                                </div>
                                {(() => {
                                  const cancelBadge = cancelBadgeSpec(g.anchor.cancel?.status);
                                  return cancelBadge ? (
                                    <Badge
                                      variant={cancelBadge.spec.variant}
                                      className={cn(badgeBase, badgeSizeSm)}
                                    >
                                      {cancelBadge.label}
                                    </Badge>
                                  ) : null;
                                })()}
                                {anchorCancelQuickSignal && (
                                  <TooltipProvider delayDuration={50}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge
                                          className={cn(
                                            badgeBase,
                                            badgeSizeSm,
                                            badgeToneClass(anchorCancelQuickSignal.tone),
                                            "cursor-help",
                                          )}
                                        >
                                          {anchorCancelQuickSignal.label}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="top"
                                        align="start"
                                        sideOffset={6}
                                        className={adminRichTooltipClass}
                                      >
                                        <p className="text-sm text-foreground">
                                          취소 요청이 접수된 항목입니다.
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          {toOperatorSentence(anchorCancelQuickSignal.tooltipCopy)}
                                        </p>
                                        {g.anchor.cancel?.refundBankLabel && (
                                          <p className="mt-1 text-xs text-muted-foreground">
                                            환불 은행: {g.anchor.cancel.refundBankLabel}
                                          </p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                <span className={cn("text-right", adminTypography.caption)}>
                                  접수 {createdAtLabel}
                                </span>
                                {amountMeaningText(g.anchor) ? (
                                  <span className="text-xs text-foreground/85 line-clamp-2 text-right">
                                    {amountMeaningText(g.anchor)}
                                  </span>
                                ) : null}
                              </div>
                            </TableCell>

                            <TableCell
                              className={cn(
                                tdClasses,
                                rowDensityClass,
                                "text-right",
                                stickyActionCellClass,
                              )}
                            >
                              <div className="flex w-full flex-col items-end gap-1">
                                <div className="flex w-full flex-col items-end gap-1">
                                  <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className={cn(
                                      "h-8 min-w-[108px] justify-center px-2.5",
                                      adminTypography.actionLabel,
                                    )}
                                    title={groupGuide.nextAction ?? primaryActionTarget.label}
                                  >
                                    <Link href={primaryActionTarget.href}>
                                      {primaryActionTarget.label}
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        </Fragment>
                      );
                    })}

                    {shouldShowEmptyState && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={5} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Search className="h-8 w-8 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">
                              {activeQuickView !== "all"
                                ? "선택한 빠른 보기에 해당하는 운영 업무가 없습니다."
                                : onlyWarn
                                  ? "주의(실제 오류) 조건에 해당하는 결과가 없습니다."
                                  : "결과가 없습니다."}
                            </p>
                            {activeQuickView !== "all" && (
                              <p className="text-xs text-muted-foreground/80">
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

              <div className="space-y-3 bp-lg:hidden">
                {quickViewFilteredGroups.map((g) => {
                  const warn = g.warn;
                  const reasonBullets = collectActionableReasonBullets(g);
                  const groupGuide = inferNextActionForOperationGroup(g.items);
                  const reasonSummary = summarizeReasonText(
                    reasonBullets[0] ?? g.primarySignal?.description,
                  );
                  const customerName = g.anchor.customer?.name?.trim() || "";
                  const customerEmail = g.anchor.customer?.email?.trim() || "";
                  const customerPrimary = customerName || customerEmail || "-";
                  const scenarioLabel = flowLabelText(g.anchor);
                  const createdAtLabel = formatKST(g.anchor.createdAt ?? g.createdAt);
                  const elapsedHours = getElapsedHours(g.createdAt ?? g.anchor.createdAt);
                  const elapsedText = formatElapsedText(elapsedHours);
                  const slaLevel = resolveOperationsSlaLevel({
                    groupQueueBucket: g.groupQueueBucket,
                    createdAt: g.createdAt ?? g.anchor.createdAt,
                    hasCancel: g.items.some((it) => it.cancel?.status === "requested"),
                    hasPayment: hasPaymentCheckNeeded(g),
                    hasShipping: hasShippingMissing(g),
                    hasRental: hasRentalDue(g),
                  });
                  const slaMeta = getSlaBadgeMeta(slaLevel, elapsedText);
                  const headline = statusHeadlineOf(g.anchor);
                  const primaryActionTarget = resolvePrimaryActionTarget({
                    anchor: g.anchor,
                    items: g.items,
                  });
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
                    cancelRequested: groupCancelRequested,
                    reviewLevel: g.reviewLevel,
                  });
                  const hasReasonCard = reasonBullets.length > 0;
                  const shouldShowReasonBullets = reasonBullets.length > 0;
                  const reasonBulletCount = reasonBullets.length;
                  const isReasonOpen = !!openReasons[g.key];
                  const anchorCancelQuickSignal = cancelQuickSignalSpec(g.anchor.cancel);
                  return (
                    <Card key={`m:${g.key}`} className="border-border shadow-sm">
                      <CardContent className="space-y-3 p-4">
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              className={cn(
                                badgeBase,
                                badgeSizeSm,
                                badgeToneClass(priorityMeta.tone),
                              )}
                            >
                              {priorityMeta.label}
                            </Badge>
                            <span className="text-xs leading-relaxed text-foreground/80">
                              {priorityMeta.description}
                            </span>
                            <span className="text-xs leading-relaxed text-muted-foreground/90">
                              {g.items.length > 1 ? `${g.items.length}건 그룹` : "단일 건"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs leading-snug text-foreground/75">
                            <span>
                              {opsKindLabel(g.anchor.kind)} · {shortenId(g.anchor.id)}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-muted-foreground"
                              onClick={() => copyToClipboard(g.anchor.id)}
                              aria-label={ROW_ACTION_LABELS.copyId}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <p className="text-xs leading-snug text-foreground/75">
                            접수 {createdAtLabel}
                          </p>
                          {slaMeta ? (
                            <Badge
                              title="접수 시점 기준 경과 시간입니다. 긴급/확인은 운영 우선순위 기준으로 표시됩니다."
                              variant="outline"
                              className={cn(badgeBase, badgeSizeSm, slaMeta.className)}
                            >
                              {slaMeta.label}
                            </Badge>
                          ) : null}
                        </div>

                        <div className="flex items-baseline justify-between gap-2">
                          <div>
                            <p className="text-xs leading-snug text-foreground/75">
                              {scenarioLabel}
                            </p>
                            <span className="text-[13px] font-medium text-foreground/85">
                              {customerPrimary}
                            </span>
                            {customerName && customerEmail && (
                              <p className="text-xs leading-snug text-foreground/75">
                                {customerEmail}
                              </p>
                            )}
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-xs leading-snug text-foreground/75">
                              {g.items.length > 1 ? "대표 문서 금액" : opsKindLabel(g.anchor.kind)}
                            </p>
                            <span className="text-base font-extrabold tracking-normal text-foreground">
                              {won(g.anchor.amount)}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm font-semibold text-foreground line-clamp-1">
                          {headline}
                        </p>
                        <div className="rounded-xl border border-primary/15 bg-primary/[0.02] px-3 py-2">
                          <p className={cn("mb-0.5", adminTypography.caption)}>다음 작업</p>
                          <p className={cn("line-clamp-2", adminTypography.bodyStrong)}>
                            {nextActionText}
                          </p>
                        </div>
                        {(() => {
                          const { visible, hiddenCount } = visibleSignalSummary(g.signals, 2);
                          return visible.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {visible.map((signal) => (
                                <Badge
                                  key={`m:${g.key}:signal:${signal.code}:${signal.sourceId}`}
                                  variant="outline"
                                  className={cn(
                                    badgeBase,
                                    badgeSizeSm,
                                    "border-warning/40 bg-warning/5 text-warning",
                                  )}
                                  title={toOperatorSentence(signal.description)}
                                >
                                  {toOperatorSentence(signal.title)}
                                </Badge>
                              ))}
                              {hiddenCount > 0 && (
                                <Badge variant="outline" className={cn(badgeBase, badgeSizeSm)}>
                                  외 {hiddenCount}개
                                </Badge>
                              )}
                            </div>
                          ) : null;
                        })()}
                        {g.linkedFlowStatusIssue && (
                          <div className="rounded-md border border-warning/40 bg-warning/5 px-2 py-1.5 text-xs text-foreground/80">
                            <Badge
                              variant="outline"
                              className="mb-1 border-warning/50 text-warning"
                            >
                              {g.linkedFlowStatusIssue.title}
                            </Badge>
                            <p>{g.linkedFlowStatusIssue.message}</p>
                          </div>
                        )}
                        {hasReasonCard && (
                          <div className="space-y-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1 text-xs font-medium text-foreground/75 hover:text-foreground"
                              onClick={() => toggleReason(g.key)}
                            >
                              {isReasonOpen
                                ? "확인 이유 숨기기"
                                : reasonBulletCount > 0
                                  ? `확인 이유 ${reasonBulletCount}개 보기`
                                  : "확인 이유 보기"}
                            </Button>
                            <div
                              className={cn(
                                "grid transition-all duration-200 ease-out",
                                isReasonOpen
                                  ? "grid-rows-[1fr] opacity-100"
                                  : "grid-rows-[0fr] opacity-0",
                              )}
                            >
                              <div className="overflow-hidden rounded-sm border border-border/40 bg-muted/[0.08] px-1.5 py-0.5">
                                <p className="text-xs leading-snug text-foreground/75 line-clamp-2">
                                  {reasonSummary}
                                </p>
                                {shouldShowReasonBullets && (
                                  <ul className="mt-0.5 space-y-px">
                                    {reasonBullets.slice(0, 2).map((reason) => (
                                      <li
                                        key={`m-reason:${g.key}:${reason}`}
                                        className="list-inside list-disc text-xs leading-snug text-foreground/75 line-clamp-1"
                                      >
                                        {reason}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {reasonBullets.length > 2 && (
                                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                                    외 {reasonBullets.length - 2}건
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <Button
                            asChild
                            size="sm"
                            variant="default"
                            className="h-8 min-w-[96px] px-2.5 text-xs font-semibold shadow-sm"
                          >
                            <Link href={primaryActionTarget.href}>{primaryActionTarget.label}</Link>
                          </Button>
                        </div>

                        {amountMeaningText(g.anchor) ? (
                          <p className="text-xs leading-relaxed text-muted-foreground/85 line-clamp-1">
                            {amountMeaningText(g.anchor)}
                          </p>
                        ) : null}
                        {g.primarySignal && (
                          <p className="text-xs leading-relaxed text-muted-foreground/85">
                            참고:{" "}
                            {toOperatorSentence(
                              g.primarySignal.description ?? g.primarySignal.title,
                            )}
                          </p>
                        )}
                        {g.anchor.flow === 7 && (
                          <p className="text-xs text-muted-foreground">
                            스트링 요약:{" "}
                            {stringSummaryText(g.items.find((it) => it.kind === "rental")) ??
                              "정보 없음"}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {shouldShowEmptyState && (
                  <div className="rounded-md border border-dashed border-border px-3 py-10 text-center text-sm text-muted-foreground">
                    <p>
                      {activeQuickView !== "all"
                        ? "선택한 빠른 보기에 해당하는 운영 업무가 없습니다."
                        : "표시할 항목이 없습니다."}
                    </p>
                    {activeQuickView !== "all" && (
                      <>
                        <p className="mt-1 text-xs text-muted-foreground/80">
                          다른 빠른 보기를 선택하거나 전체 보기로 돌아가세요.
                        </p>
                        <Button
                          className="mt-3"
                          size="sm"
                          variant="outline"
                          onClick={() => applyQuickView("all")}
                        >
                          전체 보기
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* 페이지네이션 */}
          {totalPages && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 pt-4 mt-4">
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
