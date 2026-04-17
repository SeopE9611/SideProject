import { ObjectId, type Db } from "mongodb";

export type PaymentProvider = "toss" | "nicepay";

export type TossPaymentSessionStatus =
  | "ready"
  | "approved"
  | "failed"
  | "confirm_succeeded_order_failed"
  | "approve_succeeded_order_failed"
  | "approve_succeeded_auto_cancel_succeeded"
  | "approve_succeeded_auto_cancel_failed";

export type TossPaymentFlowType = "checkout_order" | "package_order" | "racket_order";

export type TossPaymentFailureStage =
  | "session_expired_before_confirm"
  | "confirm_payment"
  | "approve_payment"
  | "verify_auth"
  | "create_order_after_confirm"
  | "create_order_after_approve"
  | "net_cancel_required";

export type TossPaymentSession = {
  _id?: ObjectId;
  provider?: PaymentProvider;
  tossOrderId?: string;
  niceOrderId?: string;
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
  racketPayload?: {
    racketId: string;
    items: Array<{ productId: string; quantity: number; kind: "racket" }>;
    shippingInfo: {
      name: string;
      phone: string;
      address: string;
      addressDetail: string;
      postalCode: string;
      depositor: string;
      deliveryRequest: string;
      shippingMethod: "courier" | "visit";
    };
    servicePickupMethod: "courier" | "visit";
    shippingFee: number;
    totalPrice: number;
    paymentInfo: {
      bank?: string;
    };
    guestInfo?: {
      name?: string;
      email?: string;
      phone?: string;
    } | null;
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
  nicePrepared?: {
    clientId: string;
    orderId: string;
    returnUrl: string;
    goodsName?: string;
    buyerName?: string;
    buyerTel?: string;
    buyerEmail?: string;
  };
  niceAuthRaw?: Record<string, string>;
  niceApprovedRaw?: Record<string, string>;
  niceAutoCancel?: {
    attemptedAt: Date;
    resultCode: string;
    resultMsg?: string;
    status: "succeeded" | "failed" | "skipped";
  };
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
};

export async function ensureTossPaymentSessionIndexes(db: Db) {
  await db.collection<TossPaymentSession>("toss_payment_sessions").createIndex({ tossOrderId: 1 }, { unique: true, sparse: true });
  await db.collection<TossPaymentSession>("toss_payment_sessions").createIndex({ niceOrderId: 1 }, { unique: true, sparse: true });
  await db.collection<TossPaymentSession>("toss_payment_sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}

export function tossPaymentSessions(db: Db) {
  return db.collection<TossPaymentSession>("toss_payment_sessions");
}
