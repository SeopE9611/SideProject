import { NextResponse } from "next/server";
import type { Db, Document, Filter } from "mongodb";

import { OFFLINE_PACKAGE_ORDER_FILTER } from "@/app/api/admin/offline/_lib/packageOrderOffline";
import { requireAdmin } from "@/lib/admin.guard";
import type { AdminDailyOperationsSummaryResponse } from "@/types/admin/operations";

export const dynamic = "force-dynamic";

const TERMINAL_STATUS_VALUES = [
  "취소",
  "취소완료",
  "환불완료",
  "배송완료",
  "구매확정",
  "completed",
  "cancelled",
  "canceled",
  "refunded",
  "refund_completed",
  "delivered",
  "purchase_confirmed",
  "returned",
  "반납완료",
  "교체완료",
];

const PAYMENT_PENDING_VALUES = ["pending", "unpaid", "ready", "bank_pending", "결제대기", "대기중"];
const PAYMENT_DONE_VALUES = ["paid", "confirmed", "payment_completed", "결제완료"];
const VISIT_PICKUP_VALUES = ["visit", "pickup", "store_pickup", "visit_pickup", "방문수령", "방문 수령", "매장수령"];

const ORDER_COMPLETED_TODAY_STATUS_VALUES = [
  "paid",
  "payment_completed",
  "preparing",
  "shipping_pending",
  "shipped",
  "delivered",
  "completed",
  "purchase_confirmed",
  "결제완료",
  "배송준비중",
  "배송중",
  "배송완료",
  "구매확정",
  "cancelled",
  "canceled",
  "refunded",
  "취소완료",
  "환불완료",
];

const STRINGING_COMPLETED_TODAY_STATUS_VALUES = [
  "reviewing",
  "accepted",
  "confirmed",
  "in_progress",
  "completed",
  "검토 중",
  "접수완료",
  "작업 중",
  "교체완료",
  "취소",
  "canceled",
  "cancelled",
];

const RENTAL_HISTORY_COMPLETED_ACTION_VALUES = ["paid", "out", "returned", "cancel-approved", "cancel-rejected", "cancel-withdrawn"];
const ACADEMY_COMPLETED_TODAY_STATUS_VALUES = ["reviewing", "contacted", "confirmed", "cancelled"];

const offlineUnpaidFilter: Filter<Document> = {
  $or: [
    { "payment.status": { $in: ["pending", "unpaid", "결제대기"] } },
    { paymentStatus: { $in: ["pending", "unpaid", "결제대기"] } },
    { isPaid: false },
  ],
};

const offlinePackageIssueReconcileFilter: Filter<Document> = {
  $and: [
    OFFLINE_PACKAGE_ORDER_FILTER,
    {
      $or: [
        { "meta.requiresOfflineIssueReconcile": true },
        { "meta.offlineIssueStatus": "issue_failed" },
        { "meta.offlineIssueError": { $exists: true, $nin: [null, ""] } },
      ],
    },
    {
      $or: [
        { "meta.reconcileStatus": { $exists: false } },
        { "meta.reconcileStatus": null },
        { "meta.reconcileStatus": "open" },
      ],
    },
  ],
};

const offlinePackageUsageReconcileFilter: Filter<Document> = {
  $and: [
    { "packageUsage.passId": { $exists: true, $nin: [null, ""] } },
    {
      $or: [
        { "packageUsage.consumptionId": { $exists: false } },
        { "packageUsage.consumptionId": null },
        { "packageUsage.consumptionId": "" },
      ],
    },
    {
      $or: [
        { "packageUsage.revertedAt": { $exists: false } },
        { "packageUsage.revertedAt": null },
      ],
    },
    { "packageUsage.reverted": { $ne: true } },
    {
      $or: [
        { "packageUsage.reconcileStatus": { $exists: false } },
        { "packageUsage.reconcileStatus": null },
        { "packageUsage.reconcileStatus": "open" },
      ],
    },
  ],
};

const academyNeedsActionFilter: Filter<Document> = { status: { $in: ["submitted", "reviewing", "contacted"] } };

const cancelRequestFilter: Filter<Document> = {
  $or: [
    { "cancel.status": "requested" },
    { "cancelRequest.status": { $in: ["requested", "요청"] } },
    { cancelStatus: "requested" },
    { cancelRequested: true },
    { cancelRequestStatus: "requested" },
  ],
};

const paymentCheckFilter: Filter<Document> = {
  $and: [
    {
      $or: [
        { paymentStatus: { $in: PAYMENT_PENDING_VALUES } },
        { "paymentInfo.status": { $in: PAYMENT_PENDING_VALUES } },
        { status: { $in: ["pending", "대기중"] } },
      ],
    },
    { status: { $nin: TERMINAL_STATUS_VALUES } },
  ],
};

const missingTrackingFilter: Filter<Document> = {
  $and: [
    { $or: [{ "shippingInfo.invoice.trackingNumber": { $exists: false } }, { "shippingInfo.invoice.trackingNumber": { $in: [null, ""] } }] },
    { $or: [{ "shippingInfo.trackingNo": { $exists: false } }, { "shippingInfo.trackingNo": { $in: [null, ""] } }] },
    { $or: [{ trackingNo: { $exists: false } }, { trackingNo: { $in: [null, ""] } }] },
  ],
};

const orderShippingMissingFilter: Filter<Document> = {
  $and: [
    {
      $or: [
        { paymentStatus: { $in: PAYMENT_DONE_VALUES } },
        { "paymentInfo.status": { $in: PAYMENT_DONE_VALUES } },
        { status: { $in: ["paid", "payment_completed", "preparing", "shipping_pending", "결제완료", "배송준비중"] } },
      ],
    },
    { status: { $nin: TERMINAL_STATUS_VALUES } },
    { $or: [{ "shippingInfo.shippingMethod": { $exists: false } }, { "shippingInfo.shippingMethod": { $nin: VISIT_PICKUP_VALUES } }] },
    { $or: [{ "shippingInfo.deliveryMethod": { $exists: false } }, { "shippingInfo.deliveryMethod": { $nin: VISIT_PICKUP_VALUES } }] },
    missingTrackingFilter,
  ],
};

const stringingShippingMissingFilter: Filter<Document> = {
  $and: [
    { status: { $in: ["completed", "교체완료", "work_done", "done"] } },
    { paymentStatus: { $nin: ["cancelled", "canceled", "refunded", "환불완료"] } },
    { $or: [{ "shippingInfo.shippingMethod": { $exists: false } }, { "shippingInfo.shippingMethod": { $nin: VISIT_PICKUP_VALUES } }] },
    {
      $and: [
        { $or: [{ "shippingInfo.invoice.trackingNumber": { $exists: false } }, { "shippingInfo.invoice.trackingNumber": { $in: [null, ""] } }] },
        { $or: [{ "shippingInfo.returnInvoice.trackingNumber": { $exists: false } }, { "shippingInfo.returnInvoice.trackingNumber": { $in: [null, ""] } }] },
      ],
    },
  ],
};

const rentalShippingMissingFilter: Filter<Document> = {
  $and: [
    {
      $or: [
        { paymentStatus: { $in: PAYMENT_DONE_VALUES } },
        { "paymentInfo.status": { $in: PAYMENT_DONE_VALUES } },
        { status: { $in: ["paid", "ready", "결제완료"] } },
      ],
    },
    { status: { $nin: TERMINAL_STATUS_VALUES } },
    {
      $and: [
        { $or: [{ "shipping.outbound.trackingNumber": { $exists: false } }, { "shipping.outbound.trackingNumber": { $in: [null, ""] } }] },
        { $or: [{ outboundTrackingNo: { $exists: false } }, { outboundTrackingNo: { $in: [null, ""] } }] },
      ],
    },
  ],
};

const stringingNeedsActionFilter: Filter<Document> = {
  status: {
    $in: ["submitted", "received", "reviewing", "accepted", "confirmed", "in_progress", "work_pending", "검토 중", "접수완료", "작업 중"],
    $nin: ["completed", "교체완료", "canceled", "cancelled", "취소"],
  },
};

const rentalDueFilter = (nowPlus48Hours: Date): Filter<Document> => ({
  $and: [
    {
      $or: [
        { status: { $in: ["overdue", "return_requested", "rented", "out", "대여중", "연체"] } },
        { returnDueAt: { $lte: nowPlus48Hours } },
        { endDate: { $lte: nowPlus48Hours } },
        { dueAt: { $lte: nowPlus48Hours } },
      ],
    },
    { status: { $nin: TERMINAL_STATUS_VALUES } },
  ],
});

const linkedReviewFilter: Filter<Document> = {
  $or: [
    {
      $and: [
        { $or: [{ orderId: { $exists: true, $nin: [null, ""] } }, { rentalId: { $exists: true, $nin: [null, ""] } }] },
        { $or: [{ paymentStatus: { $exists: false } }, { paymentStatus: null }, { paymentStatus: "" }] },
        { $or: [{ paymentSource: { $exists: false } }, { paymentSource: null }, { paymentSource: "" }] },
        { packageApplied: { $ne: true } },
        { servicePaid: { $ne: true } },
      ],
    },
    { paymentStatus: { $in: ["failed", "결제실패"] } },
    { paymentSource: { $in: ["order:", "rental:"] } },
  ],
};

function getKstDayRange(date = new Date()) {
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kst = new Date(date.getTime() + kstOffsetMs);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  const start = new Date(Date.UTC(y, m, d) - kstOffsetMs);
  const end = new Date(Date.UTC(y, m, d + 1) - kstOffsetMs);

  return { start, end, dateLabel: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
}

function dateRangeFilter(field: string, start: Date, end: Date): Filter<Document> {
  return { $or: [{ [field]: { $gte: start, $lt: end } }, { [field]: { $gte: start.toISOString(), $lt: end.toISOString() } }] };
}

function offlineCompletedTodayFilter(start: Date, end: Date): Filter<Document> {
  return {
    $and: [
      { $or: [dateRangeFilter("updatedAt", start, end), dateRangeFilter("createdAt", start, end), dateRangeFilter("occurredAt", start, end)] },
      {
        $or: [
          { "payment.status": "paid" },
          { paymentStatus: "paid" },
          { isPaid: true },
          { status: { $in: ["received", "in_progress", "completed", "picked_up"] } },
          { lines: { $exists: true, $ne: [] } },
        ],
      },
    ],
  };
}

function completedStatusFilter(statusValues: string[], start: Date, end: Date): Filter<Document> {
  return {
    $and: [
      dateRangeFilter("updatedAt", start, end),
      { $or: [{ status: { $in: statusValues } }, { orderStatus: { $in: statusValues } }] },
    ],
  };
}

async function safeCount(db: Db, collectionName: string, filter: Filter<Document>) {
  try {
    return await db.collection(collectionName).countDocuments(filter, { maxTimeMS: 2500 });
  } catch (error) {
    console.error(`[admin/operations/daily-summary] failed to count ${collectionName}`, error);
    return 0;
  }
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const { db } = guard;
  const { start, end, dateLabel } = getKstDayRange();
  const nowPlus48Hours = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const [
    orders,
    stringingApplications,
    rentalIds,
    offline,
    academyApplications,
    orderCancelRequests,
    stringingCancelRequests,
    rentalCancelRequests,
    orderPaymentCheck,
    stringingPaymentCheck,
    rentalPaymentCheck,
    orderShippingMissing,
    stringingShippingMissing,
    rentalShippingMissing,
    stringingWork,
    rentalDue,
    linkedReview,
    offlineUnpaidRecords,
    offlinePackageIssueReconcile,
    offlinePackageUsageReconcile,
    remainingAcademyApplications,
  ] = await Promise.all([
    safeCount(db, "orders", completedStatusFilter(ORDER_COMPLETED_TODAY_STATUS_VALUES, start, end)),
    safeCount(db, "stringing_applications", { $and: [dateRangeFilter("updatedAt", start, end), { status: { $in: STRINGING_COMPLETED_TODAY_STATUS_VALUES } }] }),
    db.collection("rental_history").distinct("rentalId", {
      $and: [dateRangeFilter("at", start, end), { action: { $in: RENTAL_HISTORY_COMPLETED_ACTION_VALUES } }],
    }).catch((error) => {
      console.error("[admin/operations/daily-summary] failed to count rental_history", error);
      return [];
    }),
    safeCount(db, "offline_service_records", offlineCompletedTodayFilter(start, end)),
    safeCount(db, "academy_lesson_applications", { $and: [dateRangeFilter("updatedAt", start, end), { status: { $in: ACADEMY_COMPLETED_TODAY_STATUS_VALUES } }] }),
    safeCount(db, "orders", cancelRequestFilter),
    safeCount(db, "stringing_applications", cancelRequestFilter),
    safeCount(db, "rental_orders", cancelRequestFilter),
    safeCount(db, "orders", paymentCheckFilter),
    safeCount(db, "stringing_applications", paymentCheckFilter),
    safeCount(db, "rental_orders", paymentCheckFilter),
    safeCount(db, "orders", orderShippingMissingFilter),
    safeCount(db, "stringing_applications", stringingShippingMissingFilter),
    safeCount(db, "rental_orders", rentalShippingMissingFilter),
    safeCount(db, "stringing_applications", stringingNeedsActionFilter),
    safeCount(db, "rental_orders", rentalDueFilter(nowPlus48Hours)),
    safeCount(db, "stringing_applications", linkedReviewFilter),
    safeCount(db, "offline_service_records", offlineUnpaidFilter),
    safeCount(db, "packageOrders", offlinePackageIssueReconcileFilter),
    safeCount(db, "offline_service_records", offlinePackageUsageReconcileFilter),
    safeCount(db, "academy_lesson_applications", academyNeedsActionFilter),
  ]);

  const rentals = rentalIds.length;
  const completedTotal = orders + stringingApplications + rentals + offline + academyApplications;
  const remainingOffline = offlineUnpaidRecords + offlinePackageIssueReconcile + offlinePackageUsageReconcile;
  const remaining = {
    cancelRequests: orderCancelRequests + stringingCancelRequests + rentalCancelRequests,
    paymentCheck: orderPaymentCheck + stringingPaymentCheck + rentalPaymentCheck,
    shippingMissing: orderShippingMissing + stringingShippingMissing + rentalShippingMissing,
    stringingWork,
    rentalDue,
    linkedReview,
    offline: remainingOffline,
    academyApplications: remainingAcademyApplications,
    total: 0,
  };
  remaining.total = remaining.cancelRequests + remaining.paymentCheck + remaining.shippingMissing + remaining.stringingWork + remaining.rentalDue + remaining.linkedReview + remaining.offline + remaining.academyApplications;

  const urgentRemaining = remaining.cancelRequests + remaining.rentalDue;
  const watchRemaining = remaining.paymentCheck + remaining.shippingMissing + remaining.stringingWork + remaining.linkedReview + remaining.offline + remaining.academyApplications;
  let message = "오늘 주요 업무가 안정적으로 정리되었습니다.";
  if (urgentRemaining > 0) {
    message = "긴급 처리 업무가 남아 있습니다. 취소 요청과 대여 반납/연체를 먼저 확인하세요.";
  } else if (watchRemaining > 0) {
    message = "확인 필요한 업무가 남아 있습니다. 결제, 배송, 교체서비스, 상담 대기 건을 점검하세요.";
  }

  const response: AdminDailyOperationsSummaryResponse = {
    date: dateLabel,
    completedToday: { orders, stringingApplications, rentals, offline, academyApplications, total: completedTotal },
    remaining,
    attention: { urgentRemaining, watchRemaining, message },
  };

  return NextResponse.json(response);
}
