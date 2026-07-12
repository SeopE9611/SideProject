import "server-only";

import type { Db, ObjectId } from "mongodb";

import { extractReviewPhotoSessionObject } from "@/lib/reviews/review-photo-storage.server";

export type ReviewPhotoUploadSessionStatus = "active" | "committing" | "committed";

export type ReviewPhotoUploadSessionDocument = {
  _id: string;
  userId: ObjectId;
  status: ReviewPhotoUploadSessionStatus;
  createdAt: Date;
  expiresAt: Date;
  committingAt: Date | null;
  committedAt: Date | null;
};

export type ReviewPhotoUploadSessionFailureReason =
  | "uploadSessionRequired"
  | "uploadSessionNotFound"
  | "uploadSessionExpired"
  | "uploadSessionForbidden"
  | "uploadSessionInvalidState"
  | "photoSessionMismatch";

export function getReviewPhotoUploadSessionCollection(db: Db) {
  return db.collection<ReviewPhotoUploadSessionDocument>("review_photo_upload_sessions");
}

export async function validateAndClaimReviewPhotoUploadSession({
  db,
  userId,
  uploadSessionId,
  urls,
}: {
  db: Db;
  userId: ObjectId;
  uploadSessionId: string | null | undefined;
  urls: string[];
}): Promise<
  | { ok: true; session: ReviewPhotoUploadSessionDocument }
  | { ok: false; reason: ReviewPhotoUploadSessionFailureReason }
> {
  if (!urls.length) return { ok: false, reason: "uploadSessionRequired" };
  if (!uploadSessionId) return { ok: false, reason: "uploadSessionRequired" };

  const sessions = getReviewPhotoUploadSessionCollection(db);
  const session = await sessions.findOne({ _id: uploadSessionId });
  if (!session) return { ok: false, reason: "uploadSessionNotFound" };
  if (String(session.userId) !== String(userId)) return { ok: false, reason: "uploadSessionForbidden" };
  if (!(session.expiresAt instanceof Date) || session.expiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: "uploadSessionExpired" };
  }
  if (session.status !== "active") return { ok: false, reason: "uploadSessionInvalidState" };
  if (urls.some((url) => !extractReviewPhotoSessionObject(url, uploadSessionId))) {
    return { ok: false, reason: "photoSessionMismatch" };
  }

  const claim = await sessions.updateOne(
    { _id: uploadSessionId, userId, status: "active", expiresAt: { $gt: new Date() } },
    { $set: { status: "committing", committingAt: new Date() } },
  );
  if (claim.matchedCount !== 1) return { ok: false, reason: "uploadSessionInvalidState" };

  return { ok: true, session: { ...session, status: "committing", committingAt: new Date() } };
}

export async function markReviewPhotoUploadSessionCommitted(db: Db, userId: ObjectId, uploadSessionId: string | null | undefined) {
  if (!uploadSessionId) return;
  await getReviewPhotoUploadSessionCollection(db).updateOne(
    { _id: uploadSessionId, userId, status: "committing" },
    { $set: { status: "committed", committedAt: new Date() } },
  );
}

export async function rollbackReviewPhotoUploadSessionClaim(db: Db, userId: ObjectId, uploadSessionId: string | null | undefined) {
  if (!uploadSessionId) return;
  await getReviewPhotoUploadSessionCollection(db).updateOne(
    { _id: uploadSessionId, userId, status: "committing" },
    { $set: { status: "active", committingAt: null } },
  );
}
