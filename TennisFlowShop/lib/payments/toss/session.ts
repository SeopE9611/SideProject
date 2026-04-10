import { ObjectId, type Db } from "mongodb";

export type TossPaymentSessionStatus = "ready" | "approved" | "failed";

export type TossPaymentSession = {
  _id?: ObjectId;
  tossOrderId: string;
  amount: number;
  status: TossPaymentSessionStatus;
  checkoutPayload: Record<string, unknown>;
  userId: string | null;
  guestInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  mongoOrderId?: string | null;
  paymentKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
};

export async function ensureTossPaymentSessionIndexes(db: Db) {
  await db.collection<TossPaymentSession>("toss_payment_sessions").createIndex({ tossOrderId: 1 }, { unique: true });
  await db.collection<TossPaymentSession>("toss_payment_sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}

export function tossPaymentSessions(db: Db) {
  return db.collection<TossPaymentSession>("toss_payment_sessions");
}
