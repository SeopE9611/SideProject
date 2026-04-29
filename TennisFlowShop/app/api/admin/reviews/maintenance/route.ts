import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import {
  ensureReviewIndexes,
  dedupActiveReviews,
  rebuildProductRatingSummary,
} from "@/lib/reviews.maintenance";

type MaintAction =
  | "createIndexes"
  | "dedup"
  | "rebuildSummary"
  | "all"
  | undefined;

// 공통: 관리자 토큰 체크
export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const db = await getDb();
  const locks = db.collection("admin_locks");

  const now = new Date();
  const until = new Date(now.getTime() + 5 * 60 * 1000);

  // 2) 락 획득: 만료되었거나 없는 경우에만 갱신/업서트
  try {
    const res = await locks.updateOne(
      {
        key: "reviews_maintenance",
        $or: [
          { lockedUntil: { $lte: now } },
          { lockedUntil: { $exists: false } },
        ],
      },
      {
        $setOnInsert: { key: "reviews_maintenance" },
        $set: { lockedUntil: until },
      },
      { upsert: true },
    );
    // res가 매치/업서트 둘 다 못했으면 락 실패로 간주
    if (res.matchedCount === 0 && !res.upsertedId) {
      return NextResponse.json({ message: "locked" }, { status: 423 });
    }
  } catch (e: any) {
    // 이미 존재(=누가 선점)해서 업서트가 중복키로 실패하는 경우 → 잠김
    if (e?.code === 11000) {
      return NextResponse.json({ message: "locked" }, { status: 423 });
    }
    // 그 외 에러 전파
    throw e;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action as
      | "createIndexes"
      | "dedup"
      | "rebuildSummary"
      | "all"
      | undefined;

    const result: any = {};
    if (!action || action === "createIndexes" || action === "all") {
      await ensureReviewIndexes(db);
      result.createIndexes = "ok";
    }
    if (!action || action === "dedup" || action === "all") {
      result.dedup = await dedupActiveReviews(db);
    }
    if (!action || action === "rebuildSummary" || action === "all") {
      result.rebuildSummary = await rebuildProductRatingSummary(db);
    }

    const dedupResult =
      result.dedup && typeof result.dedup === "object" ? result.dedup : {};
    const rebuildResult =
      result.rebuildSummary && typeof result.rebuildSummary === "object"
        ? result.rebuildSummary
        : {};
    const affectedCount =
      Number((dedupResult as any).affectedCount ?? 0) +
      Number((rebuildResult as any).affectedCount ?? 0);
    await appendAdminAudit(
      guard.db,
      {
        type: "review.maintenance.run",
        actorId: guard.admin._id,
        message: "리뷰 maintenance 실행",
        diff: {
          targetType: "reviewMaintenance",
          targetScope: "reviews.maintenance",
          before: {
            affectedCountPreview: affectedCount,
          },
          after: {
            affectedCount,
            fixedCount: Number((dedupResult as any).fixedCount ?? 0),
            deletedCount: Number((dedupResult as any).deletedCount ?? 0),
            skippedCount: Number((dedupResult as any).skippedCount ?? 0),
          },
          metadata: {
            mode: action ?? "all",
            actor: {
              id: String(guard.admin._id),
              email: guard.admin.email ?? null,
              name: guard.admin.name ?? null,
              role: guard.admin.role ?? "admin",
            },
            dryRun: false,
            criteria: { lockKey: "reviews_maintenance" },
            resultKeys: Object.keys(result),
          },
        },
      },
      req,
    );

    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unknown" },
      { status: 500 },
    );
  } finally {
    // 3) 락 해제
    await locks.updateOne(
      { key: "reviews_maintenance" },
      { $set: { lockedUntil: new Date(0) } },
      { upsert: true },
    );
  }
}
/**
 * GET  /api/admin/reviews/maintenance
 * 현재 락 상태 조회 (운영자 확인용)
 */
export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const db = await getDb();
  const locks = db.collection("admin_locks");
  const doc = await locks.findOne({ key: "reviews_maintenance" });
  const now = new Date();
  const locked = !!doc && doc.lockedUntil && doc.lockedUntil > now;
  return NextResponse.json({
    locked,
    lockedUntil: doc?.lockedUntil ?? null,
    startedAt: doc?.startedAt ?? null,
  });
}

/**
 * DELETE /api/admin/reviews/maintenance
 * 강제 해제 (stuck시 관리자 수동 풀기)
 */
export async function DELETE(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const db = await getDb();
  const locks = db.collection("admin_locks");
  await locks.updateOne(
    { key: "reviews_maintenance" },
    { $set: { lockedUntil: new Date(0) } },
  );
  await appendAdminAudit(
    guard.db,
    {
      type: "review.maintenance.delete",
      actorId: guard.admin._id,
      message: "리뷰 maintenance 락 강제 해제",
      diff: {
        targetType: "reviewMaintenance",
        targetScope: "reviews.maintenance",
        after: {
          affectedCount: 1,
          fixedCount: 0,
          deletedCount: 0,
          skippedCount: 0,
        },
        metadata: {
          mode: "force_unlock",
          actor: {
            id: String(guard.admin._id),
            email: guard.admin.email ?? null,
            name: guard.admin.name ?? null,
            role: guard.admin.role ?? "admin",
          },
          dryRun: false,
          criteria: { lockKey: "reviews_maintenance" },
        },
      },
    },
    req,
  );
  return NextResponse.json({ ok: true });
}
