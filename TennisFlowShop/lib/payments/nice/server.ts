import { Buffer } from "node:buffer";

export const NICE_DEFAULT_APPROVE_API_BASE = "https://api.nicepay.co.kr/v1/payments";

function toPositiveAmount(amount: unknown): number {
  const normalized = Math.floor(Number(amount) || 0);
  return Number.isFinite(normalized) ? Math.max(0, normalized) : 0;
}

function toRecordString(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [k, v]) => {
    acc[k] = typeof v === "string" ? v : v === null || v === undefined ? "" : String(v);
    return acc;
  }, {});
}

export function createNiceOrderId(): string {
  return `nicepay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function buildNiceOrderName(items: Array<{ name?: string; quantity?: number }>) {
  const first = (items[0]?.name || "주문 상품").trim();
  const extraCount = Math.max(0, items.length - 1);
  return extraCount > 0 ? `${first} 외 ${extraCount}건` : first;
}

export function createNiceBasicAuthorization(clientKey: string, secretKey: string): string {
  const credentials = `${clientKey}:${secretKey}`;
  return `Basic ${Buffer.from(credentials, "utf8").toString("base64")}`;
}

export async function approveNicePaymentByTid(params: {
  tid: string;
  amount: number;
  clientKey: string;
  secretKey: string;
  apiBaseUrl?: string;
}): Promise<Record<string, string>> {
  const raw = await requestNicePayment({
    method: "POST",
    tid: params.tid,
    body: { amount: toPositiveAmount(params.amount) },
    clientKey: params.clientKey,
    secretKey: params.secretKey,
    apiBaseUrl: params.apiBaseUrl,
  });
  return raw;
}

export async function getNicePaymentByTid(params: {
  tid: string;
  clientKey: string;
  secretKey: string;
  apiBaseUrl?: string;
}): Promise<Record<string, string>> {
  return requestNicePayment({
    method: "GET",
    tid: params.tid,
    clientKey: params.clientKey,
    secretKey: params.secretKey,
    apiBaseUrl: params.apiBaseUrl,
  });
}

export async function cancelNicePaymentByTid(params: {
  tid: string;
  amount: number;
  reason: string;
  clientKey: string;
  secretKey: string;
  apiBaseUrl?: string;
}): Promise<Record<string, string>> {
  return requestNicePayment({
    method: "POST",
    tid: params.tid,
    action: "cancel",
    body: {
      amount: toPositiveAmount(params.amount),
      reason: String(params.reason || "주문 생성 실패로 인한 자동 취소").trim(),
    },
    clientKey: params.clientKey,
    secretKey: params.secretKey,
    apiBaseUrl: params.apiBaseUrl,
  });
}

async function requestNicePayment(params: {
  method: "GET" | "POST";
  tid: string;
  body?: Record<string, unknown>;
  action?: "cancel";
  clientKey: string;
  secretKey: string;
  apiBaseUrl?: string;
}): Promise<Record<string, string>> {
  const tid = String(params.tid ?? "").trim();
  if (!tid) throw new Error("NICE_TID_REQUIRED");

  const endpointBase = (params.apiBaseUrl || process.env.NICEPAY_APPROVE_API_BASE || NICE_DEFAULT_APPROVE_API_BASE).trim().replace(/\/+$/, "");
  const actionSuffix = params.action ? `/${params.action}` : "";
  const url = `${endpointBase}/${encodeURIComponent(tid)}${actionSuffix}`;

  const response = await fetch(url, {
    method: params.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: createNiceBasicAuthorization(params.clientKey, params.secretKey),
    },
    body: params.method === "POST" ? JSON.stringify(params.body ?? {}) : undefined,
    cache: "no-store",
  });

  const text = await response.text().catch(() => "");
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = {};
  }

  const raw = toRecordString(parsed);
  if (!response.ok) {
    const message = raw.resultMsg || raw.message || `NICE_APPROVE_HTTP_${response.status}`;
    const error = new Error(message) as Error & { httpStatus?: number; resultCode?: string; resultMsg?: string };
    error.httpStatus = response.status;
    error.resultCode = raw.resultCode || raw.ResultCode || "";
    error.resultMsg = raw.resultMsg || raw.ResultMsg || raw.message || "";
    throw error;
  }

  return raw;
}
