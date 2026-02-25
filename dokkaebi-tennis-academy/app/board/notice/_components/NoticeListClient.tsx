'use client';
import ErrorBox from '@/app/board/_components/ErrorBox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { attachFileColor, attachImageColor, badgeBaseOutlined, badgeSizeSm, getNoticeCategoryColor, noticePinColor } from '@/lib/badge-style';
import { boardFetcher, parseApiError } from '@/lib/fetchers/boardFetcher';
import { ArrowLeft, Bell, Eye, Pin, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';

type Props = {
  initialItems: any[];
  initialTotal: number;
  isAdmin: boolean;

  // URL 쿼리로 직접 진입하는 경우(/board/notice?page=...&q=...)
  // 서버 프리로드와 클라이언트 SWR key를 일치시켜 "한 번 튐"을 줄임.
  initialPage?: number;
  initialKeyword?: string;
  initialField?: 'all' | 'title' | 'content' | 'title_content';
};

export default function NoticeListClient({ initialItems, initialTotal, isAdmin, initialPage = 1, initialKeyword = '', initialField = 'all' }: Props) {
  type NoticeItem = {
    _id: string;
    title: string;
    createdAt: string | Date;
    viewCount?: number;
    isPinned?: boolean;
    excerpt?: string;
    category?: string;

    attachmentsCount?: number; // 전체 첨부 개수
    imagesCount?: number; // 이미지 개수
    filesCount?: number; // 비이미지(문서) 개수
    hasImage?: boolean;
    hasFile?: boolean;
  };

  type BoardListRes = {
    ok: boolean;
    items: NoticeItem[];
    total: number;
    page: number;
    limit: number;
  };

  const fmt = (v: string | Date) => new Date(v).toLocaleDateString();

  // 목록 불러오기 (핀 우선 + 최신, 서버에서 정렬됨)
  // 입력용 상태 (타이핑 중)
  const [inputKeyword, setInputKeyword] = useState(initialKeyword);
  const [inputField, setInputField] = useState<'all' | 'title' | 'content' | 'title_content'>(initialField);
  // 제출용 상태 (버튼/엔터로 확정된 값만 SWR에 반영)
  const [keyword, setKeyword] = useState(initialKeyword);
  const [field, setField] = useState<'all' | 'title' | 'content' | 'title_content'>(initialField);

  const [page, setPage] = useState(initialPage);
  const [pageJump, setPageJump] = useState('');
  const limit = 20;
  // 목록 불러오기 (검색 파라미터 포함)
  const qs = new URLSearchParams({
    type: 'notice',
    page: String(page),
    limit: String(limit),
  });

  if (keyword.trim()) {
    qs.set('q', keyword.trim());
    qs.set('field', field);
  }

  const key = `/api/boards?${qs.toString()}`;
  const initialQs = new URLSearchParams({
    type: 'notice',
    page: String(initialPage),
    limit: String(limit),
  });

  if (initialKeyword.trim()) {
    initialQs.set('q', initialKeyword.trim());
    initialQs.set('field', initialField);
  }
  const initialKey = `/api/boards?${initialQs.toString()}`;

  // fallbackData는 "초기 진입 키"에서만 제공해야 페이지/검색 전환 시 튐이 사라짐
  const fallbackData: BoardListRes | undefined =
    key === initialKey
      ? {
          ok: true,
          items: (initialItems as NoticeItem[]) ?? [],
          total: initialTotal,
          page: initialPage,
          limit,
        }
      : undefined;
  const { data, error, isLoading, isValidating } = useSWR<BoardListRes>(key, (url) => boardFetcher<BoardListRes>(url), {
    fallbackData,
    keepPreviousData: true, // 키 변경 시 이전 data 유지 → 깜빡임 제거
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateOnMount: fallbackData ? false : true,
  });
  const listError = parseApiError(error, '공지 목록을 불러오지 못했습니다.');
  // 초기(SSR fallback)에서의 revalidate는 "로딩 UI"로 취급하지 않기
  const isBusy = key !== initialKey && (isLoading || isValidating);

  const items: NoticeItem[] = data?.items ?? initialItems ?? [];
  const total: number = data?.total ?? initialTotal ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageStart = Math.max(1, Math.min(page - 1, totalPages - 2));
  const pageEnd = Math.min(totalPages, pageStart + 2);
  const visiblePages = Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart + i);

  const movePage = (nextPage: number) => {
    setPage(Math.max(1, Math.min(totalPages, nextPage)));
  };

  const handlePageJump = (e: any) => {
    e.preventDefault();
    const parsed = Number.parseInt(pageJump, 10);
    if (Number.isNaN(parsed)) return;
    movePage(parsed);
    setPageJump('');
  };

  const pinnedCount = items.filter((n) => n.isPinned).length;
  const totalViews = items.reduce((sum, n) => sum + (n.viewCount ?? 0), 0);
  const monthCount = items.filter((n) => {
    const d = new Date(n.createdAt);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 md:py-12 space-y-6 sm:space-y-8">
        <div className="flex flex-col space-y-4 sm:space-y-6">
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* 고객센터 홈으로 돌아가는 Back 버튼 */}
            <Button variant="ghost" asChild className="p-2">
              <Link href="/support">
                <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </Link>
            </Button>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary dark:bg-primary/20">
                <Bell className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">고객센터 · 공지사항</h1>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground">테니스 플로우 고객센터의 주요 안내와 공지사항을 확인하실 수 있습니다.</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="border-0 bg-card shadow-xl backdrop-blur-sm">
          <CardHeader className="bg-muted/30 border-b p-5 sm:p-6 md:p-8">
            <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                <span className="text-lg sm:text-xl md:text-2xl">공지사항 목록</span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Select value={inputField} onValueChange={(v) => setInputField(v as any)}>
                  <SelectTrigger className="w-full sm:w-[140px] bg-card text-sm sm:text-base h-10 sm:h-11">
                    <SelectValue placeholder="검색 조건" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="title">제목</SelectItem>
                    <SelectItem value="content">내용</SelectItem>
                    <SelectItem value="title_content">제목+내용</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="검색어를 입력하세요"
                    className="w-full sm:w-[220px] pl-10 sm:pl-12 bg-card text-sm sm:text-base h-10 sm:h-11"
                    value={inputKeyword}
                    onChange={(e) => setInputKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setPage(1);
                        setKeyword(inputKeyword);
                        setField(inputField);
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setKeyword(inputKeyword);
                    setField(inputField);
                  }}
                  size="sm"
                  className="bg-muted/30 h-10 sm:h-11 text-sm sm:text-base"
                  disabled={isBusy}
                >
                  {isBusy && <div className="h-4 w-4 border-2 border-border/30 border-t-primary-foreground rounded-full animate-spin mr-2" />}
                  검색
                </Button>
                {isAdmin && (
                  <Button asChild size="sm" className="bg-muted/30 h-10 sm:h-11 text-sm sm:text-base">
                    <Link href="/board/notice/write">
                      <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                      작성하기
                    </Link>
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 sm:p-6 md:p-8">
            <div className="space-y-4 sm:space-y-5">
              {error && <ErrorBox message={listError.message} status={listError.status} fallbackMessage="공지 목록을 불러오지 못했습니다." />}
              {!isBusy && !error && items.length === 0 && <div className="py-8 sm:py-10 md:py-12 text-center text-sm sm:text-base text-muted-foreground">검색 결과가 없습니다.</div>}
              {items.map((notice) => (
                <Link key={notice._id} href={`/board/notice/${notice._id}`}>
                  <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.01] border-border">
                    <CardContent className="p-5 sm:p-6 md:p-7">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2 sm:gap-2.5 mb-2 sm:mb-3 min-w-0">
                            {notice.isPinned && (
                              <Badge className={`${badgeBaseOutlined} ${badgeSizeSm} ${noticePinColor}`}>
                                <Pin className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                                고정
                              </Badge>
                            )}

                            {notice.category && <Badge className={`${badgeBaseOutlined} ${badgeSizeSm} ${getNoticeCategoryColor(notice.category)}`}>{notice.category}</Badge>}

                            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-foreground hover:text-primary dark:hover:text-primary transition-colors flex-1 min-w-0 truncate">{notice.title}</h3>

                            {(notice.hasImage || notice.hasFile) && (
                              <div className="flex items-center gap-1 sm:gap-1.5">
                                {notice.hasImage && (
                                  <Badge className={`${badgeBaseOutlined} ${badgeSizeSm} ${attachImageColor}`}>
                                    <svg viewBox="0 0 24 24" className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                                      <rect x="3" y="3" width="18" height="14" rx="2" />
                                      <path d="M3 13l4-4 5 5 3-3 6 6" />
                                      <circle cx="8.5" cy="7.5" r="1.5" />
                                    </svg>
                                  </Badge>
                                )}
                                {notice.hasFile && (
                                  <Badge className={`${badgeBaseOutlined} ${badgeSizeSm} ${attachFileColor}`}>
                                    <svg viewBox="0 0 24 24" className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.88 17.05a2 2 0 01-2.83-2.83l8.48-8.48" />
                                    </svg>
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

                          {notice.excerpt && <p className="text-sm sm:text-base text-muted-foreground mb-2 sm:mb-3 line-clamp-2">{notice.excerpt}</p>}
                          <div className="flex items-center space-x-3 sm:space-x-4 text-sm sm:text-base text-muted-foreground">
                            <span>{fmt(notice.createdAt)}</span>
                            <span className="flex items-center">
                              <Eye className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
                              {notice.viewCount ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            <div className="mt-8 sm:mt-10 flex items-center justify-center">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                <Button variant="outline" size="icon" className="bg-card h-10 w-10 sm:h-12 sm:w-12" onClick={() => movePage(1)} disabled={page <= 1 || isBusy}>
                  <span className="sr-only">첫 페이지</span>«
                </Button>
                <Button variant="outline" size="icon" className="bg-card h-10 w-10 sm:h-12 sm:w-12" onClick={() => movePage(page - 1)} disabled={page <= 1 || isBusy}>
                  <span className="sr-only">이전 페이지</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 sm:h-5 sm:w-5">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </Button>
                {visiblePages.map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant="outline"
                    size="sm"
                    className={pageNumber === page ? 'h-10 w-10 sm:h-12 sm:w-12 bg-primary text-primary-foreground border-border text-sm sm:text-base' : 'h-10 w-10 sm:h-12 sm:w-12 bg-card text-sm sm:text-base'}
                    onClick={() => movePage(pageNumber)}
                    disabled={isBusy}
                  >
                    {pageNumber}
                  </Button>
                ))}

                <Button variant="outline" size="icon" className="bg-card h-10 w-10 sm:h-12 sm:w-12" onClick={() => movePage(page + 1)} disabled={page >= totalPages || isBusy}>
                  <span className="sr-only">다음 페이지</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 sm:h-5 sm:w-5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Button>
                <Button variant="outline" size="icon" className="bg-card h-10 w-10 sm:h-12 sm:w-12" onClick={() => movePage(totalPages)} disabled={page >= totalPages || isBusy}>
                  <span className="sr-only">마지막 페이지</span>»
                </Button>

                <form onSubmit={handlePageJump} className="ml-1 flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={pageJump}
                    onChange={(e) => setPageJump(e.target.value)}
                    placeholder="페이지"
                    className="h-10 w-20 sm:h-12 rounded-md border border-border bg-card px-2 text-xs sm:text-sm dark:border-border dark:bg-card"
                  />
                  <Button type="submit" variant="outline" size="sm" className="h-10 sm:h-12 px-2 bg-card" disabled={isBusy}>
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
