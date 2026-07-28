import { SemanticBadge } from "@/components/badges/SemanticBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnswerStatusBadgeSpec, getQnaCategoryBadgeSpec } from "@/lib/badge-style";
import { Lock, MessageSquare } from "lucide-react";
import Link from "next/link";
import { fmtDate } from "./ProductDetailClient.utils";

type ProductDetailQnaTabProps = {
  productId: string;
  productName: string;
  qnas: any[];
  qnaLoading: boolean;
  qnaError: unknown;
  targetType?: "product" | "racket";
};

export default function ProductDetailQnaTab({
  productId,
  productName,
  qnas,
  qnaLoading,
  qnaError,
  targetType = "product",
}: ProductDetailQnaTabProps) {
  const qnaWriteHref = `/board/qna/write?productId=${productId}&productName=${encodeURIComponent(productName)}${
    targetType === "racket" ? "&targetType=racket" : ""
  }`;
  const title = targetType === "racket" ? "라켓 문의" : "상품 문의";

  return (
    <div className="space-y-4 bp-sm:space-y-6">
      <div className="flex min-w-0 flex-col gap-3 bp-md:flex-row bp-md:items-start bp-md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/30 text-primary bp-sm:h-12 bp-sm:w-12">
            <MessageSquare className="h-4 w-4 bp-sm:h-6 bp-sm:w-6" aria-hidden="true" />
          </div>
          <h3 className="break-keep text-ui-section-title font-ui-bold leading-tight text-foreground bp-sm:text-ui-page-title">
            {title}
          </h3>
        </div>
        <div className="flex w-full min-w-0 flex-col items-start gap-1 bp-md:w-auto bp-md:items-end">
          <Button
            asChild
            variant="secondary"
            className="h-11 min-h-11 w-full text-ui-body-sm bp-md:h-10 bp-md:min-h-10 bp-md:w-auto"
          >
            <Link href={qnaWriteHref}>문의하기</Link>
          </Button>
          <p className="max-w-sm break-keep text-ui-label text-muted-foreground bp-md:text-right">
            궁금한 점을 남겨주시면 확인 후 답변해 드립니다.
          </p>
        </div>
      </div>

      {qnaLoading && (
        <div
          className="-mx-4 divide-y divide-border/60 border-y border-border/60 bp-sm:-mx-6 bp-md:mx-0 bp-md:space-y-4 bp-md:divide-y-0 bp-md:border-y-0"
          role="status"
          aria-label="문의 목록 불러오는 중"
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="p-4 bp-sm:p-5 bp-md:rounded-2xl bp-md:border bp-md:border-border bp-md:p-6"
              aria-hidden="true"
            >
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="mt-3 h-5 w-4/5" />
              <div className="mt-3 flex gap-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      )}
      {!!qnaError && (
        <div
          className="-mx-4 border-y border-border/60 px-4 py-8 text-center text-ui-body-sm text-destructive bp-sm:-mx-6 bp-sm:px-6 bp-md:mx-0 bp-md:rounded-2xl bp-md:border bp-md:bg-muted/30 bp-md:px-6 bp-md:py-12"
          role="alert"
        >
          문의 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      )}

      {!qnaLoading && !qnaError && (
        <>
          {qnas.length === 0 ? (
            <div className="-mx-4 border-y border-border/60 px-4 py-8 text-center bp-sm:-mx-6 bp-sm:px-6 bp-md:mx-0 bp-md:rounded-2xl bp-md:border bp-md:bg-muted/30 bp-md:px-6 bp-md:py-12">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card bp-sm:mb-5 bp-sm:h-14 bp-sm:w-14">
                <MessageSquare className="h-6 w-6 text-foreground bp-sm:h-7 bp-sm:w-7" aria-hidden="true" />
              </div>
              <h4 className="mb-2 text-ui-card-title-lg font-ui-bold text-foreground bp-sm:text-ui-section-title">
                아직 문의가 없습니다
              </h4>
              <p className="break-keep text-ui-body-sm text-muted-foreground bp-sm:text-ui-body">
                궁금한 점이 있다면 상단의 문의하기 버튼을 이용해 주세요.
              </p>
            </div>
          ) : (
            <div className="-mx-4 divide-y divide-border/60 border-y border-border/60 bp-sm:-mx-6 bp-md:mx-0 bp-md:space-y-4 bp-md:divide-y-0 bp-md:border-y-0">
              {qnas.map((q: any) => (
                <Link
                  key={q._id}
                  href={`/board/qna/${q._id}`}
                  className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring bp-md:rounded-2xl"
                  aria-label={`${q.title ?? "문의"} 문의 상세 보기`}
                >
                  <Card className="rounded-none border-0 bg-card shadow-none transition-colors group-hover:bg-muted/30 group-focus-visible:bg-muted/30 bp-md:rounded-2xl bp-md:border bp-md:border-border">
                    <CardContent className="p-4 bp-sm:p-5 bp-md:p-6">
                      <div className="flex min-w-0 items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 bp-sm:gap-2">
                              <SemanticBadge tone={getQnaCategoryBadgeSpec(q.category).tone}>
                                {q.category ?? "상품문의"}
                              </SemanticBadge>
                              {q.isSecret && (
                                <SemanticBadge tone="neutral" emphasis="outline">
                                  <Lock className="mr-1 h-3 w-3" aria-hidden="true" />
                                  비밀글
                                </SemanticBadge>
                              )}
                              <SemanticBadge tone={getAnswerStatusBadgeSpec(!!q.answer).tone}>
                                {q.answer ? "답변 완료" : "답변 대기"}
                              </SemanticBadge>
                            </div>
                            <div className="line-clamp-2 min-w-0 break-keep break-words text-ui-body-sm font-ui-medium leading-relaxed text-foreground bp-sm:text-ui-body">
                              {q.title}
                            </div>
                            <div className="flex min-w-0 items-center gap-2 text-ui-body-sm text-muted-foreground">
                              <span className="min-w-0 truncate">{q.authorName ?? "익명"}</span>
                              {q.createdAt && (
                                <>
                                  <span className="shrink-0" aria-hidden="true">·</span>
                                  <span className="shrink-0">{fmtDate(q.createdAt)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
