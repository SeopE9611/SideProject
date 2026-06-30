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
  expiresAt?: Date | null;
  archivedAt?: Date | null;
  archivedBy?: ObjectId | null;
  paidAt?: Date;
  canceledAt?: Date;
  cancellationInfo?: {
    status?: "processing" | "completed" | "failed";
    reason?: string;
    requestedAt?: Date;
    canceledAt?: Date;
    failedAt?: Date;
    failureMessage?: string;
    rawSummary?: unknown;
    requestedBy?: ObjectId;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy?: ObjectId;
  history: Array<{ status: string; date: Date; description: string }>;
};


export type PrivatePaymentDocument = PrivatePayment & {
  _id: ObjectId;
};

export type SerializedPrivatePayment = Omit<
  PrivatePayment,
  "_id" | "createdBy" | "archivedBy" | "createdAt" | "updatedAt" | "expiresAt" | "archivedAt" | "paidAt" | "canceledAt" | "cancellationInfo" | "history"
> & {
  _id: string;
  id: string;
  createdBy?: string;
  archivedBy?: string;
  createdAt: string;
  expiresAt?: string;
  archivedAt?: string;
  updatedAt: string;
  paidAt?: string;
  canceledAt?: string;
  cancellationInfo?: Omit<NonNullable<PrivatePayment["cancellationInfo"]>, "requestedAt" | "canceledAt" | "failedAt" | "requestedBy"> & {
    requestedAt?: string;
    canceledAt?: string;
    failedAt?: string;
    requestedBy?: string;
  };
  history: Array<{ status: string; date: string; description: string }>;
};

type PrivatePaymentInputBody = Partial<
  Record<
    "title" | "amount" | "description" | "customerName" | "customerPhone" | "customerEmail" | "expiresAt",
    unknown
  >
>;

function asPrivatePaymentInputBody(value: unknown): PrivatePaymentInputBody {
  return value && typeof value === "object" ? (value as PrivatePaymentInputBody) : {};
}

function toIsoString(value: Date | string | undefined): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function privatePayments(db: Db) {
  return db.collection<PrivatePayment>("privatePayments");
}

export function serializePrivatePayment(
  doc: PrivatePaymentDocument,
): SerializedPrivatePayment {
  const id = doc._id.toString();

  return {
    ...doc,
    _id: id,
    id,
    createdBy: doc.createdBy?.toString(),
    archivedBy: doc.archivedBy?.toString(),
    createdAt: toIsoString(doc.createdAt) ?? "",
    updatedAt: toIsoString(doc.updatedAt) ?? "",
    expiresAt: toIsoString(doc.expiresAt ?? undefined),
    archivedAt: toIsoString(doc.archivedAt ?? undefined),
    paidAt: toIsoString(doc.paidAt),
    canceledAt: toIsoString(doc.canceledAt),
    cancellationInfo: doc.cancellationInfo
      ? {
          ...doc.cancellationInfo,
          requestedAt: toIsoString(doc.cancellationInfo.requestedAt),
          canceledAt: toIsoString(doc.cancellationInfo.canceledAt),
          failedAt: toIsoString(doc.cancellationInfo.failedAt),
          requestedBy: doc.cancellationInfo.requestedBy?.toString(),
        }
      : undefined,
    history: doc.history.map((entry) => ({
      ...entry,
      date: toIsoString(entry.date) ?? "",
    })),
  };
}

export function normalizeAmount(value: unknown) {
  const amount = Math.floor(Number(value));
  return Number.isFinite(amount) ? amount : 0;
}

export function validatePrivatePaymentInput(body: unknown, options: { partial?: boolean } = {}) {
  const errors: string[] = [];
  const input: Record<string, string | number> = {};
  const source = asPrivatePaymentInputBody(body);
  const has = (key: keyof PrivatePaymentInputBody) => Object.prototype.hasOwnProperty.call(source, key);

  if (!options.partial || has("title")) {
    const title = String(source.title ?? "").trim();
    if (!title || title.length > 80) errors.push("결제명은 1~80자로 입력해 주세요.");
    else input.title = title;
  }

  if (!options.partial || has("amount")) {
    const amount = normalizeAmount(source.amount);
    if (!Number.isInteger(amount) || amount < 1000) errors.push("금액은 1,000원 이상의 정수로 입력해 주세요.");
    else input.amount = amount;
  }

  for (const key of ["description", "customerName", "customerPhone", "customerEmail"] as const) {
    if (!options.partial || has(key)) input[key] = String(source[key] ?? "").trim();
  }

  if (!options.partial || has("expiresAt")) {
    const raw = source.expiresAt;
    if (raw === "" || raw === null || raw === undefined) {
      input.expiresAt = "";
    } else {
      const date = new Date(String(raw));
      if (Number.isNaN(date.getTime())) errors.push("만료일 형식을 확인해 주세요.");
      else input.expiresAt = date.toISOString();
    }
  }

  if (has("customerEmail") && input.customerEmail) {
    const email = String(input.customerEmail);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("이메일 형식을 확인해 주세요.");
  }

  return { input, errors };
}
