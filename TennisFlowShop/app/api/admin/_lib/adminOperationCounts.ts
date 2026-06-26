import type { Db, Document, Filter } from "mongodb";

import { createPackagePaymentCheckFilter } from "@/app/api/admin/_lib/packagePaymentCheckFilter";
import {
  EXCLUDE_OFFLINE_PACKAGE_ORDERS_FILTER,
  OFFLINE_PACKAGE_ORDER_FILTER,
} from "@/app/api/admin/offline/_lib/packageOrderOffline";
import type { SidebarBadgeKey } from "@/components/admin/sidebar-navigation";
import type {
  OperationGroupCounts,
  OperationSignalCounts,
  OperationTaskCounts,
} from "@/types/admin/operations";

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
  "입금확인",
  "활성화대기",
];
const PAYMENT_DONE_VALUES = ["paid", "confirmed", "payment_completed", "결제완료"];
const PAYMENT_CANCELLED_VALUES = [
  "결제취소",
  "취소",
  "환불",
  "환불완료",
  "refunded",
  "cancelled",
  "canceled",
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
      $or: [{ "packageUsage.revertedAt": { $exists: false } }, { "packageUsage.revertedAt": null }],
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

const packagePaymentCheckFilter = createPackagePaymentCheckFilter();

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
      $or: [{ trackingNo: { $exists: false } }, { trackingNo: { $in: [null, ""] } }],
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
        { status: { $in: ["overdue", "return_requested", "연체"] } },
        {
          $and: [
            { status: { $in: ["rented", "out", "대여중"] } },
            {
              $or: [
                { returnDueAt: { $lte: nowPlus48Hours } },
                { endDate: { $lte: nowPlus48Hours } },
                { dueAt: { $lte: nowPlus48Hours } },
                {
                  $and: [
                    { returnDueAt: { $in: [null, ""] } },
                    { endDate: { $in: [null, ""] } },
                    { dueAt: { $in: [null, ""] } },
                  ],
                },
              ],
            },
          ],
        },
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

async function safeCount(db: Db, collectionName: string, filter: Filter<Document>, label?: string) {
  try {
    return await db.collection(collectionName).countDocuments(filter, { maxTimeMS: 2500 });
  } catch (error) {
    console.error(`[admin/operation-counts] failed to count ${label ?? collectionName}`, error);
    return 0;
  }
}

const standaloneStringingNeedsActionFilter: Filter<Document> = {
  $and: [
    stringingNeedsActionFilter,
    {
      $or: [
        { orderId: { $exists: false } },
        { orderId: null },
        { orderId: "" },
      ],
    },
    {
      $or: [
        { rentalId: { $exists: false } },
        { rentalId: null },
        { rentalId: "" },
      ],
    },
  ],
};

export function toOperationSignalCounts(taskCounts: OperationTaskCounts): OperationSignalCounts {
  // navigation-summary의 operationSignalCounts는 전역 raw task count 기반 참고치입니다.
  // /admin/operations 목록 화면의 그룹 기준 신호 수는 목록 API 응답을 우선 사용합니다.
  return { ...taskCounts };
}

export async function countAdminOperationGroupCounts(db: Db): Promise<OperationGroupCounts> {
  const [orders, rentals, standaloneStringing] = await Promise.all([
    safeCount(db, "orders", orderNeedsActionFilter, "representative order tasks"),
    safeCount(db, "rental_orders", rentalNeedsActionFilter, "representative rental tasks"),
    safeCount(
      db,
      "stringing_applications",
      standaloneStringingNeedsActionFilter,
      "representative standalone stringing tasks",
    ),
  ]);

  return {
    totalRepresentativeTasks: orders + rentals + standaloneStringing,
    // 실제 오늘 생성/변경 기준이 아니라 현재 남은 대표 업무 기준입니다.
    todayRepresentativeTasks: orders + rentals + standaloneStringing,
  };
}

export async function countAdminOfflineNeedsAction(db: Db): Promise<number> {
  const [offlineUnpaidRecords, offlinePackageIssueReconcile, offlinePackageUsageReconcile] =
    await Promise.all([
      safeCount(db, "offline_service_records", offlineUnpaidFilter, "offline unpaid records"),
      safeCount(
        db,
        "packageOrders",
        offlinePackageIssueReconcileFilter,
        "offline package issue reconciliation",
      ),
      safeCount(
        db,
        "offline_service_records",
        offlinePackageUsageReconcileFilter,
        "offline package usage reconciliation",
      ),
    ]);

  return offlineUnpaidRecords + offlinePackageIssueReconcile + offlinePackageUsageReconcile;
}

export async function countAdminOperationTaskCounts(db: Db): Promise<OperationTaskCounts> {
  const nowPlus48Hours = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const [
    orderCancelRequests,
    stringingCancelRequests,
    rentalCancelRequests,
    orderPaymentCheck,
    stringingPaymentCheck,
    rentalPaymentCheck,
    packagePaymentCheck,
    orderShippingMissing,
    stringingShippingMissing,
    rentalShippingMissing,
    stringingWork,
    rentalDue,
    linkedReview,
    offline,
    academyApplications,
  ] = await Promise.all([
    safeCount(db, "orders", cancelRequestFilter, "order cancel requests"),
    safeCount(db, "stringing_applications", cancelRequestFilter, "stringing cancel requests"),
    safeCount(db, "rental_orders", cancelRequestFilter, "rental cancel requests"),
    safeCount(db, "orders", paymentCheckFilter, "order payment check"),
    safeCount(db, "stringing_applications", paymentCheckFilter, "stringing payment check"),
    safeCount(db, "rental_orders", paymentCheckFilter, "rental payment check"),
    safeCount(db, "packageOrders", packagePaymentCheckFilter, "package payment check"),
    safeCount(db, "orders", orderShippingMissingFilter, "order shipping missing"),
    safeCount(
      db,
      "stringing_applications",
      stringingShippingMissingFilter,
      "stringing shipping missing",
    ),
    safeCount(db, "rental_orders", rentalShippingMissingFilter, "rental shipping missing"),
    safeCount(db, "stringing_applications", stringingNeedsActionFilter, "stringing work"),
    safeCount(db, "rental_orders", rentalDueFilter(nowPlus48Hours), "rental due"),
    safeCount(db, "stringing_applications", linkedReviewFilter, "linked review"),
    countAdminOfflineNeedsAction(db),
    safeCount(db, "academy_lesson_applications", academyNeedsActionFilter, "academy applications"),
  ]);

  return {
    cancelRequests: orderCancelRequests + stringingCancelRequests + rentalCancelRequests,
    paymentCheck: orderPaymentCheck + stringingPaymentCheck + rentalPaymentCheck,
    packagePaymentCheck,
    shippingMissing: orderShippingMissing + stringingShippingMissing + rentalShippingMissing,
    stringingWork,
    rentalDue,
    linkedReview,
    offline,
    academyApplications,
  };
}

export async function countAdminNavigationSummary(db: Db): Promise<{
  counts: NavigationCounts;
  operationTaskCounts: OperationTaskCounts;
  operationGroupCounts: OperationGroupCounts;
  operationSignalCounts: OperationSignalCounts;
}> {
  const [
    orders,
    stringing,
    rentals,
    academyApplications,
    reviews,
    boards,
    operationTaskCounts,
    operationGroupCounts,
  ] = await Promise.all([
      safeCount(db, "orders", orderNeedsActionFilter, "orders needs action"),
      safeCount(db, "stringing_applications", stringingNeedsActionFilter, "stringing needs action"),
      safeCount(db, "rental_orders", rentalNeedsActionFilter, "rentals needs action"),
      safeCount(
        db,
        "academy_lesson_applications",
        academyNeedsActionFilter,
        "academy applications",
      ),
      safeCount(db, "reviews", reviewNeedsActionFilter, "reviews"),
      safeCount(db, "community_posts", boardNeedsActionFilter, "boards"),
      countAdminOperationTaskCounts(db),
      countAdminOperationGroupCounts(db),
    ]);

  const orderAndStringing = orders + stringing;
  const offline = operationTaskCounts.offline;
  const operations =
    operationGroupCounts.totalRepresentativeTasks +
    offline +
    operationTaskCounts.packagePaymentCheck +
    academyApplications +
    reviews +
    boards;

  const counts: NavigationCounts = {
    operations,
    orders: orderAndStringing,
    rentals,
    offline,
    academyApplications,
    packages: operationTaskCounts.packagePaymentCheck,
    reviews,
    boards,
  };

  return {
    counts,
    operationTaskCounts,
    operationGroupCounts,
    operationSignalCounts: toOperationSignalCounts(operationTaskCounts),
  };
}
