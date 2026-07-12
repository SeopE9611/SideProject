import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { deductPoints } from "@/lib/points.service";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import { buildAdminReviewRelationStages } from "@/lib/reviews/admin-review-relations.server";
import { shapeAdminReview } from "@/lib/reviews/admin-review-shape";
import { buildResolvedReviewContextExpression } from "@/lib/reviews/review-context.server";
import { reviewInputMessage, validateReviewPatchInput } from "@/lib/reviews/review-input-policy";
import { refreshReviewSummaryCachesForReviewSafely } from "@/lib/reviews/review-summary-cache.server";

const ALLOWED_HOSTS = new Set<string>(["cwzpxxahtayoyqqskmnt.supabase.co"]);
const ALLOWED_PATH_PREFIXES = ["/storage/v1/object/public/tennis-images/"];
const isAllowedHttpUrl = (v: unknown): v is string => {
  if (typeof v !== "string") return false;
  try {
    const { protocol, hostname, pathname } = new URL(v);
    return (
      (protocol === "https:" || protocol === "http:") &&
      ALLOWED_HOSTS.has(hostname) &&
      ALLOWED_PATH_PREFIXES.some((p) => pathname.startsWith(p))
    );
  } catch {
    return false;
  }
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: "invalid id" }, { status: 400 });

  const db = await getDb();
  const _id = new ObjectId(id);
  const rows = await db
    .collection("reviews")
    .aggregate([
      { $match: { _id } },
      { $addFields: { resolvedReviewContext: buildResolvedReviewContextExpression() } },
      ...buildAdminReviewRelationStages(),
    ])
    .toArray();
  if (!rows[0]) return NextResponse.json({ message: "not found" }, { status: 404 });

  return NextResponse.json(shapeAdminReview(rows[0]));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: "invalid id" }, { status: 400 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ message: "invalid_json" }, { status: 400 });
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json({ message: "validation_error" }, { status: 400 });
  }
  const rawBody = raw as Record<string, unknown>;
  const inputValidation = validateReviewPatchInput(rawBody);
  if (!inputValidation.ok) {
    return NextResponse.json(
      { message: reviewInputMessage(inputValidation.reason), reason: inputValidation.reason },
      { status: 400 },
    );
  }
  if ("photos" in rawBody && !inputValidation.value.photos?.every(isAllowedHttpUrl)) {
    return NextResponse.json(
      { message: reviewInputMessage("invalidPhotos"), reason: "invalidPhotos" },
      { status: 400 },
    );
  }
  const AdminStateSchema = z.object({
    status: z.enum(["visible", "hidden"]).optional(),
    visibility: z.enum(["public", "private"]).optional(),
  });
  const parsed = AdminStateSchema.safeParse(rawBody);
  if (!parsed.success)
    return NextResponse.json(
      { message: "validation_error", details: parsed.error.issues },
      { status: 400 },
    );
  const body = { ...inputValidation.value, ...parsed.data };

  if (
    !("content" in body) &&
    !("rating" in body) &&
    !("status" in body) &&
    !("visibility" in body) &&
    !("photos" in body)
  ) {
    return NextResponse.json({ message: "no changes" }, { status: 400 });
  }

  const db = await getDb();
  const _id = new ObjectId(id);
  const doc = await db
    .collection("reviews")
    .findOne({ _id, isDeleted: { $ne: true } }, { projection: { userId: 1, productId: 1, racketId: 1, relatedProductIds: 1, relatedRacketIds: 1, orderId: 1, rentalId: 1, serviceApplicationId: 1, applicationId: 1, reviewContext: 1, reviewType: 1, service: 1, status: 1 } });
  if (!doc) return NextResponse.json({ message: "not found" }, { status: 404 });

  const $set: any = { updatedAt: new Date() };
  if (typeof body.content === "string") $set.content = body.content.trim();
  if (typeof body.rating === "number") $set.rating = Math.max(1, Math.min(5, body.rating));
  if (body.status === "visible" || body.status === "hidden") $set.status = body.status;
  if (body.visibility) $set.status = body.visibility === "public" ? "visible" : "hidden";
  if (Array.isArray(body.photos)) $set.photos = Array.from(new Set<string>(body.photos.map((s) => s.trim())));
  if (Object.keys($set).length === 1)
    return NextResponse.json({ message: "no changes" }, { status: 400 });

  await db.collection("reviews").updateOne({ _id }, { $set });
  if (body.rating !== undefined || body.status || body.visibility)
    await refreshReviewSummaryCachesForReviewSafely(db, doc, "PATCH /api/admin/reviews/[id]");

  await appendAdminAudit(
    guard.db,
    {
      type: "admin.reviews.patch",
      actorId: guard.admin._id,
      targetId: _id,
      message: "후기 정보 수정",
      diff: { fields: Object.keys($set) },
    },
    req,
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: "invalid id" }, { status: 400 });

  const db = await getDb();
  const _id = new ObjectId(id);
  const doc = await db
    .collection("reviews")
    .findOne({ _id, isDeleted: { $ne: true } }, { projection: { userId: 1, productId: 1, racketId: 1, relatedProductIds: 1, relatedRacketIds: 1, orderId: 1, rentalId: 1, serviceApplicationId: 1, applicationId: 1, reviewContext: 1, reviewType: 1, service: 1, status: 1 } });
  if (!doc) return NextResponse.json({ message: "not found" }, { status: 404 });

  await db
    .collection("reviews")
    .updateOne({ _id }, { $set: { isDeleted: true, deletedAt: new Date(), status: "hidden" } });

  try {
    const earnRefKey = `review:${id}`;
    const earned: any = await db.collection("points_transactions").findOne(
      {
        userId: doc.userId,
        status: "confirmed",
        type: { $in: ["review_reward_product", "review_reward_service"] },
        $or: [{ refKey: earnRefKey }, { "ref.reviewId": _id }],
      },
      { projection: { amount: 1, type: 1 } },
    );
    if (earned?.amount > 0) {
      await deductPoints(db, {
        userId: doc.userId,
        amount: Number(earned.amount),
        type: earned.type,
        status: "confirmed",
        refKey: `${earnRefKey}:revoke`,
        ref: { reviewId: _id },
        reason: "리뷰 삭제로 인한 적립 회수",
        allowNegativeBalance: true,
      });
    }
  } catch (e) {
    console.error("[admin/reviews] deductPoints failed (delete)", e);
  }

  await refreshReviewSummaryCachesForReviewSafely(db, doc, "DELETE /api/admin/reviews/[id]");
  await appendAdminAudit(
    guard.db,
    {
      type: "admin.reviews.delete",
      actorId: guard.admin._id,
      targetId: _id,
      message: "후기 삭제 처리",
    },
    req,
  );

  return NextResponse.json({ ok: true });
}
