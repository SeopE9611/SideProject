import { createHash } from "node:crypto";
import { parsePaymentEventDate } from "@/lib/date/payment-event-date";

export type NiceCancelEvent = { id: string; amount: number; canceledAt: string };
export type NiceCancelHistory = { version: 1; verified: boolean; originalAmount: number; balanceAmount: number | null; events: NiceCancelEvent[] };

function integer(value: unknown): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value))) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}
function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function normalizedStatus(status: string) {
  return status.trim().toLowerCase().replace("partialcancelled", "partialcanceled").replace("cancelled", "canceled");
}

// 저장된 근거도 집계 시 재검증한다. 하나라도 모순되면 scalar 취소액으로 대체하지 않는다.
export function verifiedNiceCancelEvents(value: unknown, originalAmount: number, pgStatus: string): NiceCancelEvent[] | null {
  const history = record(value);
  const balance = integer(history?.balanceAmount);
  const status = normalizedStatus(pgStatus);
  if (history?.version !== 1 || history.verified !== true || history.originalAmount !== originalAmount || balance == null || balance > originalAmount || !Array.isArray(history.events)) return null;
  if (status === "canceled" ? balance !== 0 : status === "partialcanceled" ? balance <= 0 || balance >= originalAmount : status === "paid" ? balance !== originalAmount : true) return null;
  const unique = new Map<string, NiceCancelEvent>();
  let total = 0;
  for (const item of history.events) {
    const row = record(item);
    const date = parsePaymentEventDate(row?.canceledAt);
    const amount = integer(row?.amount);
    if (!row || typeof row.id !== "string" || !/^[a-f\d]{64}$/.test(row.id) || !date || amount == null || amount <= 0) return null;
    const event = { id: row.id, amount, canceledAt: date.toISOString() };
    const previous = unique.get(event.id);
    if (previous && (previous.amount !== event.amount || previous.canceledAt !== event.canceledAt)) return null;
    if (!previous) { unique.set(event.id, event); total += amount; }
    if (!Number.isSafeInteger(total) || total > originalAmount) return null;
  }
  if (total !== originalAmount - balance) return null;
  return [...unique.values()].sort((a, b) => a.canceledAt.localeCompare(b.canceledAt) || a.id.localeCompare(b.id));
}

// getNicePaymentByTid는 cancels[]도 cancels.0.amount 등의 문자열 키로 평탄화한다.
export function normalizeNiceCancelHistory(raw: Record<string, string>, expected: { tid: string; orderId: string; amount: number }) {
  if (!expected.tid || !expected.orderId || !Number.isSafeInteger(expected.amount) || expected.amount <= 0 ||
      raw.tid !== expected.tid || raw.orderId !== expected.orderId || integer(raw.amount) !== expected.amount) {
    throw new Error("NICE_TRANSACTION_MISMATCH");
  }
  const status = normalizedStatus(raw.status ?? raw.Status ?? "");
  const history: NiceCancelHistory = { version: 1, verified: false, originalAmount: expected.amount, balanceAmount: integer(raw.balanceAmt), events: [] };
  const unknown = () => ({ history: { ...history, verified: false, events: [] }, cancelAmount: null, canceledAt: parsePaymentEventDate(raw.cancelledAt)?.toISOString() ?? null });
  if (["paid", "canceled", "partialcanceled"].includes(status) && (history.balanceAmount == null || history.balanceAmount > expected.amount ||
      (status === "canceled" && history.balanceAmount !== 0) ||
      (status === "partialcanceled" && (history.balanceAmount <= 0 || history.balanceAmount >= expected.amount)) ||
      (status === "paid" && history.balanceAmount !== expected.amount))) throw new Error("NICE_CANCEL_BALANCE_INVALID");
  if (status === "paid" && history.balanceAmount === expected.amount && (!raw.cancels || raw.cancels === "" || raw.cancels === "[array]" && !Object.keys(raw).some((key) => key.startsWith("cancels.")))) {
    history.verified = true;
    return { history, cancelAmount: null, canceledAt: null };
  }
  if (!["canceled", "partialcanceled"].includes(status) || raw.cancels !== "[array]") return unknown();
  const indexes = [...new Set(Object.keys(raw).flatMap((key) => {
    const match = /^cancels\.(\d+)(?:\.|$)/.exec(key);
    return match ? [Number(match[1])] : [];
  }))].sort((a, b) => a - b);
  const eventId = (tid: string) => createHash("sha256").update(`${expected.tid}:${tid}`).digest("hex");
  for (const [position, index] of indexes.entries()) {
    const tid = raw[`cancels.${index}.tid`]?.trim();
    const amount = integer(raw[`cancels.${index}.amount`]);
    const date = parsePaymentEventDate(raw[`cancels.${index}.cancelledAt`]);
    if (position !== index || !tid || !date || amount == null || amount <= 0) return unknown();
    history.events.push({ id: eventId(tid), amount, canceledAt: date.toISOString() });
  }
  history.verified = true;
  const events = verifiedNiceCancelEvents(history, expected.amount, status);
  if (!events?.length) return unknown();
  const last = events[events.length - 1];
  const topDate = parsePaymentEventDate(raw.cancelledAt);
  if (topDate && topDate.toISOString() !== last.canceledAt) return unknown();
  history.events = events;
  const lastByTid = raw.cancelledTid ? events.find((event) => event.id === eventId(raw.cancelledTid)) : null;
  if (raw.cancelledTid && (!lastByTid || lastByTid.canceledAt !== last.canceledAt)) return unknown();
  const latest = events.filter((event) => event.canceledAt === last.canceledAt);
  return { history, cancelAmount: lastByTid?.amount ?? (latest.length === 1 ? last.amount : null), canceledAt: last.canceledAt };
}
