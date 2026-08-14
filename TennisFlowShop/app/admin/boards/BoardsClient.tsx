"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  RefreshCcw,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ExternalLink,
  MessageSquare,
  ThumbsUp,
  BarChart3,
  FileText,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminSemanticBadge as Badge } from "@/components/admin/AdminSemanticBadge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import AdminRowActionMenu from "@/components/admin/AdminRowActionMenu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { adminDataTable } from "@/components/admin/AdminDataTable";
import { adminTypography } from "@/components/admin/admin-typography";
import { cn } from "@/lib/utils";
import { buildAdminBoardDetailUrl, buildBoardPublicUrl } from "@/lib/board-public-url-policy";
import { adminMutator } from "@/lib/admin/adminFetcher";
import { adminPostVisibilityBadgeVariant, adminReportStatusBadgeVariant } from "@/lib/badge-style";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";

type PostItem = {
  id: string;
  type: string;
  postNo: number | null;
  title: string;
  nickname: string;
  status: "public" | "hidden";
  createdAt: string;
  views: number;
  likes: number;
  commentsCount: number;
};

type ReportItem = {
  id: string;
  targetType: "post" | "comment";
  boardType: string;
  reason: string;
  status: "pending" | "resolved" | "rejected";
  reporterNickname: string;
  reporterDisplay?: string;
  createdAt: string;
  resolvedAt: string | null;
  post: {
    id: string | null;
    title: string;
    postNo: number | null;
    status: string;
  } | null;
  comment: {
    id: string | null;
    content: string;
    nickname: string;
    status: string;
  } | null;
};

type PostsResponse = { items?: PostItem[]; total?: number };
type ReportsResponse = { items?: ReportItem[]; total?: number };

const boardLabel: Record<string, string> = {
  notice: "공지",
  qna: "Q&A",
  free: "자유",
  gear: "장비",
  market: "중고",
  hot: "인기",
  brand: "브랜드",
};

/**
 * 레거시 게시판 타입 별칭 맵.
 * - 서버/DB에 과거 데이터(brands)가 남아 있어도 관리자 화면 텍스트/배지가 깨지지 않도록 임시 유지한다.
 * - 신규 타입 표준은 brand이며, 필터 옵션 등 신규 입력은 brand만 노출한다.
 */
const legacyBoardTypeAlias: Record<string, string> = {
  brands: "brand",
};

/**
 * 화면 표기 전용 게시판 타입 정규화.
 * - 관리자 목록/신고 목록 badge 라벨 조회 시 사용한다.
 * - API 전송 타입까지 강제 치환하지 않고, 표시 계층에서만 별칭 호환을 보장한다.
 */
function resolveBoardLabel(type: string) {
  const nextType = legacyBoardTypeAlias[type] ?? type;
  return boardLabel[nextType] ?? type;
}

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString("ko-KR");
  } catch {
    return dt;
  }
}

const LIMIT = 20;

function getBoardLinkBlockedReason(
  reason: "missing_type_route" | "private_post" | "missing_identifier" | null,
  hasAdminFallback: boolean,
) {
  if (reason === "private_post") {
    return hasAdminFallback
      ? "비공개/숨김 게시글은 공개 페이지로 이동할 수 없어 관리자 상세로 대체됩니다."
      : "비공개/숨김 게시글은 공개 페이지로 이동할 수 없습니다.";
  }

  if (reason === "missing_type_route") {
    return hasAdminFallback
      ? "게시판 타입 라우팅 규칙이 없어 관리자 상세로 대체됩니다."
      : "게시판 타입 라우팅 규칙이 없어 링크를 열 수 없습니다.";
  }

  if (reason === "missing_identifier") {
    return hasAdminFallback
      ? "공개 URL 식별자(postNo)가 없어 관리자 상세로 대체됩니다."
      : "공개 URL 식별자(postNo)가 없어 링크를 열 수 없습니다.";
  }

  return hasAdminFallback
    ? "공개 URL 생성 실패로 관리자 상세로 대체됩니다."
    : "링크를 생성할 수 없습니다.";
}

export default function BoardsClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const tab = sp.get("tab") === "reports" ? "reports" : "posts";

  // 게시글 필터
  const [postType, setPostType] = useState<string>("all");
  const [postStatus, setPostStatus] = useState<string>("all");
  const [postQ, setPostQ] = useState<string>("");
  const [postPage, setPostPage] = useState<number>(1);

  // 신고 필터
  const [reportType, setReportType] = useState<string>("all");
  const [reportStatus, setReportStatus] = useState<string>("pending");
  const [reportQ, setReportQ] = useState<string>("");
  const [reportPage, setReportPage] = useState<number>(1);

  const postsUrl = useMemo(() => {
    const qs = new URLSearchParams({
      page: String(postPage),
      limit: String(LIMIT),
      type: postType,
      status: postStatus,
      q: postQ,
      sort: "createdAt",
      dir: "desc",
    });
    return `/api/admin/community/posts?${qs.toString()}`;
  }, [postPage, postType, postStatus, postQ]);

  const reportsUrl = useMemo(() => {
    const qs = new URLSearchParams({
      page: String(reportPage),
      limit: String(LIMIT),
      boardType: reportType,
      status: reportStatus,
      q: reportQ,
    });
    return `/api/admin/community/reports?${qs.toString()}`;
  }, [reportPage, reportType, reportStatus, reportQ]);

  const {
    data: postsData,
    error: postsErr,
    isLoading: postsLoading,
    mutate: mutatePosts,
  } = useSWR<PostsResponse>(tab === "posts" ? postsUrl : null, authenticatedSWRFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const {
    data: reportsData,
    error: reportsErr,
    isLoading: reportsLoading,
    mutate: mutateReports,
  } = useSWR<ReportsResponse>(tab === "reports" ? reportsUrl : null, authenticatedSWRFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const hasResolvedPostsData = !!postsData;
  const hasPostsDataError = !!postsErr;
  const hasResolvedPostsTotal = hasResolvedPostsData && typeof postsData?.total === "number";
  const postsRaw: PostItem[] | null = hasResolvedPostsData
    ? Array.isArray(postsData?.items)
      ? postsData.items
      : []
    : null;

  const posts: PostItem[] = useMemo(() => {
    return (postsRaw ?? []).map((item: any) => {
      // 서버 스키마 정합성: views/likes/commentsCount 실필드만 사용
      const views = Number(item?.views ?? 0);
      const likes = Number(item?.likes ?? 0);
      const commentsCount = Number(item?.commentsCount ?? 0);

      return {
        ...item,
        views: Number.isFinite(views) ? views : 0,
        likes: Number.isFinite(likes) ? likes : 0,
        commentsCount: Number.isFinite(commentsCount) ? commentsCount : 0,
      } as PostItem;
    });
  }, [postsRaw]);
  const postsTotal: number | null = hasResolvedPostsTotal ? (postsData?.total ?? 0) : null;
  const postsTotalPages = postsTotal === null ? null : Math.max(1, Math.ceil(postsTotal / LIMIT));

  const hasResolvedReportsData = !!reportsData;
  const hasReportsDataError = !!reportsErr;
  const hasResolvedReportsTotal = hasResolvedReportsData && typeof reportsData?.total === "number";
  const reports: ReportItem[] | null = hasResolvedReportsData
    ? Array.isArray(reportsData?.items)
      ? reportsData.items
      : []
    : null;
  const reportsTotal: number | null = hasResolvedReportsTotal ? (reportsData?.total ?? 0) : null;
  const reportsTotalPages =
    reportsTotal === null ? null : Math.max(1, Math.ceil(reportsTotal / LIMIT));

  const postsPublicCount = postsRaw ? posts.filter((p) => p.status === "public").length : null;
  const postsHiddenCount = postsRaw ? posts.filter((p) => p.status === "hidden").length : null;
  const reportsPendingCount = reports ? reports.filter((r) => r.status === "pending").length : null;

  const hasPostFilterApplied =
    postType !== "all" || postStatus !== "all" || postQ.trim().length > 0;
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);

  const currentPagePostIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const currentPagePostIdSet = useMemo(() => new Set(currentPagePostIds), [currentPagePostIds]);

  useEffect(() => {
    setSelectedPostIds((prev) => {
      const next = prev.filter((id) => currentPagePostIdSet.has(id));
      const isSame = next.length === prev.length && next.every((id, index) => id === prev[index]);

      return isSame ? prev : next;
    });
  }, [currentPagePostIdSet]);

  const isCurrentPageAllSelected =
    posts.length > 0 && posts.every((p) => selectedPostIds.includes(p.id));

  const togglePostSelect = (postId: string) => {
    setSelectedPostIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId],
    );
  };

  const toggleSelectAllCurrentPage = (checked: boolean) => {
    setSelectedPostIds(checked ? currentPagePostIds : []);
  };

  const deleteSelectedPosts = async () => {
    if (selectedPostIds.length === 0) return;
    const ok = window.confirm(
      `선택한 게시글 ${selectedPostIds.length}개를 삭제하시겠습니까?\n삭제된 게시글과 연결된 댓글/좋아요/신고 데이터가 함께 정리될 수 있습니다.\n이 작업은 되돌릴 수 없습니다.`,
    );
    if (!ok) return;

    try {
      await adminMutator("/api/admin/community/posts/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedPostIds }),
      });
      showSuccessToast("선택한 게시글을 삭제했습니다.");
      setSelectedPostIds([]);
      mutatePosts();
    } catch (e: any) {
      showErrorToast(e?.message ?? "선택 삭제에 실패했습니다.");
    }
  };

  const shouldShowPostsEmptyState =
    hasResolvedPostsData && !hasPostsDataError && !!postsRaw && postsRaw.length === 0;
  const isPostsActualEmptyState = shouldShowPostsEmptyState && !hasPostFilterApplied;
  const isPostsSearchEmptyState = shouldShowPostsEmptyState && hasPostFilterApplied;

  const shouldShowReportsEmptyState =
    hasResolvedReportsData && !hasReportsDataError && !!reports && reports.length === 0;

  const switchTab = (next: "posts" | "reports") => {
    const qs = new URLSearchParams(sp.toString());
    if (next === "reports") qs.set("tab", "reports");
    else qs.delete("tab");
    router.replace(`/admin/boards?${qs.toString()}`);
  };

  const togglePostVisibility = async (p: PostItem) => {
    try {
      const next = p.status === "public" ? "hidden" : "public";
      await adminMutator(`/api/admin/community/posts/${p.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      showSuccessToast(
        next === "hidden" ? "게시글을 숨김 처리했습니다." : "게시글을 공개 처리했습니다.",
      );
      mutatePosts();
    } catch (e: any) {
      showErrorToast(e?.message ?? "상태 변경 실패");
    }
  };

  const processReport = async (
    r: ReportItem,
    action: "resolve" | "reject" | "resolve_hide_target",
  ) => {
    try {
      await adminMutator(`/api/admin/community/reports/${r.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      showSuccessToast("신고 처리가 완료되었습니다.");
      mutateReports();
      // 대상 숨김까지 했다면 게시글 목록도 최신화하는 게 안전
      mutatePosts();
    } catch (e: any) {
      showErrorToast(e?.message ?? "신고 처리 실패");
    }
  };

  return (
    <TooltipProvider>
      <AdminPageShell variant="wide" className="space-y-4">
        <AdminPageHeader
          variant="compact"
          title="게시판 관리"
          description="커뮤니티 게시글과 신고 내역을 확인하고 공개 상태를 관리합니다."
          icon={MessageSquare}
          scope="범위: 게시글 + 신고"
          helperText="고정 공지와 게시글 상세 수정은 각 게시글 화면에서 처리합니다."
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={tab} onValueChange={(v) => switchTab(v as "posts" | "reports")}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="posts" className="gap-2">
                <FileText className="h-4 w-4" /> 게시글
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2">
                <ShieldAlert className="h-4 w-4" /> 신고
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <p className={adminTypography.metaMuted}>
            {tab === "posts" ? (
              <>
                전체 {postsTotal === null ? "-" : postsTotal.toLocaleString()}건 · 현재 페이지 공개{" "}
                {postsPublicCount === null ? "-" : postsPublicCount.toLocaleString()}건 · 숨김{" "}
                {postsHiddenCount === null ? "-" : postsHiddenCount.toLocaleString()}건
              </>
            ) : (
              <>
                전체 {reportsTotal === null ? "-" : reportsTotal.toLocaleString()}건 · 현재 페이지
                처리 대기{" "}
                {reportsPendingCount === null ? "-" : reportsPendingCount.toLocaleString()}건
              </>
            )}
          </p>
        </div>

        <AdminFilterBar
          actions={
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() =>
                tab === "posts"
                  ? (setPostPage(1), mutatePosts())
                  : (setReportPage(1), mutateReports())
              }
              aria-label={tab === "posts" ? "게시글 목록 새로고침" : "신고 목록 새로고침"}
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          }
        >
          {tab === "posts" ? (
            <div className="grid grid-cols-1 gap-2 xl:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_minmax(260px,2fr)]">
              <Select value={postType} onValueChange={(v) => (setPostPage(1), setPostType(v))}>
                <SelectTrigger className="w-full min-w-0 bg-background/50">
                  <SelectValue placeholder="게시판" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {Object.keys(boardLabel).map((k) => (
                    <SelectItem key={k} value={k}>
                      {boardLabel[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={postStatus} onValueChange={(v) => (setPostPage(1), setPostStatus(v))}>
                <SelectTrigger className="w-full min-w-0 bg-background/50">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="public">공개</SelectItem>
                  <SelectItem value="hidden">숨김</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={postQ}
                onChange={(e) => setPostQ(e.target.value)}
                placeholder="제목/작성자/내용 검색"
                className="w-full min-w-0 bg-background/50"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 xl:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_minmax(260px,2fr)]">
              <Select
                value={reportType}
                onValueChange={(v) => (setReportPage(1), setReportType(v))}
              >
                <SelectTrigger className="w-full min-w-0 bg-background/50">
                  <SelectValue placeholder="게시판" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {Object.keys(boardLabel).map((k) => (
                    <SelectItem key={k} value={k}>
                      {boardLabel[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={reportStatus}
                onValueChange={(v) => (setReportPage(1), setReportStatus(v))}
              >
                <SelectTrigger className="w-full min-w-0 bg-background/50">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">대기</SelectItem>
                  <SelectItem value="resolved">완료</SelectItem>
                  <SelectItem value="rejected">반려</SelectItem>
                  <SelectItem value="all">전체</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={reportQ}
                onChange={(e) => setReportQ(e.target.value)}
                placeholder="사유/신고자 검색"
                className="w-full min-w-0 bg-background/50"
              />
            </div>
          )}
        </AdminFilterBar>

        {tab === "posts" && selectedPostIds.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3">
            <div>
              <p className={adminTypography.bodyStrong}>{selectedPostIds.length}개 게시글 선택</p>
              <p className={adminTypography.caption}>선택 삭제는 복구할 수 없습니다.</p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={deleteSelectedPosts}
              className="gap-1 whitespace-nowrap"
            >
              <Trash2 className="h-4 w-4" /> 선택 삭제
            </Button>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-border">
          {tab === "posts" ? (
            <>
              {postsLoading ? (
                <div className="space-y-3 p-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : null}
              {hasPostsDataError ? (
                <div className={cn("p-4 text-destructive", adminTypography.body)}>
                  게시글 목록 로드 실패: {(postsErr as any)?.message ?? "error"}
                </div>
              ) : null}
              {!postsLoading && !hasPostsDataError && posts.length > 0 ? (
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <Checkbox
                    checked={isCurrentPageAllSelected}
                    onCheckedChange={(checked) => toggleSelectAllCurrentPage(Boolean(checked))}
                    aria-label="현재 페이지 게시글 전체 선택"
                  />
                  <span className={adminTypography.metaMuted}>현재 페이지 전체 선택</span>
                </div>
              ) : null}
              {!postsLoading && !hasPostsDataError
                ? posts.map((p) => {
                    const publicLink = buildBoardPublicUrl({
                      type: p.type,
                      id: p.id,
                      postNo: p.postNo,
                      status: p.status,
                    });
                    const adminLink = buildAdminBoardDetailUrl({ id: p.id });
                    return (
                      <div
                        key={p.id}
                        className="flex min-w-0 items-start gap-3 border-t border-border p-4 first:border-t-0 hover:bg-muted/20"
                      >
                        <Checkbox
                          checked={selectedPostIds.includes(p.id)}
                          onCheckedChange={() => togglePostSelect(p.id)}
                          className="mt-1"
                          aria-label={`${p.title} 게시글 선택`}
                        />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={adminDataTable.categoryText}>
                              {resolveBoardLabel(p.type)}
                            </span>
                            <span className={adminTypography.caption}>#{p.postNo ?? "-"}</span>
                            <Badge variant={adminPostVisibilityBadgeVariant(p.status)}>
                              {p.status === "public" ? "공개" : "숨김"}
                            </Badge>
                          </div>
                          {adminLink ? (
                            <Link
                              href={adminLink}
                              className={cn(
                                "block line-clamp-2 hover:text-primary",
                                adminTypography.bodyStrong,
                              )}
                            >
                              {p.title}
                            </Link>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className={cn(
                                    "block line-clamp-2 cursor-not-allowed text-muted-foreground",
                                    adminTypography.bodyStrong,
                                  )}
                                  aria-disabled="true"
                                >
                                  {p.title}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {getBoardLinkBlockedReason(null, false)}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <div
                            className={cn(
                              "flex min-w-0 flex-wrap gap-x-4 gap-y-1",
                              adminTypography.metaMuted,
                            )}
                          >
                            <span className="max-w-full truncate font-medium">
                              {p.nickname || "-"}
                            </span>
                            <span>{fmt(p.createdAt)}</span>
                          </div>
                          <div className={cn("flex items-center gap-4", adminTypography.meta)}>
                            <span className="flex items-center gap-1">
                              <BarChart3 className="h-4 w-4" />
                              {p.views}
                            </span>
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="h-4 w-4" />
                              {p.likes}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              {p.commentsCount}
                            </span>
                          </div>
                        </div>
                        <AdminRowActionMenu ariaLabel={`${p.title} 게시글 작업 메뉴`}>
                          {publicLink.ok ? (
                            <DropdownMenuItem asChild>
                              <a href={publicLink.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                공개 페이지 열기
                              </a>
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem onSelect={() => togglePostVisibility(p)}>
                            {p.status === "public" ? (
                              <EyeOff className="mr-2 h-4 w-4" />
                            ) : (
                              <Eye className="mr-2 h-4 w-4" />
                            )}
                            {p.status === "public" ? "숨김 처리" : "공개 처리"}
                          </DropdownMenuItem>
                        </AdminRowActionMenu>
                      </div>
                    );
                  })
                : null}
              {shouldShowPostsEmptyState ? (
                <div className="p-12 text-center">
                  <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className={adminTypography.metaMuted}>
                    {isPostsActualEmptyState
                      ? "등록된 게시글이 없습니다."
                      : isPostsSearchEmptyState
                        ? "검색/필터 조건에 맞는 게시글이 없습니다."
                        : "표시할 게시글이 없습니다."}
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <>
              {reportsLoading ? (
                <div className="space-y-3 p-4">
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                </div>
              ) : null}
              {hasReportsDataError ? (
                <div className={cn("p-4 text-destructive", adminTypography.body)}>
                  신고 목록 로드 실패: {(reportsErr as any)?.message ?? "error"}
                </div>
              ) : null}
              {!reportsLoading && !hasReportsDataError
                ? (reports ?? []).map((r) => {
                    const isPending = r.status === "pending";
                    const publicLink = buildBoardPublicUrl({
                      type: r.boardType,
                      id: r.post?.id,
                      postNo: r.post?.postNo,
                      status: r.post?.status,
                    });
                    const adminLink = buildAdminBoardDetailUrl({ id: r.post?.id });
                    const targetText =
                      r.targetType === "comment"
                        ? r.comment?.content || "(댓글 내용 없음)"
                        : r.post?.title || "(제목 없음)";
                    return (
                      <div
                        key={r.id}
                        className="flex min-w-0 flex-wrap items-start gap-4 border-t border-border p-4 first:border-t-0 hover:bg-muted/20"
                      >
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={adminDataTable.categoryText}>
                              {r.targetType === "post" ? "게시글" : "댓글"} ·{" "}
                              {resolveBoardLabel(r.boardType)}
                            </span>
                            <Badge variant={adminReportStatusBadgeVariant(r.status)}>
                              {r.status === "pending"
                                ? "대기"
                                : r.status === "resolved"
                                  ? "완료"
                                  : "반려"}
                            </Badge>
                          </div>
                          <div>
                            <p className={adminTypography.caption}>신고 사유</p>
                            <p className={cn("line-clamp-2", adminTypography.bodyStrong)}>
                              {r.reason}
                            </p>
                          </div>
                          <div>
                            <p className={adminTypography.caption}>신고 대상</p>
                            {adminLink ? (
                              <Link
                                href={adminLink}
                                className={cn(
                                  "block line-clamp-2 hover:text-primary",
                                  adminTypography.body,
                                )}
                              >
                                {targetText}
                              </Link>
                            ) : (
                              <span
                                className={cn(
                                  "block line-clamp-2 text-muted-foreground",
                                  adminTypography.body,
                                )}
                              >
                                {targetText}
                              </span>
                            )}
                            {publicLink.ok ? (
                              <a
                                href={publicLink.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "mt-1 inline-flex items-center gap-1 hover:text-primary",
                                  adminTypography.caption,
                                )}
                              >
                                공개 페이지 열기 <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ) : null}
                          </div>
                          <div
                            className={cn(
                              "flex min-w-0 flex-wrap gap-x-4 gap-y-1",
                              adminTypography.metaMuted,
                            )}
                          >
                            <span className="max-w-full truncate">
                              신고자: {r.reporterDisplay || r.reporterNickname || "-"}
                            </span>
                            <span>{fmt(r.createdAt)}</span>
                          </div>
                        </div>
                        {isPending ? (
                          <div className="flex shrink-0 items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => processReport(r, "resolve")}
                              className="gap-2"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              완료
                            </Button>
                            <AdminRowActionMenu
                              ariaLabel={`${targetText} 신고 작업 메뉴`}
                              destructiveActions={
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={() => processReport(r, "resolve_hide_target")}
                                >
                                  <ShieldAlert className="mr-2 h-4 w-4" />
                                  대상 숨김 + 완료
                                </DropdownMenuItem>
                              }
                            >
                              <DropdownMenuItem onSelect={() => processReport(r, "reject")}>
                                <XCircle className="mr-2 h-4 w-4" />
                                반려
                              </DropdownMenuItem>
                            </AdminRowActionMenu>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                : null}
              {shouldShowReportsEmptyState ? (
                <div className="p-12 text-center">
                  <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className={adminTypography.metaMuted}>현재 조건에 맞는 신고가 없습니다.</p>
                </div>
              ) : null}
            </>
          )}
        </div>

        {tab === "posts" && posts.length > 0 && postsTotal !== null && postsTotalPages !== null ? (
          <Pagination
            total={postsTotal}
            page={postPage}
            pages={postsTotalPages}
            setPage={setPostPage}
          />
        ) : null}
        {tab === "reports" &&
        reports &&
        reports.length > 0 &&
        reportsTotal !== null &&
        reportsTotalPages !== null ? (
          <Pagination
            total={reportsTotal}
            page={reportPage}
            pages={reportsTotalPages}
            setPage={setReportPage}
          />
        ) : null}
      </AdminPageShell>
    </TooltipProvider>
  );
}

function Pagination({
  total,
  page,
  pages,
  setPage,
}: {
  total: number;
  page: number;
  pages: number;
  setPage: (updater: (page: number) => number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
      <div className={adminTypography.metaMuted}>
        총 <span className="font-semibold text-foreground">{total}</span>건 · 페이지{" "}
        <span className="font-semibold text-foreground">{page}</span> / {pages}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          이전
        </Button>
        <div
          className={cn(
            "flex h-9 items-center rounded-md border border-border px-3",
            adminTypography.bodyStrong,
          )}
        >
          {page}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
          disabled={page >= pages}
        >
          다음
        </Button>
      </div>
    </div>
  );
}
