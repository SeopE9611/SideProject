import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAudit } from "@/lib/audit";
import { offlineRecordCreateSchema } from "@/lib/offline/validators";
import { maskPhone, normalizePhone } from "@/lib/offline/normalizers";

const KIND_VALUES = ["stringing", "package_sale", "etc"] as const;
const STATUS_VALUES = ["received", "in_progress", "completed", "picked_up", "canceled"] as const;
const PAYMENT_STATUS_VALUES = ["pending", "paid", "refunded"] as const;
const PAYMENT_METHOD_VALUES = ["cash", "card", "bank_transfer", "etc"] as const;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parsePositiveInt(value: string | null, fallback: number, max?: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  const normalized = Math.floor(parsed);
  return max ? Math.min(normalized, max) : normalized;
}

function parseDateBoundary(value: string | null, boundary: "from" | "to") {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const date = dateOnly
    ? new Date(boundary === "from" ? `${trimmed}T00:00:00.000Z` : `${trimmed}T23:59:59.999Z`)
    : new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function enumFilter<T extends readonly string[]>(value: string | null, allowed: T, field: string) {
  if (!value) return { ok: true as const, filter: null };
  if (!allowed.includes(value)) return { ok: false as const, message: `invalid ${field}` };
  return { ok: true as const, filter: value };
}

function formatLineSummary(lines?: Array<{ racketName?: string; stringName?: string; tensionMain?: string; tensionCross?: string }>): string {
  if (!Array.isArray(lines) || lines.length === 0) return "작업 내용 미입력";
  const summary = lines
    .map((line) => {
      const main = String(line.tensionMain ?? "").trim();
      const cross = String(line.tensionCross ?? "").trim();
      const tension = main || cross ? `${main || "-"}/${cross || "-"}` : "";
      return [String(line.racketName ?? "").trim(), String(line.stringName ?? "").trim(), tension].filter(Boolean).join(" · ");
    })
    .filter(Boolean)
    .join(", ");
  return summary || "작업 내용 미입력";
}

function serializeRecord(d: Record<string, any>) {
  return {
    id: String(d._id),
    offlineCustomerId: d.offlineCustomerId ? String(d.offlineCustomerId) : null,
    occurredAt: d.occurredAt instanceof Date ? d.occurredAt.toISOString() : d.occurredAt ?? d.createdAt ?? null,
    customerName: d.customerSnapshot?.name || "",
    customerPhoneMasked: maskPhone(d.customerSnapshot?.phone || ""),
    maskedPhone: maskPhone(d.customerSnapshot?.phone || ""),
    kind: d.kind,
    lineSummary: formatLineSummary(d.lines),
    lines: d.lines || [],
    memo: d.memo || "",
    payment: d.payment,
    status: d.status,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt ?? null,
    updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt ?? null,
  };
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const url = new URL(req.url);
  const page = parsePositiveInt(url.searchParams.get("page"), 1);
  const limit = parsePositiveInt(url.searchParams.get("limit"), 20, 100);
  const from = parseDateBoundary(url.searchParams.get("from"), "from");
  const to = parseDateBoundary(url.searchParams.get("to"), "to");
  if ((url.searchParams.get("from") && !from) || (url.searchParams.get("to") && !to)) {
    return NextResponse.json({ message: "invalid date filter" }, { status: 400 });
  }

  const kind = enumFilter(url.searchParams.get("kind"), KIND_VALUES, "kind");
  const status = enumFilter(url.searchParams.get("status"), STATUS_VALUES, "status");
  const paymentStatus = enumFilter(url.searchParams.get("paymentStatus"), PAYMENT_STATUS_VALUES, "paymentStatus");
  const paymentMethod = enumFilter(url.searchParams.get("paymentMethod"), PAYMENT_METHOD_VALUES, "paymentMethod");
  for (const result of [kind, status, paymentStatus, paymentMethod]) {
    if (!result.ok) return NextResponse.json({ message: result.message }, { status: 400 });
  }

  const and: Record<string, unknown>[] = [];
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    and.push({
      $or: [
        { occurredAt: range },
        { occurredAt: { $exists: false }, createdAt: range },
        { occurredAt: null, createdAt: range },
      ],
    });
  }
  const name = (url.searchParams.get("name") || "").trim();
  if (name) and.push({ "customerSnapshot.name": new RegExp(escapeRegex(name), "i") });
  const phone = (url.searchParams.get("phone") || "").trim();
  if (phone) {
    const normalizedPhone = normalizePhone(phone);
    const phoneOr: Record<string, unknown>[] = [{ "customerSnapshot.phone": new RegExp(escapeRegex(phone), "i") }];
    if (normalizedPhone) {
      const loosePhonePattern = normalizedPhone.split("").map(escapeRegex).join("\\D*");
      phoneOr.push({ "customerSnapshot.phone": new RegExp(loosePhonePattern) });
    }
    and.push({ $or: phoneOr });
  }
  if (kind.filter) and.push({ kind: kind.filter });
  if (status.filter) and.push({ status: status.filter });
  if (paymentStatus.filter) and.push({ "payment.status": paymentStatus.filter });
  if (paymentMethod.filter) and.push({ "payment.method": paymentMethod.filter });

  const filter = and.length ? { $and: and } : {};
  const projection = { offlineCustomerId: 1, customerSnapshot: 1, kind: 1, occurredAt: 1, createdAt: 1, updatedAt: 1, status: 1, payment: 1, lines: 1, memo: 1 };
  const total = await guard.db.collection("offline_service_records").countDocuments(filter);
  const items = await guard.db
    .collection("offline_service_records")
    .find(filter, { projection })
    .sort({ occurredAt: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  return NextResponse.json({ items: items.map(serializeRecord), page, limit, total, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req); if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req); if (!csrf.ok) return csrf.res;
  const body = await req.json().catch(()=>null); const parsed = offlineRecordCreateSchema.safeParse(body); if (!parsed.success) return NextResponse.json({ message:"invalid body", issues: parsed.error.flatten() }, { status:400 });
  if (!ObjectId.isValid(parsed.data.offlineCustomerId)) return NextResponse.json({ message: "invalid customer" }, { status: 400 });
  const customer = await guard.db.collection("offline_customers").findOne({ _id: new ObjectId(parsed.data.offlineCustomerId) }, { projection: { name: 1, phone: 1, email: 1, linkedUserId: 1 } });
  if (!customer) return NextResponse.json({ message: "offline customer not found" }, { status: 404 });
  const now = new Date();
  const doc: Record<string, any> = { ...parsed.data, offlineCustomerId: new ObjectId(parsed.data.offlineCustomerId), userId: customer.linkedUserId ?? (parsed.data.userId && ObjectId.isValid(parsed.data.userId) ? new ObjectId(parsed.data.userId) : null), customerSnapshot: { name: customer.name || "", phone: customer.phone || "", email: customer.email || null }, source: "offline_admin", occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : now, payment: { ...parsed.data.payment, paidAt: parsed.data.payment.paidAt ? new Date(parsed.data.payment.paidAt) : undefined }, createdAt: now, updatedAt: now, createdBy: guard.admin._id };
  const r = await guard.db.collection("offline_service_records").insertOne(doc);
  const paidAmount = doc.payment?.status === "paid" ? Number(doc.payment?.amount || 0) : 0;
  await guard.db.collection("offline_customers").updateOne({ _id: doc.offlineCustomerId }, { $inc: { "stats.visitCount": 1, "stats.totalPaid": paidAmount, "stats.totalServiceCount": 1 }, $set: { "stats.lastVisitedAt": doc.occurredAt, updatedAt: now, updatedBy: guard.admin._id } });
  await appendAudit(guard.db, { type: "offline_record_create", actorId: guard.admin._id, targetId: r.insertedId, message: "오프라인 작업/매출 등록" }, req);
  return NextResponse.json({ id: String(r.insertedId) }, { status: 201 });
}
