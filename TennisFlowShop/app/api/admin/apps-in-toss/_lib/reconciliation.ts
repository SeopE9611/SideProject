import "server-only";

import type { Document, Filter } from "mongodb";
import type { AppsInTossPaymentIntentDocument } from "@/lib/apps-in-toss/server/payment-intents";
import type { AppsInTossAttentionIssueType, AppsInTossAttentionSeverity } from "@/types/admin/apps-in-toss-reconciliation";

export const APPS_IN_TOSS_ADMIN_FINALIZATION_STALE_MS = 5 * 60_000;

export const APPS_IN_TOSS_ATTENTION_PRIORITY: readonly AppsInTossAttentionIssueType[] = [
  "state_inconsistent", "reconciliation_required", "compensation_refund_required",
  "execution_lease_expired", "refund_lease_expired", "finalization_stale",
];

const NEXT_ACTION: Record<AppsInTossAttentionIssueType, string> = {
  state_inconsistent: "내부 결제 상태와 주문 연결을 확인하세요. 자동 재처리하지 마세요.",
  reconciliation_required: "Toss 결제/환불 실제 상태와 내부 상태 대사가 필요합니다.",
  compensation_refund_required: "주문 확정 실패 후 보상 환불 상태를 확인해야 합니다.",
  execution_lease_expired: "결제 승인 결과 확인이 필요합니다. execute-payment를 직접 재호출하지 마세요.",
  refund_lease_expired: "환불 결과 확인이 필요합니다. refund-payment를 직접 재호출하지 마세요.",
  finalization_stale: "결제는 완료됐지만 주문 확정이 완료되지 않았습니다.",
};

const missing = (path: string): Filter<Document> => ({ $or: [{ [path]: { $exists: false } }, { [path]: null }] });
const present = (path: string): Filter<Document> => ({ [path]: { $exists: true, $ne: null } });

export function appsInTossAttentionIssueFilters(now: Date): Record<AppsInTossAttentionIssueType, Filter<Document>> {
  const staleAt = new Date(now.getTime() - APPS_IN_TOSS_ADMIN_FINALIZATION_STALE_MS);
  return {
    state_inconsistent: { $or: [{ $and: [{ state: "finalized" }, missing("finalOrderId")] }, { $and: [{ state: { $ne: "finalized" } }, present("finalOrderId")] }] },
    reconciliation_required: { state: "reconciliation_required" },
    compensation_refund_required: { $and: [{ state: "paid" }, present("finalization.failureCode"), missing("finalOrderId")] },
    execution_lease_expired: { $and: [{ state: "executing" }, { $or: [{ "execution.leaseUntil": { $exists: false } }, { "execution.leaseUntil": null }, { "execution.leaseUntil": { $lte: now } }] }] },
    refund_lease_expired: { $and: [{ state: "refunding" }, { $or: [{ "refund.leaseUntil": { $exists: false } }, { "refund.leaseUntil": null }, { "refund.leaseUntil": { $lte: now } }] }] },
    finalization_stale: { $and: [{ state: "paid" }, missing("finalOrderId"), missing("finalization.failureCode"), { updatedAt: { $lte: staleAt } }] },
  };
}

export function buildAppsInTossAttentionFilter(now: Date): Filter<Document> {
  const filters = appsInTossAttentionIssueFilters(now);
  return { $or: APPS_IN_TOSS_ATTENTION_PRIORITY.map((type) => filters[type]) };
}

export function buildAppsInTossAttentionClassificationExpression(now: Date): Document {
  const staleAt = new Date(now.getTime() - APPS_IN_TOSS_ADMIN_FINALIZATION_STALE_MS);
  const noOrder = { $eq: [{ $ifNull: ["$finalOrderId", null] }, null] };
  const hasOrder = { $ne: [{ $ifNull: ["$finalOrderId", null] }, null] };
  const noFinalizationFailure = { $eq: [{ $ifNull: ["$finalization.failureCode", null] }, null] };
  const hasFinalizationFailure = { $ne: [{ $ifNull: ["$finalization.failureCode", null] }, null] };
  return {
    $switch: {
      branches: [
        { case: { $or: [{ $and: [{ $eq: ["$state", "finalized"] }, noOrder] }, { $and: [{ $ne: ["$state", "finalized"] }, hasOrder] }] }, then: "state_inconsistent" },
        { case: { $eq: ["$state", "reconciliation_required"] }, then: "reconciliation_required" },
        { case: { $and: [{ $eq: ["$state", "paid"] }, hasFinalizationFailure, noOrder] }, then: "compensation_refund_required" },
        { case: { $and: [{ $eq: ["$state", "executing"] }, { $lte: [{ $ifNull: ["$execution.leaseUntil", new Date(0)] }, now] }] }, then: "execution_lease_expired" },
        { case: { $and: [{ $eq: ["$state", "refunding"] }, { $lte: [{ $ifNull: ["$refund.leaseUntil", new Date(0)] }, now] }] }, then: "refund_lease_expired" },
        { case: { $and: [{ $eq: ["$state", "paid"] }, noOrder, noFinalizationFailure, { $lte: ["$updatedAt", staleAt] }] }, then: "finalization_stale" },
      ],
      default: null,
    },
  };
}

export function classifyAppsInTossPaymentAttention(intent: AppsInTossPaymentIntentDocument, now: Date): { issueType: AppsInTossAttentionIssueType; severity: AppsInTossAttentionSeverity; nextAction: string } | null {
  const hasOrder = Boolean(intent.finalOrderId);
  let issueType: AppsInTossAttentionIssueType | null = null;
  if ((intent.state === "finalized" && !hasOrder) || (intent.state !== "finalized" && hasOrder)) issueType = "state_inconsistent";
  else if (intent.state === "reconciliation_required") issueType = "reconciliation_required";
  else if (intent.state === "paid" && intent.finalization?.failureCode != null && !hasOrder) issueType = "compensation_refund_required";
  else if (intent.state === "executing" && (!intent.execution?.leaseUntil || intent.execution.leaseUntil <= now)) issueType = "execution_lease_expired";
  else if (intent.state === "refunding" && (!intent.refund?.leaseUntil || intent.refund.leaseUntil <= now)) issueType = "refund_lease_expired";
  else if (intent.state === "paid" && !hasOrder && intent.finalization?.failureCode == null && intent.updatedAt.getTime() <= now.getTime() - APPS_IN_TOSS_ADMIN_FINALIZATION_STALE_MS) issueType = "finalization_stale";
  return issueType ? { issueType, severity: issueType === "finalization_stale" ? "warning" : "critical", nextAction: NEXT_ACTION[issueType] } : null;
}

export const appsInTossAttentionNextAction = (issueType: AppsInTossAttentionIssueType) => NEXT_ACTION[issueType];
