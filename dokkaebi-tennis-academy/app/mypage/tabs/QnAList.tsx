'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import useSWRInfinite from 'swr/infinite';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircleQuestion, Calendar, ArrowRight, CheckCircle, Clock } from 'lucide-react';

type Qna = {
  id: number;
  title: string;
  date: string;
  status: string;
  category: string;
};

type QnaPage = { items: Qna[]; total: number };

const LIMIT = 10;

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('문의 목록을 불러오지 못했습니다.');
  return res.json();
};

export default function QnAList() {
  // 필터/검색 대비
  // const { statusFilter, categoryFilter, keyword } = useQnaFilters();

  // SWR Infinite 키 생성
  const getKey = (pageIndex: number, previousPageData: QnaPage | null) => {
    // 직전 페이지가 LIMIT 미만이면 다음 페이지 없음
    if (previousPageData && previousPageData.items && previousPageData.items.length < LIMIT) return null;

    const page = pageIndex + 1;
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(LIMIT));
    // if (statusFilter) params.set('status', statusFilter);
    // if (categoryFilter) params.set('category', categoryFilter);
    // if (keyword) params.set('q', keyword);

    return `/api/qna/me?${params.toString()}`;
  };

  const { data, size, setSize, isValidating, error } = useSWRInfinite<QnaPage>(getKey, fetcher, {
    revalidateFirstPage: true,
  });

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
    return <p className="text-center py-6 text-destructive">에러: {error.message}</p>;
  }

  // 첫 로딩
  if (!data && isValidating) {
    return <div className="text-center py-8 text-muted-foreground">문의 내역을 불러오는 중입니다...</div>;
  }

  // 빈 상태
  if (!isValidating && qnas.length === 0) {
    return (
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-background to-muted dark:from-background dark:to-muted">
        <CardContent className="p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900">
            <MessageCircleQuestion className="h-10 w-10 text-primary dark:text-primary" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">문의 내역이 없습니다</h3>
          <p className="mb-6 text-foreground">궁금한 점이 있으시면 언제든지 문의해주세요!</p>
          <Button asChild className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
            <Link href="/board/qna/write" className="inline-flex items-center gap-2">
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
    <div className="space-y-6">
      {qnas.map((qna) => (
        <Card key={qna.id} className="group relative overflow-hidden border-0 bg-card shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ padding: '1px' }}>
            <div className="h-full w-full bg-card rounded-lg" />
          </div>

          <CardContent className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900">
                  <MessageCircleQuestion className="h-6 w-6 text-primary dark:text-primary" />
                </div>
                <div>
                  <Badge variant="outline" className="mb-2 border-border text-primary dark:border-border dark:text-primary">
                    {qna.category}
                  </Badge>
                  <h3 className="font-semibold text-foreground line-clamp-2">{qna.title}</h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {qna.status === '답변 완료' ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Clock className="h-5 w-5 text-yellow-500" />}
                <Badge variant={qna.status === '답변 완료' ? 'default' : 'secondary'} className={qna.status === '답변 완료' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'}>
                  {qna.status}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/60 dark:border-border/60">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{qna.date}</span>
              </div>

              <Button size="sm" variant="outline" asChild className="border-border hover:border-border hover:bg-primary dark:border-border dark:hover:border-border dark:hover:bg-primary transition-colors bg-transparent">
                <Link href={`/board/qna/${qna.id}`} className="inline-flex items-center gap-1">
                  상세보기
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
            {isValidating ? '불러오는 중…' : '더 보기'}
          </Button>
        ) : qnas.length ? (
          <span className="text-sm text-muted-foreground">마지막 페이지입니다</span>
        ) : null}
      </div>
    </div>
  );
}
