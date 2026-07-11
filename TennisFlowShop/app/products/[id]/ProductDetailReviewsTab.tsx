import ProductReviewCard from "./ProductReviewCard";
import {
  ProductDetailReviewsEmptyState,
  ProductDetailReviewsHeader,
} from "./ProductDetailReviewParts";

type ProductDetailReviewsTabProps = {
  mergedReviews: any[];
  busyReviewId: string | null;
  isAdmin: boolean;
  canWriteFromProductReviewTab: boolean;
  productReviewHref: string;
  productReviewCtaLabel: string;
  productReviewHelper: string;
  onToggleReviewVisibility: (review: any) => void | Promise<void>;
  onDeleteReview: (review: any) => void | Promise<void>;
  onEditReview: (review: any) => void;
  onOpenReviewPhoto: (photos: string[], index: number) => void;
};

export default function ProductDetailReviewsTab({
  mergedReviews,
  busyReviewId,
  isAdmin,
  canWriteFromProductReviewTab,
  productReviewHref,
  productReviewCtaLabel,
  productReviewHelper,
  onToggleReviewVisibility,
  onDeleteReview,
  onEditReview,
  onOpenReviewPhoto,
}: ProductDetailReviewsTabProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <ProductDetailReviewsHeader
        canWriteFromProductReviewTab={canWriteFromProductReviewTab}
        productReviewHref={productReviewHref}
        productReviewCtaLabel={productReviewCtaLabel}
        productReviewHelper={productReviewHelper}
      />

      <div className="space-y-4 sm:space-y-6">
        {mergedReviews.length > 0 ? (
          mergedReviews.map((review: any, index: number) => {
            const isMasked =
              review.masked ??
              (review.status === "hidden" && !review.ownedByMe && !review.adminView);

            return (
              <ProductReviewCard
                key={String(review._id ?? index)}
                review={review}
                isBusy={busyReviewId === String(review._id)}
                isMasked={isMasked}
                canManage={review.ownedByMe || isAdmin}
                onToggleVisibility={() => onToggleReviewVisibility(review)}
                onEdit={() => onEditReview(review)}
                onDelete={() => onDeleteReview(review)}
                onOpenPhoto={(photoIndex) => onOpenReviewPhoto(review.photos, photoIndex)}
              />
            );
          })
        ) : (
          <ProductDetailReviewsEmptyState
            canWriteFromProductReviewTab={canWriteFromProductReviewTab}
            productReviewHref={productReviewHref}
            productReviewCtaLabel={productReviewCtaLabel}
            productReviewHelper={productReviewHelper}
          />
        )}
      </div>
    </div>
  );
}
