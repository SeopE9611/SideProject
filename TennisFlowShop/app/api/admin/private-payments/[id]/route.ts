import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import {
  privatePayments,
  serializePrivatePayment,
  validatePrivatePaymentInput,
  type PrivatePayment,
} from "@/lib/private-payments";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id))
    return NextResponse.json({ ok: false, message: "잘못된 ID입니다." }, { status: 400 });
  const item = await privatePayments(guard.db).findOne({ _id: new ObjectId(id) });
  if (!item)
    return NextResponse.json(
      { ok: false, message: "개인결제를 찾을 수 없습니다." },
      { status: 404 },
    );
  return NextResponse.json({
    ok: true,
    item: serializePrivatePayment(item),
    publicPath: `/private-payments/${id}`,
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id))
    return NextResponse.json({ ok: false, message: "잘못된 ID입니다." }, { status: 400 });
  const col = privatePayments(guard.db);
  const current = await col.findOne({ _id: new ObjectId(id) });
  if (!current)
    return NextResponse.json(
      { ok: false, message: "개인결제를 찾을 수 없습니다." },
      { status: 404 },
    );
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  if (action === "archive" || action === "unarchive") {
    if (current.paymentStatus === "결제대기") {
      return NextResponse.json(
        { ok: false, message: "결제대기 건은 보관할 수 없습니다. 필요 시 삭제해 주세요." },
        { status: 400 },
      );
    }
    const now = new Date();
    const set =
      action === "archive"
        ? { archivedAt: now, archivedBy: guard.admin._id, updatedAt: now }
        : { archivedAt: null, archivedBy: null, updatedAt: now };
    await col.updateOne(
      { _id: current._id },
      {
        $set: set,
        $push: {
          history: {
            status: action,
            date: now,
            description: action === "archive" ? "관리자 보관" : "관리자 보관 해제",
          },
        },
      },
    );
    await appendAdminAudit(
      guard.db,
      {
        type: action === "archive" ? "private_payment.archive" : "private_payment.unarchive",
        actorId: guard.admin._id,
        targetId: current._id,
        message: action === "archive" ? "개인결제 보관" : "개인결제 보관 해제",
        diff: set,
      },
      req,
    );
    const item = await col.findOne({ _id: current._id });
    return NextResponse.json({ ok: true, item: item ? serializePrivatePayment(item) : null });
  }
  if (current.paymentStatus === "결제완료" && ("title" in body || "amount" in body)) {
    return NextResponse.json(
      { ok: false, message: "결제완료 건은 금액과 결제명을 수정할 수 없습니다." },
      { status: 400 },
    );
  }
  if (current.paymentStatus !== "결제대기") {
    return NextResponse.json(
      { ok: false, message: "결제대기 건만 수정할 수 있습니다." },
      { status: 400 },
    );
  }
  const { input, errors } = validatePrivatePaymentInput(body, { partial: true });
  if (errors.length) return NextResponse.json({ ok: false, message: errors[0] }, { status: 400 });
  const { expiresAt: inputExpiresAt, ...editableInput } = input;
  const set = { ...editableInput, updatedAt: new Date() } as Partial<PrivatePayment> & {
    updatedAt: Date;
  };
  if (Object.prototype.hasOwnProperty.call(body, "expiresAt")) {
    set.expiresAt = inputExpiresAt ? new Date(String(inputExpiresAt)) : null;
  }
  if (body.status !== undefined) {
    if (!["active", "inactive"].includes(String(body.status)))
      return NextResponse.json(
        { ok: false, message: "상태 값이 올바르지 않습니다." },
        { status: 400 },
      );
    set.status = String(body.status) as PrivatePayment["status"];
  }
  await col.updateOne(
    { _id: current._id },
    {
      $set: set,
      $push: { history: { status: "updated", date: new Date(), description: "관리자 정보 수정" } },
    },
  );
  await appendAdminAudit(
    guard.db,
    {
      type: "private_payment.update",
      actorId: guard.admin._id,
      targetId: current._id,
      message: "개인결제 수정",
      diff: set,
    },
    req,
  );
  const item = await col.findOne({ _id: current._id });
  return NextResponse.json({ ok: true, item: item ? serializePrivatePayment(item) : null });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id))
    return NextResponse.json({ ok: false, message: "잘못된 ID입니다." }, { status: 400 });
  const col = privatePayments(guard.db);
  const current = await col.findOne({ _id: new ObjectId(id) });
  if (!current)
    return NextResponse.json(
      { ok: false, message: "개인결제를 찾을 수 없습니다." },
      { status: 404 },
    );
  if (current.paymentStatus !== "결제대기") {
    return NextResponse.json(
      { ok: false, message: "결제대기 건만 삭제할 수 있습니다." },
      { status: 400 },
    );
  }
  await col.deleteOne({ _id: current._id, paymentStatus: "결제대기" });
  await appendAdminAudit(
    guard.db,
    {
      type: "private_payment.delete_pending",
      actorId: guard.admin._id,
      targetId: current._id,
      message: "결제대기 개인결제 삭제",
      diff: { title: current.title, amount: current.amount },
    },
    req,
  );
  return NextResponse.json({ ok: true });
}
