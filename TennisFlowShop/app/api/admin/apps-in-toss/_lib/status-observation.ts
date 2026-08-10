import "server-only";

import type { Db } from "mongodb";
import { getAppsInTossTossPayMode } from "@/lib/apps-in-toss/server/config";
import { loadActiveAppsInTossUserKey } from "@/lib/apps-in-toss/server/identity";
import type { AppsInTossPaymentIntentDocument } from "@/lib/apps-in-toss/server/payment-intents";
import { getTossPayPaymentStatus } from "@/lib/apps-in-toss/server/toss-pay-client";
import { assertTossPayOrderNo, parseTossPayToken } from "@/lib/apps-in-toss/server/toss-pay-contract";

export class AppsInTossStatusObservationError extends Error {
  constructor(public status: number, public code: string) { super("결제 외부 상태를 확인할 수 없습니다."); this.name = "AppsInTossStatusObservationError"; }
}

export async function observeAppsInTossPaymentStatus({ db, intent }: { db: Db; intent: AppsInTossPaymentIntentDocument }) {
  if (getAppsInTossTossPayMode().isTestPayment !== intent.isTestPayment) throw new AppsInTossStatusObservationError(409, "PAYMENT_STATUS_CHECK_ENVIRONMENT_MISMATCH");
  let payToken: string;
  try {
    payToken = parseTossPayToken(intent.payToken);
    assertTossPayOrderNo(intent.orderNo);
    if (!Number.isInteger(intent.pricingSnapshot.payableAmount) || intent.pricingSnapshot.payableAmount <= 0 || intent.pricingSnapshot.payableAmount > 9_999_999) throw new Error("invalid amount");
  } catch { throw new AppsInTossStatusObservationError(409, "PAYMENT_STATUS_CHECK_UNAVAILABLE"); }
  let userKey: string;
  try { userKey = await loadActiveAppsInTossUserKey(db, intent.identityId, intent.userId); }
  catch { throw new AppsInTossStatusObservationError(409, "PAYMENT_STATUS_CHECK_UNAVAILABLE"); }
  let result: Awaited<ReturnType<typeof getTossPayPaymentStatus>>;
  try { result = await getTossPayPaymentStatus(userKey, { payToken, orderNo: intent.orderNo }); }
  catch { throw new AppsInTossStatusObservationError(502, "TOSS_PAYMENT_STATUS_CHECK_FAILED"); }
  if (result.kind !== "success") throw new AppsInTossStatusObservationError(502, "TOSS_PAYMENT_STATUS_CHECK_FAILED");
  const observed = result.value.success;
  const expectedMode = intent.isTestPayment ? "TEST" : "LIVE";
  if (observed.payToken !== payToken || observed.orderNo !== intent.orderNo || observed.amount !== intent.pricingSnapshot.payableAmount || observed.mode !== expectedMode) {
    throw new AppsInTossStatusObservationError(409, "TOSS_PAYMENT_STATUS_CANONICAL_MISMATCH");
  }
  return observed;
}
