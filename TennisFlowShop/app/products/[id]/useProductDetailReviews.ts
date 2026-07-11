import { useMemo } from "react";
import useSWR from "swr";
import type { User } from "@/app/store/authStore";
import type { DetailTab } from "./ProductDetailClient.types";
import {
  buildProductReviewCta,
  isMineReview,
  mergeProductDetailReviews,
} from "./ProductDetailReviewData.utils";

type UseProductDetailReviewsParams = {
  activeTab: DetailTab;
  productId: string;
  baseReviews: any[];
  reviewsLen: number;
  user: User | null;
  isAdmin: boolean;
  fetcher: (url: string) => Promise<any>;
};

export function useProductDetailReviews({
  activeTab,
  productId,
  baseReviews,
  reviewsLen,
  user,
  isAdmin,
  fetcher,
}: UseProductDetailReviewsParams) {
  const reviewsCount = reviewsLen || 10;

  const { data: adminReviews, mutate: mutateAdminReviews } = useSWR(
    activeTab === "reviews" && isAdmin
      ? `/api/reviews/admin?productId=${productId}&limit=${reviewsCount}`
      : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const { data: myReview, mutate: mutateMyReview } = useSWR(
    activeTab === "reviews" && user ? `/api/reviews/self?productId=${productId}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const { data: reviewEligibility } = useSWR(
    activeTab === "reviews" && user ? `/api/reviews/eligibility?productId=${productId}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const {
    productReviewHref,
    productReviewCtaLabel,
    productReviewHelper,
    canWriteFromProductReviewTab,
  } = buildProductReviewCta({
    productId,
    reviewEligibility,
  });

  const isMine = (review: any) => isMineReview(review, myReview);

  const mergedReviews = useMemo(
    () =>
      mergeProductDetailReviews({
        baseReviews,
        myReview,
        isAdmin,
        adminReviews,
      }),
    [baseReviews, myReview, isAdmin, adminReviews],
  );

  return {
    mergedReviews,
    productReviewHref,
    productReviewCtaLabel,
    productReviewHelper,
    canWriteFromProductReviewTab,
    mutateMyReview,
    mutateAdminReviews,
    isMine,
  };
}
