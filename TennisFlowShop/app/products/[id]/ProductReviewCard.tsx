import Image from "next/image";
import MaskedBlock from "@/components/reviews/MaskedBlock";
import ReviewContextBadge from "@/components/reviews/ReviewContextBadge";
import ReviewVisibilityBadge from "@/components/reviews/ReviewVisibilityBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, EyeOff, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { ProductReviewRatingStars } from "./ProductDetailReviewParts";
import { getReviewManagedVisibilityStatus } from "@/lib/reviews/review-managed-status";

type ProductReviewCardProps = {
  review: any;
  isBusy: boolean;
  isMasked: boolean;
  canManage: boolean;
  onToggleVisibility: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenPhoto: (index: number) => void;
};

export default function ProductReviewCard({
  review,
  isBusy,
  isMasked,
  canManage,
  onToggleVisibility,
  onEdit,
  onDelete,
  onOpenPhoto,
}: ProductReviewCardProps) {
  const { managedStatus } = getReviewManagedVisibilityStatus(review, Boolean(review.adminView));
  return (
    <Card className="rounded-none border-0 bg-card shadow-none bp-md:rounded-2xl bp-md:border bp-md:border-border">
      <CardContent className="relative p-4 bp-sm:p-5 bp-md:p-6">
        {isBusy && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-none bg-card/70 backdrop-blur-sm dark:bg-background/40 bp-md:rounded-2xl">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="ml-2 text-ui-body-sm">변경 중...</span>
          </div>
        )}

        <div className="mb-3 flex min-w-0 flex-wrap items-start justify-between gap-3 bp-sm:mb-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-secondary text-ui-card-title-lg font-ui-bold text-foreground">
              {review.user?.charAt(0) || "U"}
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="min-w-0 break-words text-ui-body-sm font-ui-medium text-foreground bp-sm:text-ui-body">
                  {review.status === "hidden"
                    ? review.ownedByMe
                      ? (review.user ?? "내 후기")
                      : review.adminView
                        ? (review.user ?? "사용자")
                        : "비공개 후기"
                    : (review.user ?? "익명")}
                </span>
                <ReviewContextBadge
                  reviewContext={review.reviewContext}
                  contextLabel={review.contextLabel}
                />
                {review.status === "hidden" && (review.ownedByMe || review.adminView) && (
                  <ReviewVisibilityBadge />
                )}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <ProductReviewRatingStars rating={review.rating} />
                {review.date ? (
                  <span className="text-ui-label text-muted-foreground bp-sm:text-ui-body-sm">
                    {review.date}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-lg bp-md:h-9 bp-md:w-9"
                  aria-label="후기 관리 메뉴"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {/* 공개/비공개 토글 */}
                <DropdownMenuItem
                  disabled={isBusy}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility();
                  }}
                  className="cursor-pointer"
                >
                  {managedStatus === "visible" ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      비공개로 전환
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      공개로 전환
                    </>
                  )}
                </DropdownMenuItem>

                {/* 수정 */}
                <DropdownMenuItem
                  disabled={isBusy}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="cursor-pointer"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  수정
                </DropdownMenuItem>

                {/* 삭제 */}
                <DropdownMenuItem
                  disabled={isBusy}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {isMasked ? (
          <MaskedBlock />
        ) : (
          <div className="space-y-3 bp-sm:space-y-4">
            <p className="whitespace-pre-line break-keep break-words text-ui-body-sm leading-relaxed text-foreground bp-sm:text-ui-body">
              {review.content}
            </p>

            {Array.isArray(review.photos) && review.photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {review.photos.slice(0, 4).map((src: string, i: number) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onOpenPhoto(i)}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={`후기 사진 ${i + 1} 크게 보기`}
                  >
                    <Image
                      src={src || "/placeholder.svg"}
                      alt={`후기 사진 ${i + 1}`}
                      fill
                      className="object-cover"
                    />
                    {i === 3 && review.photos.length > 4 && (
                      <div className="absolute inset-0 bg-background/80 text-foreground border border-border text-ui-label font-semibold flex items-center justify-center">
                        +{review.photos.length - 3}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
