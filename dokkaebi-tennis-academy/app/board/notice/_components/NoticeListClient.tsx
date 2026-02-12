'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bell, Search, Eye, Pin, ArrowLeft, Plus } from 'lucide-react';
import useSWR from 'swr';
import { useState } from 'react';
import { badgeBaseOutlined, badgeSizeSm, noticePinColor, getNoticeCategoryColor, attachImageColor, attachFileColor } from '@/lib/badge-style';

type Props = {
  initialItems: any[];
  initialTotal: number;
  isAdmin: boolean;
};

export default function NoticeListClient({ initialItems, initialTotal, isAdmin }: Props) {
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

  async function fetcher(url: string): Promise<BoardListRes> {
    const res = await fetch(url, { credentials: 'include' });
    const data = (await res.json().catch(() => null)) as any;

    if (!res.ok) {
      const message = typeof data === 'object' && data !== null && 'error' in data && typeof (data as { error?: unknown }).error === 'string' ? (data as { error: string }).error : `${res.status} ${res.statusText}`;
      throw new Error(message);
    }

    // 서버가 200으로 내려도 ok:false면 여기서 차단 (스키마 안정성)
    if (!data || data.ok !== true) {
      throw new Error('invalid_response');
    }
    return data as BoardListRes;
  }
  const fmt = (v: string | Date) => new Date(v).toLocaleDateString();

  // 목록 불러오기 (핀 우선 + 최신, 서버에서 정렬됨)
  // 입력용 상태 (타이핑 중)
  const [inputKeyword, setInputKeyword] = useState('');
  const [inputField, setInputField] = useState<'all' | 'title' | 'content' | 'title_content'>('all');
  // 제출용 상태 (버튼/엔터로 확정된 값만 SWR에 반영)
  const [keyword, setKeyword] = useState('');
  const [field, setField] = useState<'all' | 'title' | 'content' | 'title_content'>('all');

  const [page, setPage] = useState(1);
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
  const initialQs = new URLSearchParams({ type: 'notice', page: '1', limit: String(limit) });
  const initialKey = `/api/boards?${initialQs.toString()}`;

  // fallbackData는 "초기 진입 키"에서만 제공해야 페이지/검색 전환 시 튐이 사라짐
  const fallbackData: BoardListRes | undefined =
    key === initialKey
      ? {
          ok: true,
          items: (initialItems as NoticeItem[]) ?? [],
          total: initialTotal,
          page: 1,
          limit,
        }
      : undefined;
  const { data, error, isLoading, isValidating } = useSWR<BoardListRes>(key, fetcher, {
    fallbackData,
    keepPreviousData: true, // 키 변경 시 이전 data 유지 → 깜빡임 제거
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  // 초기(SSR fallback)에서의 revalidate는 "로딩 UI"로 취급하지 않기
  const isBusy = key !== initialKey && (isLoading || isValidating);

  const items: NoticeItem[] = data?.items ?? initialItems ?? [];
  const total: number = data?.total ?? initialTotal ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const pinnedCount = items.filter((n) => n.isPinned).length;
  const totalViews = items.reduce((sum, n) => sum + (n.viewCount ?? 0), 0);
  const monthCount = items.filter((n) => {
    const d = new Date(n.createdAt);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 shadow-lg">
                <Bell className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">고객센터 · 공지사항</h1>
                <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-300">도깨비 테니스 고객센터의 주요 안내와 공지사항을 확인하실 수 있습니다.</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-xl backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/50 dark:to-teal-950/50 border-b p-5 sm:p-6 md:p-8">
            <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                <span className="text-lg sm:text-xl md:text-2xl">공지사항 목록</span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Select value={inputField} onValueChange={(v) => setInputField(v as any)}>
                  <SelectTrigger className="w-full sm:w-[140px] bg-white dark:bg-gray-700 text-sm sm:text-base h-10 sm:h-11">
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
                  <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="검색어를 입력하세요"
                    className="w-full sm:w-[220px] pl-10 sm:pl-12 bg-white dark:bg-gray-700 text-sm sm:text-base h-10 sm:h-11"
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
                  className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 h-10 sm:h-11 text-sm sm:text-base"
                  disabled={isBusy}
                >
                  {isBusy && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
                  검색
                </Button>
                {isAdmin && (
                  <Button asChild size="sm" className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 h-10 sm:h-11 text-sm sm:text-base">
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
              {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-200">공지 목록을 불러오지 못했습니다. (네트워크/권한을 확인해주세요)</div>}
              {!isBusy && !error && items.length === 0 && <div className="py-8 sm:py-10 md:py-12 text-center text-sm sm:text-base text-gray-500">검색 결과가 없습니다.</div>}
              {items.map((notice) => (
                <Link key={notice._id} href={`/board/notice/${notice._id}`}>
                  <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.01] border-gray-200 dark:border-gray-700">
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

                            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-1 min-w-0 truncate">{notice.title}</h3>

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

                          {notice.excerpt && <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 line-clamp-2">{notice.excerpt}</p>}
                          <div className="flex items-center space-x-3 sm:space-x-4 text-sm sm:text-base text-gray-500 dark:text-gray-500">
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
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Button variant="outline" size="icon" className="bg-white dark:bg-gray-700 h-10 w-10 sm:h-12 sm:w-12" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isBusy}>
                  <span className="sr-only">이전 페이지</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 sm:h-5 sm:w-5">
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
                      className={pageNumber === page ? 'h-10 w-10 sm:h-12 sm:w-12 bg-blue-600 text-white border-blue-600 text-sm sm:text-base' : 'h-10 w-10 sm:h-12 sm:w-12 bg-white dark:bg-gray-700 text-sm sm:text-base'}
                      onClick={() => setPage(pageNumber)}
                      disabled={isBusy}
                    >
                      {pageNumber}
                    </Button>
                  ))}

                <Button variant="outline" size="icon" className="bg-white dark:bg-gray-700 h-10 w-10 sm:h-12 sm:w-12" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isBusy}>
                  <span className="sr-only">다음 페이지</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 sm:h-5 sm:w-5">
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
