import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import { privatePayments, serializePrivatePayment } from "@/lib/private-payments";
import { normalizeEmail, normalizePhone } from "@/lib/offline/normalizers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(req: Request, ctx: Ctx) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, message: "잘못된 ID입니다." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const paymentId = new ObjectId(id);
  const col = privatePayments(guard.db);
  const payment = await col.findOne({ _id: paymentId });
  if (!payment) return NextResponse.json({ ok: false, message: "개인결제를 찾을 수 없습니다." }, { status: 404 });
  if (payment.offlineLink?.status === "linked") return NextResponse.json({ ok: false, message: "이미 오프라인 기록과 연결된 개인결제입니다." }, { status: 409 });
  if (payment.paymentStatus !== "결제완료" || !payment.paidAt || Number(payment.amount || 0) <= 0) {
    return NextResponse.json({ ok: false, message: "결제완료된 개인결제만 오프라인 기록과 연결할 수 있습니다." }, { status: 400 });
  }

  const customerName = clean(body.customerName || payment.customerName);
  const customerPhone = clean(body.customerPhone || payment.customerPhone);
  const customerEmail = clean(body.customerEmail || payment.customerEmail);
  const phoneNormalized = normalizePhone(customerPhone);
  const emailLower = normalizeEmail(customerEmail);
  if (!customerName) return NextResponse.json({ ok: false, message: "고객명을 입력해 주세요." }, { status: 400 });

  let customer: any = null;
  const customerId = clean(body.customerId);
  if (customerId) {
    if (!ObjectId.isValid(customerId)) return NextResponse.json({ ok: false, message: "오프라인 고객 ID가 올바르지 않습니다." }, { status: 400 });
    customer = await guard.db.collection("offline_customers").findOne({ _id: new ObjectId(customerId) });
    if (!customer) return NextResponse.json({ ok: false, message: "오프라인 고객을 찾을 수 없습니다." }, { status: 404 });
  } else {
    const or: Record<string, unknown>[] = [];
    if (phoneNormalized) or.push({ name: customerName, phoneNormalized });
    if (emailLower) or.push({ emailLower });
    customer = or.length ? await guard.db.collection("offline_customers").findOne({ $or: or }) : null;
    if (!customer) {
      if (!phoneNormalized) return NextResponse.json({ ok: false, message: "신규 오프라인 고객 생성에는 연락처가 필요합니다." }, { status: 400 });
      const now = new Date();
      const doc = {
        linkedUserId: null,
        name: customerName,
        phone: customerPhone,
        phoneNormalized,
        email: customerEmail || null,
        emailLower,
        memo: "개인결제 연결로 생성",
        tags: [],
        source: "private_payment",
        stats: { visitCount: 0, totalPaid: 0, totalServiceCount: 0 },
        createdAt: now,
        updatedAt: now,
        createdBy: guard.admin._id,
      };
      const inserted = await guard.db.collection("offline_customers").insertOne(doc);
      customer = { ...doc, _id: inserted.insertedId };
    }
  }

  const now = new Date();
  let offlineRecordId: ObjectId | null = null;
  const offlineLink = { status: "linked" as const, offlineCustomerId: customer._id, offlineRecordId, linkedAt: now, linkedBy: guard.admin._id };
  let updated = await col.findOneAndUpdate(
    {
      _id: paymentId,
      paymentStatus: "결제완료",
      paidAt: { $exists: true },
      amount: { $gt: 0 },
      "offlineLink.status": { $ne: "linked" },
    },
    { $set: { offlineLink, updatedAt: now }, $push: { history: { status: "offline_linked", date: now, description: "오프라인 고객/작업 기록 연결" } } },
    { returnDocument: "after" },
  );
  if (!updated) return NextResponse.json({ ok: false, message: "이미 오프라인 기록과 연결된 개인결제입니다." }, { status: 409 });

  if (body.createRecord !== false) {
    const adminMemo = clean(body.memo);
    const memo = [
      `개인결제명: ${payment.title}`,
      `개인결제 금액: ${Number(payment.amount).toLocaleString("ko-KR")}원`,
      "NICEPAY 온라인 결제 완료",
      `개인결제 ID: ${paymentId.toString()}`,
      adminMemo ? `관리자 메모: ${adminMemo}` : "",
      "오프라인 매출 제외",
    ].filter(Boolean).join("\n");
    const record = {
      offlineCustomerId: customer._id,
      userId: customer.linkedUserId ?? null,
      customerSnapshot: { name: customer.name || customerName, phone: customer.phone || customerPhone, email: customer.email || customerEmail || null },
      source: "private_payment",
      privatePaymentId: paymentId,
      revenueExcluded: true,
      kind: "etc",
      occurredAt: payment.paidAt ?? now,
      status: "completed",
      lines: [{ racketName: payment.title, stringName: "개인결제 연결", amount: 0, note: "온라인 결제 완료" }],
      payment: { status: "paid", method: "etc", amount: 0, paidAt: payment.paidAt ?? now },
      memo,
      createdAt: now,
      updatedAt: now,
      createdBy: guard.admin._id,
    };
    try {
      const inserted = await guard.db.collection("offline_service_records").insertOne(record);
      offlineRecordId = inserted.insertedId;
      const linked = await col.findOneAndUpdate(
        { _id: paymentId, "offlineLink.status": "linked", "offlineLink.offlineRecordId": null },
        { $set: { "offlineLink.offlineRecordId": offlineRecordId, updatedAt: now } },
        { returnDocument: "after" },
      );
      if (!linked) throw new Error("개인결제 오프라인 작업 기록 연결 갱신에 실패했습니다.");
      updated = linked;
      await guard.db.collection("offline_customers").updateOne({ _id: customer._id }, { $inc: { "stats.visitCount": 1, "stats.totalServiceCount": 1 }, $set: { "stats.lastVisitedAt": record.occurredAt, updatedAt: now, updatedBy: guard.admin._id } });
    } catch (error) {
      console.error("[private-payments/link-offline] offline record creation failed", { paymentId: paymentId.toString(), error });
      if (offlineRecordId) {
        await guard.db.collection("offline_service_records").deleteOne({ _id: offlineRecordId }).catch((cleanupError) => {
          console.error("[private-payments/link-offline] offline record cleanup failed", { paymentId: paymentId.toString(), offlineRecordId: offlineRecordId?.toString(), cleanupError });
        });
      }
      await col.updateOne(
        { _id: paymentId, "offlineLink.status": "linked", "offlineLink.offlineRecordId": null },
        { $unset: { offlineLink: "" }, $set: { updatedAt: new Date() } },
      ).catch((rollbackError) => {
        console.error("[private-payments/link-offline] offline link rollback failed", { paymentId: paymentId.toString(), rollbackError });
      });
      return NextResponse.json({ ok: false, message: "오프라인 작업 기록 생성 중 오류가 발생했습니다." }, { status: 500 });
    }
  }

  await appendAdminAudit(guard.db, { type: "private_payment.link_offline", actorId: guard.admin._id, targetId: paymentId, message: "개인결제 오프라인 고객/작업 기록 연결", diff: { offlineCustomerId: String(customer._id), offlineRecordId: offlineRecordId ? String(offlineRecordId) : null } }, req);
  const serialized = serializePrivatePayment(updated);
  return NextResponse.json({ ok: true, item: serialized, offlineLink: serialized.offlineLink });
}
