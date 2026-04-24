"use client";
import ErrorBox from "@/app/board/_components/ErrorBox";
import AsyncState from "@/components/system/AsyncState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { badgeBaseOutlined, badgeSizeSm, getNoticeCategoryBadgeSpec } from "@/lib/badge-style";
import { boardFetcher, parseApiError } from "@/lib/fetchers/boardFetcher";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { ArrowLeft, Bell, Eye, ImageIcon, Paperclip, Pin, Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";

type Props = {
  initialItems: any[] | null;
  initialTotal: number | null;
  // 서버 프리로드 자체 실패 여부를 별도로 받아서
  // 빈 목록(실제 0건)과 명확히 분리합니다.
  initialLoadError: boolean;
  initialErrorMessage?: string;
  // URL 쿼리로 직접 진입하는 경우(/board/notice?page=...&q=...)
  // 서버 프리로드와 클라이언트 SWR key를 일치시켜 "한 번 튐"을 줄임.
  initialPage?: number;
  initialKeyword?: string;
  initialField?: "all" | "title" | "content" | "title_content";
};

function AdminNoticeWriteButton() {
  const { user, loading } = useCurrentUser();

  if (loading || user?.role !== "admin") return null;

  return (
    <Button asChild size="sm" variant="outline" className="h-9 sm:h-10 text-sm sm:text-base">
      <Link href="/board/notice/write">
        <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
        작성하기
      </Link>
    </Button>
  );
}

export default function NoticeListClient({ initialItems, initialTotal, initialLoadError, initialErrorMessage, initialPage = 1, initialKeyword = "", initialField = "all" }: Props) {
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

  const fmt = (v: string | Date) =>
    new Date(v)
      .toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\.\s/g, ".")
      .replace(/\.$/, "");
  const noticeMobileTitleClampClass = "flex-1 min-w-0 line-clamp-2 text-sm font-semibold leading-snug sm:line-clamp-1 sm:text-base";
  const noticeMobileMetaWrapClass = "flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-muted-foreground";
  const noticeMobileActionGroupClass = "flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto";

  // 목록 불러오기 (핀 우선 + 최신, 서버에서 정렬됨)
  // 입력용 상태 (타이핑 중)
  const [inputKeyword, setInputKeyword] = useState(initialKeyword);
  const [inputField, setInputField] = useState<"all" | "title" | "content" | "title_content">(initialField);
  // 제출용 상태 (버튼/엔터로 확정된 값만 SWR에 반영)
  const [keyword, setKeyword] = useState(initialKeyword);
  const [field, setField] = useState<"all" | "title" | "content" | "title_content">(initialField);

  const [page, setPage] = useState(initialPage);
  const [pageJump, setPageJump] = useState("");
  const limit = 20;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const urlKeyword = searchParams.get("q") ?? "";
    const rawField = searchParams.get("field");
    const urlField: "all" | "title" | "content" | "title_content" = rawField === "title" || rawField === "content" || rawField === "title_content" ? rawField : "all";
    const rawPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
    const urlPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

    setInputKeyword(urlKeyword);
    setKeyword(urlKeyword);
    setInputField(urlField);
    setField(urlField);
    setPage(urlPage);
  }, [searchParams]);

  const buildListQueryFromState = () => {
    const sp = new URLSearchParams();

    if (page !== 1) sp.set("page", String(page));
    if (keyword.trim()) {
      sp.set("q", keyword.trim());
      sp.set("field", field);
    }

    return sp.toString();
  };

  const buildDetailHref = (noticeId: string) => {
    const base = `/board/notice/${noticeId}`;
    const listQuery = buildListQueryFromState();
    return listQuery ? `${base}?${listQuery}` : base;
  };

  const pushUrlFromState = (next: { page: number; keyword: string; field: "all" | "title" | "content" | "title_content" }) => {
    const sp = new URLSearchParams();
    const normalizedKeyword = next.keyword.trim();

    if (next.page !== 1) sp.set("page", String(next.page));
    if (normalizedKeyword) {
      sp.set("q", normalizedKeyword);
      sp.set("field", next.field);
    }

    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  // 목록 불러오기 (검색 파라미터 포함)
  const qs = new URLSearchParams({
    type: "notice",
    page: String(page),
    limit: String(limit),
  });

  if (keyword.trim()) {
    qs.set("q", keyword.trim());
    qs.set("field", field);
  }

  const key = `/api/boards?${qs.toString()}`;
  const initialQs = new URLSearchParams({
    type: "notice",
    page: String(initialPage),
    limit: String(limit),
  });

  if (initialKeyword.trim()) {
    initialQs.set("q", initialKeyword.trim());
    initialQs.set("field", initialField);
  }
  const initialKey = `/api/boards?${initialQs.toString()}`;

  // fallbackData는 "초기 진입 키"에서만 제공해야 페이지/검색 전환 시 튐이 사라짐
  const hasInitialResolvedData = !initialLoadError && !!initialItems && initialTotal !== null;
  const fallbackData: BoardListRes | undefined =
    key === initialKey && hasInitialResolvedData
      ? {
          ok: true,
          items: initialItems as NoticeItem[],
          total: initialTotal as number,
          page: initialPage,
          limit,
        }
      : undefined;
  const { data, error, isLoading, isValidating, mutate } = useSWR<BoardListRes>(key, (url) => boardFetcher<BoardListRes>(url), {
    fallbackData,
    keepPreviousData: true, // 키 변경 시 이전 data 유지 → 깜빡임 제거
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateOnMount: fallbackData ? false : true,
  });
  const listError = parseApiError(error, "공지 목록을 불러오지 못했습니다.");
  // 초기(SSR fallback)에서의 revalidate는 "로딩 UI"로 취급하지 않기
  const isBusy = key !== initialKey && (isLoading || isValidating);

  // 상태 분리: preload 실패 / fetch 실패 / 로딩 / 실제 데이터 확정
  const hasPreloadError = initialLoadError && key === initialKey && !data;
  const hasFetchError = !!error;
  const hasDataError = hasPreloadError || hasFetchError;
  const hasResolvedData = !!data;
  const normalizedKeyword = keyword.trim();
  const hasSearchKeyword = normalizedKeyword.length > 0;

  const items: NoticeItem[] = data?.items ?? [];
  const total: number | null = data?.total ?? null;
  const shouldShowLoadingState = isBusy && !hasResolvedData;
  const shouldShowActualEmptyState = !isBusy && !hasDataError && hasResolvedData && !hasSearchKeyword && items.length === 0;
  const shouldShowSearchEmptyState = !isBusy && !hasDataError && hasResolvedData && hasSearchKeyword && items.length === 0;

  // total이 확정되지 않은(preload 실패/초기 로딩) 상황에서
  // 0건/1페이지처럼 굳어 보이지 않게 기본 페이징만 안전 처리
  const resolvedTotalForPaging = total ?? 0;
  const totalPages = Math.max(1, Math.ceil(resolvedTotalForPaging / limit));
  const pageStart = Math.max(1, Math.min(page - 1, totalPages - 2));
  const pageEnd = Math.min(totalPages, pageStart + 2);
  const visiblePages = Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart + i);

  const movePage = (nextPage: number) => {
    const safePage = Math.max(1, Math.min(totalPages, nextPage));
    setPage(safePage);
    pushUrlFromState({ page: safePage, keyword, field });
  };

  const handlePageJump = (e: any) => {
    e.preventDefault();
    const parsed = Number.parseInt(pageJump, 10);
    if (Number.isNaN(parsed)) return;
    movePage(parsed);
    setPageJump("");
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
      <div className="container mx-auto px-4 sm:px-6 py-7 sm:py-9 md:py-10 space-y-5 sm:space-y-7">
        <div className="flex flex-col space-y-3 sm:space-y-5">
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* 고객센터 홈으로 돌아가는 Back 버튼 */}
            <Button variant="ghost" asChild className="p-2">
              <Link href="/support">
                <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </Link>
            </Button>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl border border-border bg-secondary text-foreground">
                <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-[2rem] font-bold tracking-normal text-foreground">고객센터 · 공지사항</h1>
                <p className="text-sm sm:text-base text-muted-foreground">도깨비테니스 고객센터의 주요 안내와 공지사항을 확인하실 수 있습니다.</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="bg-muted/30 border-b p-4 sm:p-5 md:p-6">
            <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                <span className="text-lg sm:text-xl md:text-2xl">공지사항 목록</span>
              </div>

              <div className={noticeMobileActionGroupClass}>
                <Select value={inputField} onValueChange={(v) => setInputField(v as any)}>
                  <SelectTrigger className="w-full sm:w-[140px] bg-card text-sm sm:text-base h-9 sm:h-10">
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
                    className="w-full sm:w-[220px] pl-10 sm:pl-12 bg-card text-sm sm:text-base h-9 sm:h-10"
                    value={inputKeyword}
                    onChange={(e) => setInputKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const nextPage = 1;
                        setPage(nextPage);
                        setKeyword(inputKeyword);
                        setField(inputField);
                        pushUrlFromState({
                          page: nextPage,
                          keyword: inputKeyword,
                          field: inputField,
                        });
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    const nextPage = 1;
                    setPage(nextPage);
                    setKeyword(inputKeyword);
                    setField(inputField);
                    pushUrlFromState({
                      page: nextPage,
                      keyword: inputKeyword,
                      field: inputField,
                    });
                  }}
                  size="sm"
                  variant="outline"
                  className="h-9 sm:h-10 text-sm sm:text-base"
                  disabled={isBusy}
                >
                  {isBusy && <div className="h-4 w-4 border-2 border-border/30 border-t-primary-foreground rounded-full animate-spin mr-2" />}
                  검색
                </Button>
                <AdminNoticeWriteButton />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 md:p-6">
            <div className="space-y-3.5 sm:space-y-4">
              {!shouldShowLoadingState && hasDataError && (
                <ErrorBox
                  message={hasPreloadError ? initialErrorMessage || "공지 목록을 불러오지 못했습니다." : listError.message}
                  status={hasPreloadError ? 500 : listError.status}
                  fallbackMessage="공지 목록을 불러오지 못했습니다."
                  onRetry={() => mutate()}
                />
              )}
              {!shouldShowLoadingState && !hasDataError && shouldShowActualEmptyState && (
                <div className="space-y-3">
                  <AsyncState kind="empty" variant="card" title="등록된 공지사항이 없습니다." description="새 소식이 등록되면 이곳에서 가장 먼저 안내해 드릴게요." />
                  <div className="mt-3">
                    <Button asChild variant="outline" size="sm">
                      <Link href="/support">고객센터 홈으로</Link>
                    </Button>
                  </div>
                </div>
              )}
              {!shouldShowLoadingState && !hasDataError && !shouldShowActualEmptyState && shouldShowSearchEmptyState && (
                <div className="space-y-3">
                  <AsyncState kind="empty" variant="card" title="검색 결과가 없습니다." description="검색어를 바꾸거나 전체 공지 목록으로 돌아가 확인해 보세요." />
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInputKeyword("");
                        setKeyword("");
                        setInputField("all");
                        setField("all");
                        setPage(1);
                        pushUrlFromState({
                          page: 1,
                          keyword: "",
                          field: "all",
                        });
                      }}
                    >
                      전체 공지 보기
                    </Button>
                  </div>
                </div>
              )}
              {!shouldShowLoadingState &&
                !hasDataError &&
                !shouldShowActualEmptyState &&
                !shouldShowSearchEmptyState &&
                items.map((notice) => {
                  const noticeCategoryBadge = getNoticeCategoryBadgeSpec(notice.category);

                  return (
                    <Link key={notice._id} href={buildDetailHref(notice._id)}>
                      <Card className="border-border transition-colors hover:border-primary/25 hover:bg-muted/25">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                                <div className="flex min-w-0 flex-1 items-center gap-2 flex-wrap">
                                  {notice.category && (
                                    <Badge variant={noticeCategoryBadge.variant} className={`${badgeBaseOutlined} ${badgeSizeSm} shrink-0`} title={notice.category ?? undefined}>
                                      {notice.category}
                                    </Badge>
                                  )}

                                  {notice.isPinned && (
                                    <Badge variant="brand" className={`${badgeBaseOutlined} ${badgeSizeSm} shrink-0`} title="고정 공지" aria-label="고정 공지">
                                      <Pin className="h-3 w-3" />
                                    </Badge>
                                  )}

                                  <span className={`${noticeMobileTitleClampClass} text-foreground transition-colors hover:text-foreground`}>{notice.title}</span>
                                </div>
                              </div>

                              <div className={noticeMobileMetaWrapClass}>
                                <span>{fmt(notice.createdAt)}</span>
                                <span className="inline-flex items-center gap-1">
                                  <Eye className="h-3.5 w-3.5" />
                                  {notice.viewCount ?? 0}
                                </span>
                                {(notice.hasImage || notice.hasFile) && (
                                  <span className="flex items-center gap-1.5" aria-label="첨부 정보">
                                    {notice.hasImage && (
                                      <span title="이미지 첨부" aria-label="이미지 첨부">
                                        <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                      </span>
                                    )}
                                    {notice.hasFile && (
                                      <span title="첨부파일 있음" aria-label="첨부파일 있음">
                                        <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
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
                    className={pageNumber === page ? "h-10 w-10 sm:h-12 sm:w-12 bg-secondary text-foreground border-border text-sm sm:text-base" : "h-10 w-10 sm:h-12 sm:w-12 bg-card text-sm sm:text-base"}
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
