import type { User } from "@/app/store/authStore";
import { buildReviewWriteHref } from "@/lib/reviews/review-target";

export function isAdminUser(user: User | null | undefined): boolean {
  return Boolean(
    user &&
    ((user as any).role === "admin" ||
      (user as any).role === "ADMIN" ||
      (user as any).isAdmin === true ||
      (Array.isArray((user as any).roles) && (user as any).roles.includes("admin"))),
  );
}

export function buildProductReviewCta({
  productId,
  reviewEligibility,
}: {
  productId: string;
  reviewEligibility: any;
}) {
  const canonicalTarget = reviewEligibility?.nextTarget ?? reviewEligibility?.target ?? null;
  const canWriteFromProductReviewTab = Boolean(
    reviewEligibility?.eligible === true &&
    canonicalTarget &&
    canonicalTarget.eligible === true &&
    canonicalTarget.reviewed === false,
  );

  const productReviewHref = canWriteFromProductReviewTab
    ? buildReviewWriteHref({
        reviewContext: canonicalTarget.reviewContext,
        orderId: canonicalTarget.orderId,
        rentalId: canonicalTarget.rentalId,
        productId: canonicalTarget.primaryProductId,
        applicationId: canonicalTarget.primaryApplicationId ?? canonicalTarget.applicationIds?.[0],
      })
    : `/reviews/write?productId=${productId}${
        reviewEligibility?.suggestedOrderId ? `&orderId=${reviewEligibility.suggestedOrderId}` : ""
      }`;

  const productReviewCtaLabel = reviewEligibility?.targetLabel
    ? `${reviewEligibility.targetLabel} 작성`
    : "후기 작성";

  const productReviewHelper = reviewEligibility?.targetLabel
    ? `${reviewEligibility.targetLabel}를 작성할 수 있습니다.`
    : reviewEligibility?.eligible
      ? "구매확정된 단품 구매 후기를 작성할 수 있습니다."
      : "작성 가능한 이용 내역이 없습니다.";

  return {
    productReviewHref,
    productReviewCtaLabel,
    productReviewHelper,
    canWriteFromProductReviewTab,
  };
}

export function isMineReview(review: any, myReview: any): boolean {
  return Boolean(
    review?.ownedByMe || (myReview && review && String(myReview._id) === String(review._id)),
  );
}

function reviewTime(value: any): number {
  const date = value?.createdAt ?? value?.date;
  const time = date ? new Date(date).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function sortReviewsByCreatedAt(items: any[]) {
  return [...items].sort((a, b) => {
    const byDate = reviewTime(b) - reviewTime(a);
    if (byDate !== 0) return byDate;
    return String(b?._id ?? "").localeCompare(String(a?._id ?? ""));
  });
}

function upsertReviewById(
  items: any[],
  review: any,
  mapReview: (current: any | undefined, review: any) => any,
) {
  const id = String(review?._id ?? "");
  if (!id) return items;

  const index = items.findIndex((item) => String(item?._id ?? "") === id);
  if (index === -1) {
    return [mapReview(undefined, review), ...items];
  }

  const next = [...items];
  next[index] = mapReview(next[index], review);
  return next;
}

export function mergeProductDetailReviews({
  baseReviews,
  myReview,
  isAdmin,
  adminReviews,
}: {
  baseReviews: any[];
  myReview: any;
  isAdmin: boolean;
  adminReviews: any[] | undefined;
}) {
  const base = Array.isArray(baseReviews) ? baseReviews : [];
  let next = base;

  if (myReview && myReview._id) {
    next = upsertReviewById(next, myReview, (current, review) => ({
      ...(current ?? {}),
      _id: review._id,
      user: review.userName ?? current?.user ?? null,
      userName: review.userName ?? current?.userName ?? null,
      rating: review.rating ?? current?.rating ?? 0,
      content: review.content,
      photos: review.photos ?? [],
      createdAt: review.createdAt ?? current?.createdAt ?? null,
      date: review.date ?? current?.date ?? review.createdAt ?? null,
      status: review.status === "hidden" ? "hidden" : "visible",
      authorStatus: review.authorStatus ?? (review.status === "hidden" ? "hidden" : "visible"),
      moderationStatus: review.moderationStatus ?? current?.moderationStatus ?? "visible",
      effectiveStatus:
        review.effectiveStatus ??
        ((review.authorStatus ?? review.status) === "visible" &&
        (review.moderationStatus ?? current?.moderationStatus) !== "hidden"
          ? "visible"
          : "hidden"),
      masked: false,
      ownedByMe: true,
    }));
  }

  if (isAdmin && Array.isArray(adminReviews) && adminReviews.length > 0) {
    for (const raw of adminReviews) {
      next = upsertReviewById(next, raw, (current, review) => ({
        ...(current ?? {}),
        _id: review._id,
        user: review.userName ?? current?.user ?? null,
        userName: review.userName ?? current?.userName ?? null,
        rating: review.rating ?? current?.rating ?? 0,
        content: review.content,
        photos: review.photos ?? [],
        createdAt: review.createdAt ?? current?.createdAt ?? null,
        date: review.date ?? current?.date ?? review.createdAt ?? null,
        status: review.status === "hidden" ? "hidden" : "visible",
        authorStatus: review.authorStatus ?? (review.status === "hidden" ? "hidden" : "visible"),
        moderationStatus: review.moderationStatus ?? current?.moderationStatus ?? "visible",
        effectiveStatus:
          review.effectiveStatus ??
          ((review.authorStatus ?? review.status) === "visible" && review.moderationStatus !== "hidden"
            ? "visible"
            : "hidden"),
        masked: false,
        adminView: true,
      }));
    }
  }

  next = sortReviewsByCreatedAt(next);

  return next;
}
