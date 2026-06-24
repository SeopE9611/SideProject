import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getCurrentUserId } from "@/lib/hooks/get-current-user";
import { getDb } from "@/lib/mongodb";
import { serializeUserNotification } from "@/lib/notifications/user-notification.service";
import type { UserNotificationDoc } from "@/lib/notifications/types";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId || !ObjectId.isValid(userId)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: NO_STORE },
    );
  }

  const searchParams = req.nextUrl.searchParams;
  const rawLimit = Number(searchParams.get("limit") ?? 10);
  const limit = Math.min(30, Math.max(1, Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 10));
  const cursor = searchParams.get("cursor");
  const userObjectId = new ObjectId(userId);
  const filter: Record<string, unknown> = {
    userId: userObjectId,
    $or: [{ archivedAt: null }, { archivedAt: { $exists: false } }],
  };

  if (cursor) {
    const cursorDate = new Date(cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      filter.createdAt = { $lt: cursorDate };
    }
  }

  const db = await getDb();
  const col = db.collection<UserNotificationDoc>("user_notifications");
  const [docs, unreadCount] = await Promise.all([
    col
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .toArray(),
    col.countDocuments({
      userId: userObjectId,
      readAt: null,
      $or: [{ archivedAt: null }, { archivedAt: { $exists: false } }],
    }),
  ]);

  const items = docs.slice(0, limit);
  const hasMore = docs.length > limit;

  return NextResponse.json(
    {
      ok: true,
      items: items.map(serializeUserNotification),
      unreadCount,
      hasMore,
      nextCursor: hasMore ? (items[items.length - 1]?.createdAt.toISOString() ?? null) : null,
    },
    { headers: NO_STORE },
  );
}
