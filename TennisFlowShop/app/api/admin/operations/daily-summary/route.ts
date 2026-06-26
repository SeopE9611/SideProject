import { NextResponse } from "next/server";
import type { Db, Document, Filter } from "mongodb";

import {
  countAdminOperationGroupCounts,
  countAdminOperationTaskCounts,
  toOperationSignalCounts,
} from "@/app/api/admin/_lib/adminOperationCounts";
import { requireAdmin } from "@/lib/admin.guard";
import type { AdminDailyOperationsSummaryResponse } from "@/types/admin/operations";

export const dynamic = "force-dynamic";

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

const RENTAL_HISTORY_COMPLETED_ACTION_VALUES = [
  "paid",
  "out",
  "returned",
  "cancel-approved",
  "cancel-rejected",
  "cancel-withdrawn",
];
const ACADEMY_COMPLETED_TODAY_STATUS_VALUES = ["reviewing", "contacted", "confirmed", "cancelled"];

function getKstDayRange(date = new Date()) {
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kst = new Date(date.getTime() + kstOffsetMs);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  const start = new Date(Date.UTC(y, m, d) - kstOffsetMs);
  const end = new Date(Date.UTC(y, m, d + 1) - kstOffsetMs);

  return {
    start,
    end,
    dateLabel: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
  };
}

function dateRangeFilter(field: string, start: Date, end: Date): Filter<Document> {
  return {
    $or: [
      { [field]: { $gte: start, $lt: end } },
      { [field]: { $gte: start.toISOString(), $lt: end.toISOString() } },
    ],
  };
}

function offlineCompletedTodayFilter(start: Date, end: Date): Filter<Document> {
  return {
    $and: [
      {
        $or: [
          dateRangeFilter("updatedAt", start, end),
          dateRangeFilter("createdAt", start, end),
          dateRangeFilter("occurredAt", start, end),
        ],
      },
      {
        $or: [
          { "payment.status": "paid" },
          { paymentStatus: "paid" },
          { isPaid: true },
          {
            status: {
              $in: ["received", "in_progress", "completed", "picked_up"],
            },
          },
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
      {
        $or: [{ status: { $in: statusValues } }, { orderStatus: { $in: statusValues } }],
      },
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
  const [
    orders,
    stringingApplications,
    rentalIds,
    offline,
    academyApplications,
    operationTaskCounts,
    operationGroupCounts,
  ] = await Promise.all([
    safeCount(db, "orders", completedStatusFilter(ORDER_COMPLETED_TODAY_STATUS_VALUES, start, end)),
    safeCount(db, "stringing_applications", {
      $and: [
        dateRangeFilter("updatedAt", start, end),
        { status: { $in: STRINGING_COMPLETED_TODAY_STATUS_VALUES } },
      ],
    }),
    db
      .collection("rental_history")
      .distinct("rentalId", {
        $and: [
          dateRangeFilter("at", start, end),
          { action: { $in: RENTAL_HISTORY_COMPLETED_ACTION_VALUES } },
        ],
      })
      .catch((error) => {
        console.error("[admin/operations/daily-summary] failed to count rental_history", error);
        return [];
      }),
    safeCount(db, "offline_service_records", offlineCompletedTodayFilter(start, end)),
    safeCount(db, "academy_lesson_applications", {
      $and: [
        dateRangeFilter("updatedAt", start, end),
        { status: { $in: ACADEMY_COMPLETED_TODAY_STATUS_VALUES } },
      ],
    }),
    countAdminOperationTaskCounts(db),
    countAdminOperationGroupCounts(db),
  ]);

  const rentals = rentalIds.length;
  const completedTotal = orders + stringingApplications + rentals + offline + academyApplications;
  const remaining = {
    ...operationTaskCounts,
    total:
      operationTaskCounts.cancelRequests +
      operationTaskCounts.paymentCheck +
      operationTaskCounts.packagePaymentCheck +
      operationTaskCounts.shippingMissing +
      operationTaskCounts.stringingWork +
      operationTaskCounts.rentalDue +
      operationTaskCounts.linkedReview +
      operationTaskCounts.offline +
      operationTaskCounts.academyApplications,
  };

  const operationSignalCounts = toOperationSignalCounts(operationTaskCounts);
  const urgentRemaining = remaining.cancelRequests + remaining.rentalDue;
  const watchRemaining =
    remaining.paymentCheck +
    remaining.packagePaymentCheck +
    remaining.shippingMissing +
    remaining.stringingWork +
    remaining.linkedReview +
    remaining.offline +
    remaining.academyApplications;
  let message = "오늘 주요 업무가 안정적으로 정리되었습니다.";
  if (urgentRemaining > 0) {
    message = "긴급 처리 업무가 남아 있습니다. 취소 요청과 대여 반납/연체를 먼저 확인하세요.";
  } else if (watchRemaining > 0) {
    message =
      "확인 필요한 업무가 남아 있습니다. 결제, 패키지 결제/활성화, 배송, 교체서비스, 상담 대기 건을 점검하세요.";
  }

  const response: AdminDailyOperationsSummaryResponse = {
    date: dateLabel,
    completedToday: {
      orders,
      stringingApplications,
      rentals,
      offline,
      academyApplications,
      total: completedTotal,
    },
    remaining,
    operationGroupCounts,
    operationSignalCounts,
    attention: { urgentRemaining, watchRemaining, message },
  };

  return NextResponse.json(response);
}
