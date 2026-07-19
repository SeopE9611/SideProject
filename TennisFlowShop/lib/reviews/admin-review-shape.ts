import {
  getReviewContextLabel,
  getReviewManagementCategory,
  inferReviewContext,
  type ReviewContext,
} from "./review-target";
import type { AdminReviewListItemDto } from "@/types/admin/reviews";

function asString(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(asString).filter((v): v is string => Boolean(v))));
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    const text = asString(value);
    if (text) return text;
  }
  return null;
}

export function buildAdminReviewSubject(row: Record<string, unknown>, context: ReviewContext) {
  const productName = pickString(
    row.productName,
    row.productTitle,
    row.productNameKo,
    row.productNameResolved,
  );
  const racketName = pickString(
    row.racketName,
    [row.racketBrand, row.racketModel].map(asString).filter(Boolean).join(" "),
  );
  const rentalName = pickString(
    row.rentalName,
    [row.rentalBrand, row.rentalModel].map(asString).filter(Boolean).join(" "),
  );
  const stringName = pickString(row.stringName, row.serviceTargetName);
  if (context === "standalone_stringing")
    return stringName ? `교체서비스 · ${stringName}` : "교체서비스";
  if (context === "rental") return rentalName || racketName || "라켓 대여";
  if (context === "rental_stringing") return rentalName || racketName || "대여·교체서비스";
  if (context === "product_stringing") return productName || racketName || "상품·교체서비스";
  return productName || racketName || "상품 후기";
}

export function shapeAdminReview(
  row: Record<string, unknown>,
  contentLimit?: number,
): AdminReviewListItemDto {
  const reviewContext = inferReviewContext({
    ...row,
    reviewContext: row.resolvedReviewContext ?? row.reviewContext,
  });
  const content = typeof row.content === "string" ? row.content : "";
  const serviceApplicationId = asString(row.serviceApplicationId) ?? asString(row.applicationId);
  const authorStatus = row.status === "hidden" ? "hidden" : "visible";
  const moderationStatus = row.moderationStatus === "hidden" ? "hidden" : "visible";
  const effectiveStatus =
    authorStatus === "visible" && moderationStatus === "visible" ? "visible" : "hidden";
  return {
    _id: String(row._id),
    reviewContext,
    contextLabel: pickString(row.contextLabel) ?? getReviewContextLabel(reviewContext),
    category: getReviewManagementCategory(reviewContext),
    subject: buildAdminReviewSubject(row, reviewContext),
    rating: Number(row.rating ?? 0),
    status: moderationStatus,
    authorStatus,
    moderationStatus,
    effectiveStatus,
    content: typeof contentLimit === "number" ? content.slice(0, contentLimit) : content,
    createdAt: new Date(String(row.createdAt ?? new Date())).toISOString(),
    userEmail: pickString(row.userEmail, row.resolvedUserEmail) ?? undefined,
    userName: pickString(row.userName, row.resolvedUserName) ?? undefined,
    helpfulCount: Number(row.helpfulCount ?? 0),
    photos: stringArray(row.photosPreview ?? row.photos),
    isDeleted: Boolean(row.isDeleted),
    productId: asString(row.productId ?? row.product_id),
    racketId: asString(row.racketId),
    orderId: asString(row.orderId),
    rentalId: asString(row.rentalId),
    serviceApplicationId,
    relatedProductIds: stringArray(row.relatedProductIds),
    relatedRacketIds: stringArray(row.relatedRacketIds),
    reviewType: asString(row.reviewType),
    service: asString(row.service),
  };
}
