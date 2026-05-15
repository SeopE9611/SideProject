import { NextResponse } from "next/server";
import type { Document, Filter } from "mongodb";

import { requireAdmin } from "@/lib/admin.guard";
import type { SidebarBadgeKey } from "@/components/admin/sidebar-navigation";
import { OFFLINE_PACKAGE_ORDER_FILTER } from "@/app/api/admin/offline/_lib/packageOrderOffline";

export const dynamic = "force-dynamic";

type NavigationCounts = Partial<Record<SidebarBadgeKey, number>>;

const orderNeedsActionFilter: Filter<Document> = {
  $and: [
    {
      $or: [
        { "cancel.status": "requested" },
        { cancelStatus: "requested" },
        { paymentStatus: { $in: ["pending", "unpaid", "ready", "bank_pending", "결제대기"] } },
        {
          status: {
            $in: ["pending", "paid", "payment_completed", "preparing", "shipping_pending", "대기중", "결제완료", "배송준비중"],
          },
        },
      ],
    },
    { status: { $nin: ["canceled", "cancelled", "refunded", "refund_completed", "delivered", "completed", "purchase_confirmed", "취소", "취소완료", "환불완료", "배송완료", "구매확정"] } },
  ],
};

const rentalNeedsActionFilter: Filter<Document> = {
  $or: [
    { "cancel.status": "requested" },
    { cancelStatus: "requested" },
    { status: { $in: ["created", "paid", "ready", "out", "rented", "overdue", "return_requested"] } },
    { paymentStatus: { $in: ["pending", "unpaid", "ready", "bank_pending"] } },
  ],
};

const stringingNeedsActionFilter: Filter<Document> = {
  status: {
    $in: ["submitted", "received", "reviewing", "accepted", "confirmed", "in_progress", "work_pending", "검토 중", "접수완료", "작업 중"],
    $nin: ["completed", "교체완료", "canceled", "취소"],
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
      $or: [{ "meta.reconcileStatus": { $exists: false } }, { "meta.reconcileStatus": null }, { "meta.reconcileStatus": "open" }],
    },
  ],
};

const offlinePackageUsageReconcileFilter: Filter<Document> = {
  $and: [
    { "packageUsage.passId": { $exists: true, $nin: [null, ""] } },
    { $or: [{ "packageUsage.consumptionId": { $exists: false } }, { "packageUsage.consumptionId": null }, { "packageUsage.consumptionId": "" }] },
    { $or: [{ "packageUsage.revertedAt": { $exists: false } }, { "packageUsage.revertedAt": null }] },
    { "packageUsage.reverted": { $ne: true } },
    {
      $or: [{ "packageUsage.reconcileStatus": { $exists: false } }, { "packageUsage.reconcileStatus": null }, { "packageUsage.reconcileStatus": "open" }],
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
  $or: [{ status: { $in: ["pending", "reported"] } }, { hidden: true, resolvedAt: { $exists: false } }],
};

const boardNeedsActionFilter: Filter<Document> = {
  $or: [{ status: { $in: ["reported", "pending"] } }, { reportCount: { $gt: 0 }, moderationStatus: { $ne: "resolved" } }],
};

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const { db } = guard;

  async function count(collectionName: string, filter: Filter<Document>) {
    try {
      return await db.collection(collectionName).countDocuments(filter, { maxTimeMS: 2500 });
    } catch {
      return 0;
    }
  }

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
  ]);

  const orderAndStringing = orders + stringing;
  const offline = offlineUnpaidRecords + offlinePackageIssueReconcile + offlinePackageUsageReconcile;
  const operations = orderAndStringing + rentals + offline + academyApplications + notifications + reviews + boards;

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

  return NextResponse.json({ counts });
}
