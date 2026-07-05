import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { privatePayments } from "@/lib/private-payments";
import { sendAdminOperationalAlert } from "@/lib/admin-alerts/sendAdminOperationalAlert";
import {
  approveNicePaymentByTid,
  cancelNicePaymentByTid,
  extractNiceCardInfo,
  extractNiceEasyPayProvider,
} from "@/lib/payments/nice/server";
import {
  ensureTossPaymentSessionIndexes,
  tossPaymentSessions,
  type TossPaymentFailureStage,
} from "@/lib/payments/toss/session";

export const runtime = "nodejs";
export const preferredRegion = ["icn1", "hnd1"];

function pick(raw: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}
function amountOf(v: string) {
  const n = Math.floor(Number(v || 0));
  return Number.isFinite(n) ? n : 0;
}
function failUrl(code: string, message?: string, paymentId?: string) {
  const qs = new URLSearchParams({ code });
  if (message) qs.set("message", message);
  if (paymentId) qs.set("paymentId", paymentId);
  return `/private-payments/nice/fail?${qs}`;
}
function redirect303(req: Request, path: string) {
  return NextResponse.redirect(new URL(path, req.url), { status: 303 });
}
function creds() {
  return {
    clientKey: String(process.env.NICEPAY_CLIENT_KEY ?? process.env.NICEPAY_CLIENT_ID ?? "").trim(),
    secretKey: String(process.env.NICEPAY_SECRET_KEY ?? "").trim(),
  };
}
function apiBase() {
  return String(process.env.NICEPAY_APPROVE_API_BASE || "https://api.nicepay.co.kr/v1/payments")
    .trim()
    .replace(/\/+$/, "");
}
async function parse(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("form")) {
    const f = await req.formData();
    const o: Record<string, string> = {};
    for (const [k, v] of f.entries()) o[k] = typeof v === "string" ? v : "";
    return o;
  }
  if (ct.includes("json")) {
    const j = await req.json().catch(() => ({}));
    return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, v == null ? "" : String(v)]));
  }
  if (req.method === "POST") {
    const t = await req.text().catch(() => "");
    if (t.trim()) return Object.fromEntries(new URLSearchParams(t));
  }
  const o: Record<string, string> = {};
  new URL(req.url).searchParams.forEach((v, k) => (o[k] = v));
  return o;
}

async function handle(req: Request) {
  const raw = await parse(req);
  const orderId = pick(raw, "orderId", "OrderId", "MOID", "Moid");
  const tid = pick(raw, "tid", "TID", "TxTid");
  const clientId = pick(raw, "clientId", "ClientId", "CID");
  const authToken = pick(raw, "authToken", "AuthToken");
  const signature = pick(raw, "signature", "Signature");
  const authResultCode = pick(raw, "authResultCode", "AuthResultCode");
  const authResultMsg = pick(raw, "authResultMsg", "AuthResultMsg");
  const amount = amountOf(pick(raw, "amount", "Amt"));
  if (!orderId) return redirect303(req, failUrl("INVALID_QUERY", "orderId 값이 누락되었습니다."));
  const client = await clientPromise;
  const db = client.db();
  await ensureTossPaymentSessionIndexes(db);
  const col = tossPaymentSessions(db);
  let session = await col.findOne({ niceOrderId: orderId });
  const paymentId = session?.privatePaymentId || undefined;
  if (!session || session.provider !== "nicepay" || session.flowType !== "private_payment")
    return redirect303(
      req,
      failUrl("SESSION_NOT_FOUND", "개인결제 세션을 찾을 수 없습니다.", paymentId),
    );
  if (session.status === "approved" && session.privatePaymentId)
    return redirect303(
      req,
      `/private-payments/success?paymentId=${encodeURIComponent(session.privatePaymentId)}`,
    );
  const markFailure = async (
    stage: TossPaymentFailureStage,
    code: string,
    message: string,
    approved?: Record<string, string>,
  ) =>
    col.updateOne(
      { _id: session!._id },
      {
        $set: {
          status: "failed",
          failureStage: stage,
          failureCode: code,
          failureMessage: message,
          niceAuthRaw: raw,
          ...(approved ? { niceApprovedRaw: approved } : {}),
          updatedAt: new Date(),
        },
      },
    );
  if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
    await markFailure(
      "session_expired_before_confirm",
      "SESSION_EXPIRED",
      "결제 세션 유효시간이 만료되었습니다.",
    );
    return redirect303(
      req,
      failUrl("SESSION_EXPIRED", "결제 세션 유효시간이 만료되었습니다.", paymentId),
    );
  }
  if (session.status !== "ready")
    return redirect303(
      req,
      failUrl(
        "INVALID_PAYMENT_SESSION_STATUS",
        "이미 처리 중이거나 처리 완료된 결제 세션입니다.",
        paymentId,
      ),
    );
  const claimed = await col.findOneAndUpdate(
    { _id: session._id, status: "ready" },
    { $set: { status: "processing", processingStartedAt: new Date(), updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!claimed)
    return redirect303(
      req,
      failUrl("PAYMENT_SESSION_ALREADY_PROCESSING", "결제 처리가 이미 진행 중입니다.", paymentId),
    );
  session = claimed;
  if (authResultCode !== "0000") {
    await markFailure("verify_auth", "AUTH_FAILED", authResultMsg || "인증 결제에 실패했습니다.");
    return redirect303(
      req,
      failUrl("AUTH_FAILED", authResultMsg || "인증 결제에 실패했습니다.", paymentId),
    );
  }
  const prepared = session.nicePrepared || { clientId: "", orderId: "" };
  if (
    !tid ||
    !authToken ||
    !signature ||
    !clientId ||
    clientId !== prepared.clientId ||
    prepared.orderId !== orderId ||
    session.amount !== amount
  ) {
    await markFailure("verify_auth", "AMOUNT_MISMATCH", "결제 응답 검증에 실패했습니다.");
    return redirect303(
      req,
      failUrl("AMOUNT_MISMATCH", "결제 응답 검증에 실패했습니다.", paymentId),
    );
  }
  const { clientKey, secretKey } = creds();
  if (!clientKey || !secretKey) {
    await markFailure("approve_payment", "APPROVE_FAILED", "결제 승인 설정이 올바르지 않습니다.");
    return redirect303(
      req,
      failUrl("APPROVE_FAILED", "결제 승인 설정이 올바르지 않습니다.", paymentId),
    );
  }
  let approved: Record<string, string>;
  try {
    approved = await approveNicePaymentByTid({
      tid,
      amount,
      clientKey,
      secretKey,
      apiBaseUrl: apiBase(),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "승인 처리에 실패했습니다.";
    await markFailure("approve_payment", "APPROVE_FAILED", message);
    return redirect303(req, failUrl("APPROVE_FAILED", message, paymentId));
  }
  if (pick(approved, "resultCode", "ResultCode") !== "0000") {
    const msg = pick(approved, "resultMsg", "ResultMsg") || "승인 처리에 실패했습니다.";
    await markFailure("approve_payment", "APPROVE_FAILED", msg, approved);
    return redirect303(req, failUrl("APPROVE_FAILED", msg, paymentId));
  }
  if (!session.privatePaymentId || !ObjectId.isValid(String(session.privatePaymentId))) {
    await markFailure(
      "create_order_after_approve",
      "ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE",
      "개인결제 ID를 검증하지 못했습니다.",
      approved,
    );
    return redirect303(
      req,
      failUrl(
        "ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE",
        "결제 승인 후 내부 처리에 실패했습니다.",
      ),
    );
  }
  const card = extractNiceCardInfo(approved);
  const payMethod =
    pick(approved, "payMethod", "PayMethod") || extractNiceEasyPayProvider(approved) || "card";
  const now = new Date();
  const updated = await privatePayments(db).findOneAndUpdate(
    {
      _id: new ObjectId(String(session.privatePaymentId)),
      amount,
      status: "active",
      paymentStatus: "결제대기",
    },
    {
      $set: {
        paymentStatus: "결제완료",
        paidAt: now,
        updatedAt: now,
        paymentInfo: {
          provider: "nicepay",
          method: payMethod,
          status: "paid",
          tid,
          niceOrderId: orderId,
          approvedAt: pick(approved, "approvedAt", "ApprovedAt") || now.toISOString(),
          cardDisplayName: card?.displayName || null,
          cardCompany: card?.issuerName || null,
          cardLabel: card?.cardName || null,
          niceCard: card,
          rawSummary: approved,
          total: amount,
        },
      },
      $push: {
        history: { status: "결제완료", date: now, description: "NICEPAY 개인결제 승인 완료" },
      },
    },
    { returnDocument: "after" },
  );
  if (!updated) {
    try {
      await cancelNicePaymentByTid({
        tid,
        orderId,
        reason: "승인 후 개인결제 상태 변경 실패로 자동 취소",
        clientKey,
        secretKey,
        apiBaseUrl: apiBase(),
      });
    } catch {}
    await col.updateOne(
      { _id: session._id },
      {
        $set: {
          status: "approve_succeeded_auto_cancel_failed",
          failureStage: "create_order_after_approve",
          failureCode: "ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE",
          failureMessage: "승인 후 개인결제 상태 변경에 실패했습니다.",
          niceAuthRaw: raw,
          niceApprovedRaw: approved,
          updatedAt: new Date(),
        },
      },
    );
    return redirect303(
      req,
      failUrl(
        "ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE",
        "결제 승인 후 내부 처리에 실패했습니다.",
        paymentId,
      ),
    );
  }
  await col.updateOne(
    { _id: session._id },
    {
      $set: {
        status: "approved",
        privatePaymentId: String(updated._id),
        mongoOrderId: String(updated._id),
        niceAuthRaw: raw,
        niceApprovedRaw: approved,
        confirmedPaymentSummary: {
          orderId,
          method: payMethod,
          totalAmount: amount,
          approvedAt: now,
        },
        updatedAt: now,
      },
    },
  );
  try {
    await sendAdminOperationalAlert({
      kind: "private_payment_paid",
      title: "💳 개인결제 완료",
      summary: "개인결제가 완료되었습니다. 관리자 개인결제 관리에서 확인해 주세요.",
      href: "/admin/private-payments",
      fields: [
        { name: "결제명", value: updated.title },
        { name: "금액", value: `${amount.toLocaleString()}원` },
        {
          name: "고객명",
          value: updated.customerName || session.privatePaymentPayload?.buyerInfo?.name || "-",
        },
        {
          name: "연락처",
          value: updated.customerPhone || session.privatePaymentPayload?.buyerInfo?.phone || "-",
        },
        { name: "결제수단", value: payMethod },
      ],
      dedupeKey: `private_payment_paid:${updated._id}`,
    });
  } catch {}
  return redirect303(
    req,
    `/private-payments/success?paymentId=${encodeURIComponent(String(updated._id))}`,
  );
}
export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}
