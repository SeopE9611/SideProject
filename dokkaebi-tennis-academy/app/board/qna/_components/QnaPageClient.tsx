'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Search, Users, CheckCircle, Clock, ArrowLeft, Plus, Lock } from 'lucide-react';
import useSWR from 'swr';
import { useEffect, useMemo, useState } from 'react';
import { badgeBaseOutlined, badgeSizeSm, getAnswerStatusColor, getQnaCategoryColor } from '@/lib/badge-style';
import { usePathname } from 'next/navigation';

const CAT_LABELS: Record<string, string> = {
  product: '상품문의',
  order: '주문/결제',
  delivery: '배송',
  refund: '환불/교환',
  service: '서비스',
  academy: '아카데미',
  member: '회원',
};
const CODE_TO_LABEL = CAT_LABELS; // 가독성용 alias
const LABEL_TO_CODE: Record<string, string> = Object.fromEntries(Object.entries(CODE_TO_LABEL).map(([code, label]) => [label, code]));

type QnaItem = {
  _id: string;
  title: string;
  createdAt: string | Date;
  authorName?: string | null;
  category?: string | null; // '상품문의' | '일반문의'
  answer?: { authorName?: string; createdAt?: string | Date; updatedAt?: string | Date } | undefined;
  viewCount?: number;
  isSecret?: boolean;
};

type BoardListRes = {
  ok: boolean;
  items: QnaItem[];
  total: number;
  page?: number;
  limit?: number;
};

type Props = {
  // 서버 프리로드(=URL searchParams 반영) 결과
  initialItems: QnaItem[];
  initialTotal: number;

  // URL ↔ SSR 프리로드 ↔ 클라 초기 상태를 “동일하게” 맞추기 위한 값들
  initialPage?: number;
  initialCategory?: string; // 'all' | 'product' | ... (혹은 라벨이 들어와도 방어)
  initialAnswerFilter?: 'all' | 'waiting' | 'completed';
  initialKeyword?: string;
  initialField?: 'all' | 'title' | 'content' | 'title_content';
};

export default function QnaPageClient({ initialItems, initialTotal, initialPage = 1, initialCategory = 'all', initialAnswerFilter = 'all', initialKeyword = '', initialField = 'all' }: Props) {
  async function fetcher(url: string): Promise<BoardListRes> {
    const res = await fetch(url, { credentials: 'include' });
    const data = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      const msg = typeof data === 'object' && data !== null && 'error' in data && typeof (data as { error?: unknown }).error === 'string' ? (data as { error: string }).error : `${res.status} ${res.statusText}`;
      throw new Error(msg);
    }

    if (!data || typeof data !== 'object' || (data as { ok?: unknown }).ok !== true) {
      throw new Error('invalid_response');
    }

    return data as BoardListRes;
  }

  const fmt = (v: string | Date) => new Date(v).toLocaleDateString();

  // 필터/페이지 상태: "URL 기반 초기값"으로 시작해야 튐이 사라짐
  const [category, setCategory] = useState<string>(initialCategory);
  const [answerFilter, setAnswerFilter] = useState<'all' | 'waiting' | 'completed'>(initialAnswerFilter);
  const [page, setPage] = useState(initialPage);
  const limit = 20;

  // 입력용/제출용도 초기값 동기화
  const [inputKeyword, setInputKeyword] = useState(initialKeyword);
  const [inputField, setInputField] = useState<'all' | 'title' | 'content' | 'title_content'>(initialField);

  const [keyword, setKeyword] = useState(initialKeyword);
  const [field, setField] = useState<'all' | 'title' | 'content' | 'title_content'>(initialField);

  // 현재 상태 기반 key
  const qs = new URLSearchParams({ type: 'qna', page: String(page), limit: String(limit) });

  if (category !== 'all') {
    const label = CODE_TO_LABEL[category] ?? category; // 코드든 라벨이든 안전
    qs.set('category', label);
  }
  if (keyword.trim()) {
    qs.set('q', keyword.trim());
    qs.set('field', field);
  }
  if (answerFilter !== 'all') qs.set('answer', answerFilter);

  const key = `/api/boards?${qs.toString()}`;

  // "초기 URL" 기준 key (fallbackData 매칭용)
  const initialQs = new URLSearchParams({ type: 'qna', page: String(initialPage), limit: String(limit) });

  if (initialCategory !== 'all') {
    const label = CODE_TO_LABEL[initialCategory] ?? initialCategory;
    initialQs.set('category', label);
  }
  if (initialKeyword.trim()) {
    initialQs.set('q', initialKeyword.trim());
    initialQs.set('field', initialField);
  }
  if (initialAnswerFilter !== 'all') initialQs.set('answer', initialAnswerFilter);

  const initialKey = `/api/boards?${initialQs.toString()}`;

  // key가 초기키와 같을 때만 SSR 프리로드를 fallbackData로 공급
  const fallbackData: BoardListRes | undefined =
    key === initialKey
      ? {
          ok: true,
          items: initialItems ?? [],
          total: initialTotal ?? 0,
          page: initialPage,
          limit,
        }
      : undefined;

  // 사용자 액션(검색/필터/페이지 변경) 로딩 통일용
  const [uiLoading, setUiLoading] = useState(false);

  const pathname = usePathname();

  type UrlState = {
    page: number;
    category: string; // 'all' | 'product' | ...
    answerFilter: 'all' | 'waiting' | 'completed';
    keyword: string;
    field: 'all' | 'title' | 'content' | 'title_content';
  };

  function normalizeCategory(raw: string | null): string {
    if (!raw) return 'all';
    // URL에 라벨이 들어와도(code 대신 '상품문의' 등) 안전하게 코드로 환원
    return LABEL_TO_CODE[raw] ?? raw;
  }

  function parseUrlState(): UrlState {
    const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');

    const nextPage = Math.max(1, Number(sp.get('page') ?? '1') || 1);
    const nextCategory = normalizeCategory(sp.get('category'));

    const rawAnswer = sp.get('answer');
    const nextAnswerFilter: UrlState['answerFilter'] = rawAnswer === 'waiting' || rawAnswer === 'completed' ? rawAnswer : 'all';

    const nextKeyword = sp.get('q') ?? '';
    const rawField = sp.get('field');
    const nextField: UrlState['field'] = rawField === 'title' || rawField === 'content' || rawField === 'title_content' ? rawField : 'all';

    return { page: nextPage, category: nextCategory, answerFilter: nextAnswerFilter, keyword: nextKeyword, field: nextField };
  }

  function buildSearchParams(next: UrlState): string {
    const sp = new URLSearchParams();

    // 기본값은 URL에서 생략(깔끔 + 공유 링크 안정)
    if (next.page !== 1) sp.set('page', String(next.page));
    if (next.category !== 'all') sp.set('category', next.category);
    if (next.answerFilter !== 'all') sp.set('answer', next.answerFilter);
    if (next.keyword.trim()) {
      sp.set('q', next.keyword.trim());
      sp.set('field', next.field);
    }

    return sp.toString();
  }

  function pushUrl(next: UrlState) {
    // Next Router를 안 쓰고 history API를 쓰는 이유:
    // - URL은 바꾸되, RSC 재요청/리렌더(= 깜빡임)를 유발하지 않고
    // - SWR key 변화만으로 데이터만 교체되게 만들기 위함입니다.
    const qs = buildSearchParams(next);
    const url = qs ? `${pathname}?${qs}` : pathname;
    window.history.pushState(null, '', url);
  }

  // 뒤로가기/앞으로가기(popstate) 시: URL → 상태로 복원
  useEffect(() => {
    const onPopState = () => {
      const next = parseUrlState();
      setUiLoading(true);

      setPage(next.page);
      setCategory(next.category);
      setAnswerFilter(next.answerFilter);

      setKeyword(next.keyword);
      setField(next.field);

      // 인풋 UI도 같이 복원 (검색창/조건)
      setInputKeyword(next.keyword);
      setInputField(next.field);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const { data, error, isLoading, isValidating } = useSWR<BoardListRes>(key, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,

    fallbackData,
    revalidateOnMount: fallbackData ? false : true,
  });

  useEffect(() => {
    if (uiLoading && !isValidating) setUiLoading(false);
  }, [uiLoading, isValidating]);

  const isInitialLoading = isLoading && !data && !error;
  const isBusy = uiLoading || isInitialLoading;

  const serverItems: QnaItem[] = data?.items ?? [];
  const items = serverItems;

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const answeredCount = serverItems.filter((q) => !!q.answer).length;
  const waitingCount = serverItems.filter((q) => !q.answer).length;
  const totalViews = serverItems.reduce((sum, q) => sum + (q.viewCount ?? 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild className="p-2">
              <Link href="/support">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>

            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 shadow-lg">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">고객센터 · Q&amp;A</h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">도깨비 테니스 고객센터에서 궁금한 점을 문의하고, 답변을 받아보실 수 있습니다.</p>
              </div>
            </div>
          </div>

          {/* KPI 미사용 주석처리 (삭제는 일단 대기) */}
          {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">전체 문의</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
                  </div>
                  <div className="bg-teal-50 dark:bg-teal-950/50 rounded-xl p-2">
                    <MessageSquare className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">답변 완료</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{answeredCount}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/50 rounded-xl p-2">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">답변 대기</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{waitingCount}</p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-950/50 rounded-xl p-2">
                    <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">총 조회수</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalViews}</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950/50 rounded-xl p-2">
                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div> */}
        </div>

        <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-xl backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/50 dark:to-cyan-950/50 border-b">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-teal-600" />
                <span>Q&A 목록</span>
                {isBusy && <div className="h-4 w-4 border-2 border-gray-300/70 border-t-gray-700 rounded-full animate-spin" />}
              </div>

              <Button asChild className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700">
                <Link href="/board/qna/write">
                  <Plus className="h-4 w-4 mr-2" />
                  문의하기
                </Link>
              </Button>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={category}
                  onValueChange={(v) => {
                    setUiLoading(true);
                    const nextPage = 1;
                    setCategory(v);
                    setPage(nextPage);

                    pushUrl({ page: nextPage, category: v, answerFilter, keyword, field });
                  }}
                >
                  <SelectTrigger className="w-[140px] bg-white dark:bg-gray-700">
                    <SelectValue placeholder="카테고리" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 카테고리</SelectItem>
                    <SelectItem value="product">상품</SelectItem>
                    <SelectItem value="order">주문/결제</SelectItem>
                    <SelectItem value="delivery">배송</SelectItem>
                    <SelectItem value="refund">환불/교환</SelectItem>
                    <SelectItem value="service">서비스</SelectItem>
                    <SelectItem value="academy">아카데미</SelectItem>
                    <SelectItem value="member">회원</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={answerFilter}
                  onValueChange={(v) => {
                    setUiLoading(true);
                    const nextAnswerFilter = (v === 'waiting' || v === 'completed' ? v : 'all') as 'all' | 'waiting' | 'completed';
                    const nextPage = 1;

                    setAnswerFilter(nextAnswerFilter);
                    setPage(nextPage);

                    pushUrl({ page: nextPage, category, answerFilter: nextAnswerFilter, keyword, field });
                  }}
                >
                  <SelectTrigger className="w-[120px] bg-white dark:bg-gray-700">
                    <SelectValue placeholder="답변 상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="waiting">답변 대기</SelectItem>
                    <SelectItem value="completed">답변 완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Select value={inputField} onValueChange={(v) => setInputField(v === 'title' || v === 'content' || v === 'title_content' ? v : 'all')}>
                  <SelectTrigger className="w-[120px] bg-white dark:bg-gray-700">
                    <SelectValue placeholder="검색 조건" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="title">제목</SelectItem>
                    <SelectItem value="content">내용</SelectItem>
                    <SelectItem value="title_content">제목+내용</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="검색어를 입력하세요"
                    className="w-[200px] pl-10 bg-white dark:bg-gray-700"
                    value={inputKeyword}
                    onChange={(e) => setInputKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setUiLoading(true);
                        const nextPage = 1;
                        setPage(nextPage);
                        setKeyword(inputKeyword);
                        setField(inputField);
                        pushUrl({ page: nextPage, category, answerFilter, keyword: inputKeyword, field: inputField });
                      }
                    }}
                  />
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    setUiLoading(true);
                    const nextPage = 1;
                    setPage(nextPage);
                    setKeyword(inputKeyword);
                    setField(inputField);
                    pushUrl({ page: nextPage, category, answerFilter, keyword: inputKeyword, field: inputField });
                  }}
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                  disabled={isBusy}
                >
                  {isBusy && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
                  검색
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {error && <div className="text-sm text-red-500">불러오기에 실패했습니다.</div>}

              {!isLoading &&
                !error &&
                items.map((qna) => (
                  <Link key={qna._id} href={`/board/qna/${qna._id}`}>
                    <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-gray-200 dark:border-gray-700">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getQnaCategoryColor(qna.category)}`}>
                                {qna.category ?? '일반문의'}
                              </Badge>

                              {qna.isSecret && (
                                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                  <Lock className="h-3 w-3" /> 비밀글
                                </Badge>
                              )}

                              <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getAnswerStatusColor(!!qna.answer)}`}>
                                {qna.answer ? '답변 완료' : '답변 대기'}
                              </Badge>
                            </div>

                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-3 flex-1 min-w-0 truncate">{qna.title}</h3>

                            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-500">
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">{(qna.authorName ?? '익명').slice(0, 1)}</AvatarFallback>
                                </Avatar>
                                <span>{qna.authorName ?? '익명'}</span>
                              </div>

                              <span>{fmt(qna.createdAt)}</span>

                              <span className="flex items-center">
                                <MessageSquare className="h-4 w-4 mr-1" />
                                답변 {qna.answer ? 1 : 0}개
                              </span>

                              <span className="flex items-center">
                                <Users className="h-4 w-4 mr-1" />
                                {qna.viewCount ?? 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}

              {!isLoading && !error && items.length === 0 && <div className="text-sm text-gray-500">{keyword.trim() ? '검색 결과가 없습니다.' : '등록된 문의가 없습니다.'}</div>}
            </div>

            <div className="mt-8 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-white dark:bg-gray-700"
                  onClick={() => {
                    const nextPage = Math.max(1, page - 1);
                    setUiLoading(true);
                    setPage(nextPage);
                    pushUrl({ page: nextPage, category, answerFilter, keyword, field });
                  }}
                  disabled={page <= 1 || isBusy}
                >
                  <span className="sr-only">이전 페이지</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </Button>

                {Array.from({ length: totalPages })
                  .map((_, i) => i + 1)
                  .slice(0, 3)
                  .map((pageNumber) => (
                    <Button
                      key={pageNumber}
                      variant="outline"
                      size="sm"
                      className={pageNumber === page ? 'h-10 w-10 bg-teal-600 text-white border-teal-600' : 'h-10 w-10 bg-white dark:bg-gray-700'}
                      onClick={() => {
                        setUiLoading(true);
                        setPage(pageNumber);
                        pushUrl({ page: pageNumber, category, answerFilter, keyword, field });
                      }}
                      disabled={isBusy}
                    >
                      {pageNumber}
                    </Button>
                  ))}

                <Button
                  variant="outline"
                  size="icon"
                  className="bg-white dark:bg-gray-700"
                  onClick={() => {
                    const nextPage = Math.min(totalPages, page + 1);
                    setUiLoading(true);
                    setPage(nextPage);
                    pushUrl({ page: nextPage, category, answerFilter, keyword, field });
                  }}
                  disabled={page >= totalPages || isBusy}
                >
                  <span className="sr-only">다음 페이지</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
