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
  state: string;
  paymentReady: boolean;
  expired: boolean;
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
    typeof data.state !== "string" ||
    typeof data.paymentReady !== "boolean" ||
    typeof data.expired !== "boolean"
  ) {
    throw new AppsPaymentApiError("결제 준비 응답을 확인하지 못했습니다.", 0);
  }

  return {
    success: true,
    attemptId: data.attemptId,
    state: data.state,
    paymentReady: data.paymentReady,
    expired: data.expired,
  };
}

async function requestPayment(path: string, sessionToken: string, init: RequestInit): Promise<AppsPaymentIntentStatus> {
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

  return parsePaymentIntentStatus(data);
}

export function prepareAppsPayment(input: PrepareAppsPaymentInput): Promise<AppsPaymentIntentStatus> {
  const { sessionToken, ...body } = input;

  return requestPayment(PAYMENTS_PATH, sessionToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function getAppsPaymentIntent(sessionToken: string, attemptId: string): Promise<AppsPaymentIntentStatus> {
  return requestPayment(`${PAYMENTS_PATH}/${encodeURIComponent(attemptId)}`, sessionToken, {
    method: "GET",
  });
}
