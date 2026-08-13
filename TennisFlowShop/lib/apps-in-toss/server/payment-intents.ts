import "server-only";

import { ObjectId, type ClientSession, type Db } from "mongodb";
import type { StringingApplicationInput } from "@/app/features/stringing-applications/api/submit-core";
import { assertAttemptId, assertTossPayOrderNo, parseTossPayToken } from "./toss-pay-contract";
import { assertAppsInTossPaymentIntentTransition, type AppsInTossPaymentIntentState } from "./payment-intent-state";

export const APPS_IN_TOSS_PAYMENT_INTENTS_COLLECTION = "apps_in_toss_payment_intents";
export type AppsPaymentPurpose = "stringing_service" | "racket_purchase";
export type AppsCheckoutItem =
  | { productId: string; quantity: number; kind: "product"; selectedColor: NonNullable<StringingApplicationInput["selectedColor"]>; selectedGauge: NonNullable<StringingApplicationInput["selectedGauge"]> }
  | { productId: string; quantity: number; kind: "racket" };
export type AppsCheckoutPayload = {
  items: AppsCheckoutItem[];
  applicant: {
    name: StringingApplicationInput["name"];
    email: NonNullable<StringingApplicationInput["email"]>;
    phone: StringingApplicationInput["phone"];
  };
  collectionMethod: "self_ship" | "visit" | "courier_pickup";
  shipping: { postalCode: string; address: string; addressDetail: string };
  work: {
    racketType?: NonNullable<StringingApplicationInput["racketType"]>;
    tensionMain: string; tensionCross: string; note: string;
    preferredDate: string;
    preferredTime: string;
  };
  withStringService: boolean;
};
export type AppsInTossPaymentIntentDocument = {
  _id: ObjectId; attemptId: string; userId: ObjectId; identityId: ObjectId; orderNo: string;
  state: AppsInTossPaymentIntentState; isTestPayment: boolean; paymentPurpose?: AppsPaymentPurpose; checkoutPayload: AppsCheckoutPayload;
  pricingSnapshot: { subtotal: number; shippingFee: number; serviceFee: number; serviceFeeBeforePackage?: number; pointsUsed: number; payableAmount: number };
  itemSnapshot: Array<{ productId: ObjectId; quantity: number; kind?: "product" | "racket"; selectedColor?: string; selectedGauge?: string; name: string; price: number; mountingFee?: number }>;
  packageSnapshot?: { applied: boolean; requiredPassCount: number; passId?: ObjectId };
  reservationSnapshot?: { preferredDate?: string; preferredTime?: string; slotCount?: number; durationMinutes?: number; capacityAtPrepare?: number };
  createdAt: Date; updatedAt: Date; expiresAt: Date; retentionUntil?: Date;
  payToken?: string; finalOrderId?: ObjectId;
  paidAt?: Date;
  finalization?: { failureCode: string; failedAt: Date };
  execution?: { claimedAt: Date; leaseUntil: Date };
  refund?: {
    claimedAt: Date; leaseUntil: Date; updatedAt: Date;
    refundedAt?: Date; refundNo?: string; approvalTime?: string; transactionId?: string;
  };
  failureStage?: string; failureCode?: string; failureMessage?: string;
  reconciliationRecovery?: {
    recoveredAt: Date; actorId: ObjectId; originalFailureStage: string; originalFailureCode: string;
    observedPayStatus: string;
    observedClassification: "payment_cancelled" | "payment_complete" | "payment_settled" | "refund_complete" | "refund_settled";
    targetState: "paid" | "failed" | "refunded";
  };
};
export const getAppsInTossPaymentPurpose = (intent: Pick<AppsInTossPaymentIntentDocument, "paymentPurpose">): AppsPaymentPurpose => intent.paymentPurpose ?? "stringing_service";
type CreateIntent = Omit<AppsInTossPaymentIntentDocument, "_id" | "state" | "createdAt" | "updatedAt" | "payToken" | "finalOrderId" | "execution" | "refund">;

export function appsInTossPaymentIntents(db: Db) { return db.collection<AppsInTossPaymentIntentDocument>(APPS_IN_TOSS_PAYMENT_INTENTS_COLLECTION); }
export async function createAppsInTossPaymentIntent(db: Db, input: CreateIntent) {
  assertAttemptId(input.attemptId); assertTossPayOrderNo(input.orderNo); const now = new Date();
  const document = { ...input, _id: new ObjectId(), state: "creating" as const, createdAt: now, updatedAt: now };
  await appsInTossPaymentIntents(db).insertOne(document); return document;
}
export const findAppsInTossPaymentIntentByAttemptId = (db: Db, attemptId: string) => { assertAttemptId(attemptId); return appsInTossPaymentIntents(db).findOne({ attemptId }); };
export const findAppsInTossPaymentIntentByOrderNo = (db: Db, orderNo: string) => { assertTossPayOrderNo(orderNo); return appsInTossPaymentIntents(db).findOne({ orderNo }); };

async function transition(db: Db, id: ObjectId, from: AppsInTossPaymentIntentState, to: AppsInTossPaymentIntentState, set: Record<string, unknown> = {}, unset?: Record<string, "">, session?: ClientSession) {
  assertAppsInTossPaymentIntentTransition(from, to);
  return appsInTossPaymentIntents(db).findOneAndUpdate({ _id: id, state: from }, { $set: { ...set, state: to, updatedAt: new Date() }, ...(unset ? { $unset: unset } : {}) }, { returnDocument: "after", session });
}
export function attachAppsInTossPayToken(db: Db, id: ObjectId, payToken: string) {
  const validatedPayToken = parseTossPayToken(payToken);
  return transition(db, id, "creating", "awaiting_authorization", { payToken: validatedPayToken });
}
export function recordAppsInTossPaymentCreationFailed(db: Db, id: ObjectId, failureCode: string) {
  const safeFailureCode = failureCode.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 100) || "MAKE_PAYMENT_FAILED";
  return transition(db, id, "creating", "failed", { failureStage: "make_payment", failureCode: safeFailureCode });
}
export function claimAppsInTossPaymentExecution(db: Db, id: ObjectId, leaseUntil: Date) {
  const now = new Date(); if (leaseUntil <= now) throw new Error("실행 leaseUntil은 현재보다 이후여야 합니다.");
  return transition(db, id, "awaiting_authorization", "executing", { execution: { claimedAt: now, leaseUntil } });
}
export const recordAppsInTossPaymentPaid = (db: Db, id: ObjectId) => transition(db, id, "executing", "paid", { paidAt: new Date() }, { execution: "" });
export function recordAppsInTossPaymentExecutionFailed(db: Db, id: ObjectId, failureCode: string) {
  const safeFailureCode = failureCode.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 100) || "EXECUTION_FAILED";
  return transition(db, id, "executing", "failed", { failureStage: "execute_payment", failureCode: safeFailureCode }, { execution: "" });
}
export const recordAppsInTossPaymentFinalized = (db: Db, id: ObjectId, finalOrderId: ObjectId, session?: ClientSession) => transition(db, id, "paid", "finalized", { finalOrderId }, undefined, session);
export function claimAppsInTossPaymentRefund(db: Db, id: ObjectId, leaseUntil: Date) {
  const now = new Date(); if (leaseUntil <= now) throw new Error("환불 leaseUntil은 현재보다 이후여야 합니다.");
  return transition(db, id, "paid", "refunding", { refund: { claimedAt: now, leaseUntil, updatedAt: now } });
}
export function renewAppsInTossPaymentRefundLease(db: Db, id: ObjectId, leaseUntil: Date) {
  const now = new Date(); if (leaseUntil <= now) throw new Error("환불 leaseUntil은 현재보다 이후여야 합니다.");
  return appsInTossPaymentIntents(db).findOneAndUpdate(
    { _id: id, state: "refunding" },
    { $set: { "refund.leaseUntil": leaseUntil, "refund.updatedAt": now, updatedAt: now } },
    { returnDocument: "after" },
  );
}
export function recordAppsInTossPaymentRefunded(db: Db, id: ObjectId, evidence: { refundNo?: string; approvalTime?: string; transactionId?: string } = {}) {
  const now = new Date();
  return transition(db, id, "refunding", "refunded", {
    "refund.refundedAt": now, "refund.updatedAt": now, ...Object.fromEntries(Object.entries(evidence).map(([key, value]) => [`refund.${key}`, value])),
  }, { "refund.leaseUntil": "" });
}
export function recordAppsInTossPaymentReconciliationRequired(db: Db, id: ObjectId, from: "executing" | "paid" | "refunding", failure: { failureStage?: string; failureCode?: string; failureMessage?: string } = {}) { return transition(db, id, from, "reconciliation_required", failure); }

type ReconciliationRecoveryInput = {
  id: ObjectId; actorId: ObjectId; expectedFailureStage: "payment_status" | "refund_status";
  expectedFailureCode: "PAYMENT_STATUS_UNCONFIRMED" | "PAYMENT_REFUND_STATUS_UNCONFIRMED";
  observedPayStatus: string;
  observedClassification: "payment_cancelled" | "payment_complete" | "payment_settled" | "refund_complete" | "refund_settled";
  targetState: "paid" | "failed" | "refunded"; paidAt?: Date;
};

export function recoverAppsInTossPaymentReconciliation(db: Db, input: ReconciliationRecoveryInput) {
  assertAppsInTossPaymentIntentTransition("reconciliation_required", input.targetState);
  if (input.targetState === "paid" && !input.paidAt) throw new Error("paid 복구에는 외부 결제 완료 시각이 필요합니다.");
  const now = new Date();
  const filter = {
    _id: input.id, state: "reconciliation_required" as const,
    failureStage: input.expectedFailureStage, failureCode: input.expectedFailureCode,
    finalOrderId: { $exists: false },
    "finalization.failureCode": input.expectedFailureStage === "payment_status" ? { $exists: false } : { $exists: true },
  };
  const evidence = {
    recoveredAt: now, actorId: input.actorId,
    originalFailureStage: input.expectedFailureStage, originalFailureCode: input.expectedFailureCode,
    observedPayStatus: input.observedPayStatus, observedClassification: input.observedClassification,
    targetState: input.targetState,
  };
  const set: Record<string, unknown> = { state: input.targetState, updatedAt: now, reconciliationRecovery: evidence };
  const unset: Record<string, ""> = { execution: "", failureMessage: "" };
  if (input.targetState === "paid") {
    set.paidAt = input.paidAt;
    unset.failureStage = ""; unset.failureCode = "";
  } else if (input.targetState === "failed") {
    set.failureStage = "execute_payment"; set.failureCode = "PAY_CANCEL";
  } else {
    set["refund.refundedAt"] = now; set["refund.updatedAt"] = now;
    unset["refund.leaseUntil"] = ""; unset.failureStage = ""; unset.failureCode = "";
  }
  return appsInTossPaymentIntents(db).findOneAndUpdate(filter, { $set: set, $unset: unset }, { returnDocument: "after" });
}
