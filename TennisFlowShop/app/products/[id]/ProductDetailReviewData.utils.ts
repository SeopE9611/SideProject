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
  const productReviewHref = reviewEligibility?.reviewContext
    ? buildReviewWriteHref({
        reviewContext: reviewEligibility.reviewContext,
        productId: reviewEligibility.suggestedProductId ?? productId,
        orderId: reviewEligibility.suggestedOrderId,
        applicationId: reviewEligibility.suggestedApplicationId,
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

  const canWriteFromProductReviewTab = Boolean(
    reviewEligibility?.eligible || reviewEligibility?.suggestedApplicationId,
  );

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

  // 내 리뷰 덮어쓰기 (있을 때만)
  if (myReview && myReview._id) {
    const i = next.findIndex((r: any) => String(r._id) === String(myReview._id));
    if (i !== -1) {
      next = [...next];
      next[i] = {
        ...next[i],
        user: myReview.userName ?? next[i].user, // UI에서 쓰는 user 필드 보강
        content: myReview.content,
        photos: myReview.photos ?? [],
        masked: false, // 본인 뷰는 언마스크
        ownedByMe: true,
        status: myReview.status, // hidden/visible 그대로 유지
      };
    }
  }

  // 관리자면 표시 중인 항목 범위에서 원문으로 덮어쓰기
  if (isAdmin && Array.isArray(adminReviews) && adminReviews.length > 0) {
    const map = new Map(adminReviews.map((r: any) => [String(r._id), r]));
    next = next.map((r: any) => {
      const raw = map.get(String(r._id));
      if (!raw) return r;
      return {
        ...r,
        // admin API의 필드를 화면 필드로 매핑
        user: raw.userName ?? r.user,
        content: raw.content,
        photos: raw.photos ?? [],
        status: raw.status,
        masked: false, // 관리자 뷰는 언마스크
        adminView: true,
      };
    });
  }

  return next;
}
