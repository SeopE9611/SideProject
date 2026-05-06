import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAudit } from "@/lib/audit";
import { offlineCustomerPatchSchema } from "@/lib/offline/validators";
import { normalizeEmail, normalizePhone } from "@/lib/offline/normalizers";
import { sanitizeCustomer } from "@/lib/offline/offline.repository";

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
    memo: doc.memo ?? "",
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt ?? null,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt ?? null,
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
  const linkedUser = linkedUserId
    ? await guard.db.collection("users").findOne({ _id: linkedUserId }, { projection: { name: 1, email: 1, phone: 1 } })
    : null;
  const records = await guard.db.collection("offline_service_records")
    .find(
      { offlineCustomerId: _id },
      { projection: { offlineCustomerId: 1, kind: 1, status: 1, occurredAt: 1, customerSnapshot: 1, lines: 1, payment: 1, memo: 1, createdAt: 1, updatedAt: 1 } },
    )
    .sort({ occurredAt: -1, createdAt: -1 })
    .limit(50)
    .toArray();

  return NextResponse.json({
    item: {
      ...sanitizeCustomer(doc as any),
      phoneNormalized: doc.phoneNormalized ?? null,
      linkedUser: linkedUser
        ? { id: String(linkedUser._id), name: linkedUser.name || "", email: linkedUser.email ?? null, phone: linkedUser.phone ?? null }
        : null,
    },
    records: records.map((record) => sanitizeRecord(record as any)),
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
