import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import { sendAdminOperationalAlert } from "@/lib/admin-alerts/sendAdminOperationalAlert";
import { privatePayments } from "@/lib/private-payments";
import { cancelNicePaymentByTid } from "@/lib/payments/nice/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const DEFAULT_REASON = "관리자 개인결제 승인취소";

function creds() {
  return {
    clientKey: String(process.env.NICEPAY_CLIENT_KEY ?? process.env.NICEPAY_CLIENT_ID ?? "").trim(),
    secretKey: String(process.env.NICEPAY_SECRET_KEY ?? "").trim(),
  };
}

function apiBase() {
  return String(process.env.NICEPAY_APPROVE_API_BASE || "https://api.nicepay.co.kr/v1/payments").trim().replace(/\/+$/, "");
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function failureMessage(error: unknown) {
  return error instanceof Error ? error.message : "NICEPAY 승인취소에 실패했습니다.";
}

export async function POST(req: Request, ctx: Ctx) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, message: "잘못된 ID입니다." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const reason = stringField((body as { reason?: unknown }).reason) || DEFAULT_REASON;
  const col = privatePayments(guard.db);
  const _id = new ObjectId(id);
  const item = await col.findOne({ _id });

  if (!item) return NextResponse.json({ ok: false, message: "개인결제를 찾을 수 없습니다." }, { status: 404 });
  if (item.paymentStatus === "결제취소") return NextResponse.json({ ok: false, message: "이미 취소된 개인결제입니다." }, { status: 400 });
  if (item.cancellationInfo?.status === "processing") return NextResponse.json({ ok: false, message: "이미 취소 처리가 진행 중입니다." }, { status: 409 });

  const paymentInfo = item.paymentInfo ?? {};
  const provider = stringField(paymentInfo.provider);
  const tid = stringField(paymentInfo.tid);
  const orderId = stringField(paymentInfo.niceOrderId);

  if (item.paymentStatus !== "결제완료" || provider !== "nicepay" || !tid || !Number.isFinite(item.amount) || item.amount <= 0) {
    return NextResponse.json({ ok: false, message: "NICEPAY 승인취소 가능한 개인결제가 아닙니다." }, { status: 400 });
  }
  if (!orderId) return NextResponse.json({ ok: false, message: "NICEPAY 주문번호가 없어 승인취소할 수 없습니다." }, { status: 400 });

  const { clientKey, secretKey } = creds();
  if (!clientKey || !secretKey) return NextResponse.json({ ok: false, message: "NICEPAY 취소 설정이 올바르지 않습니다." }, { status: 500 });

  const now = new Date();
  const claimed = await col.findOneAndUpdate(
    { _id, paymentStatus: "결제완료", "cancellationInfo.status": { $ne: "processing" } },
    {
      $set: {
        updatedAt: now,
        cancellationInfo: {
          status: "processing",
          reason,
          requestedAt: now,
          requestedBy: guard.admin._id,
        },
      },
    },
    { returnDocument: "after" },
  );

  if (!claimed) return NextResponse.json({ ok: false, message: "이미 취소 처리 중이거나 취소할 수 없는 상태입니다." }, { status: 409 });

  try {
    const canceled = await cancelNicePaymentByTid({ tid, orderId, reason, clientKey, secretKey, apiBaseUrl: apiBase() });
    const canceledAt = new Date();
    await col.updateOne(
      { _id },
      {
        $set: {
          paymentStatus: "결제취소",
          canceledAt,
          updatedAt: canceledAt,
          "paymentInfo.status": "canceled",
          cancellationInfo: {
            status: "completed",
            reason,
            requestedAt: now,
            requestedBy: guard.admin._id,
            canceledAt,
            rawSummary: canceled,
          },
        },
        $push: { history: { status: "결제취소", date: canceledAt, description: reason } },
      },
    );
    await appendAdminAudit(guard.db, { type: "private_payment.cancel", actorId: guard.admin._id, targetId: _id, message: "개인결제 승인취소", diff: { reason, tid, orderId } }, req);
    try {
      await sendAdminOperationalAlert({
        kind: "private_payment_canceled",
        title: "↩️ 개인결제 취소",
        summary: "개인결제가 취소되었습니다.",
        href: "/admin/private-payments",
        fields: [
          { name: "결제명", value: item.title },
          { name: "금액", value: `${item.amount.toLocaleString("ko-KR")}원` },
          { name: "고객명", value: item.customerName || "-" },
          { name: "취소사유", value: reason },
        ],
        dedupeKey: `private_payment_canceled:${_id.toString()}`,
      });
    } catch {}
    return NextResponse.json({ ok: true, message: "개인결제를 취소했습니다." });
  } catch (error) {
    const message = failureMessage(error);
    const failedAt = new Date();
    await col.updateOne(
      { _id },
      {
        $set: {
          paymentStatus: "결제완료",
          updatedAt: failedAt,
          cancellationInfo: {
            status: "failed",
            reason,
            requestedAt: now,
            requestedBy: guard.admin._id,
            failedAt,
            failureMessage: message,
          },
        },
      },
    );
    await appendAdminAudit(guard.db, { type: "private_payment.cancel", actorId: guard.admin._id, targetId: _id, message: "개인결제 승인취소 실패", diff: { reason, tid, orderId, failureMessage: message } }, req);
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}
