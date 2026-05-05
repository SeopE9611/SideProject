import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAudit } from "@/lib/audit";
import { normalizePhone } from "@/lib/offline/normalizers";
import { sanitizeCustomer } from "@/lib/offline/offline.repository";

export async function POST(req: Request) {
  const guard = await requireAdmin(req); if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req); if (!csrf.ok) return csrf.res;
  const body = await req.json().catch(() => null);
  const userId = body?.userId;
  if (!userId || !ObjectId.isValid(userId)) return NextResponse.json({ message: "invalid userId" }, { status: 400 });

  const user = await guard.db.collection("users").findOne({ _id: new ObjectId(userId) }, { projection: { name: 1, email: 1, phone: 1 } });
  if (!user) return NextResponse.json({ message: "user not found" }, { status: 404 });
  const phone = String(user.phone || "").trim();
  if (!phone) return NextResponse.json({ message: "온라인 회원에 휴대폰 번호가 없어 오프라인 명부 연결이 필요합니다." }, { status: 400 });

  const linkedId = new ObjectId(userId);
  let customer = await guard.db.collection("offline_customers").findOne({ linkedUserId: linkedId });
  if (!customer) {
    const phoneNormalized = normalizePhone(phone);
    customer = await guard.db.collection("offline_customers").findOne({ name: user.name || "", phoneNormalized });
    if (customer && !customer.linkedUserId) {
      await guard.db.collection("offline_customers").updateOne({ _id: customer._id }, { $set: { linkedUserId: linkedId, updatedAt: new Date(), updatedBy: guard.admin._id } });
      customer = await guard.db.collection("offline_customers").findOne({ _id: customer._id });
    }
  }

  if (!customer) {
    const now = new Date();
    const doc = { linkedUserId: linkedId, name: user.name || "", phone, phoneNormalized: normalizePhone(phone), email: user.email || null, emailLower: user.email ? String(user.email).trim().toLowerCase() : null, memo: "", tags: [], source: "offline_admin", stats: { visitCount: 0, totalPaid: 0, totalServiceCount: 0 }, createdAt: now, updatedAt: now, createdBy: guard.admin._id };
    const res = await guard.db.collection("offline_customers").insertOne(doc);
    customer = { ...doc, _id: res.insertedId };
    await appendAudit(guard.db, { type: "offline_customer_ensure_create", actorId: guard.admin._id, targetId: res.insertedId, message: "온라인 회원 오프라인 고객 연결 생성" }, req);
  }

  return NextResponse.json({ item: sanitizeCustomer(customer as any) });
}
