import type { Db, Document } from "mongodb";
import { EXCLUDE_OFFLINE_PACKAGE_ORDERS_FILTER } from "@/app/api/admin/offline/_lib/packageOrderOffline";
import { isStandaloneStringingApplication, rentalDepositAmount, rentalPaidAmount } from "./settlementPolicy";

export const PAYMENT_EVENT_BASIS = "payment_events_v1" as const;
export const PAYMENT_EVENT_NOTICE = "결제 발생일과 취소 발생일을 각각 집계합니다. 일시·금액 근거가 없거나 부분 취소 이력을 복원할 수 없는 거래는 추정하지 않습니다. 기존 스냅샷은 이전 집계 기준일 수 있습니다.";
export type PaymentEventSource = "orders" | "applications" | "packages" | "rentals" | "privatePayments";
export type PaymentEvent = { source: PaymentEventSource; kind: "paid" | "refund"; at: Date; amount: number; deposit: number };

// 날짜만 있는 문자열이나 시간대 없는 문자열을 실행 환경의 시간대로 해석하지 않는다.
export function paymentEventDate(value: unknown): Date | null {
  if (!(value instanceof Date) && (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value))) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function amount(value: unknown): number | null {
  if (value == null || value === "" || typeof value === "boolean") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

export function paymentEventsForDocument(source: PaymentEventSource, doc: Document): PaymentEvent[] {
  if (source === "applications" && (!isStandaloneStringingApplication(doc) || doc.status === "draft")) return [];
  const info = doc.paymentInfo ?? {};
  const paidAt = paymentEventDate(source === "privatePayments" ? doc.paidAt : info.approvedAt ?? doc.paidAt ?? doc.payment?.paidAt);
  const gross = amount(source === "privatePayments" ? doc.amount : source === "rentals" ? doc.amount?.total ?? info.total : info.total ?? info.rawSummary?.totalAmount ?? doc.paidAmount ?? doc.totalPrice ?? doc.serviceAmount);
  if (gross == null || gross <= 0) return [];
  const deposit = source === "rentals" ? rentalDepositAmount(doc) : 0;
  if (!Number.isSafeInteger(deposit) || deposit < 0 || deposit > gross) return [];
  const revenue = source === "rentals" ? rentalPaidAmount(doc) : gross;
  const events: PaymentEvent[] = [];
  // 승인 시각은 결제 근거로 유지된다. 현재 취소 상태로 결제 이력을 제외하지 않는다.
  if (paidAt) events.push({ source, kind: "paid", at: paidAt, amount: revenue, deposit });
  if (source === "privatePayments") {
    const at = paymentEventDate(doc.canceledAt);
    if (at) events.push({ source, kind: "refund", at, amount: gross, deposit: 0 });
    return events;
  }
  const sync = info.niceSync ?? {};
  const status = String(sync.pgStatus ?? info.status ?? doc.paymentStatus ?? "").toLowerCase();
  const canceled = ["canceled", "cancelled", "결제취소"].includes(status);
  const canceledAt = paymentEventDate(sync.canceledAt);
  const canceledAmount = amount(sync.cancelAmount);
  // cancelAmount는 경로에 따라 마지막 취소 금액이다. 누적으로 간주해 부분 취소를 합산하지 않는다.
  // admin_cancel_approve의 보완 시각과 실제 PG 취소 시각을 구분할 수 있을 때만 채택한다.
  const synthesizedDate = String(sync.source ?? "").startsWith("admin_cancel_approve") &&
    canceledAt?.getTime() === paymentEventDate(sync.lastSyncedAt)?.getTime();
  if (canceled && canceledAt && !synthesizedDate && canceledAmount === gross) {
    events.push({ source, kind: "refund", at: canceledAt, amount: revenue, deposit: 0 });
  }
  return events;
}

const eventDateFields = ["paymentInfo.approvedAt", "paidAt", "payment.paidAt", "paymentInfo.niceSync.canceledAt", "canceledAt"];

export async function buildOnlinePaymentEvents(db: Db, from: Date, toExclusive: Date) {
  const inRange = (date: Date) => date >= from && date < toExclusive;
  const dateMatch = { $expr: { $or: eventDateFields.map((field) => {
    const date = { $convert: { input: `$${field}`, to: "date", onError: null, onNull: null } };
    return { $and: [{ $gte: [date, from] }, { $lt: [date, toExclusive] }] };
  }) } };
  const sources = [
    ["orders", "orders"], ["applications", "stringing_applications"], ["packages", "packageOrders"],
    ["rentals", "rental_orders"], ["privatePayments", "privatePayments"],
  ] as const;
  const batches = await Promise.all(sources.map(async ([source, collection]) => {
    const docs = await db.collection(collection).find(
      { $and: [dateMatch, ...(source === "packages" ? [EXCLUDE_OFFLINE_PACKAGE_ORDERS_FILTER] : [])] },
      { projection: { paymentInfo: 1, paymentStatus: 1, paidAt: 1, payment: 1, paidAmount: 1, totalPrice: 1, serviceAmount: 1, amount: 1, deposit: 1, depositAmount: 1, status: 1, orderId: 1, rentalId: 1, canceledAt: 1 } },
    ).toArray();
    return docs.flatMap((doc) => paymentEventsForDocument(source, doc)).filter((event) => inRange(event.at));
  }));
  const events = batches.flat();
  const paidEvents = events.filter((event) => event.kind === "paid");
  const refundEvents = events.filter((event) => event.kind === "refund");
  const sum = (items: PaymentEvent[]) => items.reduce((total, event) => total + event.amount, 0);
  const paid = sum(paidEvents);
  const refund = sum(refundEvents);
  const privatePaid = paidEvents.filter((event) => event.source === "privatePayments");
  const privateRefund = refundEvents.filter((event) => event.source === "privatePayments");
  const count = (source: PaymentEventSource) => paidEvents.filter((event) => event.source === source).length;
  return {
    events,
    totals: { paid, refund, net: paid - refund, rentalDeposit: paidEvents.reduce((total, event) => total + event.deposit, 0) },
    breakdown: { orders: count("orders"), applications: count("applications"), packages: count("packages"), rentals: count("rentals"), privatePaymentsPaidAmount: sum(privatePaid), privatePaymentsRefundAmount: sum(privateRefund), privatePaymentsPaidCount: privatePaid.length, privatePaymentsRefundCount: privateRefund.length },
    accountingBasis: PAYMENT_EVENT_BASIS,
    notice: PAYMENT_EVENT_NOTICE,
  };
}
