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
  productReviewHelper: string;
};

export function ProductReviewRatingStars({ rating }: ProductReviewRatingStarsProps) {
  return (
    <div className="flex items-center gap-1" role="img" aria-label={`${rating ?? 0}점`}>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={`h-3 w-3 bp-sm:h-4 bp-sm:w-4 ${i < (rating ?? 0) ? "text-warning fill-current" : "fill-transparent text-muted-foreground stroke-current"}`}
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
    <div className="flex min-w-0 flex-col gap-3 bp-md:flex-row bp-md:items-start bp-md:justify-between">
      <div className="flex min-w-0 items-center">
        <h3 className="break-keep text-ui-section-title font-ui-bold leading-tight text-foreground bp-sm:text-ui-page-title">
          고객 후기
        </h3>
      </div>
      <div className="flex w-full min-w-0 flex-col items-start gap-1 bp-md:w-auto bp-md:items-end">
        <Button
          asChild={canWriteFromProductReviewTab}
          variant="secondary"
          disabled={!canWriteFromProductReviewTab}
          className="h-11 min-h-11 w-full text-ui-body-sm bp-md:h-10 bp-md:min-h-10 bp-md:w-auto"
        >
          {canWriteFromProductReviewTab ? (
            <Link href={productReviewHref}>
              <Pencil
                className="mr-1.5 h-3 w-3 bp-sm:mr-2 bp-sm:h-4 bp-sm:w-4"
                aria-hidden="true"
              />
              {productReviewCtaLabel}
            </Link>
          ) : (
            <span className="inline-flex items-center">
              <Pencil
                className="mr-1.5 h-3 w-3 bp-sm:mr-2 bp-sm:h-4 bp-sm:w-4"
                aria-hidden="true"
              />
              후기 작성
            </span>
          )}
        </Button>
        <p className="max-w-sm break-keep text-ui-label text-muted-foreground bp-md:text-right">
          {productReviewHelper}
        </p>
      </div>
    </div>
  );
}

export function ProductDetailReviewsEmptyState({
  productReviewHelper,
}: ProductDetailReviewsEmptyStateProps) {
  return (
    <div className="-mx-4 border-y border-border/60 px-4 py-8 text-center bp-sm:-mx-6 bp-sm:px-6 bp-md:mx-0 bp-md:rounded-2xl bp-md:border bp-md:bg-muted/30 bp-md:px-6 bp-md:py-12">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card bp-sm:mb-5 bp-sm:h-14 bp-sm:w-14">
        <Star
          className="h-6 w-6 text-foreground bp-sm:h-7 bp-sm:w-7"
          aria-hidden="true"
        />
      </div>
      <h3 className="mb-2 text-ui-card-title-lg font-ui-bold text-foreground bp-sm:text-ui-section-title">
        아직 등록된 후기가 없습니다
      </h3>
      <p className="break-keep text-ui-body-sm text-muted-foreground bp-sm:text-ui-body">
        {productReviewHelper}
      </p>
    </div>
  );
}
