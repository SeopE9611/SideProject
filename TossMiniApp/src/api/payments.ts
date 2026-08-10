import { API_BASE_URL } from "../config/env";
import type {
  StringingApplicantDraft,
  StringingCollectionMethod,
  StringingShippingDraft,
  StringingWorkDraft,
} from "../types/stringing";

const PAYMENTS_PATH = "/api/apps-in-toss/payments";

export type AppsPaymentIntentStatus = {
  success: true;
  attemptId: string;
  state: AppsPaymentIntentState;
  paymentReady: boolean;
  expired: boolean;
  paymentSummary: AppsPaymentSummary;
};

export type AppsPaymentIntentState = "creating" | "awaiting_authorization" | "executing" | "paid" | "finalized" | "cancelled" | "failed" | "refunding" | "refunded" | "reconciliation_required";
export type AppsPaymentSummary = {
  item: { name: string; quantity: number };
  pricing: { subtotal: number; shippingFee: number; serviceFeeBeforePackage: number; serviceFee: number; packageDiscount: number; payableAmount: number };
  packageApplied: boolean;
};
export type AppsPaymentCompletionResult = { success: true; attemptId: string; state: AppsPaymentIntentState; orderId?: string; stringingApplicationId?: string };

export type AppsPaymentPrepareResult = AppsPaymentIntentStatus & {
  payToken: string;
};

type PrepareAppsPaymentInput = {
  sessionToken: string;
  attemptId: string;
  productId: string;
  selectedColor: string;
  selectedGauge: string;
  applicant: StringingApplicantDraft;
  collectionMethod: StringingCollectionMethod;
  shipping: StringingShippingDraft;
  work: StringingWorkDraft;
};

export class AppsPaymentApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AppsPaymentApiError";
    this.status = status;
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const PAYMENT_STATES: readonly AppsPaymentIntentState[] = ["creating", "awaiting_authorization", "executing", "paid", "finalized", "cancelled", "failed", "refunding", "refunded", "reconciliation_required"];

function isPaymentState(value: unknown): value is AppsPaymentIntentState {
  return typeof value === "string" && PAYMENT_STATES.includes(value as AppsPaymentIntentState);
}

function parsePaymentSummary(value: unknown): AppsPaymentSummary {
  if (!isRecord(value) || !isRecord(value.item) || !isRecord(value.pricing)) throw new AppsPaymentApiError("최종 결제 금액 응답을 확인하지 못했습니다.", 0);
  const { item, pricing } = value;
  const numbers = [pricing.subtotal, pricing.shippingFee, pricing.serviceFeeBeforePackage, pricing.serviceFee, pricing.packageDiscount, pricing.payableAmount];
  if (typeof item.name !== "string" || !item.name.trim() || !Number.isInteger(item.quantity) || Number(item.quantity) <= 0 ||
    numbers.some((number) => typeof number !== "number" || !Number.isFinite(number) || number < 0) ||
    typeof pricing.payableAmount !== "number" || !Number.isInteger(pricing.payableAmount) || pricing.payableAmount <= 0 || typeof value.packageApplied !== "boolean") {
    throw new AppsPaymentApiError("최종 결제 금액 응답을 확인하지 못했습니다.", 0);
  }
  return { item: { name: item.name, quantity: item.quantity as number }, pricing: pricing as AppsPaymentSummary["pricing"], packageApplied: value.packageApplied };
}

async function readResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function parsePaymentIntentStatus(data: unknown): AppsPaymentIntentStatus {
  if (
    !isRecord(data) ||
    data.success !== true ||
    typeof data.attemptId !== "string" ||
    !isPaymentState(data.state) ||
    typeof data.paymentReady !== "boolean" ||
    typeof data.expired !== "boolean" || !("paymentSummary" in data)
  ) {
    throw new AppsPaymentApiError("결제 준비 응답을 확인하지 못했습니다.", 0);
  }

  return {
    success: true,
    attemptId: data.attemptId,
    state: data.state,
    paymentReady: data.paymentReady,
    expired: data.expired,
    paymentSummary: parsePaymentSummary(data.paymentSummary),
  };
}

function parsePaymentCompletionResult(data: unknown): AppsPaymentCompletionResult {
  if (!isRecord(data) || data.success !== true || typeof data.attemptId !== "string" || !isPaymentState(data.state) ||
    (data.orderId !== undefined && typeof data.orderId !== "string") ||
    (data.stringingApplicationId !== undefined && typeof data.stringingApplicationId !== "string")) {
    throw new AppsPaymentApiError("결제 처리 응답을 확인하지 못했습니다.", 0);
  }
  return { success: true, attemptId: data.attemptId, state: data.state,
    ...(typeof data.orderId === "string" ? { orderId: data.orderId } : {}),
    ...(typeof data.stringingApplicationId === "string" ? { stringingApplicationId: data.stringingApplicationId } : {}) };
}

function parsePaymentPrepareResult(data: unknown): AppsPaymentPrepareResult {
  const status = parsePaymentIntentStatus(data);
  if (typeof data !== "object" || data === null || !("payToken" in data) ||
    typeof data.payToken !== "string" || data.payToken.length === 0 || data.payToken.length > 30 || !data.payToken.trim()) {
    throw new AppsPaymentApiError("결제 토큰을 확인하지 못했습니다.", 0);
  }
  return { ...status, payToken: data.payToken };
}

async function requestPayment<T>(path: string, sessionToken: string, init: RequestInit, parse: (data: unknown) => T): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "omit",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${sessionToken}`,
      ...init.headers,
    },
  });
  const data = await readResponse(response);

  if (!response.ok) {
    const message = isRecord(data) && typeof data.message === "string" ? data.message : `요청에 실패했습니다. (${response.status})`;
    const code = isRecord(data) && typeof data.code === "string" ? data.code : undefined;
    throw new AppsPaymentApiError(message, response.status, code);
  }

  return parse(data);
}

export function prepareAppsPayment(input: PrepareAppsPaymentInput): Promise<AppsPaymentPrepareResult> {
  const { sessionToken, ...body } = input;

  return requestPayment(PAYMENTS_PATH, sessionToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, parsePaymentPrepareResult);
}

export function getAppsPaymentIntent(sessionToken: string, attemptId: string): Promise<AppsPaymentIntentStatus> {
  return requestPayment(`${PAYMENTS_PATH}/${encodeURIComponent(attemptId)}`, sessionToken, {
    method: "GET",
  }, parsePaymentIntentStatus);
}

export function completeAppsPayment(sessionToken: string, attemptId: string): Promise<AppsPaymentCompletionResult> {
  return requestPayment(`${PAYMENTS_PATH}/${encodeURIComponent(attemptId)}/complete`, sessionToken, { method: "POST" }, parsePaymentCompletionResult);
}
