import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAudit } from "@/lib/audit";
import { offlineCustomerPatchSchema } from "@/lib/offline/validators";
import { normalizeEmail, normalizePhone } from "@/lib/offline/normalizers";
import { sanitizeCustomer } from "@/lib/offline/offline.repository";

const oid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) { const guard = await requireAdmin(req); if (!guard.ok) return guard.res; const _id = oid((await ctx.params).id); if (!_id) return NextResponse.json({ message: "invalid id" }, { status: 400 }); const doc = await guard.db.collection("offline_customers").findOne({ _id }); if (!doc) return NextResponse.json({ message: "not found" }, { status: 404 }); return NextResponse.json({ item: sanitizeCustomer(doc as any) }); }
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
