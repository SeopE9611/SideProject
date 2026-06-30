import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import { privatePayments, serializePrivatePayment, validatePrivatePaymentInput } from "@/lib/private-payments";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 20)));
  const q = String(url.searchParams.get("q") || "").trim();
  const status = String(url.searchParams.get("status") || "").trim();
  const paymentStatus = String(url.searchParams.get("paymentStatus") || "").trim();
  const filter: any = {};
  if (q) filter.$or = ["title", "description", "customerName", "customerPhone", "customerEmail"].map((key) => ({ [key]: { $regex: q, $options: "i" } }));
  if (["active", "inactive"].includes(status)) filter.status = status;
  if (["결제대기", "결제완료", "결제취소"].includes(paymentStatus)) filter.paymentStatus = paymentStatus;
  const col = privatePayments(guard.db);
  const [items, total] = await Promise.all([
    col.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
    col.countDocuments(filter),
  ]);
  return NextResponse.json({ ok: true, items: items.map(serializePrivatePayment), total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;
  const body = await req.json().catch(() => ({}));
  const { input, errors } = validatePrivatePaymentInput(body);
  if (errors.length) return NextResponse.json({ ok: false, message: errors[0] }, { status: 400 });
  const now = new Date();
  const doc = {
    title: String(input.title),
    amount: Number(input.amount),
    description: String(input.description || ""),
    customerName: String(input.customerName || ""),
    customerPhone: String(input.customerPhone || ""),
    customerEmail: String(input.customerEmail || ""),
    status: "active" as const,
    paymentStatus: "결제대기" as const,
    createdAt: now,
    updatedAt: now,
    createdBy: guard.admin._id,
    history: [{ status: "created", date: now, description: "개인결제 링크 생성" }],
  };
  const result = await privatePayments(guard.db).insertOne(doc);
  await appendAdminAudit(guard.db, { type: "private_payment.create", actorId: guard.admin._id, targetId: result.insertedId, message: "개인결제 링크 생성", diff: { title: doc.title, amount: doc.amount } }, req);
  const publicPath = `/private-payments/${result.insertedId.toString()}`;
  return NextResponse.json({ ok: true, item: serializePrivatePayment({ ...doc, _id: result.insertedId }), publicPath, publicUrl: publicPath });
}
