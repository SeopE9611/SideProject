import { ObjectId, type Db } from "mongodb";

export type PrivatePaymentStatus = "active" | "inactive";
export type PrivatePaymentPaymentStatus = "결제대기" | "결제완료" | "결제취소";

export type PrivatePayment = {
  _id?: ObjectId;
  title: string;
  amount: number;
  description?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  status: PrivatePaymentStatus;
  paymentStatus: PrivatePaymentPaymentStatus;
  paymentInfo?: Record<string, unknown>;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: ObjectId;
  history: Array<{ status: string; date: Date; description: string }>;
};

export function privatePayments(db: Db) {
  return db.collection<PrivatePayment>("privatePayments");
}

export function serializePrivatePayment(doc: PrivatePayment) {
  return {
    ...doc,
    _id: doc._id?.toString(),
    id: doc._id?.toString(),
    createdBy: doc.createdBy?.toString(),
  };
}

export function normalizeAmount(value: unknown) {
  const amount = Math.floor(Number(value));
  return Number.isFinite(amount) ? amount : 0;
}

export function validatePrivatePaymentInput(body: any, options: { partial?: boolean } = {}) {
  const errors: string[] = [];
  const input: Record<string, string | number> = {};
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body ?? {}, key);

  if (!options.partial || has("title")) {
    const title = String(body?.title ?? "").trim();
    if (!title || title.length > 80) errors.push("결제명은 1~80자로 입력해 주세요.");
    else input.title = title;
  }

  if (!options.partial || has("amount")) {
    const amount = normalizeAmount(body?.amount);
    if (!Number.isInteger(amount) || amount < 1000) errors.push("금액은 1,000원 이상의 정수로 입력해 주세요.");
    else input.amount = amount;
  }

  for (const key of ["description", "customerName", "customerPhone", "customerEmail"] as const) {
    if (!options.partial || has(key)) input[key] = String(body?.[key] ?? "").trim();
  }

  if (has("customerEmail") && input.customerEmail) {
    const email = String(input.customerEmail);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("이메일 형식을 확인해 주세요.");
  }

  return { input, errors };
}
