import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getCurrentUserId } from "@/lib/hooks/get-current-user";
import { getDb } from "@/lib/mongodb";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  const { id } = await params;
  if (!userId || !ObjectId.isValid(userId)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: NO_STORE },
    );
  }
  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { ok: false, error: "INVALID_ID" },
      { status: 400, headers: NO_STORE },
    );
  }

  const db = await getDb();
  await db
    .collection("user_notifications")
    .updateOne(
      { _id: new ObjectId(id), userId: new ObjectId(userId), readAt: null },
      { $set: { readAt: new Date() } },
    );

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
