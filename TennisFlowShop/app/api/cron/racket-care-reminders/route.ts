import { getDb } from "@/lib/mongodb";
import { createUserNotification } from "@/lib/notifications/user-notification.service";
import { calculateRacketCareStatus } from "@/lib/racket-care/calculate-care-status";
import type { RacketCareItemDoc } from "@/lib/racket-care/types";
import { ObjectId, type Filter } from "mongodb";
import { NextResponse } from "next/server";

function getBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}
function validateCronSecret(req: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret)
    return NextResponse.json(
      { ok: false, message: "cron secret is not configured" },
      { status: 503 },
    );
  if (getBearerToken(req.headers) !== cronSecret)
    return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });
  return null;
}
function ymd(iso: string) {
  return iso.slice(0, 10);
}
function koreanDate(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));
}

export async function GET(req: Request) {
  const authError = validateCronSecret(req);
  if (authError) return authError;
  const db = await getDb();
  const now = new Date();
  const batchSize = 100;
  let lastId: ObjectId | null = null;
  let checked = 0;
  let due = 0;
  let notified = 0;
  let duplicated = 0;
  let failed = 0;

  while (true) {
    const query: Filter<RacketCareItemDoc> =
      lastId === null
        ? { reminderEnabled: true }
        : {
            reminderEnabled: true,
            _id: { $gt: lastId },
          };

    const batch: RacketCareItemDoc[] = await db
      .collection<RacketCareItemDoc>("racket_care_items")
      .find(query, {
        sort: { _id: 1 },
        limit: batchSize,
      })
      .toArray();

    if (batch.length === 0) break;

    for (const item of batch) {
      checked += 1;
      lastId = item._id;
      try {
        const status = calculateRacketCareStatus({
          playFrequency: item.playFrequency,
          lastStringingAt: item.lastStringingAt,
          now,
        });
        if (new Date(status.nextRecommendedAt) > now) continue;
        due += 1;
        const dueDate = new Date(status.nextRecommendedAt);
        if (
          item.reminderSentFor &&
          ymd(item.reminderSentFor.toISOString()) === ymd(status.nextRecommendedAt)
        )
          continue;
        const result = await createUserNotification(db, {
          userId: item.userId,
          type: "racket_care",
          title: "스트링 교체 권장일이 되었어요",
          body: `${item.nickname}의 예상 교체일(${koreanDate(status.nextRecommendedAt)})이 도달했습니다.`,
          href: `/mypage/racket-care?selected=${item._id.toString()}`,
          source: { collection: "racket_care_items", id: item._id, kind: "racket_care" },
          dedupeKey: `racket-care:${item._id.toString()}:${ymd(status.nextRecommendedAt)}`,
          priority: "normal",
        });
        if (result.ok) {
          await db
            .collection("racket_care_items")
            .updateOne(
              { _id: item._id, userId: item.userId },
              { $set: { reminderSentFor: dueDate, updatedAt: new Date() } },
            );
          if (result.duplicated) duplicated += 1;
          else notified += 1;
        } else {
          failed += 1;
        }
      } catch (error) {
        console.error("[racket-care-reminders] item failed", item._id.toString(), error);
        failed += 1;
      }
    }
    if (batch.length < batchSize) break;
  }
  return NextResponse.json({ ok: true, checked, due, notified, duplicated, failed });
}
