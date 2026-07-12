import { verifyAccessToken } from "@/lib/auth.utils";
import { getDb } from "@/lib/mongodb";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function createUploadSessionId() {
  return `rps_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function POST() {
  const token = (await cookies()).get("accessToken")?.value;
  if (!token) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const sub = typeof payload?.sub === "string" ? payload.sub : "";
  if (!sub || !ObjectId.isValid(sub)) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const uploadSessionId = createUploadSessionId();
  const db = await getDb();

  await db.collection("review_photo_upload_sessions").insertOne({
    _id: uploadSessionId,
    userId: new ObjectId(sub),
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    committedAt: null,
  });

  return NextResponse.json({ ok: true, uploadSessionId }, { headers: { "Cache-Control": "no-store" } });
}
