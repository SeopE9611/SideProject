"use client";

import AsyncState from "@/components/system/AsyncState";
import { StackedCardListSkeleton } from "@/components/system/loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAnswerStatusBadgeSpec, getQnaCategoryBadgeSpec } from "@/lib/badge-style";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { ArrowRight, Calendar, CheckCircle, Clock, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import useSWRInfinite from "swr/infinite";

type Qna = {
  id: string;
  title: string;
  date: string;
  status: string;
  category: string;
};

type QnaPage = { items: Qna[]; total: number };

const LIMIT = 10;

const fetcher = (url: string) => authenticatedSWRFetcher<QnaPage>(url);

export default function QnAList() {
  // 필터/검색 대비
  // const { statusFilter, categoryFilter, keyword } = useQnaFilters();

  // SWR Infinite 키 생성
  const getKey = (pageIndex: number, previousPageData: QnaPage | null) => {
    // 직전 페이지가 LIMIT 미만이면 다음 페이지 없음
    if (previousPageData && previousPageData.items && previousPageData.items.length < LIMIT)
      return null;

    const page = pageIndex + 1;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(LIMIT));
    // if (statusFilter) params.set('status', statusFilter);
    // if (categoryFilter) params.set('category', categoryFilter);
    // if (keyword) params.set('q', keyword);

    return `/api/qna/me?${params.toString()}`;
  };

  const { data, size, setSize, isValidating, error, mutate } = useSWRInfinite<QnaPage>(
    getKey,
    fetcher,
    {
      revalidateFirstPage: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  // 누적 리스트
  const qnas = useMemo(() => (data ? data.flatMap((d) => d.items) : []), [data]);

  // 더 보기 가능 여부
  const hasMore = useMemo(() => {
    if (!data || data.length === 0) return false;
    const last = data[data.length - 1];
    return (last?.items?.length ?? 0) === LIMIT;
  }, [data]);

  // 에러
  if (error) {
    return (
      <AsyncState kind="error" variant="card" resourceName="문의 내역" onAction={() => mutate()} />
    );
  }

  const isInitialLoading = !data && isValidating;

  // 빈 상태
  if (!isInitialLoading && !isValidating && qnas.length === 0) {
    return (
      <Card className="border-border bg-muted/20 shadow-none">
        <CardContent className="flex flex-col items-center justify-center px-4 py-8 text-center bp-sm:py-10">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card">
            <MessageCircleQuestion className="h-7 w-7 text-muted-foreground" />
          </div>

          <h3 className="text-base font-semibold text-foreground bp-sm:text-lg">
            문의 내역이 없습니다
          </h3>

          <p className="mt-1 break-keep text-sm text-muted-foreground">
            궁금한 점이 있다면 문의를 남겨주세요.
          </p>

          <Button asChild size="sm" variant="default" className="mt-4">
            <Link href="/board/qna/write" className="inline-flex items-center gap-1.5">
              문의하기
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 목록
  return (
    <div className="space-y-4 md:space-y-6">
      {isInitialLoading ? (
        <StackedCardListSkeleton
          count={4}
          cardContentClassName="space-y-4 p-4 md:p-6"
          showLeadingVisual
          titleLineWidthClassName="w-20"
          subtitleLineWidthClassName="w-64"
          badgeWidthClassName="w-16"
          showMetaDivider
          metaLineWidths={["w-28"]}
          actionCount={1}
          actionWidths={["w-20"]}
        />
      ) : null}
      {qnas.map((qna) => (
        <Card
          key={qna.id}
          className="group relative overflow-hidden border border-border bg-card shadow-sm transition-[box-shadow,border-color,background-color,color,opacity] duration-200 hover:border-primary/30 hover:shadow-md"
        >
          <div
            className="absolute inset-0 border border-border/40 bg-secondary/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ padding: "1px" }}
          >
            <div className="h-full w-full bg-card rounded-lg" />
          </div>

          <CardContent className="relative p-4 md:p-6">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/30">
                  <MessageCircleQuestion className="h-6 w-6 text-primary" />
                </div>
                <div>
                  {(() => {
                    const c = getQnaCategoryBadgeSpec(qna.category);
                    return (
                      <Badge variant={c.variant} className="mb-2">
                        {qna.category}
                      </Badge>
                    );
                  })()}
                  <h3 className="line-clamp-2 break-keep font-semibold text-foreground">
                    {qna.title}
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:justify-end">
                {qna.status === "답변 완료" ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <Clock className="h-5 w-5 text-warning" />
                )}
                {(() => {
                  const st = getAnswerStatusBadgeSpec(qna.status === "답변 완료");
                  return <Badge variant={st.variant}>{qna.status}</Badge>;
                })()}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <Calendar className="h-4 w-4" />
                <span>{qna.date}</span>
              </div>

              <Button
                size="sm"
                variant="outline"
                asChild
                className="w-full border-border bg-background transition-colors hover:bg-card sm:w-auto"
              >
                <Link href={`/board/qna/${qna.id}`} className="inline-flex items-center gap-1">
                  상세 보기
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* '더 보기' */}
      <div className="mt-6 flex justify-center items-center">
        {hasMore ? (
          <Button variant="outline" onClick={() => setSize(size + 1)} disabled={isValidating}>
            더 보기
          </Button>
        ) : qnas.length ? (
          <span className="text-sm text-foreground/80">마지막 페이지입니다</span>
        ) : null}
      </div>

      {hasMore && isValidating ? (
        <StackedCardListSkeleton
          count={2}
          cardContentClassName="space-y-4 p-4 md:p-6"
          showLeadingVisual
          titleLineWidthClassName="w-20"
          subtitleLineWidthClassName="w-64"
          badgeWidthClassName="w-16"
          showMetaDivider
          metaLineWidths={["w-28"]}
          actionCount={1}
          actionWidths={["w-20"]}
        />
      ) : null}
    </div>
  );
}
