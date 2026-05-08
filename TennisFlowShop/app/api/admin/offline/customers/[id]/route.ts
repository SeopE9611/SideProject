import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAudit } from "@/lib/audit";
import { offlineCustomerPatchSchema } from "@/lib/offline/validators";
import { maskPhone, normalizeEmail, normalizePhone } from "@/lib/offline/normalizers";
import { sanitizeCustomer } from "@/lib/offline/offline.repository";
import { getPointsBalance } from "@/lib/points.service";
import { isCountEnded, isTimeExpired } from "@/lib/pass-status";

const oid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

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

function sanitizeRecord(doc: Record<string, any>) {
  return {
    id: String(doc._id),
    offlineCustomerId: doc.offlineCustomerId ? String(doc.offlineCustomerId) : null,
    kind: doc.kind,
    status: doc.status,
    occurredAt: doc.occurredAt instanceof Date ? doc.occurredAt.toISOString() : doc.occurredAt ?? null,
    customerSnapshot: doc.customerSnapshot ?? null,
    lines: Array.isArray(doc.lines) ? doc.lines : [],
    lineSummary: formatLineSummary(doc.lines),
    payment: doc.payment ?? null,
    points: {
      earn: typeof doc.points?.earn === "number" ? doc.points.earn : null,
      use: typeof doc.points?.use === "number" ? doc.points.use : null,
      grantTxId: doc.points?.grantTxId ? String(doc.points.grantTxId) : null,
      deductTxId: doc.points?.deductTxId ? String(doc.points.deductTxId) : null,
    },
    memo: doc.memo ?? "",
    packageUsage: {
      passId: doc.packageUsage?.passId ? String(doc.packageUsage.passId) : null,
      usedCount: typeof doc.packageUsage?.usedCount === "number" ? doc.packageUsage.usedCount : null,
      consumptionId: doc.packageUsage?.consumptionId ? String(doc.packageUsage.consumptionId) : null,
    },
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt ?? null,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt ?? null,
  };
}

function sanitizePass(doc: Record<string, any>, now = new Date()) {
  const remainingCount = Number(doc.remainingCount ?? 0);
  const totalCount = Number(doc.packageSize ?? 0);
  const expiredByCount = isCountEnded(remainingCount);
  const expiredByTime = isTimeExpired(doc.expiresAt, now);
  const status = doc.status === "active" && expiredByCount
    ? "ended"
    : doc.status === "active" && expiredByTime
      ? "expired"
      : doc.status;
  const packageName = doc.meta?.planTitle ?? "교체 서비스 패키지";
  return {
    id: String(doc._id),
    name: packageName,
    packageName,
    status,
    totalCount,
    usedCount: typeof doc.usedCount === "number" ? doc.usedCount : null,
    remainingCount,
    expiresAt: doc.expiresAt instanceof Date ? doc.expiresAt.toISOString() : doc.expiresAt ?? null,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt ?? null,
  };
}

function sanitizePackageSale(doc: Record<string, any>) {
  return {
    id: String(doc._id),
    packageName: doc.packageInfo?.title ?? "교체 서비스 패키지",
    sessions: typeof doc.packageInfo?.sessions === "number" ? doc.packageInfo.sessions : Number(doc.packageInfo?.sessions ?? 0),
    price: typeof doc.totalPrice === "number" ? doc.totalPrice : Number(doc.packageInfo?.price ?? 0),
    paymentMethod: doc.meta?.paymentMethod ?? doc.paymentInfo?.method ?? null,
    paymentStatus: doc.paymentStatus ?? null,
    paidAt: doc.paymentInfo?.approvedAt instanceof Date ? doc.paymentInfo.approvedAt.toISOString() : doc.meta?.paidAt ?? null,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt ?? null,
    source: doc.meta?.source ?? null,
  };
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const _id = oid((await ctx.params).id);
  if (!_id) return NextResponse.json({ message: "invalid id" }, { status: 400 });

  const doc = await guard.db.collection("offline_customers").findOne({ _id });
  if (!doc) return NextResponse.json({ message: "not found" }, { status: 404 });

  const linkedUserId = doc.linkedUserId instanceof ObjectId ? doc.linkedUserId : null;
  const [linkedUser, linkedUserPointsBalance] = linkedUserId
    ? await Promise.all([
      guard.db.collection("users").findOne({ _id: linkedUserId }, { projection: { name: 1, email: 1, phone: 1, pointsBalance: 1 } }),
      getPointsBalance(guard.db, linkedUserId),
    ])
    : [null, null] as const;
  const now = new Date();
  const [passes, packageSales] = linkedUserId && linkedUser
    ? await Promise.all([
      guard.db.collection("service_passes")
        .find(
          { userId: linkedUserId },
          { projection: { packageSize: 1, usedCount: 1, remainingCount: 1, status: 1, expiresAt: 1, createdAt: 1, meta: 1 } },
        )
        .sort({ status: 1, expiresAt: 1, createdAt: -1 })
        .limit(100)
        .toArray(),
      guard.db.collection("packageOrders")
        .find(
          { userId: linkedUserId },
          { projection: { packageInfo: 1, totalPrice: 1, paymentInfo: 1, paymentStatus: 1, createdAt: 1, meta: 1 } },
        )
        .sort({ createdAt: -1, _id: -1 })
        .limit(20)
        .toArray(),
    ])
    : [[], []] as const;

  const records = await guard.db.collection("offline_service_records")
    .find(
      { offlineCustomerId: _id },
      { projection: { offlineCustomerId: 1, kind: 1, status: 1, occurredAt: 1, customerSnapshot: 1, lines: 1, payment: 1, points: 1, packageUsage: 1, memo: 1, createdAt: 1, updatedAt: 1 } },
    )
    .sort({ occurredAt: -1, createdAt: -1 })
    .limit(50)
    .toArray();

  return NextResponse.json({
    item: {
      ...sanitizeCustomer(doc as any),
      phoneNormalized: doc.phoneNormalized ?? null,
      linkedUser: linkedUser
        ? {
          id: String(linkedUser._id),
          name: linkedUser.name || "",
          email: linkedUser.email ?? null,
          phone: linkedUser.phone ?? null,
          phoneMasked: linkedUser.phone ? maskPhone(String(linkedUser.phone)) : null,
          pointsBalance: linkedUserPointsBalance,
        }
        : null,
    },
    records: records.map((record) => sanitizeRecord(record as any)),
    passes: passes.map((pass) => sanitizePass(pass as any, now)),
    packageSales: packageSales.map((sale) => sanitizePackageSale(sale as any)),
  });
}
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req); if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req); if (!csrf.ok) return csrf.res;
  const _id = oid((await ctx.params).id); if (!_id) return NextResponse.json({ message: "invalid id" }, { status: 400 });
  const body = await req.json().catch(()=>null); const parsed = offlineCustomerPatchSchema.safeParse(body); if (!parsed.success) return NextResponse.json({ message: "invalid body" }, { status: 400 });
  const nextName = parsed.data.name ?? undefined;
  const nextPhone = parsed.data.phone ?? undefined;
  if (nextName || nextPhone) {
    const current = await guard.db.collection("offline_customers").findOne({ _id }, { projection: { name: 1, phone: 1 } });
    if (!current) return NextResponse.json({ message: "not found" }, { status: 404 });
    const name = nextName ?? String(current.name || "");
    const phoneNormalized = normalizePhone(nextPhone ?? String(current.phone || ""));
    const duplicate = await guard.db.collection("offline_customers").findOne({ _id: { $ne: _id }, name, phoneNormalized }, { projection: { _id: 1 } });
    if (duplicate) return NextResponse.json({ message: "duplicate", existingId: String((duplicate as any)._id) }, { status: 409 });
  }
  const set: Record<string, any> = { updatedAt: new Date(), updatedBy: guard.admin._id };
  if (parsed.data.name) set.name = parsed.data.name;
  if (parsed.data.phone) { set.phone = parsed.data.phone; set.phoneNormalized = normalizePhone(parsed.data.phone); }
  if ("email" in parsed.data) { set.email = parsed.data.email ?? null; set.emailLower = normalizeEmail(parsed.data.email); }
  if ("memo" in parsed.data) set.memo = parsed.data.memo ?? "";
  if ("tags" in parsed.data) set.tags = parsed.data.tags ?? [];
  await guard.db.collection("offline_customers").updateOne({ _id }, { $set: set });
  const doc = await guard.db.collection("offline_customers").findOne({ _id });
  if (!doc) return NextResponse.json({ message: "not found" }, { status: 404 });
  await appendAudit(guard.db, { type: "offline_customer_update", actorId: guard.admin._id, targetId: _id, message: "오프라인 고객 수정", diff: set }, req);
  return NextResponse.json({ item: sanitizeCustomer(doc as any) });
}
