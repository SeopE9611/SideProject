import "server-only";

import type { Db, ObjectId } from "mongodb";

import { getAppsInTossTossPayMode, isAppsInTossTossPayLiveExecuteEnabled } from "./config";
import { loadActiveAppsInTossUserKey } from "./identity";
import {
  claimAppsInTossPaymentExecution,
  findAppsInTossPaymentIntentByAttemptId,
  recordAppsInTossPaymentExecutionFailed,
  recordAppsInTossPaymentPaid,
  recordAppsInTossPaymentReconciliationRequired,
  type AppsInTossPaymentIntentDocument,
} from "./payment-intents";
import { executeTossPayPayment, getTossPayPaymentStatus } from "./toss-pay-client";
import { classifyTossPayStatus, matchesCanonicalLivePayment } from "./payment-execution-policy";
import { assertTossPayOrderNo, parseTossPayToken } from "./toss-pay-contract";

export const APPS_IN_TOSS_PAYMENT_EXECUTION_LEASE_MS = 45_000;

export class AppsPaymentExecutionError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); this.name = "AppsPaymentExecutionError"; }
}

type CanonicalPayment = { payToken: string; orderNo: string; amount: number };

function safeResponse(intent: AppsInTossPaymentIntentDocument) {
  return { success: true, attemptId: intent.attemptId, state: intent.state };
}

function canonicalPayment(intent: AppsInTossPaymentIntentDocument): CanonicalPayment {
  let payToken: string;
  try {
    payToken = parseTossPayToken(intent.payToken);
    assertTossPayOrderNo(intent.orderNo);
  } catch {
    throw new AppsPaymentExecutionError(409, "PAYMENT_STATE_UNAVAILABLE", "현재 결제 실행 상태를 사용할 수 없습니다.");
  }
  const amount = intent.pricingSnapshot.payableAmount;
  if (!Number.isInteger(amount) || amount <= 0 || amount > 9_999_999 || intent.finalOrderId) {
    throw new AppsPaymentExecutionError(409, "PAYMENT_STATE_UNAVAILABLE", "현재 결제 실행 상태를 사용할 수 없습니다.");
  }
  return { payToken, orderNo: intent.orderNo, amount };
}

async function reconcile(db: Db, intent: AppsInTossPaymentIntentDocument, userKey: string, canonical: CanonicalPayment) {
  try {
    const result = await getTossPayPaymentStatus(userKey, { payToken: canonical.payToken, orderNo: canonical.orderNo });
    if (matchesCanonicalLivePayment(result, canonical) && result.kind === "success") {
      const classification = classifyTossPayStatus(result.value.success.payStatus);
      if (classification === "paid") {
        const paid = await recordAppsInTossPaymentPaid(db, intent._id);
        if (paid) return safeResponse(paid);
      } else if (classification === "cancelled") {
        const failed = await recordAppsInTossPaymentExecutionFailed(db, intent._id, "PAY_CANCEL");
        if (failed) return safeResponse(failed);
      }
    }
  } catch {
    // 상태 조회도 불확실하면 execute-payment를 재호출하지 않고 수동 대사 상태로 보낸다.
  }
  const reconciliation = await recordAppsInTossPaymentReconciliationRequired(db, intent._id, "executing", {
    failureStage: "payment_status", failureCode: "PAYMENT_STATUS_UNCONFIRMED",
  });
  if (reconciliation) return safeResponse(reconciliation);
  throw new AppsPaymentExecutionError(409, "PAYMENT_STATE_CHANGED", "결제 상태가 변경되었습니다. 다시 조회해 주세요.");
}

export async function executeAppsInTossPayment(params: { db: Db; attemptId: string; userId: ObjectId; identityId: ObjectId }) {
  const mode = getAppsInTossTossPayMode();
  if (mode.mode === "sandbox") throw new AppsPaymentExecutionError(409, "PAYMENT_APPROVAL_UNAVAILABLE_IN_SANDBOX", "Sandbox에서는 결제 인증까지만 확인할 수 있으며 실제 결제 승인은 진행되지 않습니다.");
  if (!isAppsInTossTossPayLiveExecuteEnabled()) throw new AppsPaymentExecutionError(503, "PAYMENT_LIVE_EXECUTION_DISABLED", "라이브 결제 승인이 비활성화되어 있습니다.");

  let intent = await findAppsInTossPaymentIntentByAttemptId(params.db, params.attemptId);
  if (!intent || !intent.userId.equals(params.userId) || !intent.identityId.equals(params.identityId)) {
    throw new AppsPaymentExecutionError(404, "PAYMENT_INTENT_NOT_FOUND", "결제 시도를 찾을 수 없습니다.");
  }
  if (intent.state === "paid" || intent.state === "finalized" || intent.state === "failed" || intent.state === "cancelled" || intent.state === "refunded" || intent.state === "reconciliation_required") return safeResponse(intent);
  if (intent.state !== "awaiting_authorization" && intent.state !== "executing") throw new AppsPaymentExecutionError(409, "PAYMENT_STATE_UNAVAILABLE", "현재 결제 실행 상태를 사용할 수 없습니다.");
  if (intent.state === "awaiting_authorization" && intent.expiresAt <= new Date()) throw new AppsPaymentExecutionError(409, "PAYMENT_INTENT_EXPIRED", "결제 실행 시간이 만료되었습니다.");

  const canonical = canonicalPayment(intent);
  if (intent.isTestPayment) throw new AppsPaymentExecutionError(409, "PAYMENT_STATE_UNAVAILABLE", "라이브 결제 실행 정보가 아닙니다.");
  const userKey = await loadActiveAppsInTossUserKey(params.db, intent.identityId, intent.userId);

  if (intent.state === "executing") {
    if (intent.execution?.leaseUntil && intent.execution.leaseUntil > new Date()) throw new AppsPaymentExecutionError(409, "PAYMENT_EXECUTION_IN_PROGRESS", "결제 승인을 처리하고 있습니다.");
    return reconcile(params.db, intent, userKey, canonical);
  }

  const claimed = await claimAppsInTossPaymentExecution(params.db, intent._id, new Date(Date.now() + APPS_IN_TOSS_PAYMENT_EXECUTION_LEASE_MS));
  if (!claimed) {
    intent = await findAppsInTossPaymentIntentByAttemptId(params.db, params.attemptId);
    if (intent?.state === "paid" || intent?.state === "finalized") return safeResponse(intent);
    throw new AppsPaymentExecutionError(409, "PAYMENT_EXECUTION_IN_PROGRESS", "결제 승인을 처리하고 있습니다.");
  }

  try {
    const result = await executeTossPayPayment(userKey, { payToken: canonical.payToken, orderNo: canonical.orderNo });
    if (matchesCanonicalLivePayment(result, canonical)) {
      const paid = await recordAppsInTossPaymentPaid(params.db, claimed._id);
      if (paid) return safeResponse(paid);
    }
  } catch {
    // 요청 도달 여부를 알 수 없으므로 execute-payment를 재시도하지 않고 상태만 조회한다.
  }
  return reconcile(params.db, claimed, userKey, canonical);
}
