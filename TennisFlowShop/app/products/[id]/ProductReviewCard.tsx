import Image from "next/image";
import MaskedBlock from "@/components/reviews/MaskedBlock";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, EyeOff, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { ProductReviewRatingStars } from "./ProductDetailReviewParts";

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
  return (
    <Card className="rounded-xl border border-border bg-card shadow-none sm:rounded-2xl">
      <CardContent className="relative p-4 sm:p-6">
        {isBusy && (
          <div className="absolute inset-0 bg-card/70 dark:bg-background/40 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="ml-2 text-ui-body-sm">변경 중...</span>
          </div>
        )}

        <div className="mb-3 flex min-w-0 flex-wrap items-start justify-between gap-3 sm:mb-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="w-10 h-10 bg-secondary border border-border/60 rounded-full flex items-center justify-center text-foreground font-semibold text-ui-card-title-lg shadow-sm">
              {review.user?.charAt(0) || "U"}
            </div>
            <div className="min-w-0">
              <div className="break-words font-semibold text-foreground text-ui-body-sm sm:text-ui-body">
                {review.type === "service"
                  ? "상품·교체서비스 후기"
                  : review.status === "hidden"
                    ? review.ownedByMe
                      ? `${review.user ?? "내 리뷰"} (비공개)`
                      : review.adminView
                        ? `${review.user ?? "사용자"} (비공개)`
                        : "비공개 리뷰"
                    : (review.user ?? "익명")}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <ProductReviewRatingStars rating={review.rating} />
                <span className="text-ui-label sm:text-ui-body-sm text-muted-foreground">
                  {review.date || "2099-01-01"}
                </span>
              </div>
            </div>
          </div>

          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted/50 hover:text-foreground transition-colors"
                  aria-label="내 리뷰 관리"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
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
                  {review.status === "visible" ? (
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
          <div className="space-y-3 sm:space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-3 sm:p-4">
              <p className="break-keep break-words text-ui-body-sm leading-relaxed text-muted-foreground sm:text-ui-body">
                {review.content}
              </p>
            </div>

            {Array.isArray(review.photos) && review.photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {review.photos.slice(0, 4).map((src: string, i: number) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onOpenPhoto(i)}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border transition-colors hover:border-foreground/40 sm:h-20 sm:w-20"
                    aria-label={`리뷰 사진 ${i + 1} 크게 보기`}
                  >
                    <Image
                      src={src || "/placeholder.svg"}
                      alt={`리뷰 사진 ${i + 1}`}
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
