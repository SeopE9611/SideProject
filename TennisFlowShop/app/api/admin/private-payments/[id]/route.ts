import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import { privatePayments, serializePrivatePayment, validatePrivatePaymentInput } from "@/lib/private-payments";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, message: "잘못된 ID입니다." }, { status: 400 });
  const item = await privatePayments(guard.db).findOne({ _id: new ObjectId(id) });
  if (!item) return NextResponse.json({ ok: false, message: "개인결제를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true, item: serializePrivatePayment(item), publicPath: `/private-payments/${id}` });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, message: "잘못된 ID입니다." }, { status: 400 });
  const col = privatePayments(guard.db);
  const current = await col.findOne({ _id: new ObjectId(id) });
  if (!current) return NextResponse.json({ ok: false, message: "개인결제를 찾을 수 없습니다." }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  if (current.paymentStatus === "결제완료" && ("title" in body || "amount" in body)) {
    return NextResponse.json({ ok: false, message: "결제완료 건은 금액과 결제명을 수정할 수 없습니다." }, { status: 400 });
  }
  if (current.paymentStatus !== "결제대기") {
    return NextResponse.json({ ok: false, message: "결제대기 건만 수정할 수 있습니다." }, { status: 400 });
  }
  const { input, errors } = validatePrivatePaymentInput(body, { partial: true });
  if (errors.length) return NextResponse.json({ ok: false, message: errors[0] }, { status: 400 });
  const set: any = { ...input, updatedAt: new Date() };
  if (body.status !== undefined) {
    if (!["active", "inactive"].includes(String(body.status))) return NextResponse.json({ ok: false, message: "상태 값이 올바르지 않습니다." }, { status: 400 });
    set.status = String(body.status);
  }
  await col.updateOne({ _id: current._id }, { $set: set, $push: { history: { status: "updated", date: new Date(), description: "관리자 정보 수정" } } });
  await appendAdminAudit(guard.db, { type: "private_payment.update", actorId: guard.admin._id, targetId: current._id, message: "개인결제 수정", diff: set }, req);
  const item = await col.findOne({ _id: current._id });
  return NextResponse.json({ ok: true, item: item ? serializePrivatePayment(item) : null });
}
