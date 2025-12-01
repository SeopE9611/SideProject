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
import { badgeBaseOutlined, badgeSizeSm, getQnaCategoryColor, getAnswerStatusColor, noticePinColor, getReviewTypeColor, getNoticeCategoryColor, attachImageColor, attachFileColor } from '@/lib/badge-style';

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

  const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());
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

  const { data, error, isLoading } = useSWR(`/api/boards?${qs.toString()}`, fetcher, { fallbackData: { items: initialItems, total: initialTotal } });

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
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild className="p-2">
              <Link href="/board">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 shadow-lg">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">공지사항</h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">도깨비 테니스 아카데미의 최신 소식을 확인하세요</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-xl backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/50 dark:to-teal-950/50 border-b">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-blue-600" />
                <span>공지사항 목록</span>
              </div>

              <div className="flex items-center space-x-2">
                <Select value={inputField} onValueChange={(v) => setInputField(v as any)}>
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
                        setKeyword(inputKeyword);
                        setField(inputField);
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    setKeyword(inputKeyword);
                    setField(inputField);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
                >
                  검색
                </Button>
                {isAdmin && (
                  <Button asChild className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700">
                    <Link href="/board/notice/write">
                      <Plus className="h-4 w-4 mr-2" />
                      작성하기
                    </Link>
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {!isLoading && !error && items.length === 0 && <div className="py-8 text-center text-sm text-gray-500">검색 결과가 없습니다.</div>}
              {items.map((notice) => (
                <Link key={notice._id} href={`/board/notice/${notice._id}`}>
                  <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-gray-200 dark:border-gray-700">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2 min-w-0">
                            {/* 상단 고정 */}
                            {notice.isPinned && (
                              <Badge className={`${badgeBaseOutlined} ${badgeSizeSm} ${noticePinColor}`}>
                                <Pin className="h-3 w-3 mr-1" />
                                고정
                              </Badge>
                            )}

                            {/* 카테고리 */}
                            {notice.category && <Badge className={`${badgeBaseOutlined} ${badgeSizeSm} ${getNoticeCategoryColor(notice.category)}`}>{notice.category}</Badge>}

                            {/* 제목 */}
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-1 min-w-0 truncate">{notice.title}</h3>

                            {/* 첨부(이미지/파일) */}
                            {(notice.hasImage || notice.hasFile) && (
                              <div className="ml-2 flex items-center gap-1">
                                {notice.hasImage && (
                                  <Badge className={`${badgeBaseOutlined} ${badgeSizeSm} ${attachImageColor}`}>
                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                                      <rect x="3" y="3" width="18" height="14" rx="2" />
                                      <path d="M3 13l4-4 5 5 3-3 6 6" />
                                      <circle cx="8.5" cy="7.5" r="1.5" />
                                    </svg>
                                    {/* 필요하면 개수 표시:  {notice.imagesCount ?? ''} */}
                                  </Badge>
                                )}
                                {notice.hasFile && (
                                  <Badge className={`${badgeBaseOutlined} ${badgeSizeSm} ${attachFileColor}`}>
                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.88 17.05a2 2 0 01-2.83-2.83l8.48-8.48" />
                                    </svg>
                                    {/* 필요하면 개수 표시:  {notice.filesCount ?? ''} */}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 공지는 비밀글 개념이 없지만, API 목록 응답엔 content를 내리지 않음. excerpt가 있을 때만 표시 */}
                          {notice.excerpt && <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{notice.excerpt}</p>}
                          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-500">
                            <span>{fmt(notice.createdAt)}</span>
                            <span className="flex items-center">
                              <Eye className="h-4 w-4 mr-1" />
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

            <div className="mt-8 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                {/* 이전 페이지 */}
                <Button variant="outline" size="icon" className="bg-white dark:bg-gray-700" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  <span className="sr-only">이전 페이지</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </Button>
                {/* 페이지 번호들: 최대 3개 정도만 노출 (디자인 유지용) */}
                {Array.from({ length: totalPages })
                  .map((_, i) => i + 1)
                  .slice(0, 3)
                  .map((pageNumber) => (
                    <Button key={pageNumber} variant="outline" size="sm" className={pageNumber === page ? 'h-10 w-10 bg-blue-600 text-white border-blue-600' : 'h-10 w-10 bg-white dark:bg-gray-700'} onClick={() => setPage(pageNumber)}>
                      {pageNumber}
                    </Button>
                  ))}

                {/* 다음 페이지 */}
                <Button variant="outline" size="icon" className="bg-white dark:bg-gray-700" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
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
