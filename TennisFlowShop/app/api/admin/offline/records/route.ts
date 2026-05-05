import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAudit } from "@/lib/audit";
import { offlineRecordCreateSchema } from "@/lib/offline/validators";
import { maskPhone } from "@/lib/offline/normalizers";

export async function GET(req: Request) { const guard = await requireAdmin(req); if (!guard.ok) return guard.res; const items = await guard.db.collection("offline_service_records").find({}, { projection: { customerSnapshot: 1, kind: 1, occurredAt: 1, status: 1, payment: 1, lines: 1 } }).sort({ occurredAt: -1 }).limit(100).toArray(); return NextResponse.json({ items: items.map((d:any)=>({ id:String(d._id), occurredAt:d.occurredAt, customerName:d.customerSnapshot?.name||"", customerPhoneMasked: maskPhone(d.customerSnapshot?.phone||""), kind:d.kind, lineSummary:(d.lines||[]).map((x:any)=>x.stringName||x.racketName).filter(Boolean).join(", "), payment:d.payment, status:d.status })) }); }

export async function POST(req: Request) {
  const guard = await requireAdmin(req); if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req); if (!csrf.ok) return csrf.res;
  const body = await req.json().catch(()=>null); const parsed = offlineRecordCreateSchema.safeParse(body); if (!parsed.success) return NextResponse.json({ message:"invalid body", issues: parsed.error.flatten() }, { status:400 });
  if (!ObjectId.isValid(parsed.data.offlineCustomerId)) return NextResponse.json({ message: "invalid customer" }, { status: 400 });
  const now = new Date();
  const doc: Record<string, any> = { ...parsed.data, offlineCustomerId: new ObjectId(parsed.data.offlineCustomerId), userId: parsed.data.userId && ObjectId.isValid(parsed.data.userId) ? new ObjectId(parsed.data.userId) : null, source: "offline_admin", occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : now, payment: { ...parsed.data.payment, paidAt: parsed.data.payment.paidAt ? new Date(parsed.data.payment.paidAt) : undefined }, createdAt: now, updatedAt: now, createdBy: guard.admin._id };
  const r = await guard.db.collection("offline_service_records").insertOne(doc);
  await guard.db.collection("offline_customers").updateOne({ _id: doc.offlineCustomerId }, { $inc: { "stats.visitCount": 1, "stats.totalPaid": Number(doc.payment?.amount || 0), "stats.totalServiceCount": 1 }, $set: { "stats.lastVisitedAt": doc.occurredAt, updatedAt: now, updatedBy: guard.admin._id } });
  await appendAudit(guard.db, { type: "offline_record_create", actorId: guard.admin._id, targetId: r.insertedId, message: "오프라인 작업/매출 등록" }, req);
  return NextResponse.json({ id: String(r.insertedId) }, { status: 201 });
}
