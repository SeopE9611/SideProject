import { NextResponse } from "next/server";
import type { Document, Filter } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { maskPhone } from "@/lib/offline/normalizers";
import { parseKstYmdBoundary } from "@/lib/date/kst";
import { APPS_IN_TOSS_PAYMENT_INTENTS_COLLECTION } from "@/lib/apps-in-toss/server/payment-intents";
import { APPS_IN_TOSS_ATTENTION_ISSUE_TYPES, type AppsInTossAttentionIssueType, type AppsInTossReconciliationItem, type AppsInTossReconciliationSummary } from "@/types/admin/apps-in-toss-reconciliation";
import { appsInTossAttentionNextAction, buildAppsInTossAttentionClassificationExpression, buildAppsInTossAttentionFilter } from "../_lib/reconciliation";

const ISSUE_TYPES = ["all", ...APPS_IN_TOSS_ATTENTION_ISSUE_TYPES] as const;
const ENVIRONMENTS = ["all", "live", "test"] as const;

function dateBoundary(value: string | null, boundary: "from" | "to") {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return parseKstYmdBoundary(value, boundary);
}

function iso(value: unknown): string | null {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return value.toISOString();
}

function maskEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const [local, domain] = value.trim().split("@");
  if (!local || !domain) return null;
  return `${local.slice(0, 1)}${"*".repeat(Math.max(2, Math.min(local.length - 1, 5)))}@${domain}`;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function serialize(row: Document): AppsInTossReconciliationItem {
  const issueType = row.issueType as AppsInTossAttentionIssueType;
  const applicant = row.checkoutPayload?.applicant;
  const item = Array.isArray(row.itemSnapshot) ? row.itemSnapshot[0] : null;
  return {
    id: String(row._id), attemptId: String(row.attemptId), issueType,
    severity: issueType === "finalization_stale" ? "warning" : "critical",
    state: String(row.state), environment: row.isTestPayment ? "test" : "live",
    amount: Number(row.pricingSnapshot?.payableAmount ?? 0),
    customer: {
      name: stringOrNull(applicant?.name) ?? "고객 정보 없음",
      emailMasked: maskEmail(applicant?.email),
      phoneMasked: applicant?.phone ? maskPhone(String(applicant.phone)) : null,
      userId: String(row.userId),
    },
    product: { name: stringOrNull(item?.name), selectedColor: stringOrNull(item?.selectedColor), selectedGauge: stringOrNull(item?.selectedGauge) },
    collection: {
      method: stringOrNull(row.checkoutPayload?.collectionMethod),
      preferredDate: stringOrNull(row.reservationSnapshot?.preferredDate),
      preferredTime: stringOrNull(row.reservationSnapshot?.preferredTime),
    },
    failure: { stage: stringOrNull(row.failureStage), code: stringOrNull(row.failureCode), finalizationCode: stringOrNull(row.finalization?.failureCode) },
    timestamps: {
      createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt), paidAt: iso(row.paidAt),
      finalizationFailedAt: iso(row.finalization?.failedAt), executionClaimedAt: iso(row.execution?.claimedAt),
      executionLeaseUntil: iso(row.execution?.leaseUntil), refundClaimedAt: iso(row.refund?.claimedAt), refundLeaseUntil: iso(row.refund?.leaseUntil),
    },
    links: { orderAdminUrl: row.finalOrderId ? `/admin/orders/${String(row.finalOrderId)}` : null, userAdminUrl: null },
    nextAction: appsInTossAttentionNextAction(issueType),
  };
}

function emptySummary(): AppsInTossReconciliationSummary {
  return { total: 0, reconciliationRequired: 0, compensationRefundRequired: 0, executionLeaseExpired: 0, refundLeaseExpired: 0, finalizationStale: 0, stateInconsistent: 0 };
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const url = new URL(req.url);
  const issueParam = url.searchParams.get("issueType") ?? "all";
  const environmentParam = url.searchParams.get("environment") ?? "all";
  const issueType = ISSUE_TYPES.includes(issueParam as (typeof ISSUE_TYPES)[number]) ? issueParam as (typeof ISSUE_TYPES)[number] : "all";
  const environment = ENVIRONMENTS.includes(environmentParam as (typeof ENVIRONMENTS)[number]) ? environmentParam as (typeof ENVIRONMENTS)[number] : "all";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20) || 20));
  const from = dateBoundary(url.searchParams.get("from"), "from");
  const to = dateBoundary(url.searchParams.get("to"), "to");
  const now = new Date();
  const range: Record<string, Date> = {};
  if (from) range.$gte = from;
  if (to) range.$lte = to;
  const base: Filter<Document> = { $and: [buildAppsInTossAttentionFilter(now)] };
  if (environment !== "all") base.$and!.push({ isTestPayment: environment === "test" });
  if (from || to) base.$and!.push({ updatedAt: range });
  const issueExpression = buildAppsInTossAttentionClassificationExpression(now);
  const selectedMatch = issueType === "all" ? {} : { issueType };

  const [result] = await guard.db.collection(APPS_IN_TOSS_PAYMENT_INTENTS_COLLECTION).aggregate([
    { $match: base },
    { $addFields: { issueType: issueExpression, severityRank: { $cond: [{ $eq: [issueExpression, "finalization_stale"] }, 1, 0] } } },
    { $facet: {
      items: [{ $match: selectedMatch }, { $sort: { severityRank: 1, updatedAt: -1, _id: -1 } }, { $skip: (page - 1) * limit }, { $limit: limit },
        { $project: { attemptId: 1, issueType: 1, state: 1, isTestPayment: 1, userId: 1, finalOrderId: 1, pricingSnapshot: 1, itemSnapshot: { $slice: ["$itemSnapshot", 1] }, "checkoutPayload.applicant": 1, "checkoutPayload.collectionMethod": 1, reservationSnapshot: 1, failureStage: 1, failureCode: 1, finalization: 1, execution: 1, "refund.claimedAt": 1, "refund.leaseUntil": 1, createdAt: 1, updatedAt: 1, paidAt: 1 } }],
      selectedCount: [{ $match: selectedMatch }, { $count: "value" }],
      summary: [{ $group: { _id: null, total: { $sum: 1 }, reconciliationRequired: { $sum: { $cond: [{ $eq: ["$issueType", "reconciliation_required"] }, 1, 0] } }, compensationRefundRequired: { $sum: { $cond: [{ $eq: ["$issueType", "compensation_refund_required"] }, 1, 0] } }, executionLeaseExpired: { $sum: { $cond: [{ $eq: ["$issueType", "execution_lease_expired"] }, 1, 0] } }, refundLeaseExpired: { $sum: { $cond: [{ $eq: ["$issueType", "refund_lease_expired"] }, 1, 0] } }, finalizationStale: { $sum: { $cond: [{ $eq: ["$issueType", "finalization_stale"] }, 1, 0] } }, stateInconsistent: { $sum: { $cond: [{ $eq: ["$issueType", "state_inconsistent"] }, 1, 0] } } } }],
    } },
  ], { maxTimeMS: 8_000, allowDiskUse: false }).toArray();

  const total = Number(result?.selectedCount?.[0]?.value ?? 0);
  const summaryRow = result?.summary?.[0];
  const summary = summaryRow ? {
    total: Number(summaryRow.total), reconciliationRequired: Number(summaryRow.reconciliationRequired),
    compensationRefundRequired: Number(summaryRow.compensationRefundRequired), executionLeaseExpired: Number(summaryRow.executionLeaseExpired),
    refundLeaseExpired: Number(summaryRow.refundLeaseExpired), finalizationStale: Number(summaryRow.finalizationStale), stateInconsistent: Number(summaryRow.stateInconsistent),
  } : emptySummary();
  return NextResponse.json({ items: (result?.items ?? []).map(serialize), page, limit, total, totalPages: total ? Math.ceil(total / limit) : 0, summary });
}
