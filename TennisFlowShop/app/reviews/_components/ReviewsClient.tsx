"use client";

import useSWRInfinite from "swr/infinite";
import { useMemo, useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/public";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2, X, MessageSquareText, RefreshCw, SlidersHorizontal } from "lucide-react";
import ReviewCard from "./ReviewCard";
import ReviewSkeleton from "./ReviewSkeleton";

type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";
type ReviewTab = "product" | "service" | "rental" | "all";
type SortKey = "latest" | "helpful" | "rating";

type Item = {
  _id: string;
  type: "product" | "service" | "rental";
  productId?: string;
  productName?: string;
  productImage?: string;
  service?: string;
  serviceApplicationId?: string;
  serviceTitle?: string;
  serviceTargetName?: string;
  userName: string;
  rating: number;
  content: string;
  photos?: string[];
  helpfulCount: number;
  createdAt: string;
  votedByMe?: boolean;
};

const categories: Array<{ value: ReviewTab; label: string }> = [
  { value: "all", label: "전체" },
  { value: "product", label: "상품" },
  { value: "service", label: "교체서비스" },
  { value: "rental", label: "대여" },
];
const sortLabels: Record<SortKey, string> = { latest: "최신순", helpful: "도움순", rating: "평점순" };

const getReviewListErrorMessage = (status: number, payload: unknown) => {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return status >= 500 ? "서버 오류로 후기를 불러오지 못했습니다." : "후기를 불러오지 못했습니다.";
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    let payload: unknown = null;
    try { payload = await response.json(); } catch {}
    throw new Error(getReviewListErrorMessage(response.status, payload));
  }
  return response.json();
};

export default function ReviewsClient() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<ReviewTab>(initialTab === "product" || initialTab === "service" || initialTab === "rental" ? initialTab : "all");
  const [sort, setSort] = useState<SortKey>("latest");
  const [rating, setRating] = useState<RatingFilter>("all");
  const [hasPhoto, setHasPhoto] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [draftSort, setDraftSort] = useState<SortKey>(sort);
  const [draftRating, setDraftRating] = useState<RatingFilter>(rating);
  const [draftHasPhoto, setDraftHasPhoto] = useState(hasPhoto);

  const getKey = useCallback((pageIndex: number, prev: any) => {
    if (prev && !prev.nextCursor) return null;
    const cursor = pageIndex === 0 ? "" : `&cursor=${encodeURIComponent(prev.nextCursor)}`;
    const q = [`type=${tab}`, "withHidden=mask", `sort=${sort}`, rating !== "all" ? `rating=${rating}` : "", hasPhoto ? "hasPhoto=1" : "", "limit=10", cursor].filter(Boolean).join("&");
    return `/api/reviews?${q}`;
  }, [tab, sort, rating, hasPhoto]);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch("/api/users/me", { credentials: "include" })
      .then((r) => r.json())
      .then((u) => {
        const flag = u?.role === "admin" || u?.role === "ADMIN" || u?.isAdmin === true || (Array.isArray(u?.roles) && u.roles.includes("admin"));
        setIsAdmin(Boolean(flag));
        setIsLoggedIn(!!u && !u?.error);
      })
      .catch(() => { setIsAdmin(false); setIsLoggedIn(false); });
  }, []);

  const { data, size, setSize, isValidating, mutate, error } = useSWRInfinite(getKey, fetcher, { revalidateFirstPage: false, persistSize: true });
  const items = useMemo<Item[]>(() => (data ? data.flatMap((d: any) => d.items as Item[]) : []), [data]);
  const hasMore = useMemo(() => (data ? Boolean(data[data.length - 1]?.nextCursor) : true), [data]);
  const isFirstLoading = !data && isValidating;
  const isInitialError = !data && Boolean(error);
  const isLoadMoreError = Boolean(data?.length && error);
  const activeFilterCount = (sort !== "latest" ? 1 : 0) + (rating !== "all" ? 1 : 0) + (hasPhoto ? 1 : 0);
  const activeChips = [
    sort !== "latest" ? { key: "sort", label: sortLabels[sort], onRemove: () => setSort("latest") } : null,
    rating !== "all" ? { key: "rating", label: `${rating}점`, onRemove: () => setRating("all") } : null,
    hasPhoto ? { key: "photo", label: "사진 포함", onRemove: () => setHasPhoto(false) } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; onRemove: () => void }>;

  const resetFilters = () => {
    setTab("all"); setSort("latest"); setRating("all"); setHasPhoto(false);
    mutate([], { revalidate: true });
  };

  const openMobileFilters = () => {
    setDraftSort(sort);
    setDraftRating(rating);
    setDraftHasPhoto(hasPhoto);
    setMobileFilterOpen(true);
  };

  const resetDraftFilters = () => {
    setDraftSort("latest");
    setDraftRating("all");
    setDraftHasPhoto(false);
  };

  const applyMobileFilters = () => {
    setSort(draftSort);
    setRating(draftRating);
    setHasPhoto(draftHasPhoto);
    setMobileFilterOpen(false);
  };

  return (
    <div className="space-y-5 bp-md:space-y-6">
      <Card variant="feature" className="rounded-panel">
        <CardContent className="space-y-4 p-4 bp-md:p-5">
          <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="후기 유형 선택">
            <div className="flex min-w-max gap-2">
              {categories.map((category) => {
                const selected = tab === category.value;
                return <button key={category.value} type="button" role="tab" aria-selected={selected} aria-current={selected ? "page" : undefined} onClick={() => setTab(category.value)} className="min-h-11 whitespace-nowrap rounded-control border border-border px-4 text-ui-body-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[selected=true]:border-brand-highlight/45 data-[selected=true]:bg-brand-highlight-muted data-[selected=true]:text-brand-highlight-foreground dark:data-[selected=true]:text-brand-highlight" data-selected={selected}>{category.label}</button>;
              })}
            </div>
          </div>

          <div className="hidden flex-wrap items-center gap-3 bp-md:flex">
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-10 w-[150px] rounded-control border-border bg-background"><SelectValue placeholder="정렬" /></SelectTrigger>
              <SelectContent><SelectItem value="latest">최신순</SelectItem><SelectItem value="helpful">도움돼요 많은순</SelectItem><SelectItem value="rating">평점 높은순</SelectItem></SelectContent>
            </Select>
            <Select value={rating} onValueChange={(v) => setRating(v as RatingFilter)}>
              <SelectTrigger className="h-10 w-[140px] rounded-control border-border bg-background"><SelectValue placeholder="전체 별점" /></SelectTrigger>
              <SelectContent><SelectItem value="all">전체 별점</SelectItem><SelectItem value="5">★ 5점만</SelectItem><SelectItem value="4">★ 4점만</SelectItem><SelectItem value="3">★ 3점만</SelectItem><SelectItem value="2">★ 2점만</SelectItem><SelectItem value="1">★ 1점만</SelectItem></SelectContent>
            </Select>
            <label className="inline-flex min-h-10 items-center gap-2 rounded-control border border-border bg-card px-3 text-ui-body-sm font-medium text-foreground">
              <Checkbox checked={hasPhoto} onCheckedChange={(v) => setHasPhoto(Boolean(v))} className="rounded border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary" />
              사진 포함
            </label>
            <Button variant="outline" size="sm" onClick={resetFilters} className="ml-auto h-10 rounded-control"><X className="h-4 w-4" />초기화</Button>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2 bp-md:hidden">
            <Button type="button" variant="outline" className="min-h-11 justify-start rounded-control" onClick={openMobileFilters} aria-label={`정렬 변경, 현재 ${sortLabels[sort]}`}>{sortLabels[sort]}</Button>
            <Button type="button" variant="outline" className="min-h-11 rounded-control" onClick={openMobileFilters} aria-label={`필터 열기, 활성 필터 ${activeFilterCount}개`}><SlidersHorizontal className="h-4 w-4" />필터 {activeFilterCount ? activeFilterCount : ""}</Button>
            <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
              <SheetContent side="bottom" className="rounded-t-panel pb-[calc(env(safe-area-inset-bottom)+1.5rem)]" data-kakao-widget-hide="1">
                <SheetHeader className="pr-8 text-left"><SheetTitle>후기 필터</SheetTitle><SheetDescription>정렬, 별점, 사진 포함 조건을 선택해 후기를 좁혀보세요.</SheetDescription></SheetHeader>
                <div className="grid gap-5 py-5">
                  <div className="grid gap-2"><label className="text-ui-label font-semibold text-foreground">정렬</label><Select value={draftSort} onValueChange={(v) => setDraftSort(v as SortKey)}><SelectTrigger className="min-h-11 rounded-control"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="latest">최신순</SelectItem><SelectItem value="helpful">도움돼요 많은순</SelectItem><SelectItem value="rating">평점 높은순</SelectItem></SelectContent></Select></div>
                  <div className="grid gap-2"><label className="text-ui-label font-semibold text-foreground">별점</label><Select value={draftRating} onValueChange={(v) => setDraftRating(v as RatingFilter)}><SelectTrigger className="min-h-11 rounded-control"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">전체 별점</SelectItem><SelectItem value="5">★ 5점만</SelectItem><SelectItem value="4">★ 4점만</SelectItem><SelectItem value="3">★ 3점만</SelectItem><SelectItem value="2">★ 2점만</SelectItem><SelectItem value="1">★ 1점만</SelectItem></SelectContent></Select></div>
                  <label className="flex min-h-11 items-center gap-3 rounded-control border border-border p-3 text-ui-body-sm font-medium"><Checkbox checked={draftHasPhoto} onCheckedChange={(v) => setDraftHasPhoto(Boolean(v))} />사진 포함 후기만 보기</label>
                </div>
                <SheetFooter className="gap-2 sm:space-x-0"><Button type="button" variant="outline" onClick={resetDraftFilters}>필터 초기화</Button><Button type="button" variant="highlight" onClick={applyMobileFilters}>결과 보기</Button></SheetFooter>
              </SheetContent>
            </Sheet>
          </div>

          {activeChips.length > 0 ? <div className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="활성 필터">{activeChips.map((chip) => <Badge key={chip.key} variant="secondary" className="gap-1 rounded-full px-3 py-1"><span>{chip.label}</span><button type="button" onClick={chip.onRemove} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${chip.label} 필터 제거`}><X className="h-3 w-3" /></button></Badge>)}</div> : null}
        </CardContent>
      </Card>

      {isFirstLoading && <div className="grid grid-cols-1 gap-4 bp-lg:grid-cols-2"><ReviewSkeleton /><div className="hidden bp-lg:block"><ReviewSkeleton /></div></div>}

      {!isFirstLoading && <>
        {isInitialError ? <EmptyState icon={<MessageSquareText className="h-8 w-8" />} title="후기를 불러오지 못했습니다" description={error?.message || "잠시 후 다시 시도해 주세요."} action={<Button variant="outline" onClick={() => mutate()} className="rounded-control"><RefreshCw className="mr-2 h-4 w-4" />다시 시도</Button>} /> : items.length > 0 ? <div className="grid grid-cols-1 gap-4 bp-lg:grid-cols-2">{items.map((it) => <ReviewCard key={it._id} item={it} isAdmin={isAdmin} isLoggedIn={isLoggedIn} onMutate={() => mutate()} />)}</div> : <EmptyState icon={<MessageSquareText className="h-8 w-8" />} title="조건에 맞는 후기가 없습니다" description="필터를 초기화하거나 작성 가능한 후기를 확인해 보세요." action={<div className="grid gap-2 bp-sm:flex"><Button variant="outline" onClick={resetFilters}>필터 초기화</Button><Button asChild variant="highlight"><Link href="/mypage?tab=orders&scope=todo">작성 가능한 후기 확인</Link></Button></div>} />}
        {isLoadMoreError ? <div className="flex justify-center pt-4"><Button variant="outline" onClick={() => mutate()} className="rounded-control"><RefreshCw className="mr-2 h-4 w-4" />다시 시도</Button></div> : null}
        <div className="flex justify-center pt-4">{!isInitialError && !isLoadMoreError && hasMore ? <Button onClick={() => setSize(size + 1)} disabled={isValidating} variant="outline" className="rounded-control border-border bg-background px-6 py-2 hover:bg-card bp-md:px-8">{isValidating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /><Skeleton aria-hidden className="h-4 w-16 rounded-full" /><span className="sr-only">후기를 불러오는 중입니다</span></> : "더 보기"}</Button> : !isInitialError && items.length > 0 && !isValidating ? <div className="py-6 text-center text-ui-body-sm text-muted-foreground">마지막 페이지입니다</div> : null}</div>
      </>}
    </div>
  );
}
