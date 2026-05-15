import { NextResponse } from "next/server";
import type { Document, Filter } from "mongodb";

import { requireAdmin } from "@/lib/admin.guard";
import type { SidebarBadgeKey } from "@/components/admin/sidebar-navigation";

export const dynamic = "force-dynamic";

type NavigationCounts = Partial<Record<SidebarBadgeKey, number>>;

const orderNeedsActionFilter: Filter<Document> = {
  $or: [
    { "cancel.status": "requested" },
    { cancelStatus: "requested" },
    { paymentStatus: { $in: ["pending", "unpaid", "ready", "bank_pending"] } },
    { status: { $in: ["pending", "paid", "payment_completed", "preparing", "shipping_pending"] } },
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
  status: { $in: ["submitted", "received", "reviewing", "confirmed", "in_progress", "work_pending"] },
};

const offlineNeedsActionFilter: Filter<Document> = {
  $or: [
    { paymentStatus: { $in: ["pending", "unpaid"] } },
    { isPaid: false },
    { needsReconciliation: true },
    { packageIssueStatus: { $in: ["failed", "pending"] } },
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

  const [orders, stringing, rentals, offlineRecords, offlinePackages, academyApplications, notifications, reviews, boards] = await Promise.all([
    count("orders", orderNeedsActionFilter),
    count("stringing_applications", stringingNeedsActionFilter),
    count("rentals", rentalNeedsActionFilter),
    count("offline_service_records", offlineNeedsActionFilter),
    count("packageOrders", offlineNeedsActionFilter),
    count("academy_lesson_applications", academyNeedsActionFilter),
    count("notifications_outbox", notificationNeedsActionFilter),
    count("reviews", reviewNeedsActionFilter),
    count("community_posts", boardNeedsActionFilter),
  ]);

  const orderAndStringing = orders + stringing;
  const offline = offlineRecords + offlinePackages;
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
