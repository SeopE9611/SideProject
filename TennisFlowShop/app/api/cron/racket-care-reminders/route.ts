import { calculateRacketCareStatus } from "@/lib/racket-care/calculate-care-status";
import { createUserNotification } from "@/lib/notifications/user-notification.service";
import type { RacketCareItemDoc } from "@/lib/racket-care/types";
import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";

function getBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}

function validateCronSecret(req: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ ok: false, message: "cron secret is not configured" }, { status: 503 });
  if (getBearerToken(req.headers) !== cronSecret) return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });
  return null;
}

function ymd(iso: string) { return iso.slice(0, 10); }

export async function GET(req: Request) {
  const authError = validateCronSecret(req);
  if (authError) return authError;
  const db = await getDb();
  const now = new Date();
  const candidates = await db.collection<RacketCareItemDoc>("racket_care_items").find(
    { reminderEnabled: true },
    { sort: { lastStringingAt: 1 }, limit: 100 },
  ).toArray();
  let notified = 0;
  for (const item of candidates) {
    const status = calculateRacketCareStatus({ playFrequency: item.playFrequency, lastStringingAt: item.lastStringingAt, now });
    if (new Date(status.nextRecommendedAt) > now) continue;
    const dueDate = new Date(status.nextRecommendedAt);
    if (item.reminderSentFor && ymd(item.reminderSentFor.toISOString()) === ymd(status.nextRecommendedAt)) continue;
    const result = await createUserNotification(db, {
      userId: item.userId,
      type: "racket_care",
      title: "스트링 교체 권장일이 되었어요",
      body: `${item.nickname}의 스트링 교체 시점을 확인해보세요.`,
      href: "/mypage/racket-care",
      source: { collection: "racket_care_items", id: item._id, kind: "racket_care" },
      dedupeKey: `racket-care:${item._id.toString()}:${ymd(status.nextRecommendedAt)}`,
      priority: "normal",
    });
    if (result.ok) {
      await db.collection("racket_care_items").updateOne(
        { _id: item._id, userId: item.userId },
        { $set: { reminderSentFor: dueDate, updatedAt: new Date() } },
      );
      notified += result.duplicated ? 0 : 1;
    }
  }
  return NextResponse.json({ ok: true, checked: candidates.length, notified });
}
