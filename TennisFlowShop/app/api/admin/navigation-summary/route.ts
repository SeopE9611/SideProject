import { NextResponse } from "next/server";
import type { Document, Filter } from "mongodb";

import { OFFLINE_PACKAGE_ORDER_FILTER } from "@/app/api/admin/offline/_lib/packageOrderOffline";
import type { SidebarBadgeKey } from "@/components/admin/sidebar-navigation";
import { requireAdmin } from "@/lib/admin.guard";
import type { OperationTaskCounts } from "@/types/admin/operations";

export const dynamic = "force-dynamic";

type NavigationCounts = Partial<Record<SidebarBadgeKey, number>>;

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

const PAYMENT_PENDING_VALUES = [
  "pending",
  "unpaid",
  "ready",
  "bank_pending",
  "결제대기",
  "대기중",
];
const PAYMENT_DONE_VALUES = [
  "paid",
  "confirmed",
  "payment_completed",
  "결제완료",
];
const VISIT_PICKUP_VALUES = [
  "visit",
  "pickup",
  "store_pickup",
  "visit_pickup",
  "방문수령",
  "방문 수령",
  "매장수령",
];

const orderNeedsActionFilter: Filter<Document> = {
  $and: [
    {
      $or: [
        { "cancel.status": "requested" },
        { "cancelRequest.status": { $in: ["requested", "요청"] } },
        { cancelStatus: "requested" },
        { paymentStatus: { $in: PAYMENT_PENDING_VALUES } },
        {
          status: {
            $in: [
              "pending",
              "paid",
              "payment_completed",
              "preparing",
              "shipping_pending",
              "대기중",
              "결제완료",
              "배송준비중",
            ],
          },
        },
      ],
    },
    { status: { $nin: TERMINAL_STATUS_VALUES } },
  ],
};

const rentalNeedsActionFilter: Filter<Document> = {
  $and: [
    {
      $or: [
        { "cancel.status": "requested" },
        { "cancelRequest.status": { $in: ["requested", "요청"] } },
        { cancelStatus: "requested" },
        {
          status: {
            $in: [
              "created",
              "paid",
              "ready",
              "out",
              "rented",
              "overdue",
              "return_requested",
              "대여중",
              "연체",
            ],
          },
        },
        { paymentStatus: { $in: PAYMENT_PENDING_VALUES } },
      ],
    },
    { status: { $nin: TERMINAL_STATUS_VALUES } },
  ],
};

const stringingNeedsActionFilter: Filter<Document> = {
  status: {
    $in: [
      "submitted",
      "received",
      "reviewing",
      "accepted",
      "confirmed",
      "in_progress",
      "work_pending",
      "검토 중",
      "접수완료",
      "작업 중",
    ],
    $nin: ["completed", "교체완료", "canceled", "cancelled", "취소"],
  },
};

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

const academyNeedsActionFilter: Filter<Document> = {
  status: { $in: ["submitted", "reviewing", "contacted"] },
};

const notificationNeedsActionFilter: Filter<Document> = {
  status: { $in: ["queued", "failed"] },
};

const reviewNeedsActionFilter: Filter<Document> = {
  $or: [
    { status: { $in: ["pending", "reported"] } },
    { hidden: true, resolvedAt: { $exists: false } },
  ],
};

const boardNeedsActionFilter: Filter<Document> = {
  $or: [
    { status: { $in: ["reported", "pending"] } },
    { reportCount: { $gt: 0 }, moderationStatus: { $ne: "resolved" } },
  ],
};

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
    {
      $or: [
        { "shippingInfo.invoice.trackingNumber": { $exists: false } },
        { "shippingInfo.invoice.trackingNumber": { $in: [null, ""] } },
      ],
    },
    {
      $or: [
        { "shippingInfo.trackingNo": { $exists: false } },
        { "shippingInfo.trackingNo": { $in: [null, ""] } },
      ],
    },
    {
      $or: [
        { trackingNo: { $exists: false } },
        { trackingNo: { $in: [null, ""] } },
      ],
    },
  ],
};

const orderShippingMissingFilter: Filter<Document> = {
  $and: [
    {
      $or: [
        { paymentStatus: { $in: PAYMENT_DONE_VALUES } },
        { "paymentInfo.status": { $in: PAYMENT_DONE_VALUES } },
        {
          status: {
            $in: [
              "paid",
              "payment_completed",
              "preparing",
              "shipping_pending",
              "결제완료",
              "배송준비중",
            ],
          },
        },
      ],
    },
    { status: { $nin: TERMINAL_STATUS_VALUES } },
    {
      $or: [
        { "shippingInfo.shippingMethod": { $exists: false } },
        { "shippingInfo.shippingMethod": { $nin: VISIT_PICKUP_VALUES } },
      ],
    },
    {
      $or: [
        { "shippingInfo.deliveryMethod": { $exists: false } },
        { "shippingInfo.deliveryMethod": { $nin: VISIT_PICKUP_VALUES } },
      ],
    },
    missingTrackingFilter,
  ],
};

const stringingShippingMissingFilter: Filter<Document> = {
  $and: [
    { status: { $in: ["completed", "교체완료", "work_done", "done"] } },
    {
      paymentStatus: {
        $nin: ["cancelled", "canceled", "refunded", "환불완료"],
      },
    },
    {
      $or: [
        { "shippingInfo.shippingMethod": { $exists: false } },
        { "shippingInfo.shippingMethod": { $nin: VISIT_PICKUP_VALUES } },
      ],
    },
    {
      $and: [
        {
          $or: [
            { "shippingInfo.invoice.trackingNumber": { $exists: false } },
            { "shippingInfo.invoice.trackingNumber": { $in: [null, ""] } },
          ],
        },
        {
          $or: [
            { "shippingInfo.returnInvoice.trackingNumber": { $exists: false } },
            {
              "shippingInfo.returnInvoice.trackingNumber": { $in: [null, ""] },
            },
          ],
        },
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
        {
          $or: [
            { "shipping.outbound.trackingNumber": { $exists: false } },
            { "shipping.outbound.trackingNumber": { $in: [null, ""] } },
          ],
        },
        {
          $or: [
            { outboundTrackingNo: { $exists: false } },
            { outboundTrackingNo: { $in: [null, ""] } },
          ],
        },
      ],
    },
  ],
};

const rentalDueFilter = (nowPlus48Hours: Date): Filter<Document> => ({
  $and: [
    {
      $or: [
        {
          status: {
            $in: [
              "overdue",
              "return_requested",
              "rented",
              "out",
              "대여중",
              "연체",
            ],
          },
        },
        { returnDueAt: { $lte: nowPlus48Hours } },
        { endDate: { $lte: nowPlus48Hours } },
        { dueAt: { $lte: nowPlus48Hours } },
      ],
    },
    { status: { $nin: TERMINAL_STATUS_VALUES } },
  ],
});

const linkedReviewFilter: Filter<Document> = {
  // 업무 큐 안내용 근사치: 기존 operations의 review/info 신호처럼 연결 신청서의 결제 문맥 누락을 전체 기준으로 집계한다.
  $or: [
    {
      $and: [
        {
          $or: [
            { orderId: { $exists: true, $nin: [null, ""] } },
            { rentalId: { $exists: true, $nin: [null, ""] } },
          ],
        },
        {
          $or: [
            { paymentStatus: { $exists: false } },
            { paymentStatus: null },
            { paymentStatus: "" },
          ],
        },
        {
          $or: [
            { paymentSource: { $exists: false } },
            { paymentSource: null },
            { paymentSource: "" },
          ],
        },
        { packageApplied: { $ne: true } },
        { servicePaid: { $ne: true } },
      ],
    },
    { paymentStatus: { $in: ["failed", "결제실패"] } },
    { paymentSource: { $in: ["order:", "rental:"] } },
  ],
};

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const { db } = guard;

  async function count(collectionName: string, filter: Filter<Document>) {
    try {
      return await db
        .collection(collectionName)
        .countDocuments(filter, { maxTimeMS: 2500 });
    } catch (error) {
      console.error(
        `[admin/navigation-summary] failed to count ${collectionName}`,
        error,
      );
      return 0;
    }
  }

  const nowPlus48Hours = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const [
    orders,
    stringing,
    rentals,
    offlineUnpaidRecords,
    offlinePackageIssueReconcile,
    offlinePackageUsageReconcile,
    academyApplications,
    notifications,
    reviews,
    boards,
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
  ] = await Promise.all([
    count("orders", orderNeedsActionFilter),
    count("stringing_applications", stringingNeedsActionFilter),
    count("rental_orders", rentalNeedsActionFilter),
    count("offline_service_records", offlineUnpaidFilter),
    count("packageOrders", offlinePackageIssueReconcileFilter),
    count("offline_service_records", offlinePackageUsageReconcileFilter),
    count("academy_lesson_applications", academyNeedsActionFilter),
    count("notifications_outbox", notificationNeedsActionFilter),
    count("reviews", reviewNeedsActionFilter),
    count("community_posts", boardNeedsActionFilter),
    count("orders", cancelRequestFilter),
    count("stringing_applications", cancelRequestFilter),
    count("rental_orders", cancelRequestFilter),
    count("orders", paymentCheckFilter),
    count("stringing_applications", paymentCheckFilter),
    count("rental_orders", paymentCheckFilter),
    count("orders", orderShippingMissingFilter),
    count("stringing_applications", stringingShippingMissingFilter),
    count("rental_orders", rentalShippingMissingFilter),
    count("stringing_applications", stringingNeedsActionFilter),
    count("rental_orders", rentalDueFilter(nowPlus48Hours)),
    count("stringing_applications", linkedReviewFilter),
  ]);

  const orderAndStringing = orders + stringing;
  const offline =
    offlineUnpaidRecords +
    offlinePackageIssueReconcile +
    offlinePackageUsageReconcile;
  const operations =
    orderAndStringing +
    rentals +
    offline +
    academyApplications +
    notifications +
    reviews +
    boards;

  const counts: NavigationCounts = {
    operations,
    orders: orderAndStringing,
    rentals,
    offline,
    academyApplications,
    notifications,
    reviews,
    boards,
  };

  const operationTaskCounts: OperationTaskCounts = {
    cancelRequests:
      orderCancelRequests + stringingCancelRequests + rentalCancelRequests,
    paymentCheck:
      orderPaymentCheck + stringingPaymentCheck + rentalPaymentCheck,
    shippingMissing:
      orderShippingMissing + stringingShippingMissing + rentalShippingMissing,
    stringingWork,
    rentalDue,
    linkedReview,
    offline,
    academyApplications,
  };

  return NextResponse.json({ counts, operationTaskCounts });
}
