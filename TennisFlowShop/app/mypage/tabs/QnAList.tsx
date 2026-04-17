"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AsyncState from "@/components/system/AsyncState";
import { StackedCardListSkeleton } from "@/components/system/loading";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  MessageCircleQuestion,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import useSWRInfinite from "swr/infinite";
import {
  getAnswerStatusBadgeSpec,
  getQnaCategoryBadgeSpec,
} from "@/lib/badge-style";

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
    if (
      previousPageData &&
      previousPageData.items &&
      previousPageData.items.length < LIMIT
    )
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
  const qnas = useMemo(
    () => (data ? data.flatMap((d) => d.items) : []),
    [data],
  );

  // 더 보기 가능 여부
  const hasMore = useMemo(() => {
    if (!data || data.length === 0) return false;
    const last = data[data.length - 1];
    return (last?.items?.length ?? 0) === LIMIT;
  }, [data]);

  // 에러
  if (error) {
    return (
      <AsyncState
        kind="error"
        variant="card"
        resourceName="문의 내역"
        onAction={() => mutate()}
      />
    );
  }

  const isInitialLoading = !data && isValidating;

  // 빈 상태
  if (!isInitialLoading && !isValidating && qnas.length === 0) {
    return (
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-8 text-center md:p-12">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-border bg-secondary md:mb-6">
            <MessageCircleQuestion className="h-10 w-10 text-primary" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">
            문의 내역이 없습니다
          </h3>
          <p className="mb-4 text-foreground md:mb-6">
            궁금한 점이 있으시면 언제든지 문의해주세요!
          </p>
          <Button
            asChild
            variant="default" className="shadow-sm"
          >
            <Link
              href="/board/qna/write"
              className="inline-flex items-center gap-2"
            >
              문의하기
              <ArrowRight className="h-4 w-4" />
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
          className="group relative overflow-hidden border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div
            className="absolute inset-0 border border-border/40 bg-secondary/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ padding: "1px" }}
          >
            <div className="h-full w-full bg-card rounded-lg" />
          </div>

          <CardContent className="relative p-4 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
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
                  <h3 className="font-semibold text-foreground line-clamp-2">
                    {qna.title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {qna.status === "답변 완료" ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <Clock className="h-5 w-5 text-warning" />
                )}
                {(() => {
                  const st = getAnswerStatusBadgeSpec(
                    qna.status === "답변 완료",
                  );
                  return <Badge variant={st.variant}>{qna.status}</Badge>;
                })()}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/60 dark:border-border/60">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{qna.date}</span>
              </div>

              <Button
                size="sm"
                variant="outline"
                asChild
                className="border-border bg-background transition-colors hover:bg-card"
              >
                <Link
                  href={`/board/qna/${qna.id}`}
                  className="inline-flex items-center gap-1"
                >
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
          <Button
            variant="outline"
            onClick={() => setSize(size + 1)}
            disabled={isValidating}
          >
            더 보기
          </Button>
        ) : qnas.length ? (
          <span className="text-sm text-muted-foreground">
            마지막 페이지입니다
          </span>
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
