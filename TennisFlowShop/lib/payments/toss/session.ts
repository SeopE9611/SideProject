import { ObjectId, type Db } from "mongodb";

export type TossPaymentSessionStatus = "ready" | "approved" | "failed" | "confirm_succeeded_order_failed";

export type TossPaymentFlowType = "checkout_order" | "package_order";

export type TossPaymentFailureStage = "session_expired_before_confirm" | "confirm_payment" | "create_order_after_confirm";

export type TossPaymentSession = {
  _id?: ObjectId;
  tossOrderId: string;
  amount: number;
  status: TossPaymentSessionStatus;
  flowType: TossPaymentFlowType;
  checkoutPayload?: Record<string, unknown>;
  packagePayload?: {
    packageId: string;
    serviceInfo: {
      name: string;
      phone: string;
      email: string;
      serviceRequest?: string;
    };
  };
  userId: string | null;
  guestInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  mongoOrderId?: string | null;
  paymentKey?: string | null;
  failureStage?: TossPaymentFailureStage;
  failureCode?: string;
  failureMessage?: string;
  confirmedPaymentSummary?: {
    orderId: string;
    method?: string;
    type?: string;
    totalAmount: number;
    approvedAt?: Date;
    card?: { issuerCode?: string; acquirerCode?: string };
    easyPay?: { provider?: string; amount?: number };
  };
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
