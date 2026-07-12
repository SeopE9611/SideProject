import { verifyAccessToken } from "@/lib/auth.utils";
import { getDb } from "@/lib/mongodb";
import {
  extractReviewPhotoSessionObject,
  removeReviewPhotoStoragePathsBestEffort,
} from "@/lib/reviews/review-photo-storage.server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

const SESSION_ID_RE = /^rps_[a-f0-9]{32}$/;

export async function POST(req: Request) {
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

  const body = await req.json().catch(() => null);
  const uploadSessionId = typeof body?.uploadSessionId === "string" ? body.uploadSessionId : "";
  if (!SESSION_ID_RE.test(uploadSessionId)) {
    return NextResponse.json({ ok: false, reason: "invalidUploadSession" }, { status: 400 });
  }
  if (!Array.isArray(body?.urls)) {
    return NextResponse.json({ ok: false, reason: "invalidUrls" }, { status: 400 });
  }
  const urls = Array.from(new Set(body.urls.filter((url: unknown): url is string => typeof url === "string"))).slice(0, 10);
  if (!urls.length) return NextResponse.json({ ok: true });

  const db = await getDb();
  const session = await db.collection("review_photo_upload_sessions").findOne({ _id: uploadSessionId });
  if (!session) {
    return NextResponse.json({ ok: false, reason: "uploadSessionNotFound" }, { status: 404 });
  }
  if (String(session.userId) !== sub) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  if (!(session.expiresAt instanceof Date) || session.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ ok: false, reason: "uploadSessionExpired" }, { status: 400 });
  }

  const validItems = urls
    .map((url) => {
      const object = extractReviewPhotoSessionObject(url, uploadSessionId);
      return object ? { url, path: object.path } : null;
    })
    .filter((item): item is { url: string; path: string } => Boolean(item));
  if (!validItems.length) return NextResponse.json({ ok: true });

  const referenced = await db
    .collection("reviews")
    .find({ photos: { $in: validItems.map((item) => item.url) }, isDeleted: { $ne: true } })
    .project({ photos: 1 })
    .toArray();
  const referencedUrls = new Set(
    referenced.flatMap((review) => (Array.isArray(review.photos) ? review.photos.map(String) : [])),
  );
  const removablePaths = validItems
    .filter((item) => !referencedUrls.has(item.url))
    .map((item) => item.path);

  await removeReviewPhotoStoragePathsBestEffort(removablePaths, "POST /api/reviews/photos/cleanup");
  return NextResponse.json({ ok: true });
}
