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
import { diffRemovedReviewPhotos, isAllowedReviewPhotoUrl, removeReviewPhotosBestEffort } from "@/lib/reviews/review-photo-storage.server";
import {
  markReviewPhotoUploadSessionCommitted,
  rollbackReviewPhotoUploadSessionClaim,
  validateAndClaimReviewPhotoUploadSession,
} from "@/lib/reviews/review-photo-upload-session.server";

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
  if ("photos" in rawBody && !inputValidation.value.photos?.every(isAllowedReviewPhotoUrl)) {
    return NextResponse.json(
      { message: reviewInputMessage("invalidPhotos"), reason: "invalidPhotos" },
      { status: 400 },
    );
  }
  const AdminStateSchema = z.object({
    status: z.enum(["visible", "hidden"]).optional(),
    moderationStatus: z.enum(["visible", "hidden"]).optional(),
    visibility: z.enum(["public", "private"]).optional(),
  });
  const parsed = AdminStateSchema.safeParse(rawBody);
  if (!parsed.success)
    return NextResponse.json(
      { message: "validation_error", details: parsed.error.issues },
      { status: 400 },
    );
  const body = {
    ...inputValidation.value,
    ...parsed.data,
    uploadSessionId: typeof rawBody.uploadSessionId === "string" ? rawBody.uploadSessionId : null,
  };

  if (
    !("content" in body) &&
    !("rating" in body) &&
    !("status" in body) &&
    !("moderationStatus" in body) &&
    !("visibility" in body) &&
    !("photos" in body)
  ) {
    return NextResponse.json({ message: "no changes" }, { status: 400 });
  }

  const db = await getDb();
  const _id = new ObjectId(id);
  const doc = await db
    .collection("reviews")
    .findOne({ _id, isDeleted: { $ne: true } }, { projection: { userId: 1, productId: 1, racketId: 1, relatedProductIds: 1, relatedRacketIds: 1, orderId: 1, rentalId: 1, serviceApplicationId: 1, applicationId: 1, reviewContext: 1, reviewType: 1, service: 1, status: 1, photos: 1, moderationStatus: 1 } });
  if (!doc) return NextResponse.json({ message: "not found" }, { status: 404 });

  const $set: any = { updatedAt: new Date() };
  if (typeof body.content === "string") $set.content = body.content.trim();
  if (typeof body.rating === "number") $set.rating = Math.max(1, Math.min(5, body.rating));
  const moderationStatus = body.moderationStatus ?? body.status ?? (body.visibility === "public" ? "visible" : body.visibility === "private" ? "hidden" : undefined);
  if (moderationStatus === "hidden") {
    $set.moderationStatus = "hidden";
    $set.moderatedAt = new Date();
    $set.moderatedBy = guard.admin._id;
  } else if (moderationStatus === "visible") {
    $set.moderationStatus = "visible";
    $set.moderatedAt = null;
    $set.moderatedBy = null;
  }
  if (Array.isArray(body.photos)) {
    $set.photos = Array.from(new Set<string>(body.photos.map((s) => s.trim())));
    const previousPhotos = Array.isArray(doc.photos) ? doc.photos.map(String) : [];
    const addedPhotos = $set.photos.filter((url: string) => !previousPhotos.includes(url));
    if (addedPhotos.length > 0) {
      const sessionValidation = await validateAndClaimReviewPhotoUploadSession({
        db,
        userId: guard.admin._id,
        uploadSessionId: body.uploadSessionId,
        urls: addedPhotos,
      });
      if (!sessionValidation.ok) {
        return NextResponse.json(
          { ok: false, reason: sessionValidation.reason, message: sessionValidation.reason },
          { status: sessionValidation.reason === "uploadSessionForbidden" ? 403 : 400 },
        );
      }
    }
  }
  if (Object.keys($set).length === 1)
    return NextResponse.json({ message: "no changes" }, { status: 400 });

  try {
    await db.collection("reviews").updateOne({ _id }, { $set });
  } catch (error) {
    await rollbackReviewPhotoUploadSessionClaim(db, guard.admin._id, body.uploadSessionId);
    throw error;
  }
  await markReviewPhotoUploadSessionCommitted(db, guard.admin._id, body.uploadSessionId);
  if (Array.isArray($set.photos)) {
    await removeReviewPhotosBestEffort(diffRemovedReviewPhotos(doc.photos, $set.photos), "PATCH /api/admin/reviews/[id]");
  }
  if (body.rating !== undefined || moderationStatus)
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
    .findOne({ _id, isDeleted: { $ne: true } }, { projection: { userId: 1, productId: 1, racketId: 1, relatedProductIds: 1, relatedRacketIds: 1, orderId: 1, rentalId: 1, serviceApplicationId: 1, applicationId: 1, reviewContext: 1, reviewType: 1, service: 1, status: 1, photos: 1 } });
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
  await removeReviewPhotosBestEffort(Array.isArray(doc.photos) ? doc.photos : [], "DELETE /api/admin/reviews/[id]");
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
