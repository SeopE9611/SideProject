export function isDuplicateReviewError(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && ("code" in error ? (error as { code?: unknown }).code === 11000 : false),
  );
}

export function isPlainReviewRequestBody(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function getHelpfulReviewBlockReason(
  review: { status?: unknown; moderationStatus?: unknown; userId?: unknown } | null,
  userId: unknown,
) {
  if (!review) return "notFound" as const;
  if (review.status !== "visible" || review.moderationStatus === "hidden") return "reviewNotVisible" as const;
  if (String(review.userId) === String(userId)) return "ownReview" as const;
  return null;
}

export function isValidReviewCursor(
  value: unknown,
  sort: "latest" | "helpful" | "rating",
  isValidId: (id: string) => boolean,
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const cursor = value as Record<string, unknown>;
  if (!isValidId(String(cursor.id ?? ""))) return false;
  if (sort === "latest") {
    const createdAt = cursor.createdAt;
    if (typeof createdAt !== "string" && !(createdAt instanceof Date)) return false;
    const timestamp = createdAt instanceof Date ? createdAt.getTime() : Date.parse(createdAt);
    return !Number.isNaN(timestamp);
  }
  const numericValue = sort === "helpful" ? cursor.helpfulCount : cursor.rating;
  return typeof numericValue === "number" && Number.isFinite(numericValue);
}
