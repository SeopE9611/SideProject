import "server-only";

import type { Db, ObjectId } from "mongodb";

import { AppsPaymentExecutionError, executeAppsInTossPayment } from "./payment-execution";
import { AppsPaymentFinalizationError, finalizeAppsInTossPayment } from "./payment-finalization";
import { findAppsInTossPaymentIntentByAttemptId, type AppsInTossPaymentIntentDocument } from "./payment-intents";
import { AppsPaymentRefundError, refundAppsInTossFinalizationFailure } from "./payment-refund";

export type AppsPaymentCompletionAction = "execute" | "finalize" | "refund" | "return" | "unavailable";

export class AppsPaymentCompletionError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); this.name = "AppsPaymentCompletionError"; }
}

export function classifyAppsPaymentCompletionAction(intent: AppsInTossPaymentIntentDocument): AppsPaymentCompletionAction {
  if (intent.state === "creating") return "unavailable";
  if (intent.state === "awaiting_authorization" || intent.state === "executing") return "execute";
  if (intent.state === "paid") return intent.finalization?.failureCode ? "refund" : "finalize";
  if (intent.state === "refunding") return "refund";
  return "return";
}

function owns(intent: AppsInTossPaymentIntentDocument, userId: ObjectId, identityId: ObjectId) {
  return intent.userId.equals(userId) && intent.identityId.equals(identityId);
}

function safeResponse(intent: AppsInTossPaymentIntentDocument) {
  return { success: true, attemptId: intent.attemptId, state: intent.state };
}

async function reloadOwned(params: { db: Db; attemptId: string; userId: ObjectId; identityId: ObjectId }) {
  const intent = await findAppsInTossPaymentIntentByAttemptId(params.db, params.attemptId);
  if (!intent || !owns(intent, params.userId, params.identityId)) {
    throw new AppsPaymentCompletionError(404, "PAYMENT_INTENT_NOT_FOUND", "결제 시도를 찾을 수 없습니다.");
  }
  return intent;
}

async function refundAndReload(params: { db: Db; attemptId: string; userId: ObjectId; identityId: ObjectId }) {
  const eligible = await reloadOwned(params);
  if (eligible.state === "finalized" || eligible.finalOrderId) {
    throw new AppsPaymentCompletionError(409, "PAYMENT_REFUND_NOT_ELIGIBLE", "주문 확정 실패 보상 환불 대상이 아닙니다.");
  }
  try {
    await refundAppsInTossFinalizationFailure(params);
  } catch (error) {
    if (!(error instanceof AppsPaymentRefundError) || error.code !== "PAYMENT_REFUND_IN_PROGRESS") throw error;
    const current = await reloadOwned(params);
    if (current.state === "refunding" || current.state === "refunded" || current.state === "reconciliation_required") return safeResponse(current);
    if (current.state === "finalized" || current.finalOrderId) {
      throw new AppsPaymentCompletionError(409, "PAYMENT_REFUND_NOT_ELIGIBLE", "주문 확정 실패 보상 환불 대상이 아닙니다.");
    }
    if (current.state === "paid" && current.finalization?.failureCode) throw error;
    throw new AppsPaymentCompletionError(409, "PAYMENT_STATE_CHANGED", "환불 상태가 변경되었습니다. 다시 조회해 주세요.");
  }
  return safeResponse(await reloadOwned(params));
}

export async function completeAppsInTossPayment(params: { db: Db; attemptId: string; userId: ObjectId; identityId: ObjectId }) {
  let intent = await reloadOwned(params);
  let action = classifyAppsPaymentCompletionAction(intent);

  if (action === "unavailable") {
    throw new AppsPaymentCompletionError(409, "PAYMENT_STATE_UNAVAILABLE", "현재 결제 완료 상태를 사용할 수 없습니다.");
  }
  if (action === "return") {
    return intent.state === "finalized" ? finalizeAppsInTossPayment(params) : safeResponse(intent);
  }
  if (action === "refund") return refundAndReload(params);

  if (action === "execute") {
    let executed = false;
    try {
      await executeAppsInTossPayment(params);
      executed = true;
    } catch (error) {
      if (!(error instanceof AppsPaymentExecutionError) || error.code !== "PAYMENT_EXECUTION_IN_PROGRESS") throw error;
      intent = await reloadOwned(params);
      action = classifyAppsPaymentCompletionAction(intent);
      if (action === "execute") {
        if (intent.state === "executing") return safeResponse(intent);
        throw new AppsPaymentCompletionError(409, "PAYMENT_STATE_CHANGED", "결제 상태가 변경되었습니다. 다시 조회해 주세요.");
      }
      if (action === "unavailable") {
        throw new AppsPaymentCompletionError(409, "PAYMENT_STATE_CHANGED", "결제 상태가 변경되었습니다. 다시 조회해 주세요.");
      }
    }
    if (executed) {
      intent = await reloadOwned(params);
      action = classifyAppsPaymentCompletionAction(intent);
    }
    if (action === "return") {
      return intent.state === "finalized" ? finalizeAppsInTossPayment(params) : safeResponse(intent);
    }
    if (action === "refund") return refundAndReload(params);
    if (action !== "finalize") return safeResponse(intent);
  }

  try {
    return await finalizeAppsInTossPayment(params);
  } catch (error) {
    if (!(error instanceof AppsPaymentFinalizationError)) throw error;
    intent = await reloadOwned(params);
    if (intent.state === "finalized") return finalizeAppsInTossPayment(params);
    if (intent.state === "paid" && intent.finalization?.failureCode && !intent.finalOrderId) {
      return refundAndReload(params);
    }
    throw error;
  }
}
