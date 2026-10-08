import "server-only";
import { Buffer } from "node:buffer";

// Initial lookup budget, not a measured provider SLA.
export const TOSS_PAYMENT_LOOKUP_TIMEOUT_MS = 10_000;

const PAYMENT_STATUSES = [
  "DONE", "READY", "IN_PROGRESS", "WAITING_FOR_DEPOSIT",
  "ABORTED", "EXPIRED", "CANCELED", "PARTIAL_CANCELED",
] as const;
export type TossPaymentStatus = typeof PAYMENT_STATUSES[number];
export type TossPaymentObservation = {
  paymentKey: string;
  orderId: string;
  totalAmount: number;
  status: TossPaymentStatus;
  observedAt: Date;
  balanceAmount?: number;
};

export type TossPaymentLookupErrorKind =
  | "timeout" | "network" | "invalid_response" | "provider_http"
  | "identity_mismatch" | "invalid_input" | "configuration";

export class TossPaymentLookupError extends Error {
  readonly provider = "toss";
  readonly operation = "lookup";
  constructor(
    readonly kind: TossPaymentLookupErrorKind,
    readonly httpStatus?: number,
    readonly providerCode?: string,
  ) {
    // Do not attach provider messages, payloads, identifiers, credentials or raw causes.
    super(`TOSS_LOOKUP_${kind.toUpperCase()}`);
    this.name = "TossPaymentLookupError";
  }
}

type CanonicalExpectation = {
  /** Canonical values from trusted server storage, not unchecked request input. */
  orderId: string;
  expectedAmount: number;
};

function isPaymentKey(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 200 && !/\s/.test(value);
}
function isOrderId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(value);
}
function isAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Lookup only; a valid observation does not authorize a local state transition. */
export function getTossPaymentByPaymentKey(params: CanonicalExpectation & { paymentKey: string }) {
  return lookupPayment(params, "paymentKey");
}

/** orderId lookup can be used when the canonical paymentKey has not been stored yet. */
export function getTossPaymentByOrderId(params: CanonicalExpectation & { paymentKey?: string }) {
  return lookupPayment(params, "orderId");
}

async function lookupPayment(
  params: CanonicalExpectation & { paymentKey?: string },
  by: "paymentKey" | "orderId",
): Promise<TossPaymentObservation> {
  if (process.env.PORTFOLIO_DEMO_MODE === "true") {
    throw Object.assign(new Error("포트폴리오 데모에서는 실제 결제를 진행하지 않습니다."), {
      code: "PORTFOLIO_DEMO_PAYMENT_DISABLED", status: 403,
    });
  }
  if (!params || !isOrderId(params.orderId) || !isAmount(params.expectedAmount) ||
      (by === "paymentKey" ? !isPaymentKey(params.paymentKey) : params.paymentKey !== undefined && !isPaymentKey(params.paymentKey))) {
    throw new TossPaymentLookupError("invalid_input");
  }
  const secretKey = process.env.TOSS_WIDGET_SECRET_KEY;
  if (!secretKey || !secretKey.trim()) throw new TossPaymentLookupError("configuration");
  const path = by === "paymentKey" ? encodeURIComponent(params.paymentKey!) : `orders/${encodeURIComponent(params.orderId)}`;
  const signal = AbortSignal.timeout(TOSS_PAYMENT_LOOKUP_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`https://api.tosspayments.com/v1/payments/${path}`, {
      method: "GET",
      headers: { Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`, "Content-Type": "application/json" },
      cache: "no-store",
      signal,
    });
  } catch {
    throw new TossPaymentLookupError(signal.aborted ? "timeout" : "network");
  }
  let parsed: unknown;
  try {
    const text = await response.text();
    signal.throwIfAborted();
    parsed = JSON.parse(text);
  } catch {
    throw new TossPaymentLookupError(signal.aborted ? "timeout" : response.ok ? "invalid_response" : "provider_http", response.status);
  }
  if (!response.ok) {
    const code = isRecord(parsed) && typeof parsed.code === "string" && /^[A-Z][A-Z0-9_]{0,99}$/.test(parsed.code) ? parsed.code : undefined;
    throw new TossPaymentLookupError("provider_http", response.status, code);
  }
  if (!isRecord(parsed) || !isPaymentKey(parsed.paymentKey) || !isOrderId(parsed.orderId) ||
      !isAmount(parsed.totalAmount) || typeof parsed.status !== "string" ||
      !PAYMENT_STATUSES.some((status) => status === parsed.status)) {
    throw new TossPaymentLookupError("invalid_response", response.status);
  }
  if (parsed.orderId !== params.orderId || parsed.totalAmount !== params.expectedAmount ||
      (params.paymentKey !== undefined && parsed.paymentKey !== params.paymentKey)) {
    throw new TossPaymentLookupError("identity_mismatch", response.status);
  }
  if (parsed.balanceAmount !== undefined && (!isAmount(parsed.balanceAmount) || parsed.balanceAmount > parsed.totalAmount)) {
    throw new TossPaymentLookupError("invalid_response", response.status);
  }
  return {
    paymentKey: parsed.paymentKey,
    orderId: parsed.orderId,
    totalAmount: parsed.totalAmount,
    status: parsed.status as TossPaymentStatus,
    observedAt: new Date(),
    ...(parsed.balanceAmount !== undefined ? { balanceAmount: parsed.balanceAmount as number } : {}),
  };
}
