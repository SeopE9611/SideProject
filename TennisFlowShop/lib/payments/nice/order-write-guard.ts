import { isOrderCanceledStatus, isOrderRefundedStatus } from "@/lib/status/flow-status";
import type { Document, Filter } from "mongodb";
import {
  isCancelFinalizedOrderStatus,
  isExternallyCanceledPayment,
} from "@/lib/orders/cancel-finalization";

// Compare only payment/cancel state, not unrelated shipping or card metadata.
// The token also detects a claim that started and finished during the PG lookup.
export function niceOrderWriteFilter(order: Document, pgStatus: string): Filter<Document> {
  const canceled = pgStatus === "canceled";
  const claim = order.cancelRequest?.pgCancelClaim;
  const blocked = claim?.status === "processing" || (!canceled && (
    isExternallyCanceledPayment(order) ||
    isCancelFinalizedOrderStatus(order.status) ||
    isOrderCanceledStatus(order.status) || isOrderRefundedStatus(order.status) ||
    order.status === "취소처리중" ||
    ["approved", "approved_pending_pg_cancel", "approved_pending_finalization"].includes(order.cancelRequest?.status) ||
    ["needs_reconciliation", "pg_canceled"].includes(claim?.status) ||
    (pgStatus !== "partialcanceled" && (
      order.paymentStatus === "부분취소" ||
      ["partialcanceled", "partialcancelled"].includes(String(order.paymentInfo?.status ?? "").toLowerCase())
    ))
  ));

  return {
    _id: order._id,
    ...(blocked ? { $expr: { $eq: [1, 0] } } : {}),
    paymentStatus: order.paymentStatus ?? null,
    "paymentInfo.provider": order.paymentInfo?.provider ?? null,
    "paymentInfo.tid": order.paymentInfo?.tid ?? null,
    "paymentInfo.status": order.paymentInfo?.status ?? null,
    "paymentInfo.niceSync.pgStatus": order.paymentInfo?.niceSync?.pgStatus ?? null,
    "paymentNiceSync.pgStatus": order.paymentNiceSync?.pgStatus ?? null,
    "cancelRequest.status": order.cancelRequest?.status ?? null,
    "cancelRequest.pgCancelClaim.status": claim?.status ?? null,
    "cancelRequest.pgCancelClaim.token": claim?.token ?? null,
    // A confirmed canceled result can repair payment state even after finalization.
    ...(!canceled ? { status: order.status ?? null } : {}),
  };
}

// Merge at write time: dotted $set cannot traverse null/scalar parents.
export function nicePaymentUpdatePipeline(fields: Record<string, unknown>): Document[] {
  const root: Document = {};
  const payment: Document = {};
  const nested: Record<string, Document> = {};
  for (const [path, value] of Object.entries(fields)) {
    const parts = path.split(".");
    if (parts[0] !== "paymentInfo") root[path] = { $literal: value };
    else if (parts.length === 2) payment[parts[1]] = value;
    else (nested[parts[1]] ??= {})[parts.slice(2).join(".")] = value;
  }
  const objectOrEmpty = (path: string) => ({
    $cond: [{ $eq: [{ $type: path }, "object"] }, path, {}],
  });
  const nestedExpressions: Document = {};
  for (const [key, values] of Object.entries(nested)) {
    nestedExpressions[key] = { $mergeObjects: [objectOrEmpty(`$paymentInfo.${key}`), { $literal: values }] };
  }
  root.paymentInfo = { $mergeObjects: [objectOrEmpty("$paymentInfo"), { $literal: payment }, nestedExpressions] };
  return [{ $set: root }];
}
