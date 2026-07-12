import { verifyAccessToken } from "@/lib/auth.utils";
import { removeReviewPhotosBestEffort } from "@/lib/reviews/review-photo-storage.server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const token = (await cookies()).get("accessToken")?.value;
  if (!token) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  try {
    verifyAccessToken(token);
  } catch {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const urls = Array.isArray(body?.urls) ? body.urls.slice(0, 10) : [];
  if (!urls.length) return NextResponse.json({ ok: true });

  await removeReviewPhotosBestEffort(urls, "POST /api/reviews/photos/cleanup");
  return NextResponse.json({ ok: true });
}
