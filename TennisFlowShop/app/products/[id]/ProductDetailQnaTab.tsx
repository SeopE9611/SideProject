import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  badgeBaseOutlined,
  badgeSizeSm,
  getAnswerStatusBadgeSpec,
  getQnaCategoryBadgeSpec,
} from "@/lib/badge-style";
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
    <>
      <div className="mb-5 flex min-w-0 flex-wrap items-center justify-between gap-3 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 sm:w-12 h-10 sm:h-12 bg-muted/30 text-foreground rounded-lg flex items-center justify-center">
            <MessageSquare className="h-4 w-4 sm:h-6 sm:w-6" />
          </div>
          <h3 className="break-keep text-ui-section-title font-semibold leading-tight text-foreground sm:text-ui-page-title">
            {title}
          </h3>
        </div>
        <Button
          asChild
          variant="secondary"
          className="text-ui-label sm:text-ui-body-sm h-9 sm:h-10"
        >
          <Link href={qnaWriteHref}>문의하기</Link>
        </Button>
      </div>

      {qnaLoading && (
        <div className="py-1">
          <Skeleton className="h-4 w-20" />
        </div>
      )}
      {qnaError && (
        <div className="text-ui-body-sm text-destructive">문의 목록을 불러오지 못했습니다.</div>
      )}

      {!qnaLoading && !qnaError && (
        <>
          {qnas.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-10 text-center sm:rounded-2xl sm:px-6 sm:py-14">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card sm:mb-5 sm:h-14 sm:w-14">
                <MessageSquare className="h-6 w-6 text-foreground sm:h-7 sm:w-7" />
              </div>
              <h4 className="text-ui-card-title-lg sm:text-ui-section-title font-semibold text-foreground mb-2">
                아직 문의가 없습니다
              </h4>
              <p className="text-muted-foreground mb-6 text-ui-body sm:text-ui-card-title-lg">
                첫 번째 문의를 남겨보세요!
              </p>
              <Button
                asChild
                variant="secondary"
                className="px-6 sm:px-8 py-2 sm:py-3 text-ui-body-sm sm:text-ui-body"
              >
                <Link href={qnaWriteHref}>문의하기</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {qnas.map((q: any) => (
                <Link key={q._id} href={`/board/qna/${q._id}`}>
                  <Card className="rounded-xl border-border shadow-none transition-[background-color,color,border-color,box-shadow,opacity] duration-200 hover:bg-muted/30 hover:shadow-sm sm:rounded-2xl">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex min-w-0 items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <Badge
                                variant={getQnaCategoryBadgeSpec(q.category).variant}
                                className={`${badgeBaseOutlined} ${badgeSizeSm}`}
                              >
                                {q.category ?? "상품문의"}
                              </Badge>
                              {q.isSecret && (
                                <Badge
                                  variant="outline"
                                  className={`${badgeBaseOutlined} ${badgeSizeSm} bg-muted/50 text-muted-foreground border-border/40 dark:border-border shrink-0`}
                                >
                                  <Lock className="h-3 w-3 mr-1" />
                                  비밀글
                                </Badge>
                              )}
                              <Badge
                                variant={getAnswerStatusBadgeSpec(!!q.answer).variant}
                                className={`${badgeBaseOutlined} ${badgeSizeSm} shrink-0`}
                              >
                                {q.answer ? "답변 완료" : "답변 대기"}
                              </Badge>
                            </div>
                            <div className="line-clamp-2 min-w-0 break-keep break-words text-ui-body-sm font-semibold leading-relaxed text-foreground hover:text-foreground sm:text-ui-body">
                              {q.title}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ui-body-sm text-muted-foreground sm:gap-x-4">
                              <span>{q.authorName ?? "익명"}</span>
                              <span>{fmtDate(q.createdAt)}</span>
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
    </>
  );
}
