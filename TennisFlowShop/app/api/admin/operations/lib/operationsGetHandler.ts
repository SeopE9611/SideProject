import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import type { Document, Filter } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { createPackagePaymentCheckFilter } from "@/app/api/admin/_lib/packagePaymentCheckFilter";
import {
  toISO,
  normalizeOrderStatus,
  normalizePaymentStatus,
  normalizeRentalStatus,
  summarizeOrderItems,
  pickCustomerFromDoc,
  normalizeRentalAmountTotal,
  normalizeRentalPaymentMeta,
} from "@/lib/admin-ops-normalize";
import type {
  AdminOperationFlow as Flow,
  AdminOperationItem as OpItem,
  AdminOperationKind as Kind,
  AdminOperationReviewLevel,
  AdminOperationsGroup,
  SettlementAnchor,
  AdminOperationsListRequestDto,
  AdminOperationsListResponseDto,
  AdminOperationsSummary,
  AdminOperationsWarnFilter,
  AdminOperationsWarnSort,
  LinkedFlowStatusIssue,
  OperationSignal,
  OperationSignalCounts,
  OperationSignalLevel,
} from "@/types/admin/operations";
import { enforceAdminRateLimit } from "@/lib/admin/adminRateLimit";
import { ADMIN_EXPENSIVE_ENDPOINT_POLICIES } from "@/lib/admin/adminEndpointCostPolicy";
import { inferNextActionForOperationItem } from "@/lib/admin/next-action-guidance";
import { needsOrderCancelFinalization } from "@/lib/orders/cancel-finalization";
import { getOrderStatusLabelForDisplay, isVisitPickupOrder } from "@/lib/order-shipping";
import { getRefundBankLabel } from "@/lib/cancel-request/refund-account";
import { isLikelyEmailQuery, normalizeEmailForSearch } from "@/lib/search-email";
/** Responsibility: admin operations 목록 조회의 query/transform/response 조합. */

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const MAX_FETCH_EACH = 300; // 각 컬렉션에서 상위 N개만 가져온 뒤 merge/sort
const SEARCH_FETCH_EACH = 4000; // 검색 시 누락 방지를 위해 조회 범위를 확대

// warn=1 (경고만 보기) 서버 필터
type OpGroup = {
  key: string;
  anchor: OpItem;
  createdAt: string | null;
  items: OpItem[]; // anchor 포함
};

const KIND_PRIORITY: Record<Kind, number> = {
  order: 0,
  rental: 1,
  stringing_application: 2,
  package_purchase: 3,
};

type UnknownDoc = Record<string, unknown>;
type UnknownArray = UnknownDoc[];
type Measure = <T>(name: string, work: Promise<T> | (() => Promise<T> | T)) => Promise<T>;
type AdminOperationsGetOptions = {
  measure?: Measure;
};

function asDoc(value: unknown): UnknownDoc | null {
  return typeof value === "object" && value !== null ? (value as UnknownDoc) : null;
}

function asDocArray(value: unknown): UnknownArray {
  return Array.isArray(value)
    ? value.filter((item): item is UnknownDoc => asDoc(item) !== null)
    : [];
}

function getString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function getIdString(value: unknown): string | null {
  const asString = getString(value);
  if (asString) return asString;
  const obj = asDoc(value);
  if (!obj) return null;
  if (typeof obj.toString === "function") return obj.toString();
  return null;
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildIdCandidates(q: string) {
  const candidates: Array<string | ObjectId> = [q];
  if (ObjectId.isValid(q)) candidates.push(new ObjectId(q));
  return candidates;
}

function buildSearchRegex(q: string) {
  return new RegExp(escapeRegex(q), "i");
}

function buildPrefixRegex(q: string) {
  return new RegExp(`^${escapeRegex(q)}`, "i");
}

function buildCaseSensitivePrefixRegex(q: string) {
  return new RegExp(`^${escapeRegex(q)}`);
}

type NormalizedCancel = {
  status: "none" | "requested" | "approved" | "rejected" | "approved_pending_pg_cancel";
  requestedAt?: string | null;
  handledAt?: string | null;
  reason?: string;
  refundAccountReady?: boolean;
  refundBankLabel?: string | null;
};

function normalizeCancelStatus(raw: unknown): NormalizedCancel["status"] {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!v) return "none";
  if (v === "requested" || v === "요청") return "requested";
  if (v === "approved_pending_pg_cancel" || v === "cancel_processing" || v === "취소처리중")
    return "approved_pending_pg_cancel";
  if (v === "approved" || v === "승인") return "approved";
  if (v === "rejected" || v === "거절") return "rejected";
  return "none";
}

function hasRefundAccount(account: UnknownDoc | null) {
  if (!account) return false;
  const bank = getString(account.bank)?.trim();
  const number = getString(account.account)?.trim();
  const holder = getString(account.holder)?.trim();
  return Boolean(bank && number && holder);
}

function resolveRefundBankLabel(account: UnknownDoc | null) {
  if (!account) return null;
  const bank = getString(account.bank)?.trim();
  if (!bank) return null;
  return getRefundBankLabel(bank);
}

function normalizeCancelRequest(doc: UnknownDoc): NormalizedCancel {
  const cancel = asDoc(doc?.cancelRequest);
  const status = normalizeCancelStatus(cancel?.status);
  const requestedAt = toISO(cancel?.requestedAt ?? cancel?.createdAt ?? null);
  const handledAt = toISO(cancel?.processedAt ?? cancel?.approvedAt ?? cancel?.rejectedAt ?? null);
  const reasonCode = getString(cancel?.reasonCode);
  const reasonText = getString(cancel?.reasonText) ?? getString(cancel?.rejectReason);
  const reason = [reasonCode, reasonText].filter(Boolean).join(" · ") || undefined;
  const refundAccount = asDoc(cancel?.refundAccount);
  const refundAccountReady = status === "none" ? undefined : hasRefundAccount(refundAccount);
  const refundBankLabel = status === "none" ? null : resolveRefundBankLabel(refundAccount);
  return {
    status,
    requestedAt,
    handledAt,
    reason,
    refundAccountReady,
    refundBankLabel,
  };
}

function hasRacketItems(items: unknown) {
  return asDocArray(items).some((it) => it.kind === "racket" || it.kind === "used_racket");
}

function hasOrderShippingInfo(order: UnknownDoc) {
  const shippingInfo = asDoc(order?.shippingInfo);
  if (!shippingInfo) return false;

  const shippingMethod =
    getString(shippingInfo.shippingMethod) ?? getString(shippingInfo.deliveryMethod);
  const estimatedDate = getString(shippingInfo.estimatedDate);
  const invoice = asDoc(shippingInfo.invoice);
  const invoiceCourier = getString(invoice?.courier);
  const trackingNumber = getString(invoice?.trackingNumber);

  // 방문 수령은 택배 필드가 없어도 정상 케이스로 본다.
  if (isVisitPickupOrder(shippingMethod)) return true;

  return Boolean(
    (shippingMethod && shippingMethod.trim()) ||
    (estimatedDate && estimatedDate.trim()) ||
    (invoiceCourier && invoiceCourier.trim()) ||
    (trackingNumber && trackingNumber.trim()),
  );
}

function flowLabelOf(flow: Flow) {
  switch (flow) {
    case 1:
      return "레거시 · 스트링 단품 구매";
    case 2:
      return "스트링 구매 + 교체서비스 신청(통합)";
    case 3:
      return "교체서비스 단일 신청";
    case 4:
      return "레거시 · 라켓 단품 구매";
    case 5:
      return "라켓 구매 + 스트링 선택 + 교체서비스 신청(통합)";
    case 6:
      return "레거시 · 라켓 단품 대여";
    case 7:
      return "라켓 대여 + 스트링 선택 + 교체서비스 신청(통합)";
    case 8:
      return "패키지 구매";
    default:
      return "미분류";
  }
}

function settlementLabelOf(anchor: SettlementAnchor) {
  // 화면에서 “금액=정산금액?” 혼동을 막기 위한 최소 라벨
  switch (anchor) {
    case "order":
      return "정산: 주문";
    case "rental":
      return "정산: 대여";
    case "application":
      return "정산: 신청(단독)";
    case "package_purchase":
      return "정산: 패키지 구매";
    default:
      return "정산: -";
  }
}

function orderFlowByHasRacket(hasRacket: boolean, integrated: boolean): Flow {
  if (integrated) return (hasRacket ? 5 : 2) as Flow;
  return (hasRacket ? 4 : 1) as Flow;
}

function rentalFlowByWithService(withService: boolean): Flow {
  return (withService ? 7 : 6) as Flow;
}

function groupKeyOf(it: OpItem): string {
  // 주문/대여는 자기 자신이 앵커
  if (it.kind === "order") return `order:${it.id}`;
  if (it.kind === "rental") return `rental:${it.id}`;
  if (it.kind === "package_purchase") return `package_purchase:${it.id}`;

  // 신청서는 연결된 "주문/대여"를 앵커로
  const rel = it.related;
  if (rel?.kind === "order") return `order:${rel.id}`;
  if (rel?.kind === "rental") return `rental:${rel.id}`;
  // 단독 신청서
  return `app:${it.id}`;
}

function pickAnchor(groupItems: OpItem[]): OpItem {
  return (
    groupItems.find((x) => x.kind === "order") ??
    groupItems.find((x) => x.kind === "rental") ??
    groupItems[0]!
  );
}

const VALID_LINKED_ORDER_STRINGING_STATUS_PAIRS = new Set([
  "대기중:검토중",
  "결제완료:접수완료",
  "결제완료:작업중",
  "배송중:교체완료",
  "배송완료:교체완료",
]);

function normalizeLinkedStatus(value: string | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "");
}

function getLinkedOrderStringingStatusIssue(items: OpItem[]): LinkedFlowStatusIssue | null {
  const order = items.find((item) => item.kind === "order");
  const application = items
    .filter(
      (item) =>
        item.kind === "stringing_application" &&
        item.related?.kind === "order" &&
        (!order || item.related.id === order.id) &&
        normalizeLinkedStatus(item.statusLabel).toLowerCase() !== "draft",
    )
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    })[0];
  const integrityReason = items
    .flatMap((item) => item.warnReasons ?? [])
    .find((reason) =>
      ["찾지 못했습니다", "DB에 없습니다", "불일치", "역방향 링크"].some((keyword) =>
        reason.includes(keyword),
      ),
    );

  if (integrityReason && (order || application)) {
    const missing =
      integrityReason.includes("찾지 못했습니다") || integrityReason.includes("DB에 없습니다");
    const target = order ?? application!;
    return {
      severity: "warning",
      code: missing ? "LINKED_DOC_MISSING" : "LINKED_DOC_REFERENCE_MISMATCH",
      title: "연결 문서 확인 필요",
      message: integrityReason,
      orderStatus: order?.statusLabel ?? "-",
      applicationStatus: application?.statusLabel ?? "-",
      actionHref: order ? `/admin/orders/${order.id}` : target.href,
      actionLabel: order ? "통합 주문 관리" : "신청서 확인",
    };
  }

  if (!order || !application) return null;

  const orderStatus = normalizeLinkedStatus(order.statusLabel);
  const applicationStatus = normalizeLinkedStatus(application.statusLabel);
  const statusPair = `${orderStatus}:${applicationStatus}`;
  if (VALID_LINKED_ORDER_STRINGING_STATUS_PAIRS.has(statusPair)) return null;

  const isClosed = (status: string) =>
    !isCancelProcessingStatus(status) &&
    ["취소", "환불", "구매확정", "cancel", "refund", "confirmed"].some((keyword) =>
      status.toLowerCase().includes(keyword.toLowerCase()),
    );
  if (isClosed(orderStatus) || isClosed(applicationStatus)) return null;

  const transientPairs = new Set([
    "대기중:접수완료",
    "결제완료:검토중",
    "배송중:작업중",
    "배송완료:작업중",
  ]);
  const isTransient = transientPairs.has(statusPair);

  return {
    severity: isTransient ? "review" : "warning",
    code: "LINKED_STATUS_MISMATCH",
    title: isTransient ? "통합 단계 검토" : "통합 단계 확인 필요",
    message: isTransient
      ? "주문과 교체서비스 신청서가 다음 단계 처리 전 일시적으로 어긋날 수 있는 조합입니다. 다음 작업 시 현재 단계를 함께 확인하세요."
      : "주문과 교체서비스 신청서의 진행 단계가 표준 처리 흐름과 다릅니다. 통합 주문 관리에서 현재 단계와 다음 작업을 확인하세요.",
    orderStatus: order.statusLabel,
    applicationStatus: application.statusLabel,
    actionHref: `/admin/orders/${order.id}`,
    actionLabel: "통합 주문 관리",
  };
}

function isWarnGroup(g: OpGroup) {
  return (g.items ?? []).some((it) => it.warn);
}

function deriveStringingPaymentLabel(app: UnknownDoc): {
  paymentLabel: string;
  derived: boolean;
  source: "explicit" | "package" | "order" | "rental" | "service_paid" | "pending" | "unknown";
} {
  const rawPaymentStatus = getString(app?.paymentStatus);
  if (rawPaymentStatus && rawPaymentStatus.trim()) {
    return {
      paymentLabel: normalizePaymentStatus(rawPaymentStatus),
      derived: false,
      source: "explicit",
    };
  }

  if (app?.packageApplied === true) {
    return { paymentLabel: "패키지차감", derived: true, source: "package" };
  }

  const paymentSource = getString(app?.paymentSource) ?? "";
  if (paymentSource.startsWith("order:")) {
    return { paymentLabel: "주문결제포함", derived: true, source: "order" };
  }

  if (paymentSource.startsWith("rental:")) {
    return { paymentLabel: "대여결제포함", derived: true, source: "rental" };
  }

  if (app?.servicePaid === true) {
    return { paymentLabel: "결제완료", derived: true, source: "service_paid" };
  }

  const totalPrice = Number(app?.totalPrice ?? 0);
  const serviceAmount = Number(app?.serviceAmount ?? 0);
  if (totalPrice > 0 || serviceAmount > 0) {
    return { paymentLabel: "결제대기", derived: true, source: "pending" };
  }

  return { paymentLabel: "확인필요", derived: true, source: "unknown" };
}

function filterWarnGroups(list: OpItem[]): OpItem[] {
  const map = new Map<string, OpItem[]>();
  for (const it of list) {
    const key = groupKeyOf(it);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(it);
  }

  const groups: OpGroup[] = Array.from(map.entries()).map(([key, items]) => {
    items.sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind]);
    const anchor = pickAnchor(items);
    const ts = Math.max(...items.map((x) => (x.createdAt ? new Date(x.createdAt).getTime() : 0)));
    const createdAt = ts ? new Date(ts).toISOString() : null;
    return { key, anchor, createdAt, items };
  });

  const warnGroups = groups.filter((g) => isWarnGroup(g));

  // 그룹 최신순(운영자가 "최근 경고"부터 본다)
  warnGroups.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  // 그룹 내부는 kind 우선순위(주문 → 대여 → 신청서)
  return warnGroups.flatMap((g) => g.items);
}

function signalLevelPriority(level: OperationSignalLevel) {
  if (level === "warn") return 4;
  if (level === "review") return 3;
  if (level === "pending") return 2;
  return 1;
}

function dedupeSignals(signals: OperationSignal[]): OperationSignal[] {
  const seen = new Set<string>();
  const out: OperationSignal[] = [];
  for (const signal of signals) {
    const key = [
      signal.title,
      signal.description,
      signal.code,
      signal.sourceKind,
      signal.sourceId,
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(signal);
  }
  return out;
}

function normalizeStatusText(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function isCancelApproved(item: OpItem) {
  return item.cancel?.status === "approved";
}

function isCancelProcessingStatus(status?: string | null) {
  const s = normalizeStatusText(status);
  return (
    s === "취소처리중" || s === "cancel_processing" || s === "approved_pending_pg_cancel"
  );
}

function isCancelProcessingItem(item: OpItem) {
  return (
    item.cancel?.status === "approved_pending_pg_cancel" ||
    isCancelProcessingStatus(item.statusLabel) ||
    isCancelProcessingStatus(item.statusDisplayLabel)
  );
}

function isOrderTerminalStatus(status?: string | null) {
  if (isCancelProcessingStatus(status)) return false;
  const s = normalizeStatusText(status);
  return (
    s.includes("취소") ||
    s.includes("환불") ||
    s.includes("결제취소") ||
    s.includes("구매확정") ||
    s === "canceled" ||
    s === "cancelled" ||
    s === "refunded" ||
    s === "confirmed"
  );
}

function isClosedForNicePaymentSync(status?: string | null) {
  if (isCancelProcessingStatus(status)) return false;
  const s = normalizeStatusText(status);
  return (
    s.includes("취소") ||
    s.includes("환불") ||
    s.includes("결제취소") ||
    s === "canceled" ||
    s === "cancelled" ||
    s === "refunded"
  );
}

const VISIT_STRINGING_COLLECTION_METHOD_VALUES = [
  "visit",
  "pickup",
  "store_pickup",
  "visit_pickup",
  "방문수령",
  "방문 수령",
  "매장수령",
  "매장 수령",
  "매장방문",
  "매장 방문",
] as const;

const normalizeMethodValue = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const isVisitCollectionMethodValue = (value: unknown) => {
  const normalized = normalizeMethodValue(value);
  return VISIT_STRINGING_COLLECTION_METHOD_VALUES.includes(
    normalized as (typeof VISIT_STRINGING_COLLECTION_METHOD_VALUES)[number],
  );
};

function isStringingCompletedStatus(status?: string | null) {
  const s = normalizeStatusText(status);
  return s === "completed" || s === "done" || s === "work_done" || s.includes("교체완료");
}

function isVisitPickupLikeStringing(app: UnknownDoc) {
  const shippingInfo = asDoc(app?.shippingInfo);
  const exactMethodValues = [
    app?.collectionMethod,
    shippingInfo?.collectionMethod,
    shippingInfo?.shippingMethod,
    shippingInfo?.deliveryMethod,
    shippingInfo?.pickupMethod,
    shippingInfo?.servicePickupMethod,
  ];

  if (exactMethodValues.some(isVisitCollectionMethodValue)) return true;

  const koreanText = exactMethodValues
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");

  return (
    koreanText.includes("방문수령") ||
    koreanText.includes("방문 수령") ||
    koreanText.includes("매장수령") ||
    koreanText.includes("매장 수령") ||
    koreanText.includes("매장방문") ||
    koreanText.includes("매장 방문")
  );
}

function hasStringingTracking(shippingInfo: UnknownDoc | null) {
  if (!shippingInfo) return false;
  const invoice = asDoc(shippingInfo.invoice);
  const returnInvoice = asDoc(shippingInfo.returnInvoice);
  const outboundTracking =
    getString(invoice?.trackingNumber) ??
    getString(shippingInfo.trackingNumber) ??
    getString(shippingInfo.trackingNo) ??
    "";
  const returnTracking =
    getString(returnInvoice?.trackingNumber) ??
    getString(shippingInfo.returnTrackingNumber) ??
    getString(shippingInfo.returnTrackingNo) ??
    "";

  return Boolean(outboundTracking.trim() || returnTracking.trim());
}

function isStringingPaymentCancelled(status?: string | null) {
  const s = normalizeStatusText(status);
  return s === "cancelled" || s === "canceled" || s === "refunded" || s === "환불완료";
}

function needsStringingShippingFollowup(app: UnknownDoc) {
  const shippingInfo = asDoc(app?.shippingInfo);
  return (
    isStringingCompletedStatus(getString(app?.status)) &&
    !isStringingPaymentCancelled(getString(app?.paymentStatus)) &&
    !isVisitPickupLikeStringing(app) &&
    !hasStringingTracking(shippingInfo)
  );
}

function isApplicationTerminalStatus(status?: string | null) {
  const s = normalizeStatusText(status);
  return (
    s.includes("취소") ||
    s.includes("교체완료") ||
    s === "canceled" ||
    s === "cancelled" ||
    s === "done" ||
    s === "work_done" ||
    s === "completed"
  );
}

function isRentalTerminalStatus(item: OpItem) {
  const s = normalizeStatusText(item.statusLabel);
  if (s.includes("취소") || s === "canceled" || s === "cancelled") return true;
  if (!(s.includes("반납완료") || s === "returned")) return false;
  return Boolean(item.depositRefundedAt);
}

function isPackageTerminalStatus(item: OpItem) {
  const status = normalizeStatusText(item.statusLabel);
  const payment = normalizeStatusText(item.paymentLabel);
  return (
    payment.includes("결제완료") ||
    payment === "paid" ||
    status.includes("활성") ||
    status.includes("완료")
  );
}

function isTerminalOperationItem(item: OpItem) {
  if (isCancelProcessingItem(item)) return false;
  if (item.needsCancelFinalization) return false;
  if (isCancelApproved(item)) return true;
  if (item.kind === "order") return isOrderTerminalStatus(item.statusLabel);
  if (item.kind === "stringing_application") {
    if (item.shippingFollowupRequired) return false;
    return isApplicationTerminalStatus(item.statusLabel);
  }
  if (item.kind === "rental") return isRentalTerminalStatus(item);
  if (item.kind === "package_purchase") return isPackageTerminalStatus(item);
  return false;
}

function isTerminalOperationGroup(group: AdminOperationsGroup) {
  return group.items.length > 0 && group.items.every(isTerminalOperationItem);
}

function isOperationallyTerminalGroup(group: AdminOperationsGroup) {
  if (group.items.length === 0) return false;

  const anchor =
    group.items.find((item) => item.id === group.anchorId && item.kind === group.anchorKind) ??
    group.items[0];

  if ((anchor.kind === "order" || anchor.kind === "rental") && isTerminalOperationItem(anchor)) {
    return true;
  }

  return isTerminalOperationGroup(group);
}

function buildItemSignals(item: OpItem): OperationSignal[] {
  const out: OperationSignal[] = [];
  for (const reason of item.warnReasons ?? []) {
    out.push({
      code: "WARN_INTEGRITY",
      level: "warn",
      sourceKind: item.kind,
      sourceId: item.id,
      title: "연결/무결성 오류",
      description: reason,
      nextAction: "연결 문서를 확인해 역방향 링크와 참조 ID를 정정하세요.",
    });
  }
  if (item.reviewLevel === "action") {
    for (const reason of item.reviewReasons ?? []) {
      out.push({
        code: "REVIEW_ACTION",
        level: "review",
        sourceKind: item.kind,
        sourceId: item.id,
        title: item.reviewTitle ?? "검토 필요 신호",
        description: reason,
        nextAction: "결제/상태 문맥을 확인하고 상세 문서에서 상태를 보정하세요.",
      });
    }
  }
  for (const reason of item.pendingReasons ?? []) {
    const isRentalDepositRefundRequired =
      item.kind === "rental" && reason === "대여가 반납완료 상태지만 보증금 환불 완료 기록이 없습니다.";
    const isStringingShippingFollowupRequired =
      item.kind === "stringing_application" &&
      item.shippingFollowupRequired &&
      reason === "교체완료 상태지만 배송/반송 운송장 정보가 없습니다.";
    out.push({
      code: isRentalDepositRefundRequired ? "RENTAL_DEPOSIT_REFUND_REQUIRED" : "PENDING_TASK",
      level: "pending",
      sourceKind: item.kind,
      sourceId: item.id,
      title: isRentalDepositRefundRequired
        ? "보증금 환불 확인 필요"
        : isStringingShippingFollowupRequired
          ? "교체서비스 운송장 확인 필요"
          : "미처리 업무",
      description: reason,
      nextAction: isRentalDepositRefundRequired
        ? "환불 계좌/결제 수단과 실제 환불 여부를 확인한 뒤 보증금 환불 처리하세요."
        : item.nextAction ?? "상세 문서로 이동해 미처리 상태를 해소하세요.",
    });
  }
  if ((item.cancel?.status ?? "none") === "approved_pending_pg_cancel") {
    out.push({
      code: "PG_CANCEL_BLOCKED_UNSETTLED",
      level: "pending",
      sourceKind: item.kind,
      sourceId: item.id,
      title: "취소 처리중: PG 취소 확인 필요",
      description:
        "관리자가 취소를 승인했지만 NICE 미정산금액 부족으로 자동 카드취소가 완료되지 않았습니다.",
      nextAction: "NICE 입금 후 취소 완료 여부를 확인하고 PG 상태를 다시 확인하세요.",
    });
  }
  if ((item.cancel?.status ?? "none") === "requested") {
    out.push({
      code:
        item.cancel?.refundAccountReady === false
          ? "CANCEL_REFUND_ACCOUNT_REQUIRED"
          : "CANCEL_REQUEST_REVIEW",
      level: "pending",
      sourceKind: item.kind,
      sourceId: item.id,
      title:
        item.cancel?.refundAccountReady === false
          ? "취소 요청: 환불 계좌 확인 필요"
          : "취소 요청: 처리 검토 필요",
      description:
        item.cancel?.refundAccountReady === false
          ? "취소 요청은 접수되었으나 환불 계좌 정보가 부족합니다."
          : "취소 요청이 접수되어 승인/거절 결정을 기다리고 있습니다.",
      nextAction:
        item.cancel?.refundAccountReady === false
          ? "환불 계좌 정보를 확인한 뒤 취소 승인/거절을 진행하세요."
          : "취소 승인/거절을 검토하고 처리 상태를 갱신하세요.",
    });
  }
  return dedupeSignals(out);
}

function pickPrimarySignal(signals: OperationSignal[]): OperationSignal | null {
  if (signals.length === 0) return null;
  return [...signals].sort((a, b) => {
    const lv = signalLevelPriority(b.level) - signalLevelPriority(a.level);
    if (lv !== 0) return lv;
    return a.code.localeCompare(b.code);
  })[0]!;
}

function reviewLevelPriority(level: AdminOperationReviewLevel) {
  if (level === "action") return 2;
  if (level === "info") return 1;
  return 0;
}

function isCompatiblePaymentContext(anchorPay: string, childPay: string) {
  if (!anchorPay || !childPay || anchorPay === "-" || childPay === "-") return false;
  if (anchorPay === childPay) return true;

  const pair = new Set([anchorPay, childPay]);
  if (pair.has("결제완료") && pair.has("주문결제포함")) return true;
  if (pair.has("결제완료") && pair.has("대여결제포함")) return true;
  if (pair.has("패키지차감") && pair.has("결제완료")) return true;

  return false;
}

function summarizeDistinctLabelsByKind(
  items: OpItem[],
  getLabel: (item: OpItem) => string | undefined | null,
) {
  const map = new Map<Kind, Set<string>>();
  for (const it of items) {
    const value = getLabel(it);
    if (!value) continue;
    if (!map.has(it.kind)) map.set(it.kind, new Set());
    map.get(it.kind)!.add(String(value));
  }
  return map;
}

function computeGroupReviewLevel(group: AdminOperationsGroup): AdminOperationReviewLevel {
  let level: AdminOperationReviewLevel = "none";
  for (const item of group.items ?? []) {
    const itemLevel: AdminOperationReviewLevel =
      item.reviewLevel ??
      (item.needsReview ? "action" : (item.reviewReasons?.length ?? 0) > 0 ? "info" : "none");
    if (reviewLevelPriority(itemLevel) > reviewLevelPriority(level)) level = itemLevel;
  }

  if (!group.items || group.items.length <= 1) return level;

  const anchor =
    group.items.find((item) => item.kind === group.anchorKind && item.id === group.anchorId) ??
    group.items[0];
  if (!anchor) return level;

  const anchorKey = `${anchor.kind}:${anchor.id}`;
  const children = group.items.filter((item) => `${item.kind}:${item.id}` !== anchorKey);
  if (children.length === 0) return level;

  const childStatusMap = summarizeDistinctLabelsByKind(children, (item) => item.statusLabel);
  const childPaymentMap = summarizeDistinctLabelsByKind(children, (item) => item.paymentLabel);
  const hasMixed =
    Array.from(childStatusMap.values()).some((labels) => labels.size > 1) ||
    Array.from(childPaymentMap.values()).some((labels) => labels.size > 1);

  const anchorPay = anchor.paymentLabel ?? "-";
  const payMismatch =
    anchorPay !== "-" &&
    children.some((item) => {
      const childPay = item.paymentLabel ?? "-";
      return (
        childPay !== "-" &&
        childPay !== anchorPay &&
        !isCompatiblePaymentContext(anchorPay, childPay)
      );
    });

  if (hasMixed || payMismatch) return "action";
  return level;
}

function buildGroups(list: OpItem[]): AdminOperationsGroup[] {
  const map = new Map<string, OpItem[]>();
  const orderKeys: string[] = [];
  for (const it of list) {
    const key = groupKeyOf(it);
    if (!map.has(key)) {
      map.set(key, []);
      orderKeys.push(key);
    }
    map.get(key)!.push(it);
  }

  return orderKeys.map((key) => {
    const items = map.get(key)!;
    items.sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind]);
    const anchor = pickAnchor(items);
    const ts = Math.max(...items.map((x) => (x.createdAt ? new Date(x.createdAt).getTime() : 0)));
    const createdAt = ts ? new Date(ts).toISOString() : null;
    const signals = dedupeSignals(items.flatMap((it) => it.signals ?? []));
    const primarySignal = pickPrimarySignal(signals);
    const linkedFlowStatusIssue = getLinkedOrderStringingStatusIssue(items);
    return {
      groupKey: key,
      anchorId: anchor.id,
      anchorKind: anchor.kind,
      createdAt,
      items,
      signals,
      primarySignal,
      nextAction: anchor.nextAction ?? null,
      linkedFlowStatusIssue,
    };
  });
}

function parseIntegrated(v: string | null): boolean | null {
  // integrated=1 (통합만) / integrated=0 (단독만)
  if (v === "1") return true;
  if (v === "0") return false;
  return null;
}

function parseFlow(v: string | null): Flow | null {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isInteger(n)) return null;
  if (n < 1 || n > 8) return null;
  return n as Flow;
}

function parseIntParam(v: string | null, opts: { defaultValue: number; min: number; max: number }) {
  const n = Number(v);
  const base = Number.isFinite(n) ? n : opts.defaultValue;
  return Math.min(opts.max, Math.max(opts.min, Math.trunc(base)));
}

function parseKind(v: string | null): Kind | "all" {
  if (v === "order" || v === "rental" || v === "stringing_application" || v === "package_purchase")
    return v;
  return "all";
}

function parseWarnFilter(v: string | null): AdminOperationsWarnFilter {
  if (v === "warn" || v === "caution" || v === "review" || v === "pending" || v === "clean")
    return v;
  return "all";
}

function parseWarnSort(v: string | null): AdminOperationsWarnSort {
  if (v === "warn_first" || v === "safe_first") return v;
  return "default";
}

function parseOperationsListRequest(url: URL): AdminOperationsListRequestDto {
  const page = parseIntParam(url.searchParams.get("page"), {
    defaultValue: 1,
    min: 1,
    max: 10_000,
  });
  const pageSize = parseIntParam(url.searchParams.get("pageSize"), {
    defaultValue: DEFAULT_PAGE_SIZE,
    min: 1,
    max: MAX_PAGE_SIZE,
  });
  const kind = parseKind(url.searchParams.get("kind"));
  const q = String(url.searchParams.get("q") ?? "")
    .trim()
    .toLowerCase();
  const warn = url.searchParams.get("warn") === "1";
  const flow = parseFlow(url.searchParams.get("flow"));
  const integrated = parseIntegrated(url.searchParams.get("integrated"));
  const warnFilterRaw = parseWarnFilter(url.searchParams.get("warnFilter"));
  const warnFilter =
    warn &&
    (warnFilterRaw === "caution" ||
      warnFilterRaw === "review" ||
      warnFilterRaw === "pending" ||
      warnFilterRaw === "clean")
      ? "warn"
      : warnFilterRaw;
  const warnSort = parseWarnSort(url.searchParams.get("warnSort"));
  return {
    page,
    pageSize,
    kind,
    q,
    warn,
    flow,
    integrated,
    warnFilter,
    warnSort,
  };
}

function isMatchedByDbCandidate(
  item: OpItem,
  matchedIds: {
    order: Set<string>;
    rental: Set<string>;
    application: Set<string>;
    packagePurchase: Set<string>;
  },
) {
  if (item.kind === "order") return matchedIds.order.has(item.id);
  if (item.kind === "rental") return matchedIds.rental.has(item.id);
  if (item.kind === "package_purchase") return matchedIds.packagePurchase.has(item.id);
  return matchedIds.application.has(item.id);
}

function matchesResidualMemoryFallback(item: OpItem, q: string) {
  /**
   * 메모리 안전망은 DB $or 후보 추출에서 아직 올리기 어려운 일부 contains 케이스만 담당한다.
   * - id 부분검색(ObjectId 부분 일치)
   * - 표시용 파생 title 문자열(예: "외 N개", "(N일)")의 부분 일치
   *
   * 검색의 주 기준은 DB 후보 추출이며, 이 함수는 보조 안전망으로만 사용한다.
   */
  const idContains = item.id.toLowerCase().includes(q);
  const titleContains = (item.title ?? "").toLowerCase().includes(q);
  return idContains || titleContains;
}

export async function handleAdminOperationsGet(
  req: Request,
  options: AdminOperationsGetOptions = {},
) {
  const measure: Measure =
    options.measure ?? ((_, work) => Promise.resolve(typeof work === "function" ? work() : work));
  const guard = await measure("operations.requireAdmin", () => requireAdmin(req));
  if (!guard.ok) return guard.res;
  const { db } = guard;

  // 운영 흐름 목록은 대량 merge/sort 조회를 수행하므로 고비용 API로 레이트리밋을 건다.
  const limited = await measure("operations.rateLimit", () =>
    enforceAdminRateLimit(
      req,
      db,
      String(guard.admin._id),
      ADMIN_EXPENSIVE_ENDPOINT_POLICIES.adminOperationsList,
    ),
  );
  if (limited) return limited;

  const requestDto = await measure("operations.parseQuery", () => {
    const url = new URL(req.url);
    return parseOperationsListRequest(url);
  });
  const { page, pageSize, kind, q, warn, flow, integrated, warnFilter, warnSort } = requestDto;
  const fetchLimit = q ? SEARCH_FETCH_EACH : MAX_FETCH_EACH;
  const qRegex = q ? buildSearchRegex(q) : null;
  const qPrefixRegex = q ? buildPrefixRegex(q) : null;
  const isEmailSearch = q ? isLikelyEmailQuery(q) : false;
  const qEmailNormalized = q ? normalizeEmailForSearch(q) : null;
  const qEmailPrefixRegex =
    isEmailSearch && qEmailNormalized ? buildCaseSensitivePrefixRegex(qEmailNormalized) : null;
  const idCandidates = q ? buildIdCandidates(q) : [];
  const rentalUserIdCandidates: Array<string | ObjectId> = [];

  await measure("operations.resolveSearchUsers", async () => {
    if (qRegex) {
      if (isEmailSearch && qEmailNormalized) {
        const userCollection = db.collection("users");
        const matchedUsersExact = await userCollection
          .find({ email: qEmailNormalized })
          .project({ _id: 1 })
          .limit(fetchLimit)
          .toArray();
        let matchedUsers = matchedUsersExact;
        if (matchedUsers.length === 0 && qEmailPrefixRegex) {
          matchedUsers = await userCollection
            .find({ email: qEmailPrefixRegex })
            .project({ _id: 1 })
            .limit(fetchLimit)
            .toArray();
        }
        if (matchedUsers.length === 0) {
          matchedUsers = await userCollection
            .find({ email: qRegex })
            .project({ _id: 1 })
            .limit(fetchLimit)
            .toArray();
        }
        for (const user of matchedUsers) {
          const uid = getIdString(user?._id);
          if (!uid) continue;
          rentalUserIdCandidates.push(ObjectId.isValid(uid) ? new ObjectId(uid) : uid);
        }
      } else {
        const matchedUsers = await db
          .collection("users")
          .find({
            $or: [{ name: qRegex }, { email: qRegex }],
          })
          .project({ _id: 1 })
          .limit(fetchLimit)
          .toArray();
        for (const user of matchedUsers) {
          const uid = getIdString(user?._id);
          if (!uid) continue;
          rentalUserIdCandidates.push(ObjectId.isValid(uid) ? new ObjectId(uid) : uid);
        }
      }
    }
  });

  const appQuery: Record<string, unknown> = { status: { $ne: "draft" } };
  let appEmailFallbackQuery: Record<string, unknown> | null = null;
  if (qRegex) {
    if (isEmailSearch && qEmailNormalized) {
      appQuery.$or = [
        { searchEmailLower: qEmailNormalized },
        { "customer.email": qEmailNormalized },
        { "userSnapshot.email": qEmailNormalized },
        { guestEmail: qEmailNormalized },
        ...(qEmailPrefixRegex
          ? [
              { searchEmailLower: qEmailPrefixRegex },
              { "customer.email": qEmailPrefixRegex },
              { "userSnapshot.email": qEmailPrefixRegex },
              { guestEmail: qEmailPrefixRegex },
            ]
          : []),
      ];
      appEmailFallbackQuery = {
        status: { $ne: "draft" },
        $or: [
          { "customer.email": qRegex },
          { "userSnapshot.email": qRegex },
          { guestEmail: qRegex },
        ],
      };
    } else {
      appQuery.$or = [
        ...(idCandidates.length > 0
          ? [
              { _id: { $in: idCandidates } },
              { stringingApplicationId: { $in: idCandidates } },
              { orderId: { $in: idCandidates } },
              { rentalId: { $in: idCandidates } },
            ]
          : []),
        ...(qPrefixRegex
          ? [
              { stringingApplicationId: qPrefixRegex },
              { orderId: qPrefixRegex },
              { rentalId: qPrefixRegex },
            ]
          : []),
        { "customer.name": qRegex },
        { "customer.email": qRegex },
        { "userSnapshot.name": qRegex },
        { "userSnapshot.email": qRegex },
        { guestName: qRegex },
        { guestEmail: qRegex },
        { paymentSource: qPrefixRegex ?? qRegex },
      ];
    }
  }

  const orderQuery: Record<string, unknown> = {};
  let orderEmailFallbackQuery: Record<string, unknown> | null = null;
  if (qRegex) {
    if (isEmailSearch && qEmailNormalized) {
      orderQuery.$or = [
        { searchEmailLower: qEmailNormalized },
        { "customer.email": qEmailNormalized },
        { "userSnapshot.email": qEmailNormalized },
        { "guestInfo.email": qEmailNormalized },
        ...(qEmailPrefixRegex
          ? [
              { searchEmailLower: qEmailPrefixRegex },
              { "customer.email": qEmailPrefixRegex },
              { "userSnapshot.email": qEmailPrefixRegex },
              { "guestInfo.email": qEmailPrefixRegex },
            ]
          : []),
      ];
      orderEmailFallbackQuery = {
        $or: [
          { "customer.email": qRegex },
          { "userSnapshot.email": qRegex },
          { "guestInfo.email": qRegex },
        ],
      };
    } else {
      orderQuery.$or = [
        ...(idCandidates.length > 0
          ? [{ _id: { $in: idCandidates } }, { stringingApplicationId: { $in: idCandidates } }]
          : []),
        ...(qPrefixRegex ? [{ stringingApplicationId: qPrefixRegex }] : []),
        { "customer.name": qRegex },
        { "customer.email": qRegex },
        { "userSnapshot.name": qRegex },
        { "userSnapshot.email": qRegex },
        { "guestInfo.name": qRegex },
        { "guestInfo.email": qRegex },
        { "items.title": qRegex },
        { "items.productName": qRegex },
        { "items.name": qRegex },
      ];
    }
  }

  const rentalQuery: Record<string, unknown> = {};
  let rentalEmailFallbackQuery: Record<string, unknown> | null = null;
  if (qRegex) {
    if (isEmailSearch && qEmailNormalized) {
      rentalQuery.$or = [
        ...(rentalUserIdCandidates.length > 0 ? [{ userId: { $in: rentalUserIdCandidates } }] : []),
        { "guest.email": qEmailNormalized },
        ...(qEmailPrefixRegex ? [{ "guest.email": qEmailPrefixRegex }] : []),
      ];
      rentalEmailFallbackQuery = { $or: [{ "guest.email": qRegex }] };
    } else {
      rentalQuery.$or = [
        ...(idCandidates.length > 0
          ? [
              { _id: { $in: idCandidates } },
              { stringingApplicationId: { $in: idCandidates } },
              { userId: { $in: idCandidates } },
            ]
          : []),
        ...(qPrefixRegex
          ? [{ stringingApplicationId: qPrefixRegex }, { userId: qPrefixRegex }]
          : []),
        ...(rentalUserIdCandidates.length > 0 ? [{ userId: { $in: rentalUserIdCandidates } }] : []),
        { "guest.name": qRegex },
        { "guest.email": qRegex },
        { brand: qRegex },
        { model: qRegex },
      ];
    }
  }

  // 1) 신청서 먼저 조회해서 “연결 매핑(orderId/rentalId)”을 만든다.
  const appProjection = {
    _id: 1,
    createdAt: 1,
    status: 1,
    paymentStatus: 1,
    paymentInfo: 1,
    packageApplied: 1,
    paymentSource: 1,
    servicePaid: 1,
    serviceFeeBefore: 1,
    stringingApplicationId: 1,
    totalPrice: 1,
    serviceAmount: 1,
    orderId: 1,
    rentalId: 1,
    customer: 1,
    userSnapshot: 1,
    guestName: 1,
    guestEmail: 1,
    cancelRequest: 1,
    collectionMethod: 1,
    shippingInfo: 1,
  };
  let rawApps = await measure("operations.fetchStringingApplications", () =>
    db
      .collection("stringing_applications")
      .find(appQuery)
      .project(appProjection)
      .sort({ createdAt: -1 })
      .limit(fetchLimit)
      .toArray(),
  );
  if (isEmailSearch && rawApps.length === 0 && appEmailFallbackQuery) {
    rawApps = await measure("operations.fetchStringingApplications.emailFallback", () =>
      db
        .collection("stringing_applications")
        .find(appEmailFallbackQuery)
        .project(appProjection)
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .toArray(),
    );
  }
  const dbMatchedAppIds = new Set(rawApps.map((a) => String(a?._id)));

  const orderToApp = new Map<string, string>();
  const rentalToApp = new Map<string, string>();
  for (const a of rawApps) {
    const appId = getIdString(a?._id);
    const orderId = getIdString(a?.orderId);
    const rentalId = getIdString(a?.rentalId);
    if (orderId && appId) orderToApp.set(orderId, appId);
    if (rentalId && appId) rentalToApp.set(rentalId, appId);
  }

  // 경고용: orderId/rentalId 기준으로 신청서가 “여러 개” 붙는 경우까지 집계(기존 orderToApp/rentalToApp은 1개만 매핑)
  const orderToAppIds = new Map<string, string[]>();
  const rentalToAppIds = new Map<string, string[]>();
  for (const a of asDocArray(rawApps)) {
    const orderId = getIdString(a?.orderId);
    const rentalId = getIdString(a?.rentalId);
    const appId = getIdString(a?._id);
    if (orderId && appId) {
      const key = orderId;
      const arr = orderToAppIds.get(key) ?? [];
      arr.push(appId);
      orderToAppIds.set(key, arr);
    }
    if (rentalId && appId) {
      const key = rentalId;
      const arr = rentalToAppIds.get(key) ?? [];
      arr.push(appId);
      rentalToAppIds.set(key, arr);
    }
  }

  // 2) 주문 조회
  const orderProjection = {
    _id: 1,
    createdAt: 1,
    status: 1,
    paymentStatus: 1,
    paymentInfo: 1,
    isStringServiceApplied: 1,
    stringingApplicationId: 1,
    totalPrice: 1,
    customer: 1,
    userSnapshot: 1,
    guestInfo: 1,
    items: 1,
    shippingInfo: 1,
    cancelRequest: 1,
  };
  let rawOrders = await measure("operations.fetchOrders", () =>
    db
      .collection("orders")
      .find(orderQuery)
      .project(orderProjection)
      .sort({ createdAt: -1 })
      .limit(fetchLimit)
      .toArray(),
  );
  if (isEmailSearch && rawOrders.length === 0 && orderEmailFallbackQuery) {
    rawOrders = await measure("operations.fetchOrders.emailFallback", () =>
      db
        .collection("orders")
        .find(orderEmailFallbackQuery)
        .project(orderProjection)
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .toArray(),
    );
  }
  const dbMatchedOrderIds = new Set(rawOrders.map((o) => String(o?._id)));

  // 3) 대여 조회(+ userId 배치 매핑: 고객명/이메일 정확도 향상)
  const rentalProjection = {
    _id: 1,
    createdAt: 1,
    status: 1,
    paymentStatus: 1,
    paymentInfo: 1,
    userId: 1,
    guest: 1,
    brand: 1,
    model: 1,
    days: 1,
    period: 1,
    amount: 1,
    fee: 1,
    deposit: 1,
    stringing: 1,
    stringingApplicationId: 1,
    isStringServiceApplied: 1,
    cancelRequest: 1,
    "shipping.outbound": 1,
    outboundTrackingNo: 1,
    returnDueAt: 1,
    endDate: 1,
    dueAt: 1,
    depositRefundedAt: 1,
  };
  let rawRentals = await measure("operations.fetchRentals", () =>
    db
      .collection("rental_orders")
      .find(rentalQuery)
      .project(rentalProjection)
      .sort({ createdAt: -1 })
      .limit(fetchLimit)
      .toArray(),
  );
  if (isEmailSearch && rawRentals.length === 0 && rentalEmailFallbackQuery) {
    rawRentals = await measure("operations.fetchRentals.emailFallback", () =>
      db
        .collection("rental_orders")
        .find(rentalEmailFallbackQuery)
        .project(rentalProjection)
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .toArray(),
    );
  }
  const dbMatchedRentalIds = new Set(rawRentals.map((r) => String(r?._id)));

  // 패키지 구매는 주문/신청서/대여 linked-flow와 분리된 단독 운영 항목으로 조회한다.
  const { packagePurchaseQuery, packagePurchaseProjection } = await measure(
    "operations.fetchPackagePurchases.buildFilter",
    () => {
      const packagePurchaseFilter = createPackagePaymentCheckFilter();
      const packageObjectIdCandidates = idCandidates.filter(
        (id): id is ObjectId => id instanceof ObjectId,
      );
      const packageSearchOr: Filter<Document>[] = [
        { "userSnapshot.name": qRegex },
        { "userSnapshot.email": qRegex },
        { "serviceInfo.name": qRegex },
        { "serviceInfo.email": qRegex },
        { "shippingInfo.name": qRegex },
        { "packageInfo.title": qRegex },
      ];
      if (packageObjectIdCandidates.length > 0) {
        packageSearchOr.push({ _id: { $in: packageObjectIdCandidates } });
      }
      const packagePurchaseQuery: Filter<Document> = qRegex
        ? {
            $and: [packagePurchaseFilter, { $or: packageSearchOr }],
          }
        : packagePurchaseFilter;
      return {
        packagePurchaseQuery,
        packagePurchaseProjection: {
          _id: 1,
          createdAt: 1,
          status: 1,
          paymentStatus: 1,
          totalPrice: 1,
          userSnapshot: 1,
          serviceInfo: 1,
          shippingInfo: 1,
          packageInfo: 1,
        },
      };
    },
  );
  const rawPackagePurchases = await measure("operations.fetchPackagePurchases", async () => {
    const packagePurchaseCursor = await measure("operations.fetchPackagePurchases.find", () =>
      db
        .collection("packageOrders")
        .find(packagePurchaseQuery)
        .project(packagePurchaseProjection)
        .sort({ createdAt: -1 })
        .limit(fetchLimit),
    );
    return measure("operations.fetchPackagePurchases.toArray", () =>
      packagePurchaseCursor.toArray(),
    );
  });
  const dbMatchedPackagePurchaseIds = new Set(
    rawPackagePurchases.map((purchase) => String(purchase?._id)),
  );

  /**
   * 3-1) MAX_FETCH_EACH 컷 보강
   *
   * rawApps는 "신청서 상위 N개"만 가져오므로,
   * - 화면에 보이는 주문/대여(rawOrders/rawRentals)에는 신청서가 실제로 연결되어 있는데
   * - rawApps에 그 신청서가 포함되지 않아
   *   (1) 단독/통합 판정이 틀어지거나
   *   (2) "주문.stringingApplicationId가 가리키는 신청서를 DB에서 찾지 못했습니다" 같은 오탐 경고가 생기는 현상 발견.
   *
   * 따라서 "현재 응답 범위의 주문/대여"를 기준으로 연결된 신청서를 추가 조회하여(rawApps + 매핑) 보강함
   */
  const linkOr: Array<Record<string, unknown>> = [];
  if (rawOrders.length > 0) {
    const orderIds = rawOrders.map((o) => o?._id).filter(Boolean);
    if (orderIds.length > 0) linkOr.push({ orderId: { $in: orderIds } });
  }
  if (rawRentals.length > 0) {
    const rentalIds = rawRentals.map((r) => r?._id).filter(Boolean);
    if (rentalIds.length > 0) linkOr.push({ rentalId: { $in: rentalIds } });
  }

  if (linkOr.length > 0) {
    const extraLinkedApps = await db
      .collection("stringing_applications")
      .find({ status: { $ne: "draft" }, $or: linkOr })
      .project({
        _id: 1,
        createdAt: 1,
        status: 1,
        paymentStatus: 1,
        paymentInfo: 1,
        packageApplied: 1,
        paymentSource: 1,
        servicePaid: 1,
        serviceFeeBefore: 1,
        stringingApplicationId: 1,
        totalPrice: 1,
        serviceAmount: 1,
        orderId: 1,
        rentalId: 1,
        customer: 1,
        userSnapshot: 1,
        guestName: 1,
        guestEmail: 1,
        cancelRequest: 1,
        shippingInfo: 1,
      })
      .toArray();

    // rawApps에 없는 신청서만 추가 + 매핑 보강
    const existingAppIds = new Set(rawApps.map((a) => String(a?._id)));
    for (const a of asDocArray(extraLinkedApps)) {
      const aid = String(a?._id);
      if (!aid) continue;

      // 1) rawApps에 없으면 추가(목록/정렬은 아래 merge 단계에서 createdAt 기준으로 재정렬됨)
      if (!existingAppIds.has(aid)) {
        rawApps.push(a);
        existingAppIds.add(aid);
      }
      dbMatchedAppIds.add(aid);

      // 2) 주문/대여 → 신청서 매핑 보강(단독/통합 판정 + 경고 계산 정확도 향상)
      if (a?.orderId) {
        const oid = String(a.orderId);
        if (oid) {
          // orderToApp은 "대표 1개"만 가지므로 기존 값이 있으면 덮어쓰지 않음(최신값 유지 의도)
          if (!orderToApp.has(oid)) orderToApp.set(oid, aid);
          const arr = orderToAppIds.get(oid) ?? [];
          if (!arr.includes(aid)) {
            arr.push(aid);
            orderToAppIds.set(oid, arr);
          }
        }
      }
      if (a?.rentalId) {
        const rid = String(a.rentalId);
        if (rid) {
          if (!rentalToApp.has(rid)) rentalToApp.set(rid, aid);
          const arr = rentalToAppIds.get(rid) ?? [];
          if (!arr.includes(aid)) {
            arr.push(aid);
            rentalToAppIds.set(rid, arr);
          }
        }
      }
    }
  }

  const userIds = Array.from(new Set(rawRentals.map((r) => r?.userId).filter(Boolean)));
  const userMap = new Map<string, { name?: string; email?: string }>();
  if (userIds.length > 0) {
    const users = await db
      .collection("users")
      .find({
        _id: {
          $in: userIds.map((id) => (ObjectId.isValid(String(id)) ? new ObjectId(String(id)) : id)),
        },
      })
      .project({ name: 1, email: 1 })
      .toArray();
    users.forEach((u) => userMap.set(String(u._id), { name: u.name, email: u.email }));
  }

  // 주문 아이템에서 '라켓 포함 여부'를 미리 계산해두면,
  // 신청서가 주문에 연결된 경우에도(Flow 2 vs 5) 정확히 판정가능
  const orderHasRacket = new Map<string, boolean>();
  for (const o of rawOrders) {
    orderHasRacket.set(String(o?._id), hasRacketItems(o?.items));
  }

  // 3) 연결 무결성(양방향 링크) 경고 사유 계산
  const appById = new Map<string, UnknownDoc>(asDocArray(rawApps).map((a) => [String(a._id), a]));
  const warnByKey = new Map<string, string[]>();
  const pushWarn = (kind: Kind, id: string, reason: string) => {
    const key = `${kind}:${id}`;
    const arr = warnByKey.get(key) ?? [];
    if (!arr.includes(reason)) arr.push(reason);
    warnByKey.set(key, arr);
  };

  const pendingByKey = new Map<string, string[]>();
  const pushPending = (kind: Kind, id: string, reason: string) => {
    const key = `${kind}:${id}`;
    const arr = pendingByKey.get(key) ?? [];
    if (!arr.includes(reason)) arr.push(reason);
    pendingByKey.set(key, arr);
  };

  // '작성대기' 판정: 주문/대여가 stringingApplicationId로 신청서를 가리키지만,
  // rawApps는 status != 'draft' 조건으로 가져오므로(초안은 제외),
  // 'DB에서 못 찾음'이 아니라 '초안 작성대기'로 분류해야 하는 케이스가 생긴다.
  const draftById = new Map<string, UnknownDoc>();
  {
    const candidateIds = new Set<string>();
    for (const o of rawOrders) {
      if (o?.stringingApplicationId) candidateIds.add(String(o.stringingApplicationId));
    }
    for (const r of rawRentals) {
      if (r?.stringingApplicationId) candidateIds.add(String(r.stringingApplicationId));
    }

    const missingIds = Array.from(candidateIds).filter((id) => !appById.has(id));
    if (missingIds.length > 0) {
      const objectIds = missingIds
        .filter((id) => ObjectId.isValid(id))
        .map((id) => new ObjectId(id));

      if (objectIds.length > 0) {
        const rawDrafts = await db
          .collection("stringing_applications")
          .find({ _id: { $in: objectIds }, status: "draft" })
          .project({ _id: 1, status: 1, orderId: 1, rentalId: 1, createdAt: 1 })
          .toArray();
        for (const d of asDocArray(rawDrafts)) {
          draftById.set(String(d._id), d);
        }
      }
    }
  }

  // 주문 ↔ 신청서(교체서비스) 양방향 체크
  for (const o of rawOrders) {
    const oid = String(o._id);
    const appIdsFromApps = orderToAppIds.get(oid) ?? [];
    const appIdInOrder = o?.stringingApplicationId ? String(o.stringingApplicationId) : null;

    if (appIdsFromApps.length > 1) {
      pushWarn(
        "order",
        oid,
        `주문에 연결된 신청서가 ${appIdsFromApps.length}개입니다(중복/분기 오류 가능).`,
      );
    }
    if (appIdsFromApps.length > 0 && !appIdInOrder) {
      pushWarn(
        "order",
        oid,
        "신청서→주문 연결은 존재하지만 주문.stringingApplicationId가 비어있습니다(역방향 링크 누락).",
      );
    }

    if (appIdInOrder) {
      const a = appById.get(appIdInOrder);
      if (!a) {
        const d = draftById.get(appIdInOrder);
        if (d) {
          pushPending("order", oid, "교체서비스 신청서가 초안(draft) 상태입니다(작성대기).");
        } else {
          // 사용자가 신청을 "아예 진행하지 않은/완료하지 않은" 케이스까지 무조건 오류로 잡으면 오탐.
          // - 주문이 "신청 완료" 상태라고 명시(isStringServiceApplied=true)했거나
          // - 신청서 컬렉션에서 해당 주문으로 연결된 신청서(appIdsFromApps)가 실제로 존재하는데
          //   주문이 그걸 못 가리키는 상황이면 => 진짜 연결 오류
          // 그 외에는 "미신청/작성 전"으로 보고 pending으로 분류한다.
          const orderClaimsApplied = Boolean(o?.isStringServiceApplied);
          if (!orderClaimsApplied && appIdsFromApps.length === 0) {
            pushPending(
              "order",
              oid,
              "교체서비스 신청이 아직 제출되지 않았습니다(미신청/작성 전).",
            );
          } else {
            pushWarn(
              "order",
              oid,
              "주문.stringingApplicationId가 가리키는 신청서를 DB에서 찾지 못했습니다.",
            );
          }
        }
      } else {
        const aOrderId = a?.orderId ? String(a.orderId) : "";
        if (aOrderId && aOrderId !== oid) {
          pushWarn(
            "order",
            oid,
            "주문↔신청서 연결이 불일치합니다(신청서.orderId가 이 주문을 가리키지 않음).",
          );
          pushWarn(
            "stringing_application",
            String(a._id),
            "신청서.orderId가 주문과 불일치합니다(주문.stringingApplicationId와 양방향 아님).",
          );
        }
      }
      if (appIdsFromApps.length > 0 && !appIdsFromApps.includes(appIdInOrder)) {
        pushWarn(
          "order",
          oid,
          "주문.stringingApplicationId와 신청서.orderId 매핑이 일치하지 않습니다.",
        );
      }
    }
  }

  // 대여 ↔ 신청서(교체서비스) 양방향 체크
  for (const r of rawRentals) {
    const rid = String(r._id);
    const appIdsFromApps = rentalToAppIds.get(rid) ?? [];
    const appIdInRental = r?.stringingApplicationId ? String(r.stringingApplicationId) : null;

    if (appIdsFromApps.length > 1) {
      pushWarn(
        "rental",
        rid,
        `대여에 연결된 신청서가 ${appIdsFromApps.length}개입니다(중복/분기 오류 가능).`,
      );
    }
    if (appIdsFromApps.length > 0 && !appIdInRental) {
      pushWarn(
        "rental",
        rid,
        "신청서→대여 연결은 존재하지만 대여.stringingApplicationId가 비어있습니다(역방향 링크 누락).",
      );
    }

    if (appIdInRental) {
      const a = appById.get(appIdInRental);
      if (!a) {
        const d = draftById.get(appIdInRental);
        if (d) {
          pushPending("rental", rid, "교체서비스 신청서가 초안(draft) 상태입니다(작성대기).");
        } else {
          const rentalClaimsApplied = Boolean(r?.isStringServiceApplied);
          if (!rentalClaimsApplied && appIdsFromApps.length === 0) {
            pushPending(
              "rental",
              rid,
              "교체서비스 신청이 아직 제출되지 않았습니다(미신청/작성 전).",
            );
          } else {
            pushWarn(
              "rental",
              rid,
              "대여.stringingApplicationId가 가리키는 신청서를 DB에서 찾지 못했습니다.",
            );
          }
        }
      } else {
        const aRentalId = a?.rentalId ? String(a.rentalId) : "";
        if (aRentalId && aRentalId !== rid) {
          pushWarn(
            "rental",
            rid,
            "대여↔신청서 연결이 불일치합니다(신청서.rentalId가 이 대여를 가리키지 않음).",
          );
          pushWarn(
            "stringing_application",
            String(a._id),
            "신청서.rentalId가 대여와 불일치합니다(대여.stringingApplicationId와 양방향 아님).",
          );
        }
      }
      if (appIdsFromApps.length > 0 && !appIdsFromApps.includes(appIdInRental)) {
        pushWarn(
          "rental",
          rid,
          "대여.stringingApplicationId와 신청서.rentalId 매핑이 일치하지 않습니다.",
        );
      }
    }
  }

  // 신청서 기준: 존재성 + 역방향 링크
  for (const a of asDocArray(rawApps)) {
    const aid = String(a._id);

    const oid = a?.orderId ? String(a.orderId) : null;
    if (oid) {
      const o = rawOrders.find((x) => String(x._id) === oid);
      if (!o) {
        pushWarn("stringing_application", aid, "신청서.orderId가 가리키는 주문이 DB에 없습니다.");
      } else {
        const back = o?.stringingApplicationId ? String(o.stringingApplicationId) : null;
        if (!back) {
          pushWarn(
            "stringing_application",
            aid,
            "신청서→주문은 연결되어 있으나 주문.stringingApplicationId가 비어있습니다(역방향 링크 누락).",
          );
        } else if (back !== aid) {
          pushWarn(
            "stringing_application",
            aid,
            "주문.stringingApplicationId가 다른 신청서를 가리킵니다(양방향 링크 불일치).",
          );
        }
      }
    }

    const rid = a?.rentalId ? String(a.rentalId) : null;
    if (rid) {
      const r = rawRentals.find((x) => String(x._id) === rid);
      if (!r) {
        pushWarn("stringing_application", aid, "신청서.rentalId가 가리키는 대여가 DB에 없습니다.");
      } else {
        const back = r?.stringingApplicationId ? String(r.stringingApplicationId) : null;
        if (!back) {
          pushWarn(
            "stringing_application",
            aid,
            "신청서→대여는 연결되어 있으나 대여.stringingApplicationId가 비어있습니다(역방향 링크 누락).",
          );
        } else if (back !== aid) {
          pushWarn(
            "stringing_application",
            aid,
            "대여.stringingApplicationId가 다른 신청서를 가리킵니다(양방향 링크 불일치).",
          );
        }
      }
    }
  }

  // 4) 공통 포맷으로 매핑
  const orderItems: OpItem[] = rawOrders.map((o) => {
    const id = String(o._id);
    const cust = pickCustomerFromDoc(o);
    const appId = orderToApp.get(id) ?? null;
    const isIntegrated = !!appId;
    const hasShippingInfo = hasOrderShippingInfo(o);
    const shippingMethod =
      getString(asDoc(o?.shippingInfo)?.shippingMethod) ??
      getString(asDoc(o?.shippingInfo)?.deliveryMethod);
    const hasOutboundTracking = Boolean(
      getString(asDoc(asDoc(o?.shippingInfo)?.invoice)?.trackingNumber)?.trim(),
    );
    const statusLabel = normalizeOrderStatus(o.status);
    // NOTE: statusDisplayLabel은 현재 order 문맥(방문 수령 노출 문구)에서만 사용한다.
    const statusDisplayLabel = getOrderStatusLabelForDisplay(statusLabel, {
      shippingMethod,
      deliveryMethod: getString(asDoc(o?.shippingInfo)?.deliveryMethod),
    });
    const paymentLabel = normalizePaymentStatus(
      getString(o.paymentStatus) ?? getString(o?.paymentInfo?.status),
    );
    const cancel = normalizeCancelRequest(o);
    const paymentInfo = asDoc(o.paymentInfo);
    const paymentProvider = getString(paymentInfo?.provider) ?? null;
    const paymentTid = getString(paymentInfo?.tid) ?? null;
    const niceSync = asDoc(paymentInfo?.niceSync);
    const needsCancelFinalization = needsOrderCancelFinalization({
      status: statusLabel,
      paymentStatus: paymentLabel,
      paymentInfo: paymentInfo as any,
    });
    const canSyncNicePayment =
      paymentProvider === "nicepay" &&
      Boolean(paymentTid) &&
      !isClosedForNicePaymentSync(statusLabel);
    return {
      id,
      kind: "order",
      createdAt: toISO(o.createdAt),
      customer: cust,
      title: summarizeOrderItems(o.items),
      statusLabel,
      statusDisplayLabel,
      paymentLabel,
      paymentProvider,
      paymentTid,
      paymentInfo: {
        provider: paymentProvider,
        tid: paymentTid,
        status: getString(paymentInfo?.status) ?? null,
        niceSync: niceSync
          ? {
              pgStatus: getString(niceSync.pgStatus) ?? null,
              lastSyncedAt: toISO(niceSync.lastSyncedAt),
            }
          : null,
      },
      canSyncNicePayment,
      amount: Number(o.totalPrice ?? 0),
      shippingMethod,
      flow: orderFlowByHasRacket(orderHasRacket.get(id) ?? false, isIntegrated),
      flowLabel: flowLabelOf(orderFlowByHasRacket(orderHasRacket.get(id) ?? false, isIntegrated)),
      settlementAnchor: "order",
      settlementLabel: settlementLabelOf("order"),
      href: `/admin/orders/${id}`,
      related: appId
        ? {
            kind: "stringing_application",
            id: appId,
            href: `/admin/applications/stringing/${appId}`,
          }
        : null,
      isIntegrated,
      hasShippingInfo,
      hasOutboundTracking,
      warnReasons: warnByKey.get(`order:${id}`) ?? [],
      pendingReasons: [
        ...(pendingByKey.get(`order:${id}`) ?? []),
        ...(cancel.status === "requested" ? ["취소 요청 처리 필요"] : []),
        ...(cancel.status === "approved_pending_pg_cancel" ? ["PG 취소 확인 필요"] : []),
      ],
      warn: needsCancelFinalization || (warnByKey.get(`order:${id}`)?.length ?? 0) > 0,
      cancel,
      needsCancelFinalization,
      ...inferNextActionForOperationItem({
        kind: "order",
        statusLabel,
        statusDisplayLabel,
        paymentLabel,
        related: appId
          ? {
              kind: "stringing_application",
              id: appId,
              href: `/admin/applications/stringing/${appId}`,
            }
          : null,
        hasShippingInfo,
        hasOutboundTracking,
        shippingMethod,
        cancelStatus: cancel.status,
        needsCancelFinalization,
        refundAccountReady: cancel.refundAccountReady,
      }),
    };
  });

  const appItems: OpItem[] = asDocArray(rawApps).map((a) => {
    const id = String(a._id);
    const cust = pickCustomerFromDoc(a);
    const linkedOrderId = a?.orderId ? String(a.orderId) : null;
    const linkedRentalId = a?.rentalId ? String(a.rentalId) : null;
    const isIntegrated = !!(linkedOrderId || linkedRentalId);

    // 신청서는 상세/정산에서 “가격 누락”이 치명적이므로,
    // totalPrice 우선, 없으면 serviceAmount로 보완.
    const amount = Number(a?.totalPrice ?? a?.serviceAmount ?? 0);

    // 연결 우선순위: 주문 연결 > 대여 연결 (필요 시 UX 기준으로 바꿔도 됨)
    const related = linkedOrderId
      ? {
          kind: "order" as const,
          id: linkedOrderId,
          href: `/admin/orders/${linkedOrderId}`,
        }
      : linkedRentalId
        ? {
            kind: "rental" as const,
            id: linkedRentalId,
            href: `/admin/rentals/${linkedRentalId}`,
          }
        : null;

    const paymentDerived = deriveStringingPaymentLabel(a);
    const paymentSource = getString(a?.paymentSource) ?? "";
    const hasExplicitPaymentStatus = Boolean(getString(a?.paymentStatus));
    const hasPaymentSource = Boolean(paymentSource.trim());
    const serviceFeeBefore = Number(a?.serviceFeeBefore ?? 0);
    const cancel = normalizeCancelRequest(a);
    const reviewReasons: string[] = [];
    const reviewInfoReasons: string[] = [];
    const reviewActionReasons: string[] = [];
    if (linkedOrderId && !hasExplicitPaymentStatus)
      reviewInfoReasons.push(
        "주문 기반 신청서이나 신청서 paymentStatus가 비어 있어 파생 결제상태를 사용했습니다.",
      );
    if (linkedRentalId && !hasExplicitPaymentStatus)
      reviewInfoReasons.push(
        "대여 기반 신청서이나 신청서 paymentStatus가 비어 있어 파생 결제상태를 사용했습니다.",
      );
    if (
      linkedOrderId &&
      !hasExplicitPaymentStatus &&
      !hasPaymentSource &&
      paymentDerived.source === "pending"
    )
      reviewInfoReasons.push(
        "주문 기반 신청서인데 paymentSource/paymentStatus가 비어 있어 결제대기로 해석되었습니다.",
      );
    if (
      linkedRentalId &&
      !hasExplicitPaymentStatus &&
      !hasPaymentSource &&
      paymentDerived.source === "pending"
    )
      reviewInfoReasons.push(
        "대여 기반 신청서인데 paymentSource/paymentStatus가 비어 있어 결제대기로 해석되었습니다.",
      );
    if (a?.packageApplied === true) reviewInfoReasons.push("패키지 차감 기반 신청서입니다.");
    if (paymentSource.startsWith("order:"))
      reviewInfoReasons.push("결제 소스가 주문(order:)을 가리킵니다.");
    if (paymentSource.startsWith("rental:"))
      reviewInfoReasons.push("결제 소스가 대여(rental:)를 가리킵니다.");
    if (paymentDerived.derived)
      reviewInfoReasons.push("신청서 결제상태를 정책 규칙으로 파생했습니다.");
    if (paymentDerived.source === "unknown")
      reviewActionReasons.push("신청서 결제소스를 판별할 수 없어 확인이 필요합니다.");
    reviewReasons.push(...reviewActionReasons, ...reviewInfoReasons);
    const reviewLevel: AdminOperationReviewLevel =
      reviewActionReasons.length > 0 ? "action" : reviewInfoReasons.length > 0 ? "info" : "none";

    const shippingFollowupRequired = needsStringingShippingFollowup(a);
    const stringingShippingPendingReason =
      "교체완료 상태지만 배송/반송 운송장 정보가 없습니다.";
    const stringingShippingNextAction = "배송/반송 운송장 등록 여부를 확인하세요.";

    const amountNote = (() => {
      if (amount !== 0) return undefined;
      if (a?.packageApplied === true) return "패키지차감";
      if (paymentSource.startsWith("order:") || linkedOrderId) return "주문결제포함";
      if (paymentSource.startsWith("rental:") || linkedRentalId) return "대여결제포함";
      if (paymentDerived.source === "unknown") return "확인필요";
      return "별도청구없음";
    })();

    return {
      id,
      kind: "stringing_application",
      createdAt: toISO(a.createdAt),
      customer: cust,
      title: "교체 서비스 신청",
      statusLabel: String(a?.status ?? "접수완료"),
      paymentLabel: paymentDerived.paymentLabel,
      amount,
      amountNote,
      amountReference: amount === 0 && serviceFeeBefore > 0 ? serviceFeeBefore : undefined,
      amountReferenceLabel: amount === 0 && serviceFeeBefore > 0 ? "기준금액" : undefined,
      flow: (() => {
        if (!isIntegrated) return 3 as Flow;
        if (related?.kind === "order")
          return orderFlowByHasRacket(orderHasRacket.get(String(related.id)) ?? false, true);
        if (related?.kind === "rental") return 7 as Flow;
        return 3 as Flow;
      })(),
      flowLabel: (() => {
        const f = (() => {
          if (!isIntegrated) return 3 as Flow;
          if (related?.kind === "order")
            return orderFlowByHasRacket(orderHasRacket.get(String(related.id)) ?? false, true);
          if (related?.kind === "rental") return 7 as Flow;
          return 3 as Flow;
        })();
        return flowLabelOf(f);
      })(),
      settlementAnchor: (() => {
        // 통합 신청서는 정산이 “앵커(주문/대여)”로 잡히는 것이 원칙
        if (!isIntegrated) return "application" as SettlementAnchor;
        if (related?.kind === "order") return "order" as SettlementAnchor;
        if (related?.kind === "rental") return "rental" as SettlementAnchor;
        return "application" as SettlementAnchor;
      })(),
      settlementLabel: (() => {
        const anchor = (() => {
          if (!isIntegrated) return "application" as SettlementAnchor;
          if (related?.kind === "order") return "order" as SettlementAnchor;
          if (related?.kind === "rental") return "rental" as SettlementAnchor;
          return "application" as SettlementAnchor;
        })();
        return settlementLabelOf(anchor);
      })(),
      href: linkedOrderId
        ? `/admin/orders/${linkedOrderId}`
        : `/admin/applications/stringing/${id}`,
      related,
      isIntegrated,
      warnReasons: warnByKey.get(`stringing_application:${id}`) ?? [],
      pendingReasons: [
        ...(pendingByKey.get(`stringing_application:${id}`) ?? []),
        ...(cancel.status === "requested" ? ["취소 요청 처리 필요"] : []),
        ...(shippingFollowupRequired ? [stringingShippingPendingReason] : []),
      ],
      warn: (warnByKey.get(`stringing_application:${id}`)?.length ?? 0) > 0,
      needsReview: reviewLevel === "action",
      reviewLevel,
      reviewTitle:
        reviewLevel === "action"
          ? "결제 상태 확인 필요"
          : reviewLevel === "info"
            ? "자동 계산 정보"
            : undefined,
      reviewReasons,
      cancel,
      shippingFollowupRequired,
      ...inferNextActionForOperationItem({
        kind: "stringing_application",
        statusLabel: String(a?.status ?? "접수완료"),
        paymentLabel: paymentDerived.paymentLabel,
        related,
        cancelStatus: cancel.status,
        refundAccountReady: cancel.refundAccountReady,
      }),
      ...(shippingFollowupRequired
        ? { stage: "운송장 확인", nextAction: stringingShippingNextAction }
        : {}),
    };
  });

  const rentalItems: OpItem[] = rawRentals.map((r) => {
    const id = String(r._id);
    const u = r?.userId ? userMap.get(String(r.userId)) : null;
    const cust =
      u?.name || u?.email
        ? { name: String(u?.name ?? ""), email: String(u?.email ?? "") }
        : pickCustomerFromDoc(r);
    const rawAppId = r?.stringingApplicationId ?? null;
    const stringingApplicationId = rawAppId ? getIdString(rawAppId) : null;
    const appId = stringingApplicationId || (rentalToApp.get(id) ?? null);
    const withStringService =
      Boolean(r?.stringing?.requested) || Boolean(r?.isStringServiceApplied) || Boolean(appId);
    const isIntegrated = Boolean(appId);
    const days = Number(r?.days ?? r?.period ?? 0);
    const amount = normalizeRentalAmountTotal(r);
    const rentalPaymentMeta = normalizeRentalPaymentMeta(r);
    const hasOutboundTracking = Boolean(
      r?.shipping?.outbound?.trackingNumber ?? r?.outboundTrackingNo,
    );
    const rentalDueAt = toISO(r?.returnDueAt ?? r?.endDate ?? r?.dueAt);
    const linkedApplication = appId ? appById.get(appId) : null;
    const stringingDoc = asDoc(r?.stringing);
    const stringingName = getString(stringingDoc?.name);
    const stringPrice = Number(
      r?.amount?.stringPrice ?? (stringingDoc?.requested ? stringingDoc?.price : 0) ?? 0,
    );
    const mountingFee = Number(
      r?.amount?.stringingFee ?? (stringingDoc?.requested ? stringingDoc?.mountingFee : 0) ?? 0,
    );
    const requested =
      Boolean(stringingDoc?.requested) || stringPrice > 0 || mountingFee > 0 || Boolean(appId);
    const reviewLevel: AdminOperationReviewLevel =
      rentalPaymentMeta.source === "derived" ? "info" : "none";
    const cancel = normalizeCancelRequest(r);
    const depositRefundedAt = toISO(r?.depositRefundedAt);
    const rentalStatusLabel = normalizeRentalStatus(r?.status);
    const needsDepositRefund = rentalStatusLabel === "반납완료" && !depositRefundedAt;

    return {
      id,
      kind: "rental",
      createdAt: toISO(r.createdAt),
      customer: cust,
      title:
        `${String(r?.brand ?? "")} ${String(r?.model ?? "")}`.trim() + (days ? ` (${days}일)` : ""),
      statusLabel: rentalStatusLabel,
      paymentLabel: rentalPaymentMeta.label,
      amount,
      flow: rentalFlowByWithService(withStringService),
      flowLabel: flowLabelOf(rentalFlowByWithService(withStringService)),
      settlementAnchor: "rental",
      settlementLabel: settlementLabelOf("rental"),
      href: `/admin/rentals/${id}`,
      related: appId
        ? {
            kind: "stringing_application",
            id: appId,
            href: `/admin/applications/stringing/${appId}`,
          }
        : null,
      isIntegrated,
      warnReasons: warnByKey.get(`rental:${id}`) ?? [],
      pendingReasons: [
        ...(pendingByKey.get(`rental:${id}`) ?? []),
        ...(needsDepositRefund
          ? ["대여가 반납완료 상태지만 보증금 환불 완료 기록이 없습니다."]
          : []),
        ...(cancel.status === "requested" ? ["취소 요청 처리 필요"] : []),
      ],
      warn: (warnByKey.get(`rental:${id}`)?.length ?? 0) > 0,
      needsReview: false,
      reviewLevel,
      reviewTitle: reviewLevel === "info" ? "자동 계산 정보" : undefined,
      reviewReasons:
        reviewLevel === "info"
          ? ["대여 결제상태 필드가 비어 있어 대여 상태/paidAt 기준으로 결제상태를 파생했습니다."]
          : [],
      stringingSummary: requested
        ? {
            requested,
            name: stringingName ?? undefined,
            price: stringPrice > 0 ? stringPrice : undefined,
            mountingFee: mountingFee > 0 ? mountingFee : undefined,
            applicationStatus: getString(linkedApplication?.status) ?? undefined,
          }
        : undefined,
      hasOutboundTracking,
      rentalDueAt,
      depositRefundedAt,
      cancel,
      ...inferNextActionForOperationItem({
        kind: "rental",
        statusLabel: rentalStatusLabel,
        paymentLabel: rentalPaymentMeta.label,
        hasOutboundTracking,
        rentalDueAt,
        depositRefundedAt,
        linkedApplicationStatus: getString(linkedApplication?.status),
        cancelStatus: cancel.status,
        refundAccountReady: cancel.refundAccountReady,
      }),
    };
  });

  const packagePurchaseItems: OpItem[] = await measure(
    "operations.fetchPackagePurchases.mapItems",
    () =>
      rawPackagePurchases.map((purchase) => {
        const id = String(purchase._id);
        const packageInfo = asDoc(purchase.packageInfo);
        const sessions = Number(packageInfo?.sessions ?? 0);
        const packageTitle =
          getString(packageInfo?.title) ?? (sessions > 0 ? `${sessions}회권` : "패키지");
        const statusLabel = getString(purchase.status) ?? "주문접수";
        const paymentLabel = getString(purchase.paymentStatus) ?? "결제대기";
        const serviceInfo = asDoc(purchase.serviceInfo);
        const snapshotCustomer = pickCustomerFromDoc(purchase);
        const customer =
          snapshotCustomer.name || snapshotCustomer.email
            ? snapshotCustomer
            : {
                name: getString(serviceInfo?.name) ?? "",
                email: getString(serviceInfo?.email) ?? "",
              };

        return {
          id,
          kind: "package_purchase",
          createdAt: toISO(purchase.createdAt),
          customer,
          title: sessions > 0 ? `${packageTitle} · ${sessions}회` : packageTitle,
          statusLabel,
          paymentLabel,
          amount: Number(purchase.totalPrice ?? 0),
          flow: 8,
          flowLabel: "패키지 구매",
          settlementAnchor: "package_purchase",
          settlementLabel: "패키지 구매",
          href: `/admin/packages/${id}`,
          related: null,
          isIntegrated: false,
          pendingReasons: ["새 패키지 구매가 접수되었습니다."],
          nextAction: "패키지 구매를 확인하고 결제 상태와 이용권 활성화 상태를 확인하세요.",
        };
      }),
  );

  // 5) 병합 → 최신순 정렬 → kind/q 필터
  let merged: OpItem[] = [...orderItems, ...appItems, ...rentalItems, ...packagePurchaseItems].sort(
    (a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    },
  );

  if (kind !== "all") merged = merged.filter((x) => x.kind === kind);

  if (q) {
    /**
     * 최종 메모리 필터는 "안전망"으로만 유지한다.
     * - 1차 후보 추출은 DB $or 검색(primary ids set)에서 최대한 소화.
     * - 여기서는 DB로 올리기 어려운 파생 문자열(예: ObjectId 부분검색, 파생 title)만 보정.
     *
     * TODO(admin-ops search/index)
     * - 다음 단계에서는 order/rental/application의 식별자 exact/prefix 조회를 위한 인덱스
     *   (_id 외 stringingApplicationId/orderId/rentalId, customer/userSnapshot/guest email)를 우선 검토.
     * - 광범위 contains 검색(title 자유검색)은 이번 범위 밖이며, 필요 시 Atlas Search/full-text로 분리 검토.
     */
    const dbMatchedIds = {
      order: dbMatchedOrderIds,
      rental: dbMatchedRentalIds,
      application: dbMatchedAppIds,
      packagePurchase: dbMatchedPackagePurchaseIds,
    };
    merged = merged.filter(
      (item) =>
        isMatchedByDbCandidate(item, dbMatchedIds) || matchesResidualMemoryFallback(item, q),
    );
  }

  // flow=1..8 (시나리오) 필터
  // - "그룹(통합)"의 구성(앵커/하위)을 깨지 않기 위해, '그룹 키' 기준으로 통째로 남긴다.
  // - 즉, 해당 그룹의 어떤 문서든 flow가 매칭되면 같은 그룹 키의 문서를 같이 남긴다.
  if (flow) {
    const allowedKeys = new Set<string>();
    for (const it of merged) {
      if (it.flow === flow) allowedKeys.add(groupKeyOf(it));
    }
    merged = merged.filter((it) => allowedKeys.has(groupKeyOf(it)));
  }

  // integrated=1/0 (통합/단독) 필터
  // - 그룹 키 기준으로 통째로 남김(앵커/하위 깨짐 방지)
  if (integrated !== null) {
    const groupIntegrated = new Map<string, boolean>();
    // 기본값 false로 두고, 그룹 내에 isIntegrated=true가 하나라도 있으면 true
    for (const it of merged) {
      const key = groupKeyOf(it);
      const prev = groupIntegrated.get(key) ?? false;
      if (prev) continue;
      if (it.isIntegrated) groupIntegrated.set(key, true);
      else groupIntegrated.set(key, prev);
    }
    const allowedKeys = new Set<string>();
    for (const [key, isInt] of groupIntegrated.entries()) {
      if (isInt === integrated) allowedKeys.add(key);
    }
    merged = merged.filter((it) => allowedKeys.has(groupKeyOf(it)));
  }

  // warn=1이면 서버에서 "경고 그룹"만 남긴 뒤 페이지네이션
  if (warn) merged = filterWarnGroups(merged);

  // structured signals 생성(기존 warn/pending/review 이유 배열은 호환 목적 유지)
  merged = merged.map((item) => {
    const isTerminal = isTerminalOperationItem(item);
    const cancelFinalizationSignal = item.needsCancelFinalization
      ? [
          {
            code: "PG_CANCEL_FINALIZATION_REQUIRED",
            level: "warn" as const,
            sourceKind: item.kind,
            sourceId: item.id,
            title: "PG 결제취소 감지 주문",
            description:
              "결제는 취소되었지만 주문 상태가 아직 완료/진행 상태입니다. 재고/포인트/연결 교체서비스 후처리를 진행하세요.",
            nextAction: "취소 후처리하기",
          },
        ]
      : [];
    const signals = isTerminal
      ? cancelFinalizationSignal
      : [...cancelFinalizationSignal, ...buildItemSignals(item)];
    return {
      ...item,
      signals,
      primarySignal: pickPrimarySignal(signals),
      nextAction: isTerminal ? "후속 조치 없음" : item.nextAction,
      reviewLevel: isTerminal ? "none" : item.reviewLevel,
      needsReview: isTerminal ? false : item.needsReview,
    };
  });

  // 그룹 기준으로 재구성 (페이지 경계에서 그룹 분리 방지)
  let groups = await measure("operations.mergeGroups", () => buildGroups(merged));

  const isGroupWarn = (group: AdminOperationsGroup) =>
    group.signals.some((signal) => signal.level === "warn");
  const isGroupPending = (group: AdminOperationsGroup) =>
    group.signals.some((signal) => signal.level === "pending");

  const hasPaymentRisk = (group: AdminOperationsGroup) =>
    group.items.some((item) =>
      ["결제취소", "결제실패", "확인필요"].includes(item.paymentLabel ?? ""),
    );
  const hasPaymentPending = (group: AdminOperationsGroup) =>
    group.items.some((item) => (item.paymentLabel ?? "") === "결제대기");
  const hasRoutineNextAction = (group: AdminOperationsGroup) =>
    group.items.some(
      (item) =>
        Boolean(item.nextAction?.trim()) && !String(item.nextAction).includes("후속 조치 없음"),
    );
  const hasCancelWorkflowPending = (group: AdminOperationsGroup) =>
    group.items.some(
      (item) =>
        item.cancel?.status === "requested" ||
        item.cancel?.status === "approved_pending_pg_cancel" ||
        isCancelProcessingItem(item),
    );

  const groupsWithQueue = groups.map((group) => {
    const isTerminalGroup = isOperationallyTerminalGroup(group);
    const groupReviewLevel = isTerminalGroup ? "none" : computeGroupReviewLevel(group);
    const groupNeedsReview =
      !isTerminalGroup &&
      (groupReviewLevel === "action" || group.linkedFlowStatusIssue?.severity === "warning");
    const queueBucket: AdminOperationsGroup["groupQueueBucket"] = isTerminalGroup
      ? "clean"
      : isGroupWarn(group)
        ? "urgent"
        : groupNeedsReview || hasCancelWorkflowPending(group) || hasPaymentRisk(group)
          ? "caution"
          : isGroupPending(group) || hasPaymentPending(group) || hasRoutineNextAction(group)
            ? "pending"
            : "clean";
    return {
      ...group,
      groupReviewLevel,
      groupNeedsReview,
      groupQueueBucket: queueBucket,
    };
  });
  const allGroups = q
    ? groupsWithQueue
    : groupsWithQueue.filter((group) => !isOperationallyTerminalGroup(group));

  const isCautionQueueGroup = (group: AdminOperationsGroup) => group.groupQueueBucket === "caution";
  const isPendingQueueGroup = (group: AdminOperationsGroup) => group.groupQueueBucket === "pending";
  const isCleanGroup = (group: AdminOperationsGroup) => group.groupQueueBucket === "clean";
  const isGroupReview = (group: AdminOperationsGroup) => group.groupNeedsReview === true;

  const summaryAll: AdminOperationsSummary = allGroups.reduce(
    (acc, group) => {
      if (isGroupWarn(group)) acc.urgent += 1;
      if (isCautionQueueGroup(group)) acc.caution += 1;
      if (isPendingQueueGroup(group)) acc.pending += 1;
      return acc;
    },
    { urgent: 0, caution: 0, pending: 0 },
  );

  const operationGroupCounts = {
    // 대표 업무 합계는 주문·대여·단독 교체서비스 기준입니다.
    // 패키지 구매는 결제 확인 항목으로 별도 집계해 UI에서 분리해서 보여줍니다.
    totalRepresentativeTasks: allGroups.filter((group) => group.anchorKind !== "package_purchase")
      .length,
    // 현재 목록 화면에서는 실제 오늘 생성/변경 기준이 아니라 남은 대표 업무 큐 기준입니다.
    todayRepresentativeTasks: summaryAll.urgent + summaryAll.caution + summaryAll.pending,
  };
  const groupHas = (group: AdminOperationsGroup, predicate: (item: OpItem) => boolean) =>
    group.items.some(predicate);
  const isRentalReturnedForDeposit = (item: OpItem) => {
    const statusText = `${item.statusDisplayLabel ?? ""} ${item.statusLabel ?? ""}`.toLowerCase();
    return statusText.includes("returned") || statusText.includes("반납완료");
  };
  const hasDepositRefundSignal = (item: OpItem) =>
    item.signals?.some((signal) => signal.code === "RENTAL_DEPOSIT_REFUND_REQUIRED") === true;
  const hasDepositRefundKeyword = (item: OpItem) =>
    item.nextAction?.includes("보증금") === true;
  const isRentalDepositRefundRequiredItem = (item: OpItem): boolean =>
    item.kind === "rental" &&
    !item.depositRefundedAt &&
    (hasDepositRefundSignal(item) ||
      (isRentalReturnedForDeposit(item) && hasDepositRefundKeyword(item)));
  const operationSignalCounts: OperationSignalCounts = {
    cancelRequests: allGroups.filter((group) =>
      groupHas(
        group,
        (item) =>
          item.cancel?.status === "requested" ||
          item.cancel?.status === "approved_pending_pg_cancel",
      ),
    ).length,
    paymentCheck: allGroups.filter(
      (group) =>
        hasPaymentPending(group) || groupHas(group, (item) => item.paymentLabel === "확인필요"),
    ).length,
    packagePaymentCheck: allGroups.filter((group) => group.anchorKind === "package_purchase")
      .length,
    shippingMissing: allGroups.filter((group) =>
      groupHas(group, (item) =>
        Boolean(item.nextAction?.includes("운송장") || item.nextAction?.includes("배송")),
      ),
    ).length,
    stringingWork: allGroups.filter((group) =>
      groupHas(
        group,
        (item) =>
          item.kind === "stringing_application" && !String(item.statusLabel).includes("교체완료"),
      ),
    ).length,
    rentalDue: allGroups.filter((group) =>
      groupHas(
        group,
        (item) =>
          (item.kind === "rental" && Boolean(item.rentalDueAt || item.nextAction?.includes("반납"))) ||
          isRentalDepositRefundRequiredItem(item),
      ),
    ).length,
    linkedReview: allGroups.filter((group) => Boolean(group.linkedFlowStatusIssue)).length,
    offline: 0,
    academyApplications: 0,
  };

  groups = allGroups;

  if (warnFilter === "warn") groups = groups.filter((group) => isGroupWarn(group));
  if (warnFilter === "caution") groups = groups.filter((group) => isCautionQueueGroup(group));
  if (warnFilter === "review")
    groups = groups.filter((group) => !isGroupWarn(group) && isGroupReview(group));
  if (warnFilter === "pending") groups = groups.filter((group) => isPendingQueueGroup(group));
  if (warnFilter === "clean") groups = groups.filter((group) => isCleanGroup(group));

  if (warnSort !== "default") {
    groups = await measure("operations.sortGroups", () =>
      [...groups].sort((a, b) => {
        const aWarn = isGroupWarn(a);
        const bWarn = isGroupWarn(b);
        if (aWarn === bWarn) {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        }
        if (warnSort === "warn_first") return aWarn ? -1 : 1;
        return aWarn ? 1 : -1;
      }),
    );
  }

  const filteredGroupsCount = groups.length;
  const start = (page - 1) * pageSize;
  const { pagedGroups, items } = await measure("operations.paginate", () => {
    const nextPagedGroups = groups.slice(start, start + pageSize);
    return {
      pagedGroups: nextPagedGroups,
      items: nextPagedGroups.flatMap((group) => group.items),
    };
  });

  const responseDto: AdminOperationsListResponseDto = await measure(
    "operations.responseDto",
    () => ({
      summaryAll,
      groups: pagedGroups,
      operationGroupCounts,
      operationSignalCounts,
      pagination: {
        page,
        pageSize,
        totalGroupsAll: allGroups.length,
        filteredGroupsCount,
        totalGroups: filteredGroupsCount,
      },
      // transitional shape
      items,
      total: filteredGroupsCount,
    }),
  );
  return NextResponse.json(responseDto);
}
