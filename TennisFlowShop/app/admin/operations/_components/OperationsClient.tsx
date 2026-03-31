"use client";

import {
  AlertTriangle,
  BellRing,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Eye,
  Link2,
  Search,
  Siren,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import AsyncState from "@/components/system/AsyncState";
import { opsKindLabel } from "@/lib/admin-ops-taxonomy";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { buildQueryString } from "@/lib/admin/urlQuerySync";
import { inferNextActionForOperationGroup } from "@/lib/admin/next-action-guidance";
import {
  badgeBase,
  badgeSizeSm,
  badgeToneClass,
  getPaymentStatusBadgeSpec,
  getWorkflowMetaBadgeSpec,
} from "@/lib/badge-style";
import { shortenId } from "@/lib/shorten";
import { adminRichTooltipClass } from "@/lib/tooltip-style";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "./actions/operationsActions";
import {
  flowBadgeClass,
  prevMonthYyyymmKST,
  type Kind,
} from "./filters/operationsFilters";
import {
  buildOperationsViewQueryString,
  initOperationsStateFromQuery,
  useSyncOperationsQuery,
} from "./hooks/useOperationsQueryState";
import {
  formatKST,
  yyyymmKST,
  type OpItem,
  type ReviewLevel,
} from "./table/operationsTableUtils";
import type {
  AdminOperationsGroup,
  AdminOperationsListResponseDto,
  AdminOperationsSummary,
} from "@/types/admin/operations";

const won = (n: number) => (n || 0).toLocaleString("ko-KR") + "원";

function amountMeaningText(item: OpItem) {
  const bits: string[] = [];
  if (item.amountNote) bits.push(item.amountNote);
  if (typeof item.amountReference === "number" && item.amountReference > 0) {
    bits.push(
      `${item.amountReferenceLabel ?? "기준금액"} ${won(item.amountReference)}`,
    );
  }
  return bits.join(" · ");
}

const PAGE_COPY = {
  title: "운영 통합 센터",
  description:
    "오늘 처리할 항목을 빠르게 고르고, 바로 액션할 수 있도록 정리한 화면입니다.",
  dailyTodoTitle: "오늘 해야 할 일",
  dailyTodoLabels: {
    urgent: "긴급",
    caution: "확인 필요",
    pending: "미처리",
  },
  actionsTitle: "도움말",
  actions: [
    {
      title: "주의(오류) 우선 처리",
      description:
        "데이터 연결/무결성 오류 신호를 먼저 점검해 운영 리스크를 줄입니다.",
    },
    {
      title: "확인 필요 항목 점검",
      description:
        "오류는 아니지만 운영 확인이 필요한 건의 검수 사유를 빠르게 확인합니다.",
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
  detail: "상세 보기",
  copyId: "문서 ID 복사",
} as const;

const OPERATOR_TERM_MAP: Array<[RegExp, string]> = [
  [/\bpaymentStatus\b/gi, "결제 상태 정보"],
  [/\bpaymentSource\b/gi, "결제 연결 정보"],
  [/\bREVIEW_INFO\b/g, "확인이 필요한 이유"],
  [/\bderived\b/gi, "주문 정보를 기준으로 계산된"],
  [/\bsignal\b/gi, "확인 신호"],
  [/\bwarn\b/gi, "주의"],
  [/\bpending\b/gi, "미처리"],
];

const FLOW_LABEL_BY_ID: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, string> = {
  1: "스트링 단품 구매",
  2: "스트링 구매 + 교체서비스 신청(통합)",
  3: "교체서비스 단일 신청",
  4: "라켓 단품 구매",
  5: "라켓 구매 + 스트링 선택 + 교체서비스 신청(통합)",
  6: "라켓 단품 대여",
  7: "라켓 대여 + 스트링 선택 + 교체서비스 신청(통합)",
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
    .replace(
      /파생 결제상태/gi,
      "주문 정보를 기준으로 계산한 결제 상태",
    )
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
  if (
    normalized.includes("연결") ||
    normalized.includes("문서") ||
    normalized.includes("누락")
  ) {
    return "연결 문서 확인 필요";
  }

  const oneLine = normalized
    .split(/[.!?]\s+/)[0]
    ?.split(" · ")[0]
    ?.trim();
  return truncateText(oneLine || normalized, 34);
}

function isLowTensionNextAction(nextAction: string) {
  const normalized = nextAction.trim();
  if (!normalized) return true;
  return normalized.includes("후속 조치 없음") || normalized.includes("모니터링");
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
  if (group.reviewLevel === "info") return "조치 필요 없음(정상 파생)";
  return "조치 필요 없음";
}

function statusHeadlineOf(item: OpItem) {
  const status = item.statusDisplayLabel?.trim() || item.statusLabel?.trim() || "";
  const flowLabel = flowLabelText(item);
  const lowerStatus = status.toLowerCase();
  const hasRelated = Boolean(item.related);
  const integratedApplication = item.kind === "stringing_application" && hasRelated;
  const standaloneApplication = item.kind === "stringing_application" && !hasRelated;
  const isCancelRequested = item.cancel?.status === "requested";
  const isCancelDone =
    item.cancel?.status === "approved" || item.cancel?.status === "rejected";

  if (item.kind === "order") {
    if (isCancelRequested) return "취소 요청 접수 주문";
    if (isCancelDone || lowerStatus.includes("환불")) return "취소/환불 처리 주문";
    if (lowerStatus.includes("구매확정")) return "구매확정 주문";
    if (lowerStatus.includes("배송완료") || lowerStatus.includes("delivered"))
      return "배송 완료 주문";
    if (lowerStatus.includes("배송중") || lowerStatus.includes("shipped"))
      return "배송 중 주문";
    if (lowerStatus.includes("결제")) return "결제 대기 주문";
    return status ? `${status} 주문` : "처리 대기 주문";
  }

  if (item.kind === "rental") {
    if (isCancelRequested) return "취소 요청 접수 대여 건";
    if (lowerStatus.includes("반납완료")) return "대여 완료 건";
    if (lowerStatus.includes("대여중") || lowerStatus.includes("out"))
      return "대여 진행 건";
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
    priorityReason:
      "연결 구조가 복잡해 문서 누락/상태 불일치가 가장 자주 발생합니다.",
    nextAction:
      "앵커 문서 기준으로 연결 문서의 상태·금액·정산 대상 월을 차례대로 검수하세요.",
    params: { integrated: "1", flow: "all", kind: "all", warn: false },
    isActive: ({ integrated, flow, kind, onlyWarn }) =>
      integrated === "1" && flow === "all" && kind === "all" && !onlyWarn,
  },
  singleApplication: {
    label: "단독 신청서 처리",
    helperText: "연결되지 않은 교체서비스 신청서만 빠르게 처리합니다.",
    priorityReason:
      "단독 신청서는 후속 주문/대여 연결이 없어 처리 누락 시 장기 미처리로 남기 쉽습니다.",
    nextAction:
      "미처리 사유를 우선 확인하고 담당자 배정 또는 상태 업데이트를 즉시 진행하세요.",
    params: {
      integrated: "0",
      flow: "3",
      kind: "stringing_application",
      warn: false,
    },
    isActive: ({ integrated, flow, kind, onlyWarn }) =>
      integrated === "0" &&
      flow === "3" &&
      kind === "stringing_application" &&
      !onlyWarn,
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
  return (["order", "rental", "stringing_application"] as Kind[])
    .map((k) => byKind.get(k))
    .filter(Boolean) as OpItem[];
}

function isWarnGroup(g: { items: OpItem[] }) {
  return (g.items ?? []).some(
    (it) => it.warn === true || (it.warnReasons?.length ?? 0) > 0,
  );
}

function cancelBadgeSpec(
  status?: "none" | "requested" | "approved" | "rejected",
) {
  if (status === "requested")
    return {
      label: "취소요청",
      spec: getWorkflowMetaBadgeSpec("cancel_requested"),
    };
  if (status === "approved")
    return { label: "취소승인", spec: getPaymentStatusBadgeSpec("환불") };
  if (status === "rejected")
    return { label: "취소거절", spec: getPaymentStatusBadgeSpec("결제대기") };
  return null;
}

function cancelQuickSignalSpec(
  cancel?: OpItem["cancel"],
): {
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

type QuickActionTarget = {
  href: string;
  label: string;
};

const MEANINGFUL_QUICK_ACTION_LABELS = new Set([
  "취소 검토",
  "계좌 확인",
  "신청서 확인",
  "배송 확인",
  "대여 확인",
  "주문 확인",
]);

function resolveQuickActionTarget(
  group: {
    anchor: OpItem;
    primarySignal?: AdminOperationsGroup["primarySignal"] | null;
    nextAction?: string | null;
  },
  groupGuide: { nextAction?: string | null },
): QuickActionTarget | null {
  const anchor = group.anchor;
  const related = anchor.related;
  const signal = group.primarySignal;
  const nextActionText =
    signal?.nextAction ?? group.nextAction ?? groupGuide.nextAction ?? "";
  const signalCode = String(signal?.code ?? "").toUpperCase();
  let candidate: QuickActionTarget | null = null;

  if (!nextActionText.trim()) return null;

  if (
    nextActionText.includes("환불 계좌") ||
    nextActionText.includes("취소승인") ||
    nextActionText.includes("취소거절")
  ) {
    candidate = {
      href: anchor.href,
      label: nextActionText.includes("환불 계좌") ? "계좌 확인" : "취소 검토",
    };
  }

  if (!candidate && (nextActionText.includes("신청서") || signalCode.includes("APP"))) {
    if (anchor.kind === "stringing_application") {
      candidate = { href: anchor.href, label: "신청서 확인" };
    }
    if (!candidate && related?.kind === "stringing_application") {
      candidate = { href: related.href, label: "신청서 확인" };
    }
  }

  const needsShippingCheck =
    nextActionText.includes("배송") ||
    nextActionText.includes("출고") ||
    nextActionText.includes("운송장");
  if (!candidate && needsShippingCheck) {
    if (anchor.kind === "order") candidate = { href: anchor.href, label: "배송 확인" };
    if (!candidate && related?.kind === "order")
      candidate = { href: related.href, label: "배송 확인" };
  }

  const needsRentalCheck =
    nextActionText.includes("대여") ||
    nextActionText.includes("반납") ||
    nextActionText.includes("수령");
  if (!candidate && needsRentalCheck) {
    if (anchor.kind === "rental") candidate = { href: anchor.href, label: "대여 확인" };
    if (!candidate && related?.kind === "rental")
      candidate = { href: related.href, label: "대여 확인" };
  }

  if (!candidate && anchor.kind === "stringing_application" && related) {
    if (related.kind === "order") candidate = { href: related.href, label: "주문 확인" };
    if (!candidate && related.kind === "rental")
      candidate = { href: related.href, label: "대여 확인" };
  }

  if (!candidate) return null;
  if (candidate.href === anchor.href) return null;
  return candidate;
}

function collectReviewReasons(g: { anchor: OpItem; items: OpItem[] }) {
  const reasons = new Set<string>();
  for (const it of g.items ?? []) {
    for (const reason of it.reviewReasons ?? []) {
      const value = reason?.trim();
      if (value) reasons.add(value);
    }
  }
  return Array.from(reasons);
}

function stringSummaryText(item?: OpItem) {
  if (!item?.stringingSummary?.requested) return null;
  const summary = item.stringingSummary;
  const bits = [
    summary.name ?? "스트링 선택됨",
    summary.price ? `요금 ${won(summary.price)}` : null,
    summary.mountingFee ? `교체비 ${won(summary.mountingFee)}` : null,
    summary.applicationStatus
      ? `신청 ${summary.applicationStatus}`
      : "신청 상태 확인",
  ]
    .filter(Boolean)
    .join(" / ");
  return bits || "스트링 선택됨";
}

const thClasses =
  "px-4 py-2 text-left align-middle font-semibold text-foreground text-[11px] whitespace-nowrap";
const tdClasses = "px-4 py-2 align-top";
const th = thClasses;
const td = tdClasses;

// 액션 컬럼은 본문 셀이 sticky(right)로 고정되어 있으므로,
// 헤더도 동일하게 sticky 처리해 가로 스크롤 시 컬럼 머리글이 어긋나지 않게 맞춘다.
// 단, header 배경색은 thead의 bg-muted/50과 동일 톤을 써서 "액션"만 색이 달라 보이는 현상을 방지.
const stickyActionHeadClass =
  "sticky right-0 z-20 bg-muted/50 text-right shadow-[-8px_0_12px_-12px_hsl(var(--border))]";

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
  const [flow, setFlow] = useState<
    "all" | "1" | "2" | "3" | "4" | "5" | "6" | "7"
  >("all");
  const [integrated, setIntegrated] = useState<"all" | "1" | "0">("all"); // 1=통합만, 0=단독만
  const [onlyWarn, setOnlyWarn] = useState(false);
  const [warnFilter, setWarnFilter] = useState<
    "all" | "warn" | "caution" | "review" | "pending" | "clean"
  >("all");
  const [warnSort, setWarnSort] = useState<
    "default" | "warn_first" | "safe_first"
  >("default");
  const [page, setPage] = useState(1);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [openReasons, setOpenReasons] = useState<Record<string, boolean>>({});
  const [showActionsGuide, setShowActionsGuide] = useState(false);
  const [isFilterScrolled, setIsFilterScrolled] = useState(false);
  const [displayDensity, setDisplayDensity] = useState<"default" | "compact">(
    "default",
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

  // 필터/페이지가 바뀌면 펼침 상태를 초기화(예상치 못한 "열림 유지" 방지)
  useEffect(() => {
    setOpenGroups({});
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
    replaceNoScroll,
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

  const { data, isLoading, error, mutate } = useSWR<AdminOperationsListResponseDto>(
    key,
    authenticatedSWRFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
    },
  );
  const totalGroups = data?.pagination?.totalGroups;
  const pageSize = data?.pagination?.pageSize ?? effectivePageSize;
  const totalPages =
    typeof totalGroups === "number"
      ? Math.max(1, Math.ceil(totalGroups / pageSize))
      : null;

  // 서버 groups를 단일 source of truth로 사용한다.
  const groups = useMemo(() => {
    if (!Array.isArray(data?.groups)) return [];
    return data.groups
      .filter((group) => Array.isArray(group.items) && group.items.length > 0)
      .map((group) => {
        const anchor =
          group.items.find(
            (item) =>
              item.id === group.anchorId && item.kind === group.anchorKind,
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
  const shouldShowEmptyState = hasResolvedGroups && groupsToRender.length === 0;
  const shouldShowGlobalError = Boolean(error) && !Array.isArray(data?.groups);

  const todayTodoCount: AdminOperationsSummary | null =
    data?.summaryAll ?? (data ? { urgent: 0, caution: 0, pending: 0 } : null);

  // 펼칠 수 있는 그룹(통합 묶음)만 추림
  const expandableGroupKeys = useMemo(
    () => groupsToRender.filter((g) => g.items.length > 1).map((g) => g.key),
    [groupsToRender],
  );
  const hasExpandableGroups = expandableGroupKeys.length > 0;
  const isAllExpanded =
    hasExpandableGroups && expandableGroupKeys.every((k) => !!openGroups[k]);
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
    return qs ? `${pathname}?${qs}` : pathname;
  }, [
    flow,
    integrated,
    kind,
    onlyWarn,
    page,
    pathname,
    q,
    warnFilter,
    warnSort,
  ]);
  const shareViewFullHref = useMemo(() => {
    if (typeof window === "undefined") return shareViewHref;
    return `${window.location.origin}${shareViewHref}`;
  }, [shareViewHref]);

  function toggleAllGroups() {
    if (!hasExpandableGroups) return;
    const nextOpen = !isAllExpanded;
    const next: Record<string, boolean> = {};
    for (const k of expandableGroupKeys) next[k] = nextOpen;
    setOpenGroups(next);
  }

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
    setPage(1);
    /**
     * reset도 URL을 초기화하지만,
     * "초기화 버튼 누를 때마다 화면이 위로 튀는 것"이 싫다면 scroll:false로 동일하게 처리.
     * (만약 reset 시에는 위로 올리고 싶다면 이 줄만 scroll:true로 분리하면 됨)
     */
    router.replace(pathname, { scroll: false });
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
  }, [
    presetActive.integratedReview,
    presetActive.paymentMismatch,
    presetActive.singleApplication,
  ]);

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

  const activeKpi = useMemo(() => {
    if (warnFilter === "warn") return "urgent";
    if (warnFilter === "caution") return "caution";
    if (warnFilter === "pending") return "pending";
    return null;
  }, [warnFilter]);

  function toggleGroup(key: string) {
    setOpenGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function toggleReason(key: string) {
    setOpenReasons((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  return (
    <div className="mx-auto w-full max-w-[1560px] px-3 py-4 bp-sm:px-4 bp-md:px-3 lg:px-5 lg:py-5">
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
      <div className="mx-auto mb-4 max-w-[1480px] space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
          {PAGE_COPY.title}
        </h1>
        <p className="text-xs text-muted-foreground lg:text-sm">
          {PAGE_COPY.description}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setShowActionsGuide((prev) => !prev)}
          >
            {showActionsGuide ? "도움말 닫기" : "도움말 보기"}
          </Button>
          <p className="text-xs text-muted-foreground/90">
            우선순위: 상태 → 시나리오 → 고객 → 제목 → 다음 처리
          </p>
        </div>

        {showActionsGuide && (
          <div className="grid grid-cols-1 gap-1.5 rounded-lg border border-border/70 bg-muted/20 p-2 bp-sm:grid-cols-2 bp-lg:grid-cols-4">
            {PAGE_COPY.actions.map((action) => (
              <div key={action.title} className="rounded-md border border-border/50 bg-background/80 px-2 py-1.5">
                <p className="text-[11px] font-semibold leading-tight text-foreground">{action.title}</p>
                <p className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-muted-foreground/90">{action.description}</p>
              </div>
            ))}
          </div>
        )}

        <p className="text-sm font-medium text-foreground">
          {PAGE_COPY.dailyTodoTitle}
        </p>
        <div className="grid gap-2 grid-cols-1 bp-sm:grid-cols-3">
          <Card
            className={cn(
              "cursor-pointer border-warning/30 bg-warning/5 shadow-none transition",
              activeKpi === "urgent" && "ring-2 ring-warning/60",
            )}
            onClick={() => {
              setWarnFilter("warn");
              setOnlyWarn(false);
              setPage(1);
            }}
          >
            <CardHeader className="p-3">
              <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                <Siren className="h-4 w-4 text-warning" />
                {PAGE_COPY.dailyTodoLabels.urgent}
              </CardTitle>
              <CardDescription className="text-2xl font-bold text-foreground">
                {todayTodoCount ? `${todayTodoCount.urgent}건` : "-"}
              </CardDescription>
            </CardHeader>
          </Card>
          <Card
            className={cn(
              "cursor-pointer border-info/40 bg-info/5 shadow-none transition",
              activeKpi === "caution" && "ring-2 ring-info/60",
            )}
            onClick={() => {
              setOnlyWarn(false);
              setWarnFilter("caution");
              setPage(1);
            }}
          >
            <CardHeader className="p-3">
              <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                <BellRing className="h-4 w-4 text-info" />
                {PAGE_COPY.dailyTodoLabels.caution}
              </CardTitle>
              <CardDescription className="text-2xl font-bold text-foreground">
                {todayTodoCount ? `${todayTodoCount.caution}건` : "-"}
              </CardDescription>
              <p className="text-[11px] text-muted-foreground">확인이 필요한 항목</p>
            </CardHeader>
          </Card>
          <Card
            className={cn(
              "cursor-pointer border-primary/30 bg-primary/5 shadow-none transition",
              activeKpi === "pending" && "ring-2 ring-primary/60",
            )}
            onClick={() => {
              setOnlyWarn(false);
              setWarnFilter("pending");
              setPage(1);
            }}
          >
            <CardHeader className="p-3">
              <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                {PAGE_COPY.dailyTodoLabels.pending}
              </CardTitle>
              <CardDescription className="text-2xl font-bold text-foreground">
                {todayTodoCount ? `${todayTodoCount.pending}건` : "-"}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-sm font-semibold text-foreground">업무 모드 전환</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
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
        </div>
      </div>

      {/* 필터 및 검색 카드 */}
      <div
        className={cn(
          "top-3 z-30 mb-4 transition-all duration-200",
          isFilterScrolled && "drop-shadow-xl",
        )}
      >
        <Card
          className={cn(
            "rounded-xl border-border px-4 py-4 bp-lg:px-5 shadow-md transition-all duration-200",
            onlyWarn
              ? "bg-warning/5 border-warning/20 dark:bg-warning/10 dark:border-warning/30"
              : "bg-card",
            isFilterScrolled &&
              "bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90",
          )}
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div>
              <CardTitle>필터 및 검색</CardTitle>
              <CardDescription className="text-xs mt-1">
                검색과 핵심 필터로 바로 업무를 좁혀보세요.
              </CardDescription>
              {error && !shouldShowGlobalError && (
                <p className="mt-1 text-[11px] text-warning">
                  검색 결과를 새로 불러오지 못해 이전 결과를 유지 중입니다. 잠시 후
                  다시 시도해 주세요.
                </p>
              )}
              {activeFilterCount > 0 && (
                <Badge
                  className={cn(
                    badgeBase,
                    badgeSizeSm,
                    "mt-2 " + badgeToneClass("brand"),
                  )}
                >
                  적용된 필터 {activeFilterCount}개
                </Badge>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="shrink-0 bg-transparent"
            >
              필터 초기화
            </Button>
          </CardHeader>
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
                variant={onlyWarn ? "default" : "outline"}
                size="sm"
                title={
                  onlyWarn
                    ? "주의(오류) 항목만 조회 중"
                    : "주의(오류) 항목만 모아보기"
                }
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

              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 bg-transparent"
              >
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
                <SelectTrigger>
                  <SelectValue placeholder="종류(전체)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">종류(전체)</SelectItem>
                  <SelectItem value="order">주문</SelectItem>
                  <SelectItem value="stringing_application">신청서</SelectItem>
                  <SelectItem value="rental">대여</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={flow}
                onValueChange={(v: any) => {
                  setFlow(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="시나리오(전체)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">시나리오(전체)</SelectItem>
                  <SelectItem value="1">스트링 단품 구매</SelectItem>
                  <SelectItem value="2">
                    스트링 구매 + 교체서비스 신청(통합)
                  </SelectItem>
                  <SelectItem value="3">교체서비스 단일 신청</SelectItem>
                  <SelectItem value="4">라켓 단품 구매</SelectItem>
                  <SelectItem value="5">
                    라켓 구매 + 스트링 선택 + 교체서비스 신청(통합)
                  </SelectItem>
                  <SelectItem value="6">라켓 단품 대여</SelectItem>
                  <SelectItem value="7">
                    라켓 대여 + 스트링 선택 + 교체서비스 신청(통합)
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={integrated}
                onValueChange={(v: any) => {
                  setIntegrated(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
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
                <SelectTrigger>
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

              <Select
                value={warnSort}
                onValueChange={(v: any) => setWarnSort(v)}
              >
                <SelectTrigger>
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
                  <p className="mb-1 text-[11px] font-semibold text-primary">
                    현재 결과
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {typeof totalGroups === "number"
                      ? `${totalGroups.toLocaleString("ko-KR")}건`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-primary">
                    우선 처리 이유
                  </p>
                  <p>{PRESET_CONFIG[activePresetKey].helperText}</p>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-primary">
                    다음 처리
                  </p>
                  <p>{PRESET_CONFIG[activePresetKey].nextAction}</p>
                </div>
              </div>
            )}
            <div className="pt-1">
              <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5 text-[11px] leading-tight text-muted-foreground/90">
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                <span>
                  상태 배지는 목록에 보이는 <strong>주의 / 확인 필요</strong>만
                  사용합니다. 시나리오는 각 행 텍스트를 직접 확인하세요.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 업무 목록 카드 */}
      <Card className="rounded-xl border-border bg-card px-3 py-4 bp-sm:px-4 lg:px-5">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 bp-md:flex-row bp-md:items-center bp-md:justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-medium">업무 목록</CardTitle>
              {activePresetKey && (
                <Badge
                  className={cn(
                    badgeBase,
                    badgeSizeSm,
                    badgeToneClass("brand"),
                  )}
                >
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
          <div className="flex items-center gap-2 pt-2">
            <div className="text-xs text-muted-foreground">
              {totalPages
                ? `${page} / ${totalPages} 페이지`
                : "페이지 계산 중…"}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="bg-transparent"
              disabled={!hasExpandableGroups}
              title={
                !hasExpandableGroups
                  ? "펼칠 통합 묶음이 없습니다."
                  : "통합 묶음(연결된 문서)을 한 번에 펼치거나 접습니다."
              }
              onClick={toggleAllGroups}
            >
              {isAllExpanded ? "전체 접기" : "전체 펼치기"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="min-h-[520px] p-0 pt-2">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              업무 목록을 불러오는 중입니다.
            </div>
          ) : (
            <>
              <div className="hidden bp-lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className={cn(thClasses, "w-[24%]")}>
                        처리 상태
                      </TableHead>
                      <TableHead className={cn(thClasses, "w-[42%]")}>
                        대상 · 시나리오 · 처리
                      </TableHead>
                      <TableHead className={cn(thClasses, "w-[18%] text-right")}>
                        금액
                      </TableHead>
                      {/* <TableHead className={cn(thClasses, 'sticky right-0 z-20 bg-card text-right shadow-[-8px_0_12px_-12px_hsl(var(--border))]')}>액션</TableHead> */}
                      <TableHead
                        className={cn(thClasses, stickyActionHeadClass, "w-[16%]")}
                      >
                        액션
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupsToRender.map((g, idx) => {
                      const isGroup = g.items.length > 1;
                      const isOpen = !!openGroups[g.key];
                      const anchorKey = `${g.anchor.kind}:${g.anchor.id}`;
                      const children = g.items.filter(
                        (x) => `${x.kind}:${x.id}` !== anchorKey,
                      );
                      const reviewReasons = collectReviewReasons(g);
                      const groupGuide = inferNextActionForOperationGroup(
                        g.items,
                      );
                      const warn = g.warn;
                      const reasonSummary = summarizeReasonText(
                        g.primarySignal?.description ?? reviewReasons[0],
                      );
                      const reasonBullets = reviewReasons
                        .map((reason) => toOperatorSentence(reason))
                        .filter(Boolean);
                      const groupCancelRequested = g.items.some(
                        (it) => it.cancel?.status === "requested",
                      );
                      const nextActionText = groupNextActionText({
                        guide: groupGuide,
                        cancelRequested: groupCancelRequested,
                        reviewLevel: g.reviewLevel,
                      });
                      const reasonNeedsAttention =
                        warn ||
                        g.reviewLevel === "action" ||
                        groupCancelRequested;
                      const hasReasonCard =
                        reasonNeedsAttention ||
                        (reasonBullets.length > 0 &&
                          !isLowTensionNextAction(nextActionText)) ||
                        (Boolean(g.primarySignal?.title) &&
                          !isLowTensionNextAction(nextActionText));
                      const shouldShowReasonBullets =
                        reasonBullets.length > 0 && reasonNeedsAttention;
                      const reasonBulletCount = reasonBullets.length;
                      const isReasonOpen = !!openReasons[g.key];
                      const customerName =
                        g.anchor.customer?.name?.trim() || "";
                      const customerEmail =
                        g.anchor.customer?.email?.trim() || "";
                      const customerPrimary = customerName || customerEmail || "-";
                      const docLabel = `${opsKindLabel(g.anchor.kind)} · ${shortenId(g.anchor.id)}`;
                      const scenarioLabel = flowLabelText(g.anchor);
                      const createdAtLabel = formatKST(
                        g.anchor.createdAt ?? g.createdAt,
                      );
                      const headline = statusHeadlineOf(g.anchor);
                      const quickActionTarget = resolveQuickActionTarget(
                        {
                          anchor: g.anchor,
                          primarySignal: g.primarySignal,
                          nextAction: groupGuide.nextAction,
                        },
                        groupGuide,
                      );
                      const actionableQuickTarget =
                        quickActionTarget &&
                        MEANINGFUL_QUICK_ACTION_LABELS.has(
                          quickActionTarget.label,
                        )
                          ? quickActionTarget
                          : null;
                      const anchorCancelQuickSignal = cancelQuickSignalSpec(
                        g.anchor.cancel,
                      );
                      const linkedDocsForAnchor = isGroup
                        ? children.map((x) => ({
                            kind: x.kind,
                            id: x.id,
                            href: x.href,
                          }))
                        : g.anchor.related
                          ? [g.anchor.related]
                          : [];

                      const rowDensityClass =
                        displayDensity === "compact" ? "py-1.5" : "py-2.5";
                      const rowBaseToneClass =
                        idx % 2 === 0 ? "bg-background" : "bg-muted/[0.18]";
                      const warnEmphasisClass = warn
                        ? "border-l-2 border-l-warning/60 bg-warning/[0.08]"
                        : "border-l-2 border-l-transparent";
                      const stickyActionCellClass =
                        "sticky right-0 z-10 bg-inherit shadow-[-8px_0_12px_-12px_hsl(var(--border))]";

                      return (
                        <Fragment key={g.key}>
                          <TableRow
                            className={cn(
                              "transition-colors hover:bg-muted/35",
                              rowBaseToneClass,
                              warnEmphasisClass,
                            )}
                          >
                            <TableCell
                              className={cn(tdClasses, rowDensityClass)}
                            >
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge
                                    className={cn(
                                      badgeBase,
                                      badgeSizeSm,
                                      warn
                                        ? badgeToneClass("warning")
                                        : badgeToneClass("neutral"),
                                    )}
                                  >
                                    {warn ? "주의" : "정상"}
                                  </Badge>
                                  {!warn && g.reviewLevel === "action" && (
                                    <Badge
                                      variant={
                                        getWorkflowMetaBadgeSpec("action_required")
                                          .variant
                                      }
                                      className={cn(badgeBase, badgeSizeSm)}
                                    >
                                      확인 필요
                                    </Badge>
                                  )}
                                  <span className="text-[10px] text-muted-foreground/80">
                                    {isGroup ? `${g.items.length}건 그룹` : "단일 건"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/90">
                                  <span>{docLabel}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                    onClick={() => copyToClipboard(g.anchor.id)}
                                    title={ROW_ACTION_LABELS.copyId}
                                    aria-label={ROW_ACTION_LABELS.copyId}
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <p className="text-[11px] text-muted-foreground/85 leading-tight">
                                  접수 {createdAtLabel}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell
                              className={cn(tdClasses, rowDensityClass)}
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-start gap-2">
                                  {isGroup && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="mt-0.5 h-6 w-6 p-0"
                                      onClick={() => toggleGroup(g.key)}
                                      title={
                                        isOpen ? "운영 참고 접기" : "운영 참고 펼치기"
                                      }
                                    >
                                      {isOpen ? (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      ) : (
                                        <ChevronRight className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  )}
                                  <div className="min-w-0 space-y-0.5">
                                    <p className="text-[11px] text-muted-foreground/90 leading-tight">
                                      {scenarioLabel}
                                    </p>
                                    <p className="text-[13px] font-medium text-foreground/85 leading-tight">
                                      {customerPrimary}
                                    </p>
                                    {customerName && customerEmail && (
                                      <p className="text-[11px] text-muted-foreground/90 leading-tight">
                                        {customerEmail}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <p className="text-[15px] font-semibold leading-tight text-foreground line-clamp-1">
                                  {headline}
                                </p>
                                <p className="text-[12px] text-foreground/95 line-clamp-1">
                                  <span className="font-semibold text-primary/90">
                                    다음 처리:
                                  </span>{" "}
                                  {nextActionText}
                                </p>
                                {hasReasonCard && (
                                  <div className="space-y-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-1 text-[11px] font-medium text-muted-foreground"
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
                                      <div className="overflow-hidden rounded-sm border border-border/40 bg-muted/[0.08] px-1.5 py-1">
                                        <p className="text-[11px] text-muted-foreground/90">
                                          {reasonSummary}
                                        </p>
                                        {shouldShowReasonBullets && (
                                          <ul className="mt-0.5 space-y-0.5">
                                            {reasonBullets.slice(0, 3).map((reason) => (
                                              <li
                                                key={`reason:${g.key}:${reason}`}
                                                className="list-inside list-disc text-[11px] text-muted-foreground/85 line-clamp-1"
                                              >
                                                {reason}
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            <TableCell
                              className={cn(
                                tdClasses,
                                rowDensityClass,
                                "font-semibold text-right",
                              )}
                            >
                              <div className="flex flex-col items-end gap-1.5">
                                <div className="text-right">
                                <span className="text-[11px] text-muted-foreground/90">
                                  {isGroup ? "대표 문서 금액" : opsKindLabel(g.anchor.kind)}
                                </span>
                                  <p className="text-lg font-extrabold whitespace-nowrap tracking-tight">
                                    {won(g.anchor.amount)}
                                  </p>
                                </div>
                                {(() => {
                                  const cancelBadge = cancelBadgeSpec(
                                    g.anchor.cancel?.status,
                                  );
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
                                            badgeToneClass(
                                              anchorCancelQuickSignal.tone,
                                            ),
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
                                          {toOperatorSentence(
                                            anchorCancelQuickSignal.tooltipCopy,
                                          )}
                                        </p>
                                        {g.anchor.cancel?.refundBankLabel && (
                                          <p className="mt-1 text-xs text-muted-foreground">
                                            환불 은행:{" "}
                                            {g.anchor.cancel.refundBankLabel}
                                          </p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {amountMeaningText(g.anchor) ? (
                                  <span className="text-[11px] text-muted-foreground/85 line-clamp-1 text-right">
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
                                  {actionableQuickTarget && (
                                    <Button
                                      asChild
                                      size="sm"
                                      variant="default"
                                      className="h-8 min-w-[96px] justify-center px-2.5 text-xs font-semibold shadow-sm"
                                      title={groupGuide.nextAction ?? actionableQuickTarget.label}
                                    >
                                      <Link href={actionableQuickTarget.href} className="text-xs">
                                        {actionableQuickTarget.label}
                                      </Link>
                                    </Button>
                                  )}
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      asChild
                                      size="sm"
                                      variant="secondary"
                                      className="h-8 min-w-[68px] px-2 text-xs"
                                      title={ROW_ACTION_LABELS.detail}
                                    >
                                      <Link
                                        href={g.anchor.href}
                                        className="flex items-center gap-1"
                                        aria-label={ROW_ACTION_LABELS.detail}
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                        <span className="text-xs">상세</span>
                                      </Link>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>

                          {isGroup && (
                            <TableRow className="bg-muted/20">
                              <TableCell
                                colSpan={4}
                                className={cn(
                                  tdClasses,
                                  "border-l-2 border-l-primary/25 border-t border-border/40 py-0",
                                )}
                              >
                                <div
                                  className={cn(
                                    "grid transition-all duration-200 ease-out",
                                    isOpen
                                      ? "grid-rows-[1fr] opacity-100 py-2"
                                      : "grid-rows-[0fr] opacity-0",
                                  )}
                                >
                                  <div className="overflow-hidden">
                                    <div className="mb-1.5 flex items-center gap-2">
                                      <ChevronDown className="h-3.5 w-3.5 text-primary" />
                                      <p className="text-[11px] font-semibold text-foreground">
                                        운영 참고 정보
                                      </p>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1.5 border-y border-border/50 bg-muted/10 px-2 py-1 text-[11px] font-medium text-muted-foreground/90">
                                      <span>문서 · 상태</span>
                                      <span>처리 안내</span>
                                      <span className="text-right">금액</span>
                                      <span>연결 정보</span>
                                    </div>
                                    <div className="divide-y divide-border/40 border-b border-border/50 bg-background/10">
                                      {g.items.map((item) => (
                                        <div
                                          key={`detail:${g.key}:${item.kind}:${item.id}`}
                                          className="grid grid-cols-4 gap-1.5 px-2 py-1 text-[11px] leading-tight"
                                        >
                                          <div>
                                            <div className="flex items-center gap-1">
                                              <Link
                                                href={item.href}
                                                className="font-medium text-foreground hover:underline"
                                              >
                                                {opsKindLabel(item.kind)} · {shortenId(item.id)}
                                              </Link>
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                className="h-5 w-5 p-0 text-muted-foreground"
                                                onClick={() => copyToClipboard(item.id)}
                                                aria-label={ROW_ACTION_LABELS.copyId}
                                              >
                                                <Copy className="h-3 w-3" />
                                              </Button>
                                            </div>
                                            <p className="text-muted-foreground">
                                              {item.statusDisplayLabel ?? item.statusLabel}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-foreground">
                                              {toOperatorSentence(item.nextAction ?? groupGuide.nextAction)}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground/90">
                                              결제 상태: {item.paymentLabel || "정보 없음"}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground/90">
                                              {formatKST(item.createdAt)}
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <p className="font-semibold text-foreground">
                                              {won(item.amount)}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground/90">
                                              {item.kind === "stringing_application"
                                                ? "신청서"
                                                : item.kind === "rental"
                                                  ? "대여"
                                                  : "주문"}
                                            </p>
                                            {amountMeaningText(item) ? (
                                              <p className="text-[11px] text-muted-foreground/85">
                                                {amountMeaningText(item)}
                                              </p>
                                            ) : null}
                                          </div>
                                          <div className="text-muted-foreground">
                                            {toOperatorSentence(item.stage ?? groupGuide.stage)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] leading-tight text-muted-foreground/90">
                                      <span>기준 시각 {formatKST(g.createdAt ?? g.anchor.createdAt)}</span>
                                      {g.anchor.flow === 7 && (
                                        <span>
                                          스트링 요약:{" "}
                                          {stringSummaryText(
                                            g.items.find((it) => it.kind === "rental"),
                                          ) ?? "정보 없음"}
                                        </span>
                                      )}
                                      {linkedDocsForAnchor.length > 0 && (
                                        <span>연결 문서 {linkedDocsForAnchor.length}건</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}

                    {shouldShowEmptyState && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={4} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Search className="h-8 w-8 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">
                              {onlyWarn
                                ? "주의(실제 오류) 조건에 해당하는 결과가 없습니다."
                                : "결과가 없습니다."}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 bp-lg:hidden">
                {groupsToRender.map((g) => {
                  const warn = g.warn;
                  const isOpen = !!openGroups[g.key];
                  const reviewReasons = collectReviewReasons(g);
                  const groupGuide = inferNextActionForOperationGroup(g.items);
                  const reasonSummary = summarizeReasonText(
                    g.primarySignal?.description ?? reviewReasons[0],
                  );
                  const reasonBullets = reviewReasons
                    .map((reason) => toOperatorSentence(reason))
                    .filter(Boolean);
                  const customerName = g.anchor.customer?.name?.trim() || "";
                  const customerEmail = g.anchor.customer?.email?.trim() || "";
                  const customerPrimary = customerName || customerEmail || "-";
                  const scenarioLabel = flowLabelText(g.anchor);
                  const createdAtLabel = formatKST(g.anchor.createdAt ?? g.createdAt);
                  const headline = statusHeadlineOf(g.anchor);
                  const quickActionTarget = resolveQuickActionTarget(
                    {
                      anchor: g.anchor,
                      primarySignal: g.primarySignal,
                      nextAction: groupGuide.nextAction,
                    },
                    groupGuide,
                  );
                  const actionableQuickTarget =
                    quickActionTarget &&
                    MEANINGFUL_QUICK_ACTION_LABELS.has(quickActionTarget.label)
                      ? quickActionTarget
                      : null;
                  const groupCancelRequested = g.items.some(
                    (it) => it.cancel?.status === "requested",
                  );
                  const nextActionText = groupNextActionText({
                    guide: groupGuide,
                    cancelRequested: groupCancelRequested,
                    reviewLevel: g.reviewLevel,
                  });
                  const reasonNeedsAttention =
                    warn || g.reviewLevel === "action" || groupCancelRequested;
                  const hasReasonCard =
                    reasonNeedsAttention ||
                    (reasonBullets.length > 0 &&
                      !isLowTensionNextAction(nextActionText)) ||
                    (Boolean(g.primarySignal?.title) &&
                      !isLowTensionNextAction(nextActionText));
                  const shouldShowReasonBullets =
                    reasonNeedsAttention && reasonBullets.length > 0;
                  const reasonBulletCount = reasonBullets.length;
                  const isReasonOpen = !!openReasons[g.key];
                  const anchorCancelQuickSignal = cancelQuickSignalSpec(
                    g.anchor.cancel,
                  );
                  return (
                    <Card key={`m:${g.key}`} className="border-border shadow-sm">
                      <CardContent className="space-y-1.5 p-1.5">
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              className={cn(
                                badgeBase,
                                badgeSizeSm,
                                warn
                                  ? badgeToneClass("warning")
                                  : badgeToneClass("neutral"),
                              )}
                            >
                              {warn ? "주의" : "정상"}
                            </Badge>
                            {!warn && g.reviewLevel === "action" && (
                              <Badge
                                variant={
                                  getWorkflowMetaBadgeSpec("action_required")
                                    .variant
                                }
                                className={cn(badgeBase, badgeSizeSm)}
                              >
                                확인 필요
                              </Badge>
                            )}
                            <span className="text-[11px] leading-tight text-muted-foreground/90">
                              {g.items.length > 1 ? `${g.items.length}건 그룹` : "단일 건"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] leading-snug text-muted-foreground">
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
                          <p className="text-[11px] leading-snug text-muted-foreground">
                            접수 {createdAtLabel}
                          </p>
                        </div>

                        <div className="flex items-baseline justify-between gap-2">
                          <div>
                            <p className="text-[11px] leading-snug text-muted-foreground">
                              {scenarioLabel}
                            </p>
                            <span className="text-[13px] font-medium text-foreground/85">
                              {customerPrimary}
                            </span>
                            {customerName && customerEmail && (
                              <p className="text-[11px] leading-snug text-muted-foreground">
                                {customerEmail}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] leading-snug text-muted-foreground">
                              {g.items.length > 1 ? "대표 문서 금액" : opsKindLabel(g.anchor.kind)}
                            </p>
                            <span className="text-base font-extrabold tracking-tight text-foreground">
                              {won(g.anchor.amount)}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm font-semibold text-foreground line-clamp-1">
                          {headline}
                        </p>
                        <p className="text-[12px] text-foreground line-clamp-1">
                          <span className="mr-1 font-semibold text-primary">
                            다음 처리
                          </span>
                          {nextActionText}
                        </p>
                        {hasReasonCard && (
                          <div className="space-y-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1 text-[11px] font-medium text-foreground/75 hover:text-foreground"
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
                                <p className="text-[11px] leading-snug text-muted-foreground line-clamp-2">
                                  {reasonSummary}
                                </p>
                                {shouldShowReasonBullets && (
                                  <ul className="mt-0.5 space-y-px">
                                    {reasonBullets.slice(0, 3).map((reason) => (
                                      <li
                                        key={`m-reason:${g.key}:${reason}`}
                                        className="list-inside list-disc text-[11px] leading-snug text-muted-foreground line-clamp-1"
                                      >
                                        {reason}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {actionableQuickTarget && (
                            <Button
                              asChild
                              size="sm"
                              variant="default"
                              className="h-8 min-w-[96px] px-2.5 text-xs font-semibold shadow-sm"
                            >
                              <Link href={actionableQuickTarget.href}>
                                {actionableQuickTarget.label}
                              </Link>
                            </Button>
                          )}
                          <Button
                            asChild
                            size="sm"
                            variant="secondary"
                            className="h-8 min-w-[68px] px-2 text-xs"
                          >
                            <Link
                              href={g.anchor.href}
                              className="inline-flex items-center gap-1"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              상세
                            </Link>
                          </Button>
                          {g.items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-auto h-7 px-2 text-[11px] text-foreground/75 hover:text-foreground"
                              onClick={() => toggleGroup(g.key)}
                            >
                              {isOpen ? "접기" : "운영 참고"}
                            </Button>
                          )}
                        </div>

                        <div
                          className={cn(
                            "grid transition-all duration-200 ease-out",
                            isOpen
                              ? "grid-rows-[1fr] opacity-100"
                              : "grid-rows-[0fr] opacity-0",
                          )}
                        >
                          <div className="overflow-hidden">
                            <div className="space-y-0.5 border-t border-border/50 pt-0.5">
                              <p className="text-[11px] leading-snug text-muted-foreground">
                                기준 시각: {formatKST(g.createdAt ?? g.anchor.createdAt)}
                              </p>
                              <div className="border border-border/50 bg-background/20">
                                <div className="grid grid-cols-[1fr_auto] gap-1 border-b border-border/50 bg-muted/10 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                                  <span>문서 · 상태</span>
                                  <span className="text-right">금액</span>
                                </div>
                                <div className="divide-y divide-border/40">
                                {g.items.map((item) => (
                                  <div
                                    key={`m-detail:${g.key}:${item.kind}:${item.id}`}
                                    className="grid grid-cols-[1fr_auto] gap-1 px-1.5 py-0.5 text-[11px] leading-snug"
                                  >
                                    <div>
                                      <div className="flex items-center gap-1">
                                        <Link
                                          href={item.href}
                                          className="font-medium text-foreground hover:underline"
                                        >
                                          {opsKindLabel(item.kind)} · {shortenId(item.id)}
                                        </Link>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          className="h-5 w-5 p-0 text-muted-foreground"
                                          onClick={() => copyToClipboard(item.id)}
                                          aria-label={ROW_ACTION_LABELS.copyId}
                                        >
                                          <Copy className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      <p className="text-muted-foreground">
                                        {item.statusDisplayLabel ?? item.statusLabel}
                                      </p>
                                      <p className="text-muted-foreground/90">
                                        결제 상태: {item.paymentLabel || "정보 없음"}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-semibold text-foreground">
                                        {won(item.amount)}
                                      </p>
                                      <p className="text-[11px] leading-snug text-muted-foreground">
                                        {item.kind === "stringing_application"
                                          ? "신청서"
                                          : item.kind === "rental"
                                            ? "대여"
                                            : "주문"}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                                </div>
                              </div>
                            {amountMeaningText(g.anchor) ? (
                              <p className="text-[11px] leading-tight text-muted-foreground/85 line-clamp-1">
                                {amountMeaningText(g.anchor)}
                              </p>
                            ) : null}
                            {g.primarySignal && (
                              <p className="text-[11px] leading-tight text-muted-foreground/85">
                                참고:{" "}
                                {toOperatorSentence(
                                  g.primarySignal.description ??
                                    g.primarySignal.title,
                                )}
                              </p>
                            )}
                            {g.anchor.flow === 7 && (
                              <p className="text-xs text-muted-foreground">
                                스트링 요약:{" "}
                                {stringSummaryText(
                                  g.items.find((it) => it.kind === "rental"),
                                ) ?? "정보 없음"}
                              </p>
                            )}
                          </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {shouldShowEmptyState && (
                  <div className="rounded-md border border-dashed border-border px-3 py-10 text-center text-sm text-muted-foreground">
                    표시할 항목이 없습니다.
                  </div>
                )}
              </div>
            </>
          )}

          {/* 페이지네이션 */}
          {totalPages && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 pt-4 mt-4">
              <p className="text-xs text-muted-foreground">
                {page} / {totalPages} 페이지 (총{" "}
                {(totalGroups ?? 0).toLocaleString("ko-KR")}그룹)
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
    </div>
  );
}
