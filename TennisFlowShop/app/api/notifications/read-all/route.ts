import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getCurrentUserId } from "@/lib/hooks/get-current-user";
import { getDb } from "@/lib/mongodb";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId || !ObjectId.isValid(userId)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const db = await getDb();
  const result = await db.collection("user_notifications").updateMany(
    {
      userId: new ObjectId(userId),
      readAt: null,
      $or: [{ archivedAt: null }, { archivedAt: { $exists: false } }],
    },
    { $set: { readAt: new Date() } },
  );

  return NextResponse.json({ ok: true, modifiedCount: result.modifiedCount }, { headers: NO_STORE });
}
