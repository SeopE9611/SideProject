"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { adminDataTable } from "@/components/admin/AdminDataTable";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import ReviewContextBadge from "@/components/reviews/ReviewContextBadge";
import { Switch } from "@/components/ui/switch";
import { adminMutator } from "@/lib/admin/adminFetcher";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import type { ReviewContext } from "@/lib/reviews/review-target";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { AdminReviewListItemDto, AdminReviewsListResponseDto } from "@/types/admin/reviews";
import {
  Award,
  Calendar,
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Search,
  Star,
  ThumbsUp,
  Trash2,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";

type Row = AdminReviewListItemDto;
type Page = AdminReviewsListResponseDto;
const ReviewPhotoDialog = dynamic(() => import("@/app/reviews/_components/ReviewPhotoDialog"), {
  loading: () => null,
});
const AdminConfirmDialog = dynamic(() => import("@/components/admin/AdminConfirmDialog"), {
  loading: () => null,
});

function mapApiToViewModel(page: Page | null): Page | null {
  if (!page) return null;
  return {
    total: page.total,
    items: page.items.map((item) => ({
      ...item,
      createdAt: new Date(item.createdAt).toISOString(),
      photos: Array.isArray(item.photos) ? item.photos : [],
      helpfulCount: Number(item.helpfulCount ?? 0),
    })),
  };
}

const LIMIT = 10;

// 검색 디바운스
function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function AdminReviewListClient() {
  // ---- 검색/필터 ----
  const [qRaw, setQRaw] = useState("");
  const qDebounced = useDebounced(qRaw, 350);
  const [status, setStatus] = useState<"all" | "visible" | "hidden">("all");
  const [context, setContext] = useState<"all" | ReviewContext>("all");
  const [showDeleted, setShowDeleted] = useState(false);

  useEffect(() => {
    setSize(1);
  }, [qDebounced, status, context, showDeleted]);

  // ---- KPI ----
  const { data: metrics } = useSWR<{
    total: number;
    avg: number;
    five: number;
    byContext: Record<ReviewContext, number>;
    byCategory: { product: number; stringing: number; rental: number };
  }>("/api/admin/reviews/metrics", authenticatedSWRFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  // ---- 리스트 ----
  const getKey = useCallback(
    (idx: number, prev: Page | null) => {
      if (prev && prev.items.length < LIMIT) return null;
      const page = idx + 1;
      const p = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (qDebounced.trim()) p.set("q", qDebounced.trim());
      if (status !== "all") p.set("status", status);
      if (context !== "all") p.set("context", context);
      if (showDeleted) p.set("withDeleted", "1");
      return `/api/admin/reviews?${p.toString()}`;
    },
    [qDebounced, status, context, showDeleted],
  );

  const {
    data: rawData,
    error,
    isValidating,
    size,
    setSize,
    mutate,
  } = useSWRInfinite<Page>(getKey, authenticatedSWRFetcher, {
    revalidateFirstPage: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  const data = useMemo(
    () => (rawData ? rawData.map((page) => mapApiToViewModel(page) as Page) : undefined),
    [rawData],
  );
  const rows = useMemo(() => (data ? data.flatMap((d) => d.items) : []), [data]);
  const hasMore = useMemo(
    () => (data?.length ? data[data.length - 1].items.length === LIMIT : false),
    [data],
  );

  // ---- 상세 모달 ----
  const [detail, setDetail] = useState<Row | null>(null);

  // 상세 조회(단건) + 사진 뷰어 상태
  const [fullDetail, setFullDetail] = useState<Row | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);

  // fullDetail가 오기 전에도 detail.photos가 있으면 그걸 먼저 사용
  const photos: string[] = useMemo(
    () => fullDetail?.photos ?? detail?.photos ?? [],
    [fullDetail, detail],
  );
  // "보여줄 사진이 전혀 없을 때"만 스켈레톤 표시
  const loadingPhotos = !!detail && !fullDetail && photos.length === 0;

  useEffect(() => {
    if (!detail?._id) {
      setFullDetail(null);
      setDetailLoading(false);
      return;
    }
    let aborted = false;
    (async () => {
      try {
        setDetailLoading(true);
        const res = await fetch(`/api/admin/reviews/${detail._id}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const j = await res.json();
        if (!aborted) setFullDetail(j as Row);
      } finally {
        if (!aborted) setDetailLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [detail]);

  // ---- 정렬 ----
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "rating" | "helpful">("latest");
  const sortedRows = useMemo(() => {
    const arr = rows.slice();
    switch (sortBy) {
      case "rating":
        arr.sort((a, b) => b.rating - a.rating);
        break;
      case "helpful":
        arr.sort((a, b) => (b.helpfulCount ?? 0) - (a.helpfulCount ?? 0));
        break;
      case "oldest":
        arr.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
        break;
      default:
        arr.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    }
    return arr;
  }, [rows, sortBy]);

  // ---- 선택/삭제 ----
  const [selected, setSelected] = useState<string[]>([]);
  const [pendingDeleteReviewId, setPendingDeleteReviewId] = useState<string | null>(null);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const toggleSelectAll = (checked: boolean) => setSelected(checked ? rows.map((r) => r._id) : []);
  const toggleSelectOne = (id: string, checked: boolean) =>
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));

  // rows 변경 시 화면에 없는 선택 해제
  useEffect(() => {
    setSelected((prev) => prev.filter((id) => rows.some((r) => r._id === id)));
  }, [rows]);

  const doDelete = async (id: string) => {
    const snapshot = data;
    await mutate(
      (pages?: Page[]) =>
        pages
          ? pages.map((p) => ({
              ...p,
              items: p.items.filter((r) => r._id !== id),
            }))
          : pages,
      false,
    );
    try {
      await adminMutator(`/api/admin/reviews/${id}`, {
        method: "DELETE",
      });
      showSuccessToast("삭제되었습니다.");
    } catch (error: unknown) {
      await mutate(() => snapshot, false);
      showErrorToast(error instanceof Error ? error.message : "삭제 중 오류");
    }
  };

  const doBulkDelete = async () => {
    if (!selected.length) return;
    const targetIds = [...selected];
    const snapshot = data;
    await mutate(
      (pages?: Page[]) =>
        pages
          ? pages.map((p) => ({
              ...p,
              items: p.items.filter((r) => !targetIds.includes(r._id)),
            }))
          : pages,
      false,
    );
    try {
      const results = await Promise.allSettled(
        targetIds.map((id) =>
          adminMutator(`/api/admin/reviews/${id}`, {
            method: "DELETE",
          }),
        ),
      );

      const failedIds = targetIds.filter((_id, index) => results[index]?.status === "rejected");
      const failedCount = failedIds.length;

      if (failedCount === 0) {
        setSelected([]);
        showSuccessToast("선택 항목을 삭제했습니다.");
        return;
      }

      await mutate();
      setSelected(failedIds);

      if (failedCount === targetIds.length) {
        showErrorToast("선택한 후기 삭제에 실패했습니다.");
        return;
      }

      showErrorToast("일부 후기 삭제에 실패했습니다. 목록을 다시 불러왔습니다.");
    } catch {
      await mutate(() => snapshot, false);
      showErrorToast("일부 항목 삭제에 실패했습니다.");
    }
  };

  // 선택 공개/비공개 (일괄) — 낙관적 업데이트 + 실패 시 롤백
  const doBulkUpdateStatus = async (next: "visible" | "hidden") => {
    if (!selected.length) return;

    // 낙관적 업데이트: 현재 페이지들에서 선택된 항목들의 status만 먼저 바꿔 그림
    const snapshot = data;
    await mutate(
      (pages?: Page[]) =>
        pages
          ? pages.map((p) => ({
              ...p,
              items: p.items.map((r) => (selected.includes(r._id) ? { ...r, status: next } : r)),
            }))
          : pages,
      false,
    );

    // 실제 서버 PATCH — 5개씩 동시 처리(서버 부하 방지)
    const CHUNK = 5;
    try {
      for (let i = 0; i < selected.length; i += CHUNK) {
        const part = selected.slice(i, i + CHUNK);
        await Promise.all(
          part.map(async (id) => {
            await adminMutator(`/api/admin/reviews/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: next }),
            });
          }),
        );
      }
      setSelected([]);
      showSuccessToast(
        next === "hidden"
          ? "선택 항목을 비공개로 변경했습니다."
          : "선택 항목을 공개로 변경했습니다.",
      );
    } catch (e) {
      // 3) 실패 시 롤백
      await mutate(() => snapshot, false);
      showErrorToast("일부 항목 상태 변경에 실패했습니다.");
    }
  };

  // ---- 공개/비공개 토글(낙관적) ----
  const toggleVisible = async (it: Row) => {
    const next = it.status === "visible" ? "hidden" : "visible";
    const snapshot = data;
    await mutate(
      (pages?: Page[]) =>
        pages
          ? pages.map((p) => ({
              ...p,
              items: p.items.map((r) => (r._id === it._id ? { ...r, status: next } : r)),
            }))
          : pages,
      false,
    );
    try {
      await adminMutator(`/api/admin/reviews/${it._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      showSuccessToast(
        next === "hidden" ? "후기를 비공개로 변경했습니다." : "후기를 공개로 변경했습니다.",
      );
    } catch {
      await mutate(() => snapshot, false);
      showErrorToast("상태 변경 실패");
    }
  };

  // --- 카드 밀도 토글 ----
  const [compact, setCompact] = useState(false);

  // 더보기/ 접기----
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // ---- 렌더 유틸 ----
  const renderStars = (n: number) => (
    <div className="flex items-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < n ? "text-warning fill-current" : "text-muted-foreground"}`}
        />
      ))}
    </div>
  );
  function safeSplitDate(input?: string | number | Date) {
    try {
      if (input == null) return { date: "-", time: "-" };
      const d = new Date(input);
      if (Number.isNaN(d.getTime())) return { date: "-", time: "-" };
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
    } catch {
      return { date: "-", time: "-" };
    }
  }
  const GRID =
    "lg:grid-cols-[44px_minmax(90px,1fr)_minmax(240px,2.4fr)_minmax(96px,0.9fr)_minmax(110px,1fr)_minmax(84px,0.8fr)_minmax(72px,0.8fr)_56px]";

  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={adminSurface.kpiCard}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={adminTypography.caption}>전체 후기</p>
                <p className={adminTypography.kpiValueCompact}>{metrics?.total ?? 0}</p>
              </div>
              <div className="rounded-md p-2 bg-primary/10 border border-primary/20 dark:bg-primary/20">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={adminSurface.kpiCard}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={adminTypography.caption}>평균 평점</p>
                <p className={adminTypography.kpiValueCompact}>{(metrics?.avg ?? 0).toFixed(1)}</p>
              </div>
              <div className="rounded-md p-2 bg-warning/10 dark:bg-warning/15">
                <Star className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={adminSurface.kpiCard}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={adminTypography.caption}>5점 후기</p>
                <p className={adminTypography.kpiValueCompact}>{metrics?.five ?? 0}</p>
              </div>
              <div className="rounded-md p-2 bg-primary/10 border border-primary/20 dark:bg-primary/20">
                <Award className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={adminSurface.kpiCard}>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center justify-between">
              <p className={adminTypography.caption}>유형별 후기</p>
              <TrendingUp className="h-5 w-5 text-foreground" />
            </div>
            <div className="grid grid-cols-1 gap-1 text-[12px] text-muted-foreground sm:grid-cols-2">
              <span>상품 후기 {metrics?.byContext?.product ?? 0}</span>
              <span>상품·교체서비스 후기 {metrics?.byContext?.product_stringing ?? 0}</span>
              <span>교체서비스 후기 {metrics?.byContext?.standalone_stringing ?? 0}</span>
              <span>대여 후기 {metrics?.byContext?.rental ?? 0}</span>
              <span>대여·교체서비스 후기 {metrics?.byContext?.rental_stringing ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 검색/필터 + 전체선택 */}
      <div
        className={cn(
          adminSurface.filterCard,
          "sticky top-0 z-10 -mt-2 mb-2 flex flex-wrap items-center justify-between gap-3 supports-[backdrop-filter]:bg-card/95",
        )}
      >
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="후기 검색…"
            className="h-9 border-border pl-10 focus:border-border focus:ring-ring"
            value={qRaw}
            onChange={(e) => setQRaw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSize(1)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as "all" | "visible" | "hidden");
              setSize(1);
            }}
          >
            <SelectTrigger className="h-9 w-32">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="visible">관리자 공개</SelectItem>
              <SelectItem value="hidden">관리자 숨김</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={context}
            onValueChange={(v) => {
              setContext(v as "all" | ReviewContext);
              setSize(1);
            }}
          >
            <SelectTrigger className="h-9 w-52">
              <SelectValue placeholder="후기 유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 유형</SelectItem>
              <SelectItem value="product">상품 후기</SelectItem>
              <SelectItem value="product_stringing">상품·교체서비스 후기</SelectItem>
              <SelectItem value="standalone_stringing">교체서비스 후기</SelectItem>
              <SelectItem value="rental">대여 후기</SelectItem>
              <SelectItem value="rental_stringing">대여·교체서비스 후기</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
            <Checkbox
              checked={rows.length > 0 && selected.length === rows.length}
              onCheckedChange={(val) => toggleSelectAll(!!val)}
              aria-label="전체 선택"
              className="h-4 w-4 shrink-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <span className={adminTypography.caption}>전체 선택</span>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
            <Checkbox
              id="show-deleted"
              checked={showDeleted}
              onCheckedChange={(v) => {
                setShowDeleted(!!v);
                setSize(1);
              }}
              className="h-4 w-4 shrink-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <label htmlFor="show-deleted" className={adminTypography.caption}>
              삭제 포함 보기
            </label>
          </div>
          <Button size="sm" variant="outline" onClick={() => setCompact((v) => !v)}>
            {compact ? "코지" : "컴팩트"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                정렬
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 min-w-max"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem onClick={() => setSortBy("latest")}>최신순</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("rating")}>평점 높은순</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("helpful")}>
                도움돼요 많은순
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("oldest")}>오래된순</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 리스트 카드 */}
      <div className={adminSurface.tableCard}>
        <div className="max-h-[70vh] overflow-x-auto overflow-y-auto">
          {/* 헤더 라벨 */}
          <div
            className={cn(
              "sticky top-0 z-[1] hidden items-center gap-x-3 border-b border-border bg-muted/40 lg:grid",
              GRID,
            )}
          >
            <div className={cn(adminDataTable.headCenter, "px-0 opacity-70")}>선택</div>
            <div className={adminDataTable.head}>작성자</div>
            <div className={adminDataTable.head}>후기 내용</div>
            <div className={adminDataTable.headCenter}>평점 / 도움돼요</div>
            <div className={adminDataTable.headRight}>작성일</div>
            <div className={adminDataTable.headCenter}>후기 유형</div>
            <div className={adminDataTable.headCenter}>관리자 검수</div>
            <div className={adminDataTable.actionHead}>관리</div>
          </div>

          {error ? (
            <div
              className={cn(
                "m-4 p-6 text-center text-destructive",
                adminSurface.cardMuted,
                adminTypography.body,
              )}
            >
              목록을 불러오지 못했습니다.
            </div>
          ) : !data && isValidating ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className={`grid grid-cols-1 lg:grid ${GRID} items-center gap-x-3 gap-y-2 rounded-md border border-border/40 px-3 py-3`}
                >
                  <Skeleton className="h-4 w-4" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="mx-auto h-5 w-10 rounded-full" />
                  <Skeleton className="justify-self-end h-8 w-8 rounded-md" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div
              className={cn(
                "m-4 p-6 text-center",
                adminSurface.cardMuted,
                adminTypography.metaMuted,
              )}
            >
              불러올 후기가 없습니다.
            </div>
          ) : (
            sortedRows.map((r) => {
              const isSel = selected.includes(r._id);
              const dim = r.status === "hidden" ? "opacity-60" : "";
              const { date, time } = safeSplitDate(r.createdAt);

              return (
                <div
                  key={r._id}
                  onClick={() => setDetail(r)}
                  className={[
                    "grid grid-cols-1 lg:grid",
                    GRID,
                    "items-center gap-y-2 gap-x-3 px-3",
                    compact ? "py-2" : "py-3",
                    "transition-colors cursor-pointer",
                    "even:bg-background hover:bg-primary/10",
                    "dark:even:bg-card dark:hover:bg-primary/20",
                    isSel ? "border-l-4 border-primary bg-primary/10 dark:bg-primary/20" : "",
                  ].join(" ")}
                >
                  {/* 체크박스 */}
                  <div className={`self-start md:self-center ${dim}`}>
                    <Checkbox
                      data-cy="row-checkbox"
                      checked={isSel}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={(v) => toggleSelectOne(r._id, !!v)}
                      aria-label={`${r.userEmail || "-"} 후기 선택`}
                      className="h-4 w-4 shrink-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>

                  {/* 작성자 */}
                  <div className={`min-w-0 ${dim}`}>
                    <div
                      className="truncate font-medium text-foreground"
                      title={r.userName || r.userEmail || "-"}
                    >
                      {r.userName || r.userEmail || "-"}
                    </div>
                    {r.userEmail && r.userName && (
                      <div
                        className="max-w-[180px] truncate text-[12px] text-muted-foreground"
                        title={r.userEmail}
                      >
                        {r.userEmail}
                      </div>
                    )}
                    {r.isDeleted && (
                      <div className="mt-0.5">
                        <Badge variant="secondary" className="h-5 shrink-0 whitespace-nowrap">
                          삭제됨
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* 후기 내용 */}
                  <div className={`min-w-0 ${dim}`}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p
                            className={[
                              "text-sm leading-5",
                              expanded[r._id] ? "whitespace-pre-wrap" : "line-clamp-2",
                              "break-keep",
                            ].join(" ")}
                          >
                            {r.content}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md bg-card text-foreground border dark:border-border shadow-md rounded-md p-3">
                          <p className="whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">
                            {r.content}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {r.content && r.content.length > 80 && (
                      <button
                        type="button"
                        className="mt-1 text-xs text-primary hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpanded((s) => ({ ...s, [r._id]: !s[r._id] }));
                        }}
                        aria-expanded={!!expanded[r._id]}
                      >
                        {expanded[r._id] ? "접기" : "더보기"}
                      </button>
                    )}
                  </div>

                  {/* 평점 / 도움돼요 */}
                  <div className={`min-w-0 ${dim} text-center`}>
                    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                      {renderStars(r.rating)}
                      <span className="text-[13px] text-foreground">{r.rating}/5</span>
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[11px] leading-none bg-card text-foreground border-border">
                        <ThumbsUp className="h-3 w-3" />
                        {r.helpfulCount ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* 작성일 */}
                  <div className={`min-w-0 ${dim} text-right tabular-nums`}>
                    <div className="text-foreground text-[13px]">{date}</div>
                    <div className="text-[12px] text-muted-foreground">{time}</div>
                  </div>

                  {/* 후기 유형 */}
                  <div
                    className={`min-w-0 ${dim} flex items-center justify-center gap-3 whitespace-nowrap`}
                  >
                    <ReviewContextBadge
                      reviewContext={r.reviewContext}
                      contextLabel={r.contextLabel}
                    />
                  </div>

                  {/* 공개 / 비공개*/}
                  <div
                    className={`min-w-0 ${dim} flex items-center justify-center gap-2 whitespace-nowrap`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="hidden xl:inline text-[12px] text-muted-foreground">
                      {r.moderationStatus === "visible" ? "관리자 공개" : "관리자 숨김"}
                    </span>
                    {r.isDeleted && <Badge variant="secondary">삭제됨</Badge>}
                    <div className="h-6 flex items-center">
                      <Switch
                        checked={r.moderationStatus === "visible"}
                        onCheckedChange={() => toggleVisible(r)}
                      />
                    </div>
                  </div>

                  {/* 액션 */}
                  <div className="justify-self-end pl-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-background dark:hover:bg-card"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-44 min-w-max"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuItem
                          onPointerDown={(e) => e.stopPropagation()}
                          onSelect={() => setDetail(r)}
                          className="cursor-pointer whitespace-nowrap"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          <span>상세 보기</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onPointerDown={(e) => e.stopPropagation()}
                          onSelect={() => toggleVisible(r)}
                          className="cursor-pointer whitespace-nowrap"
                        >
                          {r.status === "visible" ? (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              <span>비공개</span>
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              <span>공개</span>
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onPointerDown={(e) => e.stopPropagation()}
                          className="cursor-pointer whitespace-nowrap text-destructive focus:text-destructive"
                          onSelect={() => setPendingDeleteReviewId(r._id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>삭제</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 선택 액션 바 */}
        <div
          className={`transition-all duration-200 ${selected.length ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"}`}
        >
          <div className="w-full border-t border-border bg-primary/10 dark:bg-primary/20 px-4 py-2 flex items-center justify-between rounded-b-lg text-foreground">
            <span className="inline-flex items-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M9 16.2l-3.5-3.5 1.4-1.4L9 13.4l7.1-7.1 1.4 1.4z" />
              </svg>
              <span className="inline-flex items-center rounded-full bg-card ring-1 ring-ring text-primary font-semibold text-xs px-2 py-0.5">
                {selected.length}개 선택됨
              </span>
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelected([])}
                className="h-8 px-3 border-border text-primary hover:bg-primary/10 dark:border-border dark:text-primary dark:hover:bg-primary/20"
              >
                해제
              </Button>

              <Button
                data-cy="bulk-visible"
                variant="secondary"
                size="sm"
                onClick={() => doBulkUpdateStatus("visible")}
                className="h-8 px-3"
                aria-label="선택 공개로 변경"
                title="선택한 후기를 공개로 변경"
              >
                <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 11a4 4 0 110-8 4 4 0 010 8z" />
                </svg>
                선택 공개
              </Button>
              <Button
                data-cy="bulk-hidden"
                variant="outline"
                size="sm"
                onClick={() => doBulkUpdateStatus("hidden")}
                className="h-8 px-3"
                aria-label="선택 비공개로 변경"
                title="선택한 후기를 비공개로 변경"
              >
                <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M2 12s3-7 10-7a9.9 9.9 0 018.06 4.09l1.41-1.41 1.41 1.41-19 19-1.41-1.41L4.1 19.94A12.14 12.14 0 012 12zm10 5a5 5 0 005-5 4.93 4.93 0 00-.79-2.69l-6.9 6.9A4.93 4.93 0 0012 17z" />
                </svg>
                선택 비공개
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmBulkDeleteOpen(true)}
                className="h-8 px-3"
              >
                선택 삭제
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 상세 모달 */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="border border-border/70 bg-card shadow-2xl sm:max-w-2xl">
          <DialogHeader className="space-y-2 border-b border-border/60 pb-4">
            <DialogTitle className={adminTypography.sectionTitle}>후기 상세</DialogTitle>
            {detail && (
              <div className="flex flex-wrap items-center gap-2">
                <ReviewContextBadge
                  reviewContext={detail.reviewContext}
                  contextLabel={detail.contextLabel}
                />
                <Badge variant={detail.authorStatus === "visible" ? "default" : "secondary"}>
                  작성자 설정: {detail.authorStatus === "visible" ? "공개" : "비공개"}
                </Badge>
                <Badge variant={detail.moderationStatus === "visible" ? "default" : "secondary"}>
                  관리자 검수: {detail.moderationStatus === "visible" ? "공개" : "숨김"}
                </Badge>
                <Badge variant={detail.effectiveStatus === "visible" ? "default" : "secondary"}>
                  실제 노출: {detail.effectiveStatus === "visible" ? "공개" : "비공개"}
                </Badge>
                {(() => {
                  const dt = safeSplitDate(detail.createdAt);
                  return (
                    <span className={adminTypography.metaMuted + " inline-flex items-center gap-1"}>
                      <Calendar className="h-3.5 w-3.5" />
                      {dt.date} {dt.time}
                    </span>
                  );
                })()}
                <span className={adminTypography.metaMuted + " inline-flex items-center gap-1"}>
                  <ThumbsUp className="h-4 w-4" />
                  도움돼요 {detail?.helpfulCount ?? 0}
                </span>
              </div>
            )}
          </DialogHeader>
          {detail && (
            <div className="space-y-5 py-1">
              {/* 사진 섹션: 헤더와 분리해 항상 같은 위치/폭을 확보 */}
              <section className={adminSurface.cardMuted + " space-y-3 p-4"}>
                <div className="flex items-center justify-between gap-3">
                  <h4 className={adminTypography.panelTitle}>후기 사진</h4>
                  <span className={adminTypography.caption}>{photos.length}장</span>
                </div>
                {/* 로딩 스켈레톤: 상세를 불러오는 동안 자리 고정 */}
                {loadingPhotos && (
                  <div aria-hidden className="flex min-h-[72px] flex-wrap gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-16 w-16 animate-pulse rounded-md bg-muted" />
                    ))}
                  </div>
                )}
                {/* 실제 이미지: fullDetail.photos 우선, 없으면 detail.photos */}
                {photos.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {photos.map((src: string, i: number) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setViewerIndex(i);
                          setViewerOpen(true);
                        }}
                        className="relative h-16 w-16 overflow-hidden rounded-lg border border-border/70 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        aria-label={`후기 사진 ${i + 1} 크게 보기`}
                      >
                        <Image
                          src={src}
                          alt={`review-photo-${i}`}
                          fill
                          className="object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  !loadingPhotos && (
                    <p className={adminTypography.metaMuted}>첨부된 사진이 없습니다.</p>
                  )
                )}
              </section>

              <section className="grid grid-cols-1 gap-3 rounded-2xl border border-border/60 p-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <div className={adminTypography.caption}>작성자</div>
                  <div className={adminTypography.bodyStrong}>
                    {detail.userName || detail.userEmail || "-"}
                  </div>
                  {detail.userName && (
                    <div className={adminTypography.metaMuted + " break-all"}>
                      {detail.userEmail}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className={adminTypography.caption}>후기 대상</div>
                  <div className={adminTypography.bodyStrong}>{detail.subject || "-"}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {detail.orderId && (
                      <a
                        className="text-xs text-primary underline"
                        href={`/admin/orders/${detail.orderId}`}
                      >
                        주문
                      </a>
                    )}
                    {detail.rentalId && (
                      <a
                        className="text-xs text-primary underline"
                        href={`/admin/rentals/${detail.rentalId}`}
                      >
                        대여
                      </a>
                    )}
                    {detail.serviceApplicationId && (
                      <a
                        className="text-xs text-primary underline"
                        href={`/admin/applications/stringing/${detail.serviceApplicationId}`}
                      >
                        신청서
                      </a>
                    )}
                    {detail.productId && (
                      <a
                        className="text-xs text-primary underline"
                        href={`/admin/products/${detail.productId}/edit`}
                      >
                        상품
                      </a>
                    )}
                    {detail.racketId && (
                      <a
                        className="text-xs text-primary underline"
                        href={`/admin/rackets/${detail.racketId}/edit`}
                      >
                        라켓
                      </a>
                    )}
                    {detail.relatedProductIds?.map((id) => (
                      <a
                        key={`p-${id}`}
                        className="text-xs text-primary underline"
                        href={`/admin/products/${id}/edit`}
                      >
                        관련 상품
                      </a>
                    ))}
                    {detail.relatedRacketIds?.map((id) => (
                      <a
                        key={`r-${id}`}
                        className="text-xs text-primary underline"
                        href={`/admin/rackets/${id}/edit`}
                      >
                        관련 라켓
                      </a>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className={adminTypography.caption}>평점</div>
                  <div className="flex items-center gap-2">
                    {renderStars(detail.rating)}
                    <span className={adminTypography.bodyStrong}>{detail.rating}/5</span>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h4 className={adminTypography.panelTitle}>후기 본문</h4>
                <div
                  className={
                    adminSurface.cardMuted +
                    " whitespace-pre-wrap p-4 [overflow-wrap:anywhere] " +
                    adminTypography.body
                  }
                >
                  {detail.content || "-"}
                </div>
              </section>
            </div>
          )}
          <DialogFooter className="gap-2 border-t border-border/60 pt-4 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  if (!detail) return;
                  await toggleVisible(detail);
                  setDetail((d) =>
                    d
                      ? {
                          ...d,
                          status: d.status === "visible" ? "hidden" : "visible",
                        }
                      : d,
                  );
                }}
              >
                {detail?.status === "visible" ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-1" /> 비공개
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-1" /> 공개
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (!detail) return;
                  setPendingDeleteReviewId(detail._id);
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" /> 삭제
              </Button>
            </div>
            <Button variant="outline" onClick={() => setDetail(null)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ReviewPhotoDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        photos={fullDetail?.photos ?? detail?.photos ?? []}
        initialIndex={viewerIndex}
      />
      {/* 더 보기 */}
      <div className="flex justify-center">
        {rows.length > 0 &&
          (hasMore ? (
            <Button variant="outline" onClick={() => setSize(size + 1)} disabled={isValidating}>
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="sr-only">불러오는 중</span>
                </>
              ) : (
                "더 보기"
              )}
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">마지막 페이지입니다</span>
          ))}
      </div>
      {rows.length > 0 && isValidating && (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-1 gap-2 rounded-md border border-border/40 p-3 lg:grid-cols-[44px_minmax(90px,1fr)_minmax(240px,2.4fr)_minmax(96px,0.9fr)_minmax(110px,1fr)_minmax(84px,0.8fr)_minmax(72px,0.8fr)_56px] lg:items-center lg:gap-x-3"
            >
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="h-5 w-10 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-md justify-self-end" />
            </div>
          ))}
        </div>
      )}

      <AdminConfirmDialog
        open={pendingDeleteReviewId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteReviewId(null);
        }}
        onConfirm={() => {
          const reviewId = pendingDeleteReviewId;
          if (!reviewId) return;
          if (detail?._id === reviewId) setDetail(null);
          setPendingDeleteReviewId(null);
          void doDelete(reviewId);
        }}
        title="후기를 삭제할까요?"
        description="삭제된 후기는 고객 화면과 관리자 목록에서 사라질 수 있습니다."
        confirmText="삭제"
        severity="danger"
        eventKey="admin-review-list-delete-confirm"
      />

      <AdminConfirmDialog
        open={confirmBulkDeleteOpen}
        onOpenChange={setConfirmBulkDeleteOpen}
        onConfirm={() => {
          setConfirmBulkDeleteOpen(false);
          void doBulkDelete();
        }}
        title="선택한 후기를 삭제할까요?"
        description={`선택한 ${selected.length}개 후기는 고객 화면과 관리자 목록에서 사라질 수 있습니다.`}
        confirmText="선택 삭제"
        severity="danger"
        eventKey="admin-review-list-bulk-delete-confirm"
      />
    </div>
  );
}
