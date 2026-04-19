import { Buffer } from "node:buffer";

export const NICE_DEFAULT_APPROVE_API_BASE = "https://api.nicepay.co.kr/v1/payments";

function toPositiveAmount(amount: unknown): number {
  const normalized = Math.floor(Number(amount) || 0);
  return Number.isFinite(normalized) ? Math.max(0, normalized) : 0;
}

function toRecordString(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const acc: Record<string, string> = {};
  flattenObjectToRecord(value as Record<string, unknown>, "", acc);
  return acc;
}

function pick(raw: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return "";
}

function flattenObjectToRecord(value: unknown, prefix: string, acc: Record<string, string>) {
  if (value === null || value === undefined) {
    if (prefix) acc[prefix] = "";
    return;
  }
  if (typeof value !== "object") {
    if (prefix) acc[prefix] = String(value);
    return;
  }

  if (Array.isArray(value)) {
    if (prefix) acc[prefix] = "[array]";
    value.forEach((item, index) => {
      flattenObjectToRecord(item, prefix ? `${prefix}.${index}` : String(index), acc);
    });
    return;
  }

  if (prefix) acc[prefix] = "[object]";
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    flattenObjectToRecord(child, nextPrefix, acc);
  }
}

const NICE_CARD_FIELD_CANDIDATES = {
  cardName: ["cardName", "CardName", "card.cardName", "card.name"] as const,
  issuerName: [
    "issuerName",
    "IssuerName",
    "cardCompany",
    "CardCompany",
    "card.issuerName",
    "card.company",
    "card.cardCompany",
  ] as const,
  issuerCode: ["issuerCode", "IssuerCode", "card.issuerCode"] as const,
  acquirerName: ["acquirerName", "AcquirerName", "card.acquirerName"] as const,
  acquirerCode: ["acquirerCode", "AcquirerCode", "card.acquirerCode"] as const,
  cardCode: ["cardCode", "CardCode", "card.cardCode", "card.code"] as const,
} as const;

const NICE_EASY_PAY_PROVIDER_CANDIDATES = ["easyPayProvider", "EasyPayProvider", "easyPay.provider", "easyPayProviderName"] as const;

function collectPresentKeys(raw: Record<string, string>, keys: readonly string[]) {
  return keys.filter((key) => typeof raw[key] === "string" && raw[key].trim() !== "");
}

export function summarizeNiceCardRaw(raw: Record<string, string>) {
  const allCandidates = [
    ...NICE_CARD_FIELD_CANDIDATES.cardName,
    ...NICE_CARD_FIELD_CANDIDATES.issuerName,
    ...NICE_CARD_FIELD_CANDIDATES.issuerCode,
    ...NICE_CARD_FIELD_CANDIDATES.acquirerName,
    ...NICE_CARD_FIELD_CANDIDATES.acquirerCode,
    ...NICE_CARD_FIELD_CANDIDATES.cardCode,
    ...NICE_EASY_PAY_PROVIDER_CANDIDATES,
  ];
  return {
    topLevelKeys: Object.keys(raw),
    presentCandidateKeys: collectPresentKeys(raw, allCandidates),
  };
}

export function extractNiceCardInfo(raw: Record<string, string>) {
  const cardName = pick(raw, ...NICE_CARD_FIELD_CANDIDATES.cardName);
  const issuerName = pick(raw, ...NICE_CARD_FIELD_CANDIDATES.issuerName);
  const issuerCode = pick(raw, ...NICE_CARD_FIELD_CANDIDATES.issuerCode);
  const acquirerName = pick(raw, ...NICE_CARD_FIELD_CANDIDATES.acquirerName);
  const acquirerCode = pick(raw, ...NICE_CARD_FIELD_CANDIDATES.acquirerCode);
  const cardCode = pick(raw, ...NICE_CARD_FIELD_CANDIDATES.cardCode);

  const displayName = cardName || issuerName || "";
  if (!displayName && !issuerCode && !acquirerName && !acquirerCode && !cardCode) {
    return null;
  }

  return {
    displayName,
    cardName: cardName || null,
    issuerName: issuerName || null,
    issuerCode: issuerCode || null,
    acquirerName: acquirerName || null,
    acquirerCode: acquirerCode || null,
    cardCode: cardCode || null,
  };
}

export function extractNiceEasyPayProvider(raw: Record<string, string>) {
  return pick(raw, ...NICE_EASY_PAY_PROVIDER_CANDIDATES) || "";
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
  orderId: string;
  cancelAmt?: number;
  reason: string;
  clientKey: string;
  secretKey: string;
  apiBaseUrl?: string;
}): Promise<Record<string, string>> {
  const body: Record<string, unknown> = {
    reason: String(params.reason || "주문 취소").trim(),
    orderId: String(params.orderId || "").trim(),
  };
  if (!body.orderId) throw new Error("NICE_ORDER_ID_REQUIRED");

  if (typeof params.cancelAmt === "number") {
    body.amount = toPositiveAmount(params.cancelAmt);
  }

  return requestNicePayment({
    method: "POST",
    tid: params.tid,
    action: "cancel",
    body,
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
