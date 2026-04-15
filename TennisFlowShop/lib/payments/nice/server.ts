import { createHash } from "node:crypto";

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function createNiceMoid(): string {
  return `nicepay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createNiceEdiDate(now = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mi = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
}

export function createNiceSignData(params: {
  ediDate: string;
  mid: string;
  amt: number;
  merchantKey: string;
}): string {
  const amt = String(Math.max(0, Math.floor(Number(params.amt) || 0)));
  return sha256Hex(`${params.ediDate}${params.mid}${amt}${params.merchantKey}`);
}

// Nice 인증응답 검증(Signature)
// 문서 기준 검증식: sha256(AuthToken + MID + Amt + MerchantKey)
export function verifyNiceAuthSignature(params: {
  authToken: string;
  mid: string;
  amt: number;
  merchantKey: string;
  signature: string;
}): boolean {
  const expected = sha256Hex(`${params.authToken}${params.mid}${String(Math.max(0, Math.floor(Number(params.amt) || 0)))}${params.merchantKey}`);
  return expected.toLowerCase() === String(params.signature ?? "").trim().toLowerCase();
}

export function buildNiceOrderName(items: Array<{ name?: string; quantity?: number }>) {
  const first = (items[0]?.name || "주문 상품").trim();
  const extraCount = Math.max(0, items.length - 1);
  return extraCount > 0 ? `${first} 외 ${extraCount}건` : first;
}

export async function approveNicePayment(params: {
  nextAppUrl: string;
  tid: string;
  authToken: string;
  mid: string;
  amt: number;
  ediDate: string;
  signData: string;
}): Promise<Record<string, string>> {
  const body = new URLSearchParams({
    TID: params.tid,
    AuthToken: params.authToken,
    MID: params.mid,
    Amt: String(Math.max(0, Math.floor(Number(params.amt) || 0))),
    EdiDate: params.ediDate,
    SignData: params.signData,
    CharSet: "utf-8",
  });

  const res = await fetch(params.nextAppUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
    },
    body: body.toString(),
    cache: "no-store",
  });

  const text = await res.text();
  const json = tryParseJson(text);
  const parsed = json ?? Object.fromEntries(new URLSearchParams(text));
  if (!res.ok) {
    const msg = parsed?.ResultMsg || parsed?.resultMsg || "Nice 승인 API 호출에 실패했습니다.";
    throw new Error(String(msg));
  }
  return toRecordString(parsed);
}

export async function triggerNiceNetCancel(url: string | null | undefined, payload: Record<string, string>) {
  if (!url) return { ok: false, reason: "NET_CANCEL_URL_MISSING" };
  try {
    const body = new URLSearchParams({ ...payload, CharSet: "utf-8" });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
      body: body.toString(),
      cache: "no-store",
    });
    return { ok: res.ok, status: res.status };
  } catch (error: any) {
    return { ok: false, reason: String(error?.message || "NET_CANCEL_FAILED") };
  }
}

function tryParseJson(text: string): any | null {
  try {
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function toRecordString(value: any): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  return Object.entries(value).reduce<Record<string, string>>((acc, [k, v]) => {
    acc[k] = typeof v === "string" ? v : v === null || v === undefined ? "" : String(v);
    return acc;
  }, {});
}
