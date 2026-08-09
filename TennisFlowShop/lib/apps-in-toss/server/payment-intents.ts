import "server-only";

import { ObjectId, type Db } from "mongodb";
import type { StringingApplicationInput } from "@/app/features/stringing-applications/api/submit-core";
import { assertAttemptId, assertTossPayOrderNo, parseTossPayToken } from "./toss-pay-contract";
import { assertAppsInTossPaymentIntentTransition, type AppsInTossPaymentIntentState } from "./payment-intent-state";

export const APPS_IN_TOSS_PAYMENT_INTENTS_COLLECTION = "apps_in_toss_payment_intents";
export type AppsCheckoutPayload = {
  items: Array<{
    productId: string; quantity: number; kind: "product" | "racket";
    selectedColor: NonNullable<StringingApplicationInput["selectedColor"]>;
    selectedGauge: NonNullable<StringingApplicationInput["selectedGauge"]>;
  }>;
  applicant: {
    name: StringingApplicationInput["name"];
    email: NonNullable<StringingApplicationInput["email"]>;
    phone: StringingApplicationInput["phone"];
  };
  collectionMethod: "self_ship" | "visit" | "courier_pickup";
  shipping: { postalCode: string; address: string; addressDetail: string };
  work: {
    racketType: NonNullable<StringingApplicationInput["racketType"]>;
    tensionMain: string; tensionCross: string; note: string;
    preferredDate: NonNullable<StringingApplicationInput["preferredDate"]>;
    preferredTime: NonNullable<StringingApplicationInput["preferredTime"]>;
  };
  withStringService: boolean;
};
export type AppsInTossPaymentIntentDocument = {
  _id: ObjectId; attemptId: string; userId: ObjectId; identityId: ObjectId; orderNo: string;
  state: AppsInTossPaymentIntentState; isTestPayment: boolean; checkoutPayload: AppsCheckoutPayload;
  pricingSnapshot: { subtotal: number; shippingFee: number; serviceFee: number; pointsUsed: number; payableAmount: number };
  itemSnapshot: Array<{ productId: ObjectId; quantity: number; selectedColor?: string; selectedGauge?: string; name: string; price: number }>;
  reservationSnapshot?: { preferredDate?: string; preferredTime?: string };
  createdAt: Date; updatedAt: Date; expiresAt: Date; retentionUntil?: Date;
  payToken?: string; finalOrderId?: ObjectId;
  execution?: { claimedAt: Date; leaseUntil: Date };
  refund?: { claimedAt: Date; updatedAt: Date };
  failureStage?: string; failureCode?: string; failureMessage?: string;
};
type CreateIntent = Omit<AppsInTossPaymentIntentDocument, "_id" | "state" | "createdAt" | "updatedAt" | "payToken" | "finalOrderId" | "execution" | "refund">;

export function appsInTossPaymentIntents(db: Db) { return db.collection<AppsInTossPaymentIntentDocument>(APPS_IN_TOSS_PAYMENT_INTENTS_COLLECTION); }
export async function createAppsInTossPaymentIntent(db: Db, input: CreateIntent) {
  assertAttemptId(input.attemptId); assertTossPayOrderNo(input.orderNo); const now = new Date();
  const document = { ...input, _id: new ObjectId(), state: "creating" as const, createdAt: now, updatedAt: now };
  await appsInTossPaymentIntents(db).insertOne(document); return document;
}
export const findAppsInTossPaymentIntentByAttemptId = (db: Db, attemptId: string) => { assertAttemptId(attemptId); return appsInTossPaymentIntents(db).findOne({ attemptId }); };
export const findAppsInTossPaymentIntentByOrderNo = (db: Db, orderNo: string) => { assertTossPayOrderNo(orderNo); return appsInTossPaymentIntents(db).findOne({ orderNo }); };

async function transition(db: Db, id: ObjectId, from: AppsInTossPaymentIntentState, to: AppsInTossPaymentIntentState, set: Record<string, unknown> = {}, unset?: Record<string, "">) {
  assertAppsInTossPaymentIntentTransition(from, to);
  return appsInTossPaymentIntents(db).findOneAndUpdate({ _id: id, state: from }, { $set: { ...set, state: to, updatedAt: new Date() }, ...(unset ? { $unset: unset } : {}) }, { returnDocument: "after" });
}
export function attachAppsInTossPayToken(db: Db, id: ObjectId, payToken: string) {
  const validatedPayToken = parseTossPayToken(payToken);
  return transition(db, id, "creating", "awaiting_authorization", { payToken: validatedPayToken });
}
export function claimAppsInTossPaymentExecution(db: Db, id: ObjectId, leaseUntil: Date) {
  const now = new Date(); if (leaseUntil <= now) throw new Error("실행 leaseUntil은 현재보다 이후여야 합니다.");
  return transition(db, id, "awaiting_authorization", "executing", { execution: { claimedAt: now, leaseUntil } });
}
export const recordAppsInTossPaymentPaid = (db: Db, id: ObjectId) => transition(db, id, "executing", "paid", {}, { execution: "" });
export const recordAppsInTossPaymentFinalized = (db: Db, id: ObjectId, finalOrderId: ObjectId) => transition(db, id, "paid", "finalized", { finalOrderId });
export function claimAppsInTossPaymentRefund(db: Db, id: ObjectId) { const now = new Date(); return transition(db, id, "paid", "refunding", { refund: { claimedAt: now, updatedAt: now } }); }
export const recordAppsInTossPaymentRefunded = (db: Db, id: ObjectId) => transition(db, id, "refunding", "refunded", { "refund.updatedAt": new Date() });
export function recordAppsInTossPaymentReconciliationRequired(db: Db, id: ObjectId, from: "executing" | "paid" | "refunding", failure: { failureStage?: string; failureCode?: string; failureMessage?: string } = {}) { return transition(db, id, from, "reconciliation_required", failure); }
