import "server-only";

import type { Db, ObjectId } from "mongodb";

import { getAppsInTossTossPayMode } from "./config";
import { loadActiveAppsInTossUserKey } from "./identity";
import { matchesCanonicalLivePayment } from "./payment-execution-policy";
import {
  claimAppsInTossPaymentRefund,
  findAppsInTossPaymentIntentByAttemptId,
  recordAppsInTossPaymentReconciliationRequired,
  recordAppsInTossPaymentRefunded,
  renewAppsInTossPaymentRefundLease,
  type AppsInTossPaymentIntentDocument,
} from "./payment-intents";
import { getTossPayPaymentStatus, refundTossPayPayment } from "./toss-pay-client";
import { assertRefundReason, assertTossPayOrderNo, parseTossPayToken } from "./toss-pay-contract";

export const APPS_IN_TOSS_PAYMENT_REFUND_LEASE_MS = 45_000;

export class AppsPaymentRefundError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); this.name = "AppsPaymentRefundError"; }
}

type CanonicalPayment = { payToken: string; orderNo: string; amount: number };

function safeResponse(intent: AppsInTossPaymentIntentDocument) {
  return { success: true, attemptId: intent.attemptId, state: intent.state };
}

function owns(intent: AppsInTossPaymentIntentDocument, userId: ObjectId, identityId: ObjectId) {
  return intent.userId.equals(userId) && intent.identityId.equals(identityId);
}

function canonicalPayment(intent: AppsInTossPaymentIntentDocument): CanonicalPayment {
  let payToken: string;
  try { payToken = parseTossPayToken(intent.payToken); assertTossPayOrderNo(intent.orderNo); }
  catch { throw new AppsPaymentRefundError(409, "PAYMENT_STATE_UNAVAILABLE", "현재 환불 상태를 사용할 수 없습니다."); }
  const amount = intent.pricingSnapshot.payableAmount;
  if (!Number.isInteger(amount) || amount <= 0 || amount > 9_999_999) throw new AppsPaymentRefundError(409, "PAYMENT_STATE_UNAVAILABLE", "현재 환불 상태를 사용할 수 없습니다.");
  return { payToken, orderNo: intent.orderNo, amount };
}

export function createAppsInTossFinalizationRefundReason(failureCode: string) {
  const safeCode = failureCode.replace(/[^A-Za-z0-9_-]/g, "_") || "FINALIZATION_FAILED";
  const reason = `주문확정실패:${safeCode}`.slice(0, 55);
  assertRefundReason(reason);
  return reason;
}

function directRefundMatches(result: Awaited<ReturnType<typeof refundTossPayPayment>>, canonical: CanonicalPayment) {
  if (result.kind !== "success") return false;
  const value = result.value.success;
  return value.payToken === canonical.payToken && value.refundedAmount === canonical.amount && value.refundableAmount === 0 &&
    value.refundedPaidAmount + value.refundedDiscountAmount === value.refundedAmount;
}

async function reconciliationRequired(db: Db, intent: AppsInTossPaymentIntentDocument, failureStage: "refund_payment" | "refund_status", failureCode: string) {
  const updated = await recordAppsInTossPaymentReconciliationRequired(db, intent._id, "refunding", { failureStage, failureCode });
  if (updated) return safeResponse(updated);
  const current = await findAppsInTossPaymentIntentByAttemptId(db, intent.attemptId);
  if (current?.state === "refunded" || current?.state === "reconciliation_required") return safeResponse(current);
  throw new AppsPaymentRefundError(409, "PAYMENT_STATE_CHANGED", "환불 상태가 변경되었습니다. 다시 조회해 주세요.");
}

async function reconcile(db: Db, intent: AppsInTossPaymentIntentDocument, userKey: string, canonical: CanonicalPayment, failureStage: "refund_payment" | "refund_status") {
  try {
    const result = await getTossPayPaymentStatus(userKey, { payToken: canonical.payToken, orderNo: canonical.orderNo });
    if (matchesCanonicalLivePayment(result, canonical) && result.kind === "success") {
      const status = result.value.success.payStatus;
      if ((status === "REFUND_SUCCESS" || status === "SETTLEMENT_REFUND_COMPLETE") && result.value.success.refundableAmount === 0) {
        const refunded = await recordAppsInTossPaymentRefunded(db, intent._id);
        if (refunded) return safeResponse(refunded);
      }
      if (status === "REFUND_PROGRESS") {
        const refunding = await renewAppsInTossPaymentRefundLease(db, intent._id, new Date(Date.now() + APPS_IN_TOSS_PAYMENT_REFUND_LEASE_MS));
        if (refunding) return safeResponse(refunding);
      }
    }
  } catch {
    // refund-payment는 재호출하지 않고 안전한 수동 대사 상태로 보낸다.
  }
  return reconciliationRequired(db, intent, failureStage === "refund_payment" ? "refund_status" : failureStage, "PAYMENT_REFUND_STATUS_UNCONFIRMED");
}

export async function refundAppsInTossFinalizationFailure(params: { db: Db; attemptId: string; userId: ObjectId; identityId: ObjectId }) {
  if (getAppsInTossTossPayMode().mode !== "live") throw new AppsPaymentRefundError(409, "PAYMENT_LIVE_REFUND_UNAVAILABLE", "라이브 환경에서만 환불할 수 있습니다.");

  let intent = await findAppsInTossPaymentIntentByAttemptId(params.db, params.attemptId);
  if (!intent || !owns(intent, params.userId, params.identityId)) throw new AppsPaymentRefundError(404, "PAYMENT_INTENT_NOT_FOUND", "결제 시도를 찾을 수 없습니다.");
  if (intent.state === "finalized" || intent.finalOrderId) throw new AppsPaymentRefundError(409, "PAYMENT_REFUND_NOT_ELIGIBLE", "주문 확정 실패 보상 환불 대상이 아닙니다.");
  if (intent.state === "refunded") return safeResponse(intent);
  if (!intent.finalization?.failureCode) throw new AppsPaymentRefundError(409, "PAYMENT_REFUND_NOT_ELIGIBLE", "주문 확정 실패 보상 환불 대상이 아닙니다.");
  if (intent.state === "reconciliation_required") return safeResponse(intent);
  if (intent.state !== "paid" && intent.state !== "refunding") throw new AppsPaymentRefundError(409, "PAYMENT_REFUND_NOT_ELIGIBLE", "주문 확정 실패 보상 환불 대상이 아닙니다.");
  if (intent.isTestPayment) throw new AppsPaymentRefundError(409, "TEST_PAYMENT_REFUND_FORBIDDEN", "테스트 결제는 실제 환불할 수 없습니다.");

  const canonical = canonicalPayment(intent);
  const userKey = await loadActiveAppsInTossUserKey(params.db, intent.identityId, intent.userId);
  if (intent.state === "refunding") {
    if (intent.refund?.leaseUntil && intent.refund.leaseUntil > new Date()) throw new AppsPaymentRefundError(409, "PAYMENT_REFUND_IN_PROGRESS", "환불을 처리하고 있습니다.");
    return reconcile(params.db, intent, userKey, canonical, "refund_status");
  }

  const reason = createAppsInTossFinalizationRefundReason(intent.finalization.failureCode);
  const claimed = await claimAppsInTossPaymentRefund(params.db, intent._id, new Date(Date.now() + APPS_IN_TOSS_PAYMENT_REFUND_LEASE_MS));
  if (!claimed) {
    intent = await findAppsInTossPaymentIntentByAttemptId(params.db, params.attemptId);
    if (intent?.state === "refunded" || intent?.state === "reconciliation_required") return safeResponse(intent);
    throw new AppsPaymentRefundError(409, "PAYMENT_REFUND_IN_PROGRESS", "환불을 처리하고 있습니다.");
  }

  try {
    const result = await refundTossPayPayment(userKey, { payToken: canonical.payToken, reason });
    if (directRefundMatches(result, canonical) && result.kind === "success") {
      const value = result.value.success;
      const refunded = await recordAppsInTossPaymentRefunded(params.db, claimed._id, { refundNo: value.refundNo, approvalTime: value.approvalTime, transactionId: value.transactionId });
      if (refunded) return safeResponse(refunded);
    }
  } catch {
    // 요청 도달 여부가 불확실해도 refund-payment를 절대 재호출하지 않는다.
  }
  return reconcile(params.db, claimed, userKey, canonical, "refund_payment");
}
