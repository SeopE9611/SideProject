import { Button } from "@/components/ui/button";
import { Pencil, Star } from "lucide-react";
import Link from "next/link";

type ProductReviewRatingStarsProps = {
  rating?: number;
};

type ProductDetailReviewsHeaderProps = {
  canWriteFromProductReviewTab: boolean;
  productReviewHref: string;
  productReviewCtaLabel: string;
  productReviewHelper: string;
};

type ProductDetailReviewsEmptyStateProps = {
  canWriteFromProductReviewTab: boolean;
  productReviewHref: string;
  productReviewCtaLabel: string;
  productReviewHelper: string;
};

export function ProductReviewRatingStars({ rating }: ProductReviewRatingStarsProps) {
  return (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 sm:h-4 sm:w-4 ${i < (rating || 5) ? "text-warning fill-current" : "fill-muted text-muted"}`}
        />
      ))}
    </div>
  );
}

export function ProductDetailReviewsHeader({
  canWriteFromProductReviewTab,
  productReviewHref,
  productReviewCtaLabel,
  productReviewHelper,
}: ProductDetailReviewsHeaderProps) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="w-10 sm:w-12 h-10 sm:h-12 bg-muted/30 rounded-lg flex items-center justify-center">
          <Star className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
        </div>
        <h3 className="break-keep text-ui-section-title font-semibold leading-tight text-foreground sm:text-ui-page-title">
          고객 후기
        </h3>
      </div>
      <div className="flex min-w-0 flex-col items-start gap-1 sm:items-end">
        <Button
          asChild={canWriteFromProductReviewTab}
          variant="secondary"
          disabled={!canWriteFromProductReviewTab}
          className="h-9 text-ui-label sm:h-10 sm:text-ui-body-sm"
        >
          {canWriteFromProductReviewTab ? (
            <Link href={productReviewHref}>
              <Pencil className="mr-1.5 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              {productReviewCtaLabel}
            </Link>
          ) : (
            <span className="inline-flex items-center">
              <Pencil className="mr-1.5 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              후기 작성
            </span>
          )}
        </Button>
        <p className="max-w-xs break-keep text-ui-label text-muted-foreground sm:text-right">
          {productReviewHelper}
        </p>
      </div>
    </div>
  );
}

export function ProductDetailReviewsEmptyState({
  canWriteFromProductReviewTab,
  productReviewHref,
  productReviewCtaLabel,
  productReviewHelper,
}: ProductDetailReviewsEmptyStateProps) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-4 py-10 text-center sm:rounded-2xl sm:px-6 sm:py-14">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card sm:mb-5 sm:h-14 sm:w-14">
        <Star className="h-6 w-6 text-foreground sm:h-7 sm:w-7" />
      </div>
      <h3 className="text-ui-card-title-lg sm:text-ui-section-title font-semibold text-foreground mb-2">
        아직 등록된 후기가 없습니다
      </h3>
      <p className="mb-6 text-ui-body text-muted-foreground sm:text-ui-card-title-lg">
        {productReviewHelper}
      </p>
      <Button
        asChild={canWriteFromProductReviewTab}
        variant="secondary"
        disabled={!canWriteFromProductReviewTab}
        className="px-6 py-2 text-ui-body-sm sm:px-8 sm:py-3 sm:text-ui-body"
      >
        {canWriteFromProductReviewTab ? (
          <Link href={productReviewHref}>
            <Pencil className="mr-2 h-4 w-4" />
            {productReviewCtaLabel}
          </Link>
        ) : (
          <span className="inline-flex items-center">
            <Pencil className="mr-2 h-4 w-4" />
            작성 가능한 내역 없음
          </span>
        )}
      </Button>
    </div>
  );
}
