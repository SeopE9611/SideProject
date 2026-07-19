"use client";

import AsyncState from "@/components/system/AsyncState";
import QnaListSkeleton from "@/app/mypage/tabs/_components/QnaListSkeleton";
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
      <Card
        variant="feature"
        className="relative overflow-hidden border-brand-highlight/25 shadow-soft"
      >
        <CardContent className="flex flex-col items-center justify-center px-4 py-8 text-center bp-sm:py-10 md:py-12">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-highlight-muted text-brand-highlight-ink">
            <MessageCircleQuestion className="h-10 w-10" aria-hidden="true" />
          </div>

          <h3 className="font-brand-heading text-ui-section-title font-semibold text-foreground">
            아직 문의 내역이 없습니다.
          </h3>

          <p className="mt-2 max-w-md break-keep text-ui-body-sm text-muted-foreground">
            상품, 주문, 서비스 이용 중 궁금한 점을 남기면 답변 상태를 이곳에서 확인할 수 있습니다.
          </p>

          <Button asChild size="sm" variant="highlight" wrap="responsive" className="mt-5">
            <Link href="/board/qna/write">
              문의하기
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 목록
  return (
    <div className="space-y-4 md:space-y-6">
      {isInitialLoading ? <QnaListSkeleton /> : null}
      {qnas.map((qna) => (
        <Card
          key={qna.id}
          variant="feature"
          className="group overflow-hidden border-brand-highlight/25 shadow-soft transition-[box-shadow,border-color] duration-200 hover:border-brand-highlight/45 hover:shadow-md"
        >
          <CardContent className="p-0">
            <div className="border-b border-brand-highlight/20 bg-brand-highlight-muted p-4 bp-sm:p-5">
              <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-card text-brand-highlight-ink shadow-sm">
                    <MessageCircleQuestion className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 space-y-2">
                    {(() => {
                      const c = getQnaCategoryBadgeSpec(qna.category);
                      return <Badge variant={c.variant}>{qna.category}</Badge>;
                    })()}
                    <h3 className="line-clamp-2 break-keep font-brand-heading text-ui-card-title-lg font-semibold text-foreground">
                      {qna.title}
                    </h3>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 self-start">
                  {qna.status === "답변 완료" ? (
                    <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />
                  ) : (
                    <Clock className="h-4 w-4 text-warning" aria-hidden="true" />
                  )}
                  {(() => {
                    const st = getAnswerStatusBadgeSpec(qna.status === "답변 완료");
                    return <Badge variant={st.variant}>{qna.status}</Badge>;
                  })()}
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-4 bp-sm:grid-cols-[1fr_auto] bp-sm:items-center bp-sm:p-5">
              <div className="rounded-control border border-border/70 bg-card p-3">
                <p className="text-ui-label font-medium uppercase tracking-wide text-muted-foreground">
                  작성일
                </p>
                <div className="mt-1 flex items-center gap-2 text-ui-body-sm font-semibold text-foreground">
                  <Calendar className="h-4 w-4 text-brand-highlight-ink" aria-hidden="true" />
                  <span>{qna.date}</span>
                </div>
              </div>

              <Button
                size="sm"
                variant="highlight_soft"
                wrap="responsive"
                asChild
                className="w-full bp-sm:w-auto"
              >
                <Link href={`/board/qna/${qna.id}`}>
                  상세 보기
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* '더 보기' */}
      <div className="mt-6 flex items-center justify-center">
        {hasMore ? (
          <Button
            type="button"
            variant="highlight_soft"
            wrap="responsive"
            onClick={() => setSize(size + 1)}
            disabled={isValidating}
            aria-label={isValidating ? "문의 내역을 더 불러오는 중입니다" : "문의 내역 더 보기"}
          >
            {isValidating ? "불러오는 중..." : "더 보기"}
          </Button>
        ) : qnas.length ? (
          <span className="text-ui-body-sm text-foreground/80">마지막 페이지입니다</span>
        ) : null}
      </div>

      {hasMore && isValidating ? <QnaListSkeleton count={2} /> : null}
    </div>
  );
}
