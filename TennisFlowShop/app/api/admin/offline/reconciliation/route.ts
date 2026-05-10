import { NextResponse } from "next/server";
import { ObjectId, type Document, type Filter } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { maskPhone } from "@/lib/offline/normalizers";
import { OFFLINE_PACKAGE_ORDER_FILTER } from "@/app/api/admin/offline/_lib/packageOrderOffline";

const TYPES = ["all", "package_issue", "package_usage"] as const;
const STATUSES = ["open", "resolved", "ignored", "all"] as const;
type ReconcileType = (typeof TYPES)[number];
type ReconcileStatus = Exclude<(typeof STATUSES)[number], "all">;

type ReconciliationItem = {
  id: string;
  type: "package_issue" | "package_usage";
  status: ReconcileStatus;
  title: string;
  description: string;
  severity: "warning" | "critical";
  createdAt: string | null;
  updatedAt: string | null;
  source: Record<string, string | null>;
  customer: { id: string | null; name: string; phoneMasked: string | null };
  metadata: Record<string, unknown>;
  links: Record<string, string | null>;
  note: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
};

function parseDateBoundary(value: string | null, boundary: "from" | "to") {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const date = new Date(boundary === "from" ? `${trimmed}T00:00:00.000Z` : `${trimmed}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function serializeDate(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function objectIdString(value: unknown): string | null {
  if (value instanceof ObjectId) return String(value);
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

function reconcileStatus(container: Record<string, any> | null | undefined): ReconcileStatus {
  const status = String(container?.reconcileStatus ?? "open");
  return status === "resolved" || status === "ignored" ? status : "open";
}

function buildStatusFilter(path: string, status: string): Filter<Document> {
  if (status === "all") return {};
  if (status === "open") {
    return { $or: [{ [`${path}.reconcileStatus`]: { $exists: false } }, { [`${path}.reconcileStatus`]: null }, { [`${path}.reconcileStatus`]: "open" }] };
  }
  return { [`${path}.reconcileStatus`]: status };
}

function buildDateFilter(path: string, from: Date | null, to: Date | null): Filter<Document> {
  if (!from && !to) return {};
  const range: Record<string, Date> = {};
  if (from) range.$gte = from;
  if (to) range.$lte = to;
  return { [path]: range };
}

function lineSummary(lines: any): string {
  if (!Array.isArray(lines) || lines.length === 0) return "작업 내용 미입력";
  const text = lines
    .map((line) => [line?.racketName, line?.stringName, [line?.tensionMain, line?.tensionCross].filter(Boolean).join("/")].filter(Boolean).join(" · "))
    .filter(Boolean)
    .join(", ");
  return text || "작업 내용 미입력";
}

function packageIssueMatch(status: string, from: Date | null, to: Date | null): Filter<Document> {
  return {
    $and: [
      OFFLINE_PACKAGE_ORDER_FILTER,
      {
        $or: [
          { "meta.requiresOfflineIssueReconcile": true },
          { "meta.offlineIssueStatus": "issue_failed" },
          { "meta.offlineIssueError": { $exists: true, $nin: [null, ""] } },
        ],
      },
      buildStatusFilter("meta", status),
      buildDateFilter("meta.offlineIssueFailedAt", from, to),
    ],
  };
}

function packageUsageMatch(status: string, from: Date | null, to: Date | null): Filter<Document> {
  return {
    $and: [
      { "packageUsage.passId": { $exists: true, $nin: [null, ""] } },
      { $or: [{ "packageUsage.consumptionId": { $exists: false } }, { "packageUsage.consumptionId": null }, { "packageUsage.consumptionId": "" }] },
      { $or: [{ "packageUsage.revertedAt": { $exists: false } }, { "packageUsage.revertedAt": null }] },
      { "packageUsage.reverted": { $ne: true } },
      buildStatusFilter("packageUsage", status),
      buildDateFilter("occurredAt", from, to),
    ],
  };
}

function serializePackageIssue(doc: Record<string, any>): ReconciliationItem {
  const meta = doc.meta ?? {};
  const customerId = objectIdString(meta.offlineCustomerId);
  const linkedUserId = objectIdString(meta.linkedUserId ?? doc.userId);
  const customerName = doc.offlineCustomer?.name ?? doc.serviceInfo?.name ?? doc.userSnapshot?.name ?? "고객 정보 없음";
  const failedAt = serializeDate(meta.offlineIssueFailedAt) ?? serializeDate(doc.updatedAt) ?? serializeDate(doc.createdAt);
  return {
    id: String(doc._id),
    type: "package_issue",
    status: reconcileStatus(meta),
    title: "오프라인 패키지 발급 실패",
    description: "결제/판매 기록은 있으나 서비스 패스 자동 발급 중 오류가 발생해 운영자 확인이 필요합니다.",
    severity: "critical",
    createdAt: serializeDate(doc.createdAt),
    updatedAt: serializeDate(doc.updatedAt),
    source: { packageOrderId: String(doc._id), offlineCustomerId: customerId, linkedUserId },
    customer: { id: customerId, name: String(customerName), phoneMasked: doc.offlineCustomer?.phone ? maskPhone(String(doc.offlineCustomer.phone)) : null },
    metadata: {
      error: meta.offlineIssueError ?? null,
      failedAt,
      amount: doc.totalPrice ?? doc.packageInfo?.price ?? null,
      packageName: doc.packageInfo?.title ?? null,
      paymentMethod: meta.paymentMethod ?? doc.paymentInfo?.method ?? null,
      paidAt: serializeDate(doc.paymentInfo?.approvedAt ?? meta.paidAt),
      history: Array.isArray(doc.history) ? doc.history.slice(-3).map((h: any) => ({ status: h?.status ?? null, date: serializeDate(h?.date), description: h?.description ?? null })) : [],
    },
    links: { customerDetailUrl: customerId ? `/admin/offline/customers/${customerId}` : null, packageOrderAdminUrl: `/admin/packages/${String(doc._id)}` },
    note: typeof meta.reconcileNote === "string" ? meta.reconcileNote : null,
    resolvedAt: serializeDate(meta.reconciledAt),
    resolvedBy: objectIdString(meta.reconciledBy),
  };
}

function serializePackageUsage(doc: Record<string, any>): ReconciliationItem {
  const usage = doc.packageUsage ?? {};
  const customerId = objectIdString(doc.offlineCustomerId);
  const customerName = doc.offlineCustomer?.name ?? doc.customerSnapshot?.name ?? "고객 정보 없음";
  const customerPhone = doc.offlineCustomer?.phone ?? doc.customerSnapshot?.phone ?? null;
  return {
    id: String(doc._id),
    type: "package_usage",
    status: reconcileStatus(usage),
    title: "패키지 사용 연결 누락",
    description: "offline record에는 패스 사용 표시가 있으나 consumption 연결이 없어 운영자 확인이 필요합니다.",
    severity: "warning",
    createdAt: serializeDate(doc.createdAt),
    updatedAt: serializeDate(doc.updatedAt),
    source: { offlineRecordId: String(doc._id), offlineCustomerId: customerId, passId: objectIdString(usage.passId) },
    customer: { id: customerId, name: String(customerName), phoneMasked: customerPhone ? maskPhone(String(customerPhone)) : null },
    metadata: { passId: objectIdString(usage.passId), usedCount: usage.usedCount ?? 1, occurredAt: serializeDate(doc.occurredAt), lineSummary: lineSummary(doc.lines), memo: doc.memo ?? null },
    links: { customerDetailUrl: customerId ? `/admin/offline/customers/${customerId}` : null, offlineRecordUrl: customerId ? `/admin/offline/customers/${customerId}#record-${String(doc._id)}` : "/admin/offline" },
    note: typeof usage.reconcileNote === "string" ? usage.reconcileNote : null,
    resolvedAt: serializeDate(usage.reconciledAt),
    resolvedBy: objectIdString(usage.reconciledBy),
  };
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const url = new URL(req.url);
  const typeParam = url.searchParams.get("type") ?? "all";
  const statusParam = url.searchParams.get("status") ?? "open";
  const type: ReconcileType = TYPES.includes(typeParam as ReconcileType) ? (typeParam as ReconcileType) : "all";
  const status = STATUSES.includes(statusParam as any) ? statusParam : "open";
  const page = Math.max(1, Number(url.searchParams.get("page") || "1") || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "20") || 20));
  const from = parseDateBoundary(url.searchParams.get("from"), "from");
  const to = parseDateBoundary(url.searchParams.get("to"), "to");

  const items: ReconciliationItem[] = [];
  if (type === "all" || type === "package_issue") {
    const rows = await guard.db.collection("packageOrders").aggregate([
      { $match: packageIssueMatch(status, from, to) },
      { $lookup: { from: "offline_customers", localField: "meta.offlineCustomerId", foreignField: "_id", as: "offlineCustomerDocs" } },
      { $addFields: { offlineCustomer: { $first: "$offlineCustomerDocs" } } },
      { $project: { offlineCustomerDocs: 0 } },
    ]).toArray();
    items.push(...rows.map((row) => serializePackageIssue(row as Record<string, any>)));
  }
  if (type === "all" || type === "package_usage") {
    const rows = await guard.db.collection("offline_service_records").aggregate([
      { $match: packageUsageMatch(status, from, to) },
      { $lookup: { from: "offline_customers", localField: "offlineCustomerId", foreignField: "_id", as: "offlineCustomerDocs" } },
      { $addFields: { offlineCustomer: { $first: "$offlineCustomerDocs" } } },
      { $project: { offlineCustomerDocs: 0 } },
    ]).toArray();
    items.push(...rows.map((row) => serializePackageUsage(row as Record<string, any>)));
  }

  items.sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime());
  const total = items.length;
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
  const paged = items.slice((page - 1) * limit, page * limit);
  const summary = items.reduce(
    (acc, item) => {
      if (item.status === "open") acc.open += 1;
      if (item.status === "resolved") acc.resolved += 1;
      if (item.status === "ignored") acc.ignored += 1;
      if (item.type === "package_issue") acc.packageIssue += 1;
      if (item.type === "package_usage") acc.packageUsage += 1;
      return acc;
    },
    { open: 0, packageIssue: 0, packageUsage: 0, resolved: 0, ignored: 0 },
  );

  return NextResponse.json({ items: paged, page, limit, total, totalPages, summary });
}
