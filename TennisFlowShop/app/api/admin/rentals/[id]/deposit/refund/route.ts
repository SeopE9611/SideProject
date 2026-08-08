import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import { cancelNicePaymentByTid, getNicePaymentByTid } from "@/lib/payments/nice/server";

const NICE_SUCCESS_CODES = new Set(["0000", "2001", "2211"]);

function normalizeNiceStatus(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace("partialcancelled", "partialcanceled")
    .replace("cancelled", "canceled");
}

function niceBalance(raw: Record<string, string>) {
  const value = Number(raw.balanceAmt ?? raw.balanceAmount ?? raw.remainAmount);
  return Number.isFinite(value) ? Math.floor(value) : null;
}

function createCancelOrderId(id: string) {
  return `DR${Date.now()}${id.replace(/[^0-9a-zA-Z]/g, "").slice(-16)}`.slice(0, 64);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { id } = await params;
  if (!ObjectId.isValid(id))
    return NextResponse.json({ ok: false, message: "잘못된 ID" }, { status: 400 });

  const { action = "mark" } = await req.json().catch(() => ({}));
  if (!['mark', 'clear'].includes(action))
    return NextResponse.json({ ok: false, message: "잘못된 action" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db();
  const rentals = db.collection("rental_orders");
  const _id = new ObjectId(id);
  let rental: any = await rentals.findOne({ _id });
  if (!rental) return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
  if (String(rental.status ?? "").trim().toLowerCase() !== "returned") {
    return NextResponse.json(
      { ok: false, message: "반납완료 상태에서만 처리 가능", status: rental.status },
      { status: 409 },
    );
  }

  const provider = String(rental.paymentInfo?.provider ?? "").trim().toLowerCase();
  if (!['nicepay', 'manual_bank_transfer'].includes(provider)) {
    return NextResponse.json(
      { ok: false, message: "지원하지 않는 결제수단입니다." },
      { status: 400 },
    );
  }

  if (action === "clear") {
    if (provider === "nicepay") {
      return NextResponse.json(
        { ok: false, message: "실제 NICE 카드 환불 완료 기록은 해제할 수 없습니다." },
        { status: 409 },
      );
    }
    if (!rental.depositRefundedAt)
      return NextResponse.json({ ok: true, id, depositRefundedAt: null });

    const correctedAt = new Date();
    const previousRefund = {
      depositRefundedAt: rental.depositRefundedAt,
      depositRefund: rental.paymentInfo?.depositRefund ?? null,
    };
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const result = await rentals.updateOne(
          { _id, depositRefundedAt: rental.depositRefundedAt, "paymentInfo.provider": "manual_bank_transfer" },
          {
            $unset: { depositRefundedAt: "" },
            $set: {
              "paymentInfo.depositRefund.status": "cleared",
              "paymentInfo.depositRefund.updatedAt": correctedAt,
              "paymentInfo.depositRefund.clearedAt": correctedAt,
              "paymentInfo.depositRefund.clearedByAdminId": String(guard.admin._id),
              "paymentInfo.depositRefund.previousRefund": previousRefund,
              updatedAt: correctedAt,
            },
          },
          { session },
        );
        if (!result.modifiedCount) throw new Error("REFUND_CLEAR_CONFLICT");
        await db.collection("rental_history").insertOne(
          {
            rentalId: _id,
            action: "deposit-refund-cleared",
            actor: { role: "admin", id: String(guard.admin._id) },
            snapshot: { provider, previousRefund },
            at: correctedAt,
          },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
    await appendAdminAudit(db, {
      type: "rental.deposit_refund.clear",
      actorId: guard.admin._id,
      targetId: _id,
      message: "무통장 보증금 수동 환불 완료 기록 정정",
      diff: { targetType: "rental", action: "clear", before: previousRefund, after: { depositRefundedAt: null } },
    }, req);
    return NextResponse.json({ ok: true, id, depositRefundedAt: null });
  }

  if (rental.depositRefundedAt && rental.paymentInfo?.depositRefund?.status === "completed") {
    return NextResponse.json({ ok: true, id, depositRefundedAt: rental.depositRefundedAt });
  }

  const depositAmount = Math.floor(Number(rental.amount?.deposit));
  if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
    return NextResponse.json({ ok: false, message: "유효한 보증금 금액을 확인할 수 없습니다." }, { status: 400 });
  }

  if (provider === "manual_bank_transfer") {
    const completedAt = new Date();
    const session = client.startSession();
    let changed = false;
    try {
      await session.withTransaction(async () => {
        const result = await rentals.updateOne(
          { _id, depositRefundedAt: null, "paymentInfo.provider": "manual_bank_transfer" },
          { $set: {
            depositRefundedAt: completedAt.toISOString(),
            "paymentInfo.depositRefund": { provider, status: "completed", amount: depositAmount, updatedAt: completedAt, refundedAt: completedAt, completedByAdminId: String(guard.admin._id) },
            updatedAt: completedAt,
          } },
          { session },
        );
        changed = result.modifiedCount === 1;
        if (!changed) return;
        await db.collection("rental_history").insertOne({
          rentalId: _id,
          action: "deposit-refund-completed",
          actor: { role: "admin", id: String(guard.admin._id) },
          snapshot: { provider, amount: depositAmount, refundedAt: completedAt },
          at: completedAt,
        }, { session });
      });
    } finally {
      await session.endSession();
    }
    if (!changed) {
      rental = await rentals.findOne({ _id });
      return NextResponse.json({ ok: true, id, depositRefundedAt: rental?.depositRefundedAt ?? null });
    }
    await appendAdminAudit(db, {
      type: "rental.deposit_refund.mark",
      actorId: guard.admin._id,
      targetId: _id,
      message: "무통장 보증금 수동 환불 완료 기록",
      diff: { targetType: "rental", action: "mark", after: { provider, amount: depositAmount, depositRefundedAt: completedAt.toISOString() } },
    }, req);
    return NextResponse.json({ ok: true, id, depositRefundedAt: completedAt.toISOString() });
  }

  const totalAmount = Math.floor(Number(rental.paymentInfo?.total));
  const tid = String(rental.paymentInfo?.tid ?? "").trim();
  if (!Number.isFinite(totalAmount) || totalAmount <= 0 || depositAmount > totalAmount) {
    return NextResponse.json({ ok: false, message: "저장된 NICE 원 결제금액을 검증할 수 없습니다." }, { status: 400 });
  }
  if (!tid) return NextResponse.json({ ok: false, message: "NICE TID가 없습니다." }, { status: 400 });
  const clientKey = String(process.env.NICEPAY_CLIENT_KEY ?? process.env.NICEPAY_CLIENT_ID ?? "").trim();
  const secretKey = String(process.env.NICEPAY_SECRET_KEY ?? "").trim();
  if (!clientKey || !secretKey)
    return NextResponse.json({ ok: false, message: "NICE 환불 설정이 누락되었습니다." }, { status: 502 });

  const claimToken = randomUUID();
  const claimedAt = new Date();
  const cancelOrderId = String(rental.paymentInfo?.depositRefund?.cancelOrderId ?? createCancelOrderId(id));
  const claimResult: any = await rentals.findOneAndUpdate(
    {
      _id,
      depositRefundedAt: null,
      "paymentInfo.provider": "nicepay",
      "paymentInfo.depositRefund.status": { $ne: "processing" },
    },
    { $set: {
      "paymentInfo.depositRefund.provider": "nicepay",
      "paymentInfo.depositRefund.status": "processing",
      "paymentInfo.depositRefund.amount": depositAmount,
      "paymentInfo.depositRefund.token": claimToken,
      "paymentInfo.depositRefund.claimedAt": claimedAt,
      "paymentInfo.depositRefund.updatedAt": claimedAt,
      "paymentInfo.depositRefund.tid": tid,
      "paymentInfo.depositRefund.cancelOrderId": cancelOrderId,
    } },
    { returnDocument: "after" },
  );
  const claimed = claimResult && "value" in claimResult ? claimResult.value : claimResult;
  if (!claimed) {
    const latest: any = await rentals.findOne({ _id });
    if (latest?.depositRefundedAt && latest?.paymentInfo?.depositRefund?.status === "completed")
      return NextResponse.json({ ok: true, id, depositRefundedAt: latest.depositRefundedAt });
    return NextResponse.json(
      { ok: false, message: "다른 관리자가 NICE 보증금 환불을 처리 중입니다." },
      { status: 409 },
    );
  }

  let cancelCalled = false;
  try {
    const before = await getNicePaymentByTid({ tid, clientKey, secretKey });
    const lookupCode = String(before.resultCode ?? before.ResultCode ?? "").trim();
    if (lookupCode && lookupCode !== "0000") throw new Error(String(before.resultMsg ?? "NICE 상태 조회 실패"));
    const beforeStatus = normalizeNiceStatus(before.status ?? before.Status);
    const beforeBalance = niceBalance(before);
    const expectedBalance = totalAmount - depositAmount;
    let resultCode = lookupCode || "0000";
    let resultMsg = String(before.resultMsg ?? before.ResultMsg ?? "").trim();

    if (beforeStatus === "partialcanceled" && beforeBalance === expectedBalance) {
      // 이전 요청의 외부 성공을 재시도 사전조회에서 확인했습니다.
    } else if (beforeStatus === "paid" && beforeBalance === totalAmount) {
      cancelCalled = true;
      const canceled = await cancelNicePaymentByTid({
        tid, orderId: cancelOrderId, cancelAmt: depositAmount,
        reason: "반납 완료 대여 보증금 환불", clientKey, secretKey,
      });
      resultCode = String(canceled.resultCode ?? canceled.ResultCode ?? "").trim();
      resultMsg = String(canceled.resultMsg ?? canceled.ResultMsg ?? "").trim();
      if (resultCode === "2026") {
        await rentals.updateOne({ _id, "paymentInfo.depositRefund.token": claimToken }, { $set: {
          "paymentInfo.depositRefund.status": "failed",
          "paymentInfo.depositRefund.updatedAt": new Date(),
          "paymentInfo.depositRefund.resultCode": resultCode,
          "paymentInfo.depositRefund.resultMsg": resultMsg || null,
          "paymentInfo.depositRefund.pgStatus": beforeStatus,
          "paymentInfo.depositRefund.pgBalanceAmount": beforeBalance,
          "paymentInfo.depositRefund.manualActionRequired": true,
          "paymentInfo.depositRefund.manualActionReason": "unsettled_amount_shortage",
        } });
        return NextResponse.json({ ok: false, errorCode: "NICE_UNSETTLED_AMOUNT_SHORTAGE", message: "NICE 미정산금액 부족으로 보증금 부분취소가 불가합니다." }, { status: 409 });
      }
      if (!NICE_SUCCESS_CODES.has(resultCode)) throw new Error(resultMsg || "NICE 보증금 부분취소 실패");
      const verified = await getNicePaymentByTid({ tid, clientKey, secretKey });
      if (normalizeNiceStatus(verified.status ?? verified.Status) !== "partialcanceled" || niceBalance(verified) !== expectedBalance)
        throw new Error("NICE 보증금 부분취소 결과 확인이 필요합니다.");
    } else {
      await rentals.updateOne({ _id, "paymentInfo.depositRefund.token": claimToken }, { $set: {
        "paymentInfo.depositRefund.status": "needs_reconciliation",
        "paymentInfo.depositRefund.updatedAt": new Date(),
        "paymentInfo.depositRefund.pgStatus": beforeStatus,
        "paymentInfo.depositRefund.pgBalanceAmount": beforeBalance,
        "paymentInfo.depositRefund.manualActionRequired": true,
        "paymentInfo.depositRefund.manualActionReason": "unexpected_pg_balance",
      } });
      return NextResponse.json({ ok: false, errorCode: "NICE_DEPOSIT_REFUND_NEEDS_RECONCILIATION", message: "저장 금액과 NICE 잔액이 일치하지 않아 추가 부분취소를 중단했습니다." }, { status: 409 });
    }

    const completedAt = new Date();
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const result = await rentals.updateOne(
          { _id, "paymentInfo.depositRefund.token": claimToken, "paymentInfo.depositRefund.status": "processing" },
          { $set: {
            depositRefundedAt: completedAt.toISOString(),
            paymentStatus: "부분취소",
            "paymentInfo.status": "partialCanceled",
            "paymentInfo.depositRefund.status": "completed",
            "paymentInfo.depositRefund.updatedAt": completedAt,
            "paymentInfo.depositRefund.refundedAt": completedAt,
            "paymentInfo.depositRefund.resultCode": resultCode,
            "paymentInfo.depositRefund.resultMsg": resultMsg || null,
            "paymentInfo.depositRefund.pgStatus": "partialcanceled",
            "paymentInfo.depositRefund.pgBalanceAmount": expectedBalance,
            "paymentInfo.depositRefund.manualActionRequired": false,
            "paymentInfo.depositRefund.manualActionReason": null,
            updatedAt: completedAt,
          } }, { session },
        );
        if (!result.modifiedCount) throw new Error("DEPOSIT_REFUND_FINALIZATION_CONFLICT");
        await db.collection("rental_history").insertOne({
          rentalId: _id,
          action: "deposit-refund-completed",
          actor: { role: "admin", id: String(guard.admin._id) },
          snapshot: { provider, amount: depositAmount, tid, cancelOrderId, resultCode, pgStatus: "partialcanceled", refundedAt: completedAt },
          at: completedAt,
        }, { session });
      });
    } finally {
      await session.endSession();
    }
    await appendAdminAudit(db, {
      type: "rental.deposit_refund.mark", actorId: guard.admin._id, targetId: _id,
      message: "NICE 보증금 부분취소 완료",
      diff: { targetType: "rental", action: "mark", after: { provider, amount: depositAmount, tid, cancelOrderId, depositRefundedAt: completedAt.toISOString() } },
    }, req);
    return NextResponse.json({ ok: true, id, depositRefundedAt: completedAt.toISOString() });
  } catch (error: any) {
    const errorResultCode = String(error?.resultCode ?? "").trim();
    if (errorResultCode === "2026") {
      await rentals.updateOne({ _id, "paymentInfo.depositRefund.token": claimToken }, { $set: {
        "paymentInfo.depositRefund.status": "failed",
        "paymentInfo.depositRefund.updatedAt": new Date(),
        "paymentInfo.depositRefund.resultCode": "2026",
        "paymentInfo.depositRefund.resultMsg": String(error?.resultMsg ?? error?.message ?? "") || null,
        "paymentInfo.depositRefund.manualActionRequired": true,
        "paymentInfo.depositRefund.manualActionReason": "unsettled_amount_shortage",
      } });
      return NextResponse.json({
        ok: false,
        errorCode: "NICE_UNSETTLED_AMOUNT_SHORTAGE",
        message: "NICE 미정산금액 부족으로 보증금 부분취소가 불가합니다.",
      }, { status: 409 });
    }
    await rentals.updateOne({ _id, "paymentInfo.depositRefund.token": claimToken }, { $set: {
      "paymentInfo.depositRefund.status": cancelCalled ? "needs_reconciliation" : "failed",
      "paymentInfo.depositRefund.updatedAt": new Date(),
      "paymentInfo.depositRefund.resultCode": String(error?.resultCode ?? "") || null,
      "paymentInfo.depositRefund.resultMsg": String(error?.resultMsg ?? error?.message ?? "") || null,
      "paymentInfo.depositRefund.manualActionRequired": cancelCalled,
      "paymentInfo.depositRefund.manualActionReason": cancelCalled ? "unknown_external_result" : null,
    } });
    return NextResponse.json({
      ok: false,
      errorCode: cancelCalled ? "NICE_DEPOSIT_REFUND_NEEDS_RECONCILIATION" : "NICE_DEPOSIT_REFUND_FAILED",
      message: cancelCalled ? "NICE 부분취소 결과 확인이 필요합니다. 재시도 시 PG 상태와 잔액을 먼저 확인합니다." : String(error?.message || "NICE 보증금 환불 중 오류가 발생했습니다."),
    }, { status: cancelCalled ? 502 : 400 });
  }
}
