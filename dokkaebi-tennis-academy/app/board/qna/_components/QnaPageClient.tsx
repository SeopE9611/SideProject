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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { boardFetcher, parseApiError } from '@/lib/fetchers/boardFetcher';
import ErrorBox from '@/app/board/_components/ErrorBox';

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
  authorId?: string | null;
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

  type MeRes = { id: string; role?: string | null };
  async function meFetcher(url: string): Promise<MeRes | null> {
    const res = await fetch(url, { credentials: 'include' });
    if (res.status === 401) return null;
    const data = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) return null;
    return data as MeRes;
  }

  const fmt = (v: string | Date) => new Date(v).toLocaleDateString();

  // 필터/페이지 상태: "URL 기반 초기값"으로 시작해야 튐이 사라짐
  const [category, setCategory] = useState<string>(initialCategory);
  const [answerFilter, setAnswerFilter] = useState<'all' | 'waiting' | 'completed'>(initialAnswerFilter);
  const [page, setPage] = useState(initialPage);
  const [pageJump, setPageJump] = useState('');
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

  // 현재 사용자(비로그인= null) — 비밀글 클릭 차단 판단에 사용
  const { data: me } = useSWR<MeRes | null>('/api/users/me', meFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  });
  const viewerId = me?.id ?? null;
  const isAdmin = me?.role === 'admin';

  // 비밀글 안내 모달 상태
  const [secretBlock, setSecretBlock] = useState<{ open: boolean; item?: QnaItem }>({ open: false });

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

  const { data, error, isLoading, isValidating } = useSWR<BoardListRes>(key, (url) => boardFetcher<BoardListRes>(url), {
    keepPreviousData: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,

    fallbackData,

    // page.tsx가 revalidate=30(SSR 캐시)라서, 작성 직후 목록 누락이 생길 수 있음
    // fallbackData가 있어도 mount 시 1회 재검증해서 항상 최신 목록으로 맞춘다.
    revalidateOnMount: true,
  });

  useEffect(() => {
    if (uiLoading && !isValidating) setUiLoading(false);
  }, [uiLoading, isValidating]);

  const listError = parseApiError(error, 'Q&A 목록을 불러오지 못했습니다.');

  const isInitialLoading = isLoading && !data && !error;
  const isBusy = uiLoading || isInitialLoading;

  const serverItems: QnaItem[] = data?.items ?? [];
  const items = serverItems;

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageStart = Math.max(1, Math.min(page - 1, totalPages - 2));
  const pageEnd = Math.min(totalPages, pageStart + 2);
  const visiblePages = Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart + i);
  const movePage = (nextPage: number) => {
    const safePage = Math.max(1, Math.min(totalPages, nextPage));
    setUiLoading(true);
    setPage(safePage);
    pushUrl({ page: safePage, category, answerFilter, keyword, field });
  };

  const handlePageJump = (e: any) => {
    e.preventDefault();
    const parsed = Number.parseInt(pageJump, 10);
    if (Number.isNaN(parsed)) return;
    movePage(parsed);
    setPageJump('');
  };
  const answeredCount = serverItems.filter((q) => !!q.answer).length;
  const waitingCount = serverItems.filter((q) => !q.answer).length;
  const totalViews = serverItems.reduce((sum, q) => sum + (q.viewCount ?? 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-card dark:from-background dark:via-muted dark:to-card">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild className="p-2">
              <Link href="/support">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>

            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-background to-card shadow-lg">
                <MessageSquare className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">고객센터 · Q&amp;A</h1>
                <p className="text-lg text-muted-foreground">도깨비 테니스 고객센터에서 궁금한 점을 문의하고, 답변을 받아보실 수 있습니다.</p>
              </div>
            </div>
          </div>

          {/* KPI 미사용 주석처리 (삭제는 일단 대기) */}
          {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 bg-card shadow-lg backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">전체 문의</p>
                    <p className="text-2xl font-bold text-foreground">{total}</p>
                  </div>
                  <div className="bg-success/10 dark:bg-success/10 rounded-xl p-2">
                    <MessageSquare className="h-5 w-5 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card shadow-lg backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">답변 완료</p>
                    <p className="text-2xl font-bold text-foreground">{answeredCount}</p>
                  </div>
                  <div className="bg-success/10 dark:bg-success/10 rounded-xl p-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card shadow-lg backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">답변 대기</p>
                    <p className="text-2xl font-bold text-foreground">{waitingCount}</p>
                  </div>
                  <div className="bg-warning/10 dark:bg-warning/10 rounded-xl p-2">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card shadow-lg backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">총 조회수</p>
                    <p className="text-2xl font-bold text-foreground">{totalViews}</p>
                  </div>
                  <div className="bg-muted rounded-xl p-2">
                    <Users className="h-5 w-5 text-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div> */}
        </div>

        <Card className="border-0 bg-card shadow-xl backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-background to-card dark:from-background dark:to-card border-b">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-success" />
                <span>Q&A 목록</span>
                {(isBusy || isValidating) && <div className="h-4 w-4 border-2 border-border border-t-gray-700 rounded-full animate-spin" />}
              </div>

              <Button asChild className="bg-gradient-to-r from-background to-card hover:from-background hover:to-card">
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
                  <SelectTrigger className="w-[140px] bg-card">
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
                  <SelectTrigger className="w-[120px] bg-card">
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
                  <SelectTrigger className="w-[120px] bg-card">
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
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="검색어를 입력하세요"
                    className="w-[200px] pl-10 bg-card"
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
                  className="bg-gradient-to-r from-background to-card hover:from-background hover:to-card"
                  disabled={isBusy}
                >
                  {isBusy && <div className="h-4 w-4 border-2 border-border/30 border-t-primary-foreground rounded-full animate-spin mr-2" />}
                  검색
                </Button>
              </div>
            </div>

            {/* 비밀글 1차 차단(안내 모달): 바깥 클릭 시 자동 닫힘(radix 기본) */}
            <Dialog open={secretBlock.open} onOpenChange={(open) => setSecretBlock((p) => ({ ...p, open }))}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    비밀글 열람 안내
                  </DialogTitle>
                  <DialogDescription className="space-y-2">
                    <span className="block">
                      이 글은 <b>비밀글</b>로 설정되어 있어 <b>작성자와 관리자만</b> 확인할 수 있습니다.
                    </span>

                    <span className="block">관리자 답변이 달려도 공개되지 않습니다.</span>
                    {!viewerId ? <span className="block">작성자라면 로그인 후 확인해 주세요.</span> : <span className="block">현재 계정으로는 열람 권한이 없습니다.</span>}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSecretBlock({ open: false })}>
                    닫기
                  </Button>
                  {!viewerId && secretBlock.item?._id && (
                    <Button asChild className="bg-gradient-to-r from-background to-card hover:from-background hover:to-card">
                      <Link href={`/login?next=${encodeURIComponent(`/board/qna/${secretBlock.item._id}`)}`}>로그인하고 확인</Link>
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="space-y-4">
              {error && <ErrorBox message={listError.message} status={listError.status} fallbackMessage="Q&A 목록을 불러오지 못했습니다." />}

              {!isLoading &&
                !error &&
                items.map((qna) => {
                  const canOpenSecret = !qna.isSecret || isAdmin || (viewerId && qna.authorId && viewerId === qna.authorId);

                  const displayTitle = qna.isSecret && !canOpenSecret ? '비밀글입니다' : qna.title;

                  const CardInner = (
                    <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-border">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getQnaCategoryColor(qna.category)}`}>
                                {qna.category ?? '일반문의'}
                              </Badge>

                              {qna.isSecret && (
                                <Badge variant="secondary" className="text-xs inline-flex items-center gap-1">
                                  <Lock className="h-3 w-3" />
                                  비밀글
                                </Badge>
                              )}

                              <Badge variant="outline" className={`${badgeBaseOutlined} ${badgeSizeSm} ${getAnswerStatusColor(!!qna.answer)}`}>
                                {qna.answer ? '답변 완료' : '답변 대기'}
                              </Badge>
                            </div>

                            <h3 className="text-lg font-semibold text-foreground hover:text-success dark:hover:text-success transition-colors mb-3 flex-1 min-w-0 truncate">{displayTitle}</h3>

                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
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
                  );

                  // 비밀글 + 권한없음: 상세로 보내지 않고 모달로 1차 차단
                  if (qna.isSecret && !canOpenSecret) {
                    return (
                      <button key={qna._id} type="button" className="block w-full text-left" onClick={() => setSecretBlock({ open: true, item: qna })}>
                        {CardInner}
                      </button>
                    );
                  }

                  return (
                    <Link key={qna._id} href={`/board/qna/${qna._id}`}>
                      {CardInner}
                    </Link>
                  );
                })}

              {!isLoading && !error && items.length === 0 && <div className="text-sm text-muted-foreground">{keyword.trim() ? '검색 결과가 없습니다.' : '등록된 문의가 없습니다.'}</div>}
            </div>

            <div className="mt-8 flex items-center justify-center">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button variant="outline" size="icon" className="bg-card" onClick={() => movePage(1)} disabled={page <= 1 || isBusy}>
                  <span className="sr-only">첫 페이지</span>
                  «
                </Button>
                <Button variant="outline" size="icon" className="bg-card" onClick={() => movePage(page - 1)} disabled={page <= 1 || isBusy}>
                  <span className="sr-only">이전 페이지</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </Button>

                {visiblePages.map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant="outline"
                    size="sm"
                    className={pageNumber === page ? 'h-10 w-10 bg-primary text-primary-foreground border-border' : 'h-10 w-10 bg-card'}
                    onClick={() => movePage(pageNumber)}
                    disabled={isBusy}
                  >
                    {pageNumber}
                  </Button>
                ))}

                <Button variant="outline" size="icon" className="bg-card" onClick={() => movePage(page + 1)} disabled={page >= totalPages || isBusy}>
                  <span className="sr-only">다음 페이지</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Button>
                <Button variant="outline" size="icon" className="bg-card" onClick={() => movePage(totalPages)} disabled={page >= totalPages || isBusy}>
                  <span className="sr-only">마지막 페이지</span>
                  »
                </Button>

                <form onSubmit={handlePageJump} className="ml-1 flex items-center gap-1">
                  <Input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={pageJump}
                    onChange={(e) => setPageJump(e.target.value)}
                    placeholder="페이지"
                    className="h-10 w-20"
                  />
                  <Button type="submit" variant="outline" size="sm" className="h-10 px-2 bg-card" disabled={isBusy}>
                    이동
                  </Button>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
