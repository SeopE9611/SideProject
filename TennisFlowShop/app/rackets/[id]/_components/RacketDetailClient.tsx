"use client";

import { CompareRacketItem, useRacketCompareStore } from "@/app/store/racketCompareStore";
import ProductDetailQnaTab from "@/app/products/[id]/ProductDetailQnaTab";
import SiteContainer from "@/components/layout/SiteContainer";
import { SummaryCard } from "@/components/public/SummaryCard";
import MaskedBlock from "@/components/reviews/MaskedBlock";
import ReviewContextBadge from "@/components/reviews/ReviewContextBadge";
import RecentViewedItems from "@/components/recent-viewed/RecentViewedItems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  merchandisingImageBadgeClass,
  merchandisingImageBadgeVariant,
  usedBadgeMeta,
} from "@/lib/badge-style";
import { gripSizeLabel, racketBrandLabel, stringPatternLabel } from "@/lib/constants";
import { normalizeReviewSummary } from "@/lib/reviews/review-summary";
import { normalizeItemShippingFee } from "@/lib/shipping-fee";
import { getEffectiveRacketPrice, getRacketDiscountRate } from "@/lib/racket-pricing";
import { addRecentViewedItem } from "@/lib/recent-viewed";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Scale,
  Settings,
  ShoppingCart,
  Star,
  Trash2,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

interface RacketDetailClientProps {
  racket: any;
  stock: {
    quantity: number;
    available: number;
  };
}

const RentDialog = dynamic(() => import("./RentDialog"), {
  loading: () => null,
});

const ReviewImageViewerDialog = dynamic(() => import("./ReviewImageViewerDialog"), {
  loading: () => null,
});

const ReviewEditDialog = dynamic(() => import("./ReviewEditDialog"), {
  loading: () => null,
});

export default function RacketDetailClient({ racket, stock }: RacketDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rentSectionRef = useRef<HTMLDivElement>(null);
  const [autoOpen, setAutoOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  type DetailTab = "description" | "specifications" | "reviews" | "qna";

  const initialTab = (searchParams.get("tab") as DetailTab) || "description";
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);

  useEffect(() => {
    const tab = (searchParams.get("tab") as DetailTab) || "description";
    setActiveTab(tab);
  }, [searchParams]);

  const updateTabInUrl = (tab: DetailTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };
  const soldOut = stock.available <= 0;

  // 라켓 ID 정규화
  const racketId = String(racket?.id ?? racket?._id ?? "");
  const racketShippingFee = normalizeItemShippingFee(racket?.shippingFee);
  const racketShippingLabel =
    racketShippingFee > 0 ? `${racketShippingFee.toLocaleString()}원 배송비` : "무료배송";
  const brandLabel = racketBrandLabel(racket?.brand);
  const salePrice = getEffectiveRacketPrice(racket);
  const discountRate = getRacketDiscountRate(racket);
  const hasSalePrice = discountRate > 0;

  useEffect(() => {
    if (!racketId || !racket?.model) return;
    const safePrice = Number(racket?.price);
    addRecentViewedItem({
      type: "racket",
      id: racketId,
      name: `${brandLabel} ${racket.model}`.trim(),
      subtitle: "라켓",
      image: racket?.images?.[0],
      href: `/rackets/${racketId}`,
      price: Number.isFinite(safePrice) ? safePrice : null,
    });
  }, [brandLabel, racket?.condition, racket?.images, racket?.model, racket?.price, racketId]);

  // 리뷰 탭 표시를 위한 데이터
  // - racket API에서 reviews/reviewSummary를 함께 내려주도록 되어 있어야 함
  const baseReviews = Array.isArray(racket?.reviews) ? racket.reviews : [];
  const reviewSummary = normalizeReviewSummary(racket?.reviewSummary);
  const reviewCount = reviewSummary.count;
  const averageRating = reviewSummary.average;
  const reviewsLen = baseReviews.length;

  const fetcher = async (url: string) => {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    return res.json();
  };

  // 로그인 여부 (내 비공개 후기는 /api/reviews/self로 원문을 받아 병합)
  const [user, setUser] = useState<any | null>(null);
  const [hasRequestedReviewUser, setHasRequestedReviewUser] = useState(false);
  const isReviewsTabActive = activeTab === "reviews";
  const isQnaTabActive = activeTab === "qna";

  useEffect(() => {
    if (hasRequestedReviewUser) return;
    setHasRequestedReviewUser(true);
    fetch("/api/users/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === "object" && "error" in data) setUser(null);
        else setUser(data);
      })
      .catch(() => setUser(null));
  }, [hasRequestedReviewUser]);

  const isAdmin =
    !!user &&
    ((user as any).role === "admin" ||
      (user as any).role === "ADMIN" ||
      (user as any).isAdmin === true ||
      (Array.isArray((user as any).roles) && (user as any).roles.includes("admin")));

  // 화면에 보이는 개수만큼만 가져와 병합(과한 트래픽 방지)
  const reviewsCount = reviewsLen || 10;
  const { data: adminReviews, mutate: mutateAdminReviews } = useSWR(
    isReviewsTabActive && isAdmin
      ? `/api/reviews/admin?productId=${racketId}&limit=${reviewsCount}`
      : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: myReview, mutate: mutateMyReview } = useSWR(
    isReviewsTabActive && user ? `/api/reviews/self?productId=${racketId}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const {
    data: qnaData,
    error: qnaError,
    isLoading: qnaLoading,
  } = useSWR(isQnaTabActive ? `/api/rackets/${racketId}/qna?page=1&limit=10` : null, fetcher, {
    revalidateOnFocus: false,
  });

  const isMine = (rv: any) =>
    !!rv?.ownedByMe ||
    (!!(myReview as any)?._id && String(rv?._id) === String((myReview as any)._id));

  // 서버가 내려준 racket.reviews는 숨김 리뷰를 마스킹
  // myReview가 있으면 동일 _id 항목을 원문으로 덮어쓰기 + 마스킹 해제
  // isAdmin이면 adminReviews로 표시 범위 내 항목을 원문으로 덮어쓰기 + 마스킹 해제
  const mergedReviews = useMemo(() => {
    let next = baseReviews;

    // 내 후기 덮어쓰기 (있을 때만)
    if (myReview && (myReview as any)._id) {
      const i = next.findIndex((r: any) => String(r._id) === String((myReview as any)._id));
      if (i !== -1) {
        next = [...next];
        next[i] = {
          ...next[i],
          user: (myReview as any).userName ?? next[i].user,
          rating: (myReview as any).rating ?? next[i].rating,
          content: (myReview as any).content,
          photos: (myReview as any).photos ?? [],
          masked: false,
          ownedByMe: true,
          status: (myReview as any).status,
        };
      }
    }

    // 관리자면 표시 중인 항목 범위에서 원문으로 덮어쓰기
    if (isAdmin && Array.isArray(adminReviews) && adminReviews.length > 0) {
      const map = new Map((adminReviews as any[]).map((r: any) => [String(r._id), r]));
      next = next.map((r: any) => {
        const raw = map.get(String(r._id));
        if (!raw) return r;
        return {
          ...r,
          user: raw.userName ?? r.user,
          rating: raw.rating ?? r.rating,
          content: raw.content,
          photos: raw.photos ?? [],
          status: raw.status,
          masked: false,
          adminView: true,
        };
      });
    }

    return next;
  }, [baseReviews, myReview, isAdmin, adminReviews]);

  const qnas = qnaData?.items ?? [];
  const qnaTotal = qnaData?.total ?? 0;

  // 인라인 수정 다이얼로그 상태/핸들러
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<{
    rating: number | "";
    content: string;
    photos: string[];
  }>({
    rating: "",
    content: "",
    photos: [],
  });
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);

  // 이미지 뷰어(확대) 전용 상태
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // 썸네일 클릭 → 뷰어 열기
  const openViewer = (images: string[], index = 0) => {
    if (!Array.isArray(images) || images.length === 0) return;
    setViewerImages(images);
    setViewerIndex(index);
    setViewerOpen(true);
  };
  const nextViewer = () => setViewerIndex((i) => (i + 1) % viewerImages.length);
  const prevViewer = () =>
    setViewerIndex((i) => (i - 1 + viewerImages.length) % viewerImages.length);

  const openEdit = (review: any) => {
    setEditing(review);
    setEditForm({
      rating: typeof review.rating === "number" ? review.rating : "",
      content: review.content ?? "",
      photos: Array.isArray(review.photos) ? review.photos : [],
    });
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditing(null);
  };

  const submitEdit = async () => {
    if (!editing?._id) return;
    setBusyReviewId(String(editing._id));
    const { rating, content } = editForm;

    // 낙관적 업데이트
    if (isMine(editing)) {
      mutateMyReview?.((prev: any) => {
        if (!prev?._id || String(prev._id) !== String(editing._id)) return prev;
        return {
          ...prev,
          rating: rating === "" ? prev.rating : Number(rating),
          content,
          photos: editForm.photos,
          ownedByMe: true,
          masked: false,
        };
      }, false);
    } else if (isAdmin) {
      mutateAdminReviews?.((prev: any[] | undefined) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((r) =>
          String(r._id) === String(editing._id)
            ? {
                ...r,
                rating: rating === "" ? r.rating : Number(rating),
                content,
                photos: editForm.photos,
                masked: false,
              }
            : r,
        );
      }, false);
    }

    try {
      const res = await fetch(`/api/reviews/${editing._id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: rating === "" ? undefined : Number(rating),
          content,
          photos: editForm.photos,
        }),
      });
      if (!res.ok) throw new Error("수정 실패");

      // 재검증
      if (isMine(editing)) await mutateMyReview?.();
      else if (isAdmin) await mutateAdminReviews?.();

      // 탭 유지 + 서버컴포넌트 리프레시
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "reviews");
      router.replace(`?${params.toString()}`, { scroll: false });
      router.refresh();

      showSuccessToast("후기를 수정했어요.");
      closeEdit();
    } catch (err: any) {
      if (isMine(editing)) await mutateMyReview?.();
      else if (isAdmin) await mutateAdminReviews?.();
      showErrorToast(err?.message || "후기 수정에 실패했습니다.");
    } finally {
      setBusyReviewId(null);
    }
  };

  // 대여중 수량(상세는 count를 굳이 안 받아도 quantity-available로 복원 가능)
  const rentedCount = Math.max(0, stock.quantity - stock.available);

  // 상태 구분
  const isSold = stock.quantity <= 0; // 판매 완료(보유 0)
  const isAllRented = !isSold && soldOut && rentedCount > 0; // 전량 대여중(임시 품절)

  const images = racket.images || [];
  const open = searchParams.get("open"); // 'rent' 면 자동 오픈

  // 비교(Compare) 연동
  const {
    items: compareItems,
    add: addToCompare,
    remove: removeFromCompare,
  } = useRacketCompareStore();

  const compareCount = useMemo(() => (compareItems || []).filter(Boolean).length, [compareItems]);
  const isCompared = useMemo(
    () => (compareItems || []).some((x: any) => x?.id === racketId),
    [compareItems, racketId],
  );

  const compareItem = useMemo<CompareRacketItem>(() => {
    const toNum = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    return {
      id: racketId,
      brand: racket?.brand ?? "",
      model: racket?.model ?? "",
      year: toNum(racket?.year),
      condition: racket?.condition,
      image: images?.[0],
      price: toNum(racket?.price),
      spec: {
        headSize: toNum(racket?.spec?.headSize),
        weight: toNum(racket?.spec?.weight),
        balance: toNum(racket?.spec?.balance),
        lengthIn: toNum(racket?.spec?.lengthIn),
        swingWeight: toNum(racket?.spec?.swingWeight),
        stiffnessRa: toNum(racket?.spec?.stiffnessRa),
        pattern: racket?.spec?.pattern,
        // 상세 페이지에서 비교 담기를 눌렀을 때도 그립 정보가 빠지지 않도록 포함
        gripSize: racket?.spec?.gripSize,
      },
    };
  }, [racketId, racket, images]);

  const toggleCompare = () => {
    if (!racketId) return;
    if (isCompared) {
      removeFromCompare(racketId);
      showSuccessToast("비교 목록에서 제거했습니다.");
      return;
    }
    // 최대 4개 제한 (스토어가 처리하더라도 UI에서 1차 방어)
    if (compareCount >= 4) {
      showErrorToast("비교는 최대 4개까지 가능합니다.");
      return;
    }
    addToCompare(compareItem);
    showSuccessToast("비교 목록에 담았습니다.");
  };

  useEffect(() => {
    if (open === "rent" && racket?.rental?.enabled) {
      setAutoOpen(true);
      // 가격/CTA 카드로 부드럽게 스크롤
      rentSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [open, racket?.rental?.enabled]);

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="min-h-full bg-background pb-24 bp-md:pb-10">
      <div className="relative border-b border-border/60 bg-card/70 py-4 text-foreground sm:py-5">
        <SiteContainer variant="wide" className="relative">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-ui-body-sm sm:gap-2.5 sm:text-ui-body">
              <Link
                href="/"
                className="shrink-0 whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
              >
                홈
              </Link>
              <span className="shrink-0 text-muted-foreground/60">/</span>
              <Link
                href="/rackets"
                className="shrink-0 whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
              >
                중고 라켓
              </Link>
              <span className="shrink-0 text-muted-foreground/60">/</span>
              <span className="min-w-0 flex-1 truncate break-keep font-medium text-foreground">
                {racketBrandLabel(racket.brand)} {racket.model}
              </span>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
              <Button
                variant="ghost"
                className="h-9 whitespace-nowrap rounded-xl px-2.5 text-ui-body-sm text-muted-foreground transition-[background-color,color,border-color,box-shadow,opacity] duration-200 hover:bg-muted/50 hover:text-foreground sm:px-3"
                onClick={() => router.back()}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                뒤로
              </Button>
              {isAdmin && racketId && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-9 whitespace-nowrap rounded-xl px-2.5 sm:px-3"
                >
                  <Link href={`/admin/rackets/${racketId}/edit`}>
                    <Pencil className="mr-1.5 h-4 w-4" />
                    라켓 수정
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-8 pb-12 md:pb-16">
        <div className="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-5">
          {/* 상품 이미지 */}
          <div className="space-y-4 lg:col-span-3">
            <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
              <div className="relative aspect-square">
                {images.length > 0 ? (
                  <Image
                    src={images[selectedImageIndex] || "/placeholder.svg"}
                    alt={`${racketBrandLabel(racket.brand)} ${racket.model}`}
                    fill
                    className="object-cover transition-transform duration-300 hover:scale-[1.02]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                    이미지 없음
                  </div>
                )}
                {images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl border border-border/60 bg-card/90 text-foreground shadow-sm hover:bg-card"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl border border-border/60 bg-card/90 text-foreground shadow-sm hover:bg-card"
                      onClick={nextImage}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {(racket?.marketing?.isFeatured || racket?.marketing?.isNew) && (
                  <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                    {racket?.marketing?.isFeatured && (
                      <Badge
                        variant={merchandisingImageBadgeVariant("추천")}
                        shape="pill"
                        className={cn(merchandisingImageBadgeClass)}
                      >
                        추천
                      </Badge>
                    )}
                    {racket?.marketing?.isNew && (
                      <Badge
                        variant={merchandisingImageBadgeVariant("NEW")}
                        shape="pill"
                        className={cn(merchandisingImageBadgeClass)}
                      >
                        NEW
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3">
                {images.slice(0, 5).map((image: string, index: number) => (
                  <Card
                    key={index}
                    className={`cursor-pointer overflow-hidden rounded-xl border border-border/60 transition-[border-color,box-shadow] duration-200 ${selectedImageIndex === index ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : "hover:border-border"}`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <div className="aspect-square relative">
                      <Image
                        src={image || "/placeholder.svg"}
                        alt={`${racketBrandLabel(racket.brand)} ${racket.model} ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* 상품 정보 */}
          <div className="space-y-4 lg:col-span-2">
            <SummaryCard
              eyebrow="Used racket"
              title={
                <div className="min-w-0 space-y-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge variant="outline">{racketBrandLabel(racket.brand)}</Badge>
                    <Badge variant="outline">
                      {usedBadgeMeta("condition", racket.condition).label}
                    </Badge>
                    <Badge variant="outline">
                      {soldOut
                        ? isAllRented
                          ? "전량 대여중"
                          : "품절"
                        : `재고 ${stock.available}개`}
                    </Badge>
                  </div>
                  <h1 className="min-w-0 break-words text-ui-page-title font-semibold leading-tight text-foreground lg:text-ui-page-title-lg">
                    {racket.model}
                  </h1>
                </div>
              }
              description={
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 sm:h-5 sm:w-5 ${i < Math.floor(averageRating) ? "fill-current text-foreground" : "fill-current text-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                  <span className="whitespace-nowrap text-ui-body-sm text-muted-foreground sm:text-ui-body">
                    {averageRating.toFixed(1)} ({reviewCount}개 후기)
                  </span>
                </div>
              }
              contentClassName="space-y-5"
            >
              {/* 가격 정보 */}
              <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                  {hasSalePrice ? (
                    <>
                      <span className="whitespace-nowrap tabular-nums text-ui-price-lg font-semibold tracking-normal text-foreground">
                        {salePrice.toLocaleString()}
                        <span className="ml-0.5 text-ui-section-title font-medium sm:text-ui-page-title">
                          원
                        </span>
                      </span>
                      <span className="whitespace-nowrap tabular-nums text-ui-card-title-lg text-muted-foreground/60 line-through sm:text-ui-section-title">
                        {racket.price?.toLocaleString()}원
                      </span>
                      <span className="shrink-0 whitespace-nowrap rounded-lg bg-destructive/10 px-2.5 py-1 text-ui-body-sm font-semibold text-destructive">
                        {discountRate}% OFF
                      </span>
                    </>
                  ) : (
                    <span className="whitespace-nowrap tabular-nums text-ui-price-lg font-semibold tracking-normal text-foreground">
                      {racket.price?.toLocaleString()}
                      <span className="ml-0.5 text-ui-section-title font-medium sm:text-ui-page-title">
                        원
                      </span>
                    </span>
                  )}
                </div>
                <div className="grid gap-2 text-ui-body-sm sm:text-ui-body">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">배송비</span>
                    <span className="whitespace-nowrap tabular-nums font-semibold text-foreground">
                      {racketShippingLabel}
                    </span>
                  </div>
                  {racket?.rental?.enabled && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">대여</span>
                      <span className="whitespace-nowrap tabular-nums font-semibold text-foreground">
                        7일 {Number(racket.rental?.fee?.d7 ?? 0).toLocaleString()}원 · 보증금{" "}
                        {Number(racket.rental?.deposit ?? 0).toLocaleString()}원
                      </span>
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-border bg-card p-3 text-ui-label leading-relaxed text-muted-foreground">
                  * 중고 상품 특성상 단순 변심 환불이 제한될 수 있어요.
                </div>
              </div>

              {/* CTA 영역 */}
              <div ref={rentSectionRef} className="space-y-4 border-t border-border pt-5">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <h2 className="text-ui-body font-semibold text-foreground">
                    이 라켓으로 무엇을 할까요?
                  </h2>
                  <p className="mt-1 break-keep text-ui-body-sm leading-relaxed text-muted-foreground">
                    구매 시 다음 단계에서 스트링을 선택하고 장착 정보를 함께 확인합니다. 라켓만 바로
                    결제되지 않아요.
                  </p>
                </div>
                <div className="grid gap-2.5">
                  <Button
                    wrap="responsive"
                    size="tall"
                    className="min-h-12 w-full px-3 sm:min-h-14"
                    onClick={() => router.push(`/rackets/${racketId}/select-string`)}
                    disabled={soldOut}
                    title={
                      soldOut
                        ? isAllRented
                          ? "현재 전량 대여중이라 구매/대여가 불가합니다. 반납 시 다시 가능합니다."
                          : "판매가 종료된 상품입니다."
                        : undefined
                    }
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {soldOut ? "품절(구매 불가)" : "스트링 선택하고 구매 계속"}
                  </Button>
                  {racket?.rental?.enabled ? (
                    soldOut ? (
                      <Button
                        size="tall"
                        className="min-h-12 w-full bg-muted text-muted-foreground sm:min-h-14 dark:bg-card dark:text-muted-foreground"
                        disabled
                        title="현재 대여 가능 수량이 없습니다."
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        품절(대여 불가)
                      </Button>
                    ) : (
                      <div className="min-w-0 [&_button]:min-h-12 [&_button]:w-full [&_button]:rounded-xl sm:[&_button]:min-h-14">
                        <RentDialog
                          id={racketId}
                          rental={racket.rental}
                          brand={brandLabel}
                          model={racket.model}
                          autoOpen={autoOpen}
                          full
                        />
                      </div>
                    )
                  ) : (
                    <Button
                      size="tall"
                      className="min-h-12 w-full bg-muted text-muted-foreground sm:min-h-14 dark:bg-card dark:text-muted-foreground"
                      disabled
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      대여 불가
                    </Button>
                  )}
                </div>
                {/* 비교 버튼(상세에서도 비교 담기/이동 가능) */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    className={`min-h-11 min-w-0 rounded-xl whitespace-normal break-keep px-2 text-ui-body-sm ${isCompared ? "bg-secondary border-border text-foreground hover:bg-secondary/80" : "bg-card border-border text-foreground"}`}
                    onClick={toggleCompare}
                    disabled={!racketId}
                    title={
                      !racketId
                        ? "상품 ID가 없어 비교 목록에 담을 수 없습니다."
                        : !isCompared && compareCount >= 4
                          ? "비교는 최대 4개까지 가능합니다."
                          : undefined
                    }
                  >
                    <Scale className="mr-2 h-4 w-4" />
                    비교담기 ({compareCount}/4)
                  </Button>

                  <Button
                    variant="outline"
                    className="min-h-11 min-w-0 rounded-xl whitespace-normal break-keep px-2 text-ui-body-sm"
                    onClick={() => router.push("/rackets/compare")}
                    disabled={compareCount < 2}
                    title={compareCount < 2 ? "비교는 최소 2개부터 가능합니다." : undefined}
                  >
                    비교하기
                  </Button>
                </div>

                {racket?.rental?.enabled === false && racket?.rental?.disabledReason && (
                  <div className="mt-3 break-keep rounded-xl border border-border bg-muted/20 p-3 text-ui-body-sm text-foreground">
                    대여 불가 사유: {racket.rental.disabledReason}
                  </div>
                )}
              </div>
            </SummaryCard>

            <div>
              <Link
                href="/rackets"
                className="text-ui-body-sm text-primary hover:underline inline-flex items-center"
              >
                <ArrowLeft className="mr-1 h-3 w-3" />
                목록으로
              </Link>
            </div>
          </div>
        </div>

        {/* 스펙 카드 */}
        <Card className="mt-10 min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:mt-12 sm:rounded-3xl">
          <CardContent className="p-0">
            <Tabs
              value={activeTab}
              onValueChange={(v) => updateTabInUrl(v as any)}
              className="w-full"
            >
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 border-b border-border bg-muted/30 p-1 sm:gap-1.5 sm:p-1.5 md:grid-cols-4">
                <TabsTrigger
                  value="description"
                  className="h-12 min-w-0 rounded-xl px-2 text-ui-body-sm font-medium leading-tight break-keep whitespace-normal transition-[background-color,color,border-color,box-shadow,opacity] duration-200 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:h-14 sm:px-3 sm:text-ui-body md:h-16"
                >
                  <FileText className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2 sm:h-5 sm:w-5" />
                  상품 설명
                </TabsTrigger>
                <TabsTrigger
                  value="specifications"
                  className="h-12 min-w-0 rounded-xl px-2 text-ui-body-sm font-medium leading-tight break-keep whitespace-normal transition-[background-color,color,border-color,box-shadow,opacity] duration-200 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:h-14 sm:px-3 sm:text-ui-body md:h-16"
                >
                  <Settings className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2 sm:h-5 sm:w-5" />
                  상세 스펙
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="h-12 min-w-0 rounded-xl px-2 text-ui-body-sm font-medium leading-tight break-keep whitespace-normal transition-[background-color,color,border-color,box-shadow,opacity] duration-200 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:h-14 sm:px-3 sm:text-ui-body md:h-16"
                >
                  <Star className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2 sm:h-5 sm:w-5" />
                  후기
                  <span className="ml-1 text-muted-foreground sm:ml-1.5">({reviewCount})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="qna"
                  className="h-12 min-w-0 rounded-xl px-2 text-ui-body-sm font-medium leading-tight break-keep whitespace-normal transition-[background-color,color,border-color,box-shadow,opacity] duration-200 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:h-14 sm:px-3 sm:text-ui-body md:h-16"
                >
                  <MessageSquare className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2 sm:h-5 sm:w-5" />
                  문의
                  <span className="ml-1 text-muted-foreground sm:ml-1.5">({qnaTotal})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="p-4 sm:p-6 md:p-8">
                <div className="prose max-w-none">
                  <div className="mb-5 flex min-w-0 items-center gap-3 sm:mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 bg-secondary text-foreground sm:h-12 sm:w-12">
                      <FileText className="h-4 w-4 sm:h-6 sm:w-6" />
                    </div>
                    <h3 className="break-keep text-ui-section-title font-semibold leading-tight text-foreground sm:text-ui-page-title">
                      상품 설명
                    </h3>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4 sm:rounded-2xl sm:p-6">
                    <p className="break-words break-keep text-ui-body-sm leading-relaxed text-muted-foreground sm:text-ui-body">
                      {racketBrandLabel(racket.brand)} {racket.model} 중고 라켓입니다. 상태 등급은{" "}
                      {usedBadgeMeta("condition", racket.condition).label}이며, 전문가의 검수를 거쳐
                      안전하게 사용하실 수 있습니다.
                      {racket?.rental?.enabled && " 대여 서비스도 이용 가능합니다."}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="specifications" className="p-4 sm:p-6 md:p-8">
                <div className="space-y-4 sm:space-y-6">
                  <div className="mb-5 flex min-w-0 items-center gap-3 sm:mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 bg-secondary text-foreground sm:h-12 sm:w-12">
                      <Settings className="h-4 w-4 sm:h-6 sm:w-6" />
                    </div>
                    <h3 className="break-keep text-ui-section-title font-semibold leading-tight text-foreground sm:text-ui-page-title">
                      상세 스펙
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                    {racket.spec?.weight && (
                      <div className="rounded-xl border border-border bg-muted/30 p-3.5 sm:p-4">
                        <div className="flex min-w-0 flex-col items-start gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                          <span className="text-ui-body-sm font-semibold text-foreground sm:text-ui-body">
                            무게
                          </span>
                          <span className="min-w-0 break-words text-left text-ui-body-sm font-medium text-muted-foreground sm:text-right sm:text-ui-body">
                            {racket.spec.weight} g
                          </span>
                        </div>
                      </div>
                    )}
                    {racket.spec?.balance && (
                      <div className="rounded-xl border border-border bg-muted/30 p-3.5 sm:p-4">
                        <div className="flex min-w-0 flex-col items-start gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                          <span className="text-ui-body-sm font-semibold text-foreground sm:text-ui-body">
                            밸런스
                          </span>
                          <span className="min-w-0 break-words text-left text-ui-body-sm font-medium text-muted-foreground sm:text-right sm:text-ui-body">
                            {racket.spec.balance} mm
                          </span>
                        </div>
                      </div>
                    )}
                    {racket.spec?.headSize && (
                      <div className="rounded-xl border border-border bg-muted/30 p-3.5 sm:p-4">
                        <div className="flex min-w-0 flex-col items-start gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                          <span className="text-ui-body-sm font-semibold text-foreground sm:text-ui-body">
                            헤드사이즈
                          </span>
                          <span className="min-w-0 break-words text-left text-ui-body-sm font-medium text-muted-foreground sm:text-right sm:text-ui-body">
                            {racket.spec.headSize} in²
                          </span>
                        </div>
                      </div>
                    )}
                    {racket.spec?.pattern && (
                      <div className="rounded-xl border border-border bg-muted/30 p-3.5 sm:p-4">
                        <div className="flex min-w-0 flex-col items-start gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                          <span className="text-ui-body-sm font-semibold text-foreground sm:text-ui-body">
                            패턴
                          </span>
                          {/* raw value(g2/16x19 등)를 그대로 노출하지 않고 공통 라벨로 통일 */}
                          <span className="min-w-0 break-words text-left text-ui-body-sm font-medium text-muted-foreground sm:text-right sm:text-ui-body">
                            {stringPatternLabel(String(racket.spec.pattern))}
                          </span>
                        </div>
                      </div>
                    )}
                    {racket.spec?.gripSize && (
                      <div className="rounded-xl border border-border bg-muted/30 p-3.5 sm:p-4">
                        <div className="flex min-w-0 flex-col items-start gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                          <span className="text-ui-body-sm font-semibold text-foreground sm:text-ui-body">
                            그립
                          </span>
                          {/* g2/G2/별칭 입력값이 와도 사용자에게는 읽기 쉬운 라벨로 표시 */}
                          <span className="min-w-0 break-words text-left text-ui-body-sm font-medium text-muted-foreground sm:text-right sm:text-ui-body">
                            {gripSizeLabel(String(racket.spec.gripSize))}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="rounded-xl border border-border bg-muted/30 p-3.5 sm:p-4">
                      <div className="flex min-w-0 flex-col items-start gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <span className="text-ui-body-sm font-semibold text-foreground sm:text-ui-body">
                          상태
                        </span>
                        <span className="min-w-0 break-words text-left text-ui-body-sm font-medium text-muted-foreground sm:text-right sm:text-ui-body">
                          상태: {usedBadgeMeta("condition", racket.condition).label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="reviews" className="p-4 sm:p-6 md:p-8">
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/30 text-primary sm:h-12 sm:w-12">
                        <Star className="h-4 w-4 sm:h-6 sm:w-6" />
                      </div>
                      <h3 className="break-keep text-ui-section-title font-semibold leading-tight text-foreground sm:text-ui-page-title">
                        고객 후기
                      </h3>
                    </div>

                    <Button
                      asChild
                      variant="outline"
                      className="h-9 shrink-0 border border-border bg-secondary text-ui-label text-foreground shadow-sm hover:bg-secondary/80 sm:h-10 sm:text-ui-body-sm"
                    >
                      <Link href="/mypage?tab=orders">
                        <Pencil className="mr-1.5 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                        이용내역에서 후기 작성
                      </Link>
                    </Button>
                  </div>
                  <p className="break-keep text-ui-body-sm text-muted-foreground">
                    구매확정 또는 대여확정된 이용내역에서 후기를 작성할 수 있어요.
                  </p>

                  {mergedReviews.length > 0 ? (
                    <div className="space-y-4 sm:space-y-6">
                      {mergedReviews.map((review: any, index: number) => (
                        <Card
                          key={String(review?._id ?? index)}
                          className="rounded-xl border border-border bg-card shadow-none sm:rounded-2xl"
                        >
                          <CardContent className="space-y-3 p-4 sm:p-6">
                            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 sm:gap-4">
                              <div className="flex min-w-0 items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-secondary text-ui-body-sm font-semibold text-foreground">
                                  {(review?.user ?? "익명").slice(0, 1)}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <div className="min-w-0 break-words font-semibold text-foreground sm:truncate">
                                      {review?.status === "hidden"
                                        ? review?.ownedByMe
                                          ? `${review?.user ?? "내 후기"} (비공개)`
                                          : "비공개 후기"
                                        : (review?.user ?? "익명")}
                                    </div>

                                    <ReviewContextBadge
                                      reviewContext={review?.reviewContext}
                                      contextLabel={review?.contextLabel}
                                    />

                                    {review?.status === "hidden" && (
                                      <Badge variant="outline" className="shrink-0 text-ui-label">
                                        비공개
                                      </Badge>
                                    )}
                                  </div>

                                  {review?.date ? (
                                    <div className="text-ui-label text-muted-foreground mt-0.5">
                                      {review.date}
                                    </div>
                                  ) : null}

                                  <div className="mt-1 flex flex-wrap items-center gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`h-4 w-4 ${i < Number(review?.rating ?? 0) ? "text-primary fill-primary" : "text-muted-foreground/40"}`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* 우측 상단 3점 메뉴 */}
                              <div className="shrink-0">
                                {(isAdmin || isMine(review)) && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-md hover:bg-muted/50 hover:text-foreground"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>

                                    <DropdownMenuContent align="end" className="w-44">
                                      {/* 비공개/공개 토글: 내 후기 or 관리자 */}
                                      <DropdownMenuItem
                                        onClick={async () => {
                                          if (!review?._id) return;

                                          const nextStatus =
                                            review?.status === "hidden" ? "visible" : "hidden";
                                          setBusyReviewId(String(review._id));

                                          // 낙관적 업데이트
                                          if (isMine(review)) {
                                            mutateMyReview?.((prev: any) => {
                                              if (
                                                !prev?._id ||
                                                String(prev._id) !== String(review._id)
                                              )
                                                return prev;
                                              return {
                                                ...prev,
                                                status: nextStatus,
                                              };
                                            }, false);
                                          } else if (isAdmin) {
                                            mutateAdminReviews?.((prev: any[] | undefined) => {
                                              if (!Array.isArray(prev)) return prev;
                                              return prev.map((r) =>
                                                String(r._id) === String(review._id)
                                                  ? {
                                                      ...r,
                                                      status: nextStatus,
                                                    }
                                                  : r,
                                              );
                                            }, false);
                                          }

                                          try {
                                            const res = await fetch(`/api/reviews/${review._id}`, {
                                              method: "PATCH",
                                              credentials: "include",
                                              headers: {
                                                "Content-Type": "application/json",
                                              },
                                              body: JSON.stringify({
                                                status: nextStatus,
                                              }),
                                            });
                                            if (!res.ok) throw new Error("상태 변경 실패");

                                            // 탭 유지 + 서버 리프레시
                                            const params = new URLSearchParams(
                                              searchParams.toString(),
                                            );
                                            params.set("tab", "reviews");
                                            router.replace(`?${params.toString()}`, {
                                              scroll: false,
                                            });
                                            router.refresh();

                                            showSuccessToast(
                                              nextStatus === "hidden"
                                                ? "비공개로 전환했어요."
                                                : "공개로 전환했어요.",
                                            );
                                          } catch (err: any) {
                                            // 롤백(재검증)
                                            if (isMine(review)) await mutateMyReview?.();
                                            else if (isAdmin) await mutateAdminReviews?.();
                                            showErrorToast(
                                              err?.message || "상태 변경에 실패했습니다.",
                                            );
                                          } finally {
                                            setBusyReviewId(null);
                                          }
                                        }}
                                      >
                                        {review?.status === "hidden" ? (
                                          <>
                                            <Eye className="mr-2 h-4 w-4" />
                                            공개로 전환
                                          </>
                                        ) : (
                                          <>
                                            <EyeOff className="mr-2 h-4 w-4" />
                                            비공개로 전환
                                          </>
                                        )}
                                      </DropdownMenuItem>

                                      {/* 수정: 내 후기 or 관리자 */}
                                      <DropdownMenuItem onClick={() => openEdit(review)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        수정하기
                                      </DropdownMenuItem>

                                      {/* 삭제: 관리자만 */}
                                      {isAdmin && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={async () => {
                                              if (!review?._id) return;
                                              if (!confirm("정말 삭제할까요?")) return;

                                              setBusyReviewId(String(review._id));
                                              try {
                                                const res = await fetch(
                                                  `/api/reviews/${review._id}`,
                                                  {
                                                    method: "DELETE",
                                                    credentials: "include",
                                                  },
                                                );
                                                if (!res.ok) throw new Error("삭제 실패");

                                                // 재검증 + 탭 유지
                                                await mutateAdminReviews?.();
                                                const params = new URLSearchParams(
                                                  searchParams.toString(),
                                                );
                                                params.set("tab", "reviews");
                                                router.replace(`?${params.toString()}`, {
                                                  scroll: false,
                                                });
                                                router.refresh();

                                                showSuccessToast("후기를 삭제했어요.");
                                              } catch (err: any) {
                                                showErrorToast(
                                                  err?.message || "후기 삭제에 실패했습니다.",
                                                );
                                              } finally {
                                                setBusyReviewId(null);
                                              }
                                            }}
                                          >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            삭제하기
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>

                            {review?.masked ? (
                              <MaskedBlock />
                            ) : (
                              <p className="whitespace-pre-line break-words text-ui-body-sm leading-relaxed text-foreground">
                                {review?.content || ""}
                              </p>
                            )}

                            {/* 이미지 썸네일 → 뷰어 */}
                            {Array.isArray(review?.photos) && review.photos.length > 0 ? (
                              <div className="flex gap-2 overflow-x-auto pb-1 sm:gap-3">
                                {review.photos.slice(0, 4).map((src: string, i: number) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => openViewer(review.photos, i)}
                                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted sm:rounded-xl"
                                    title="확대 보기"
                                  >
                                    <Image
                                      src={src}
                                      alt={`후기 이미지 ${i + 1}`}
                                      fill
                                      className="object-cover"
                                    />
                                    {/* 4장 넘어가면 +N 표시 */}
                                    {i === 3 && review.photos.length > 4 ? (
                                      <div className="absolute inset-0 flex items-center justify-center bg-foreground/45 text-ui-body-sm font-semibold text-background">
                                        +{review.photos.length - 4}
                                      </div>
                                    ) : null}
                                  </button>
                                ))}
                              </div>
                            ) : null}

                            {/* 작업 중 오버레이 */}
                            {busyReviewId && String(busyReviewId) === String(review?._id) ? (
                              <div className="flex items-center gap-2 pt-2 text-ui-label text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                처리 중...
                              </div>
                            ) : null}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border bg-muted/30 p-4 text-ui-body-sm text-muted-foreground sm:rounded-2xl sm:p-6">
                      아직 등록된 후기가 없습니다.
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="qna" className="p-4 sm:p-6 md:p-8">
                <ProductDetailQnaTab
                  productId={racketId}
                  productName={`${brandLabel} ${racket.model}`.trim()}
                  qnas={qnas}
                  qnaLoading={qnaLoading}
                  qnaError={qnaError}
                  targetType="racket"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <RecentViewedItems currentType="racket" currentId={racketId} />
      </SiteContainer>

      {/* 모달성 후기 UI는 필요 시점에만 로드 */}
      {viewerOpen ? (
        <ReviewImageViewerDialog
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          images={viewerImages}
          index={viewerIndex}
          onPrev={prevViewer}
          onNext={nextViewer}
        />
      ) : null}

      {editOpen && editing ? (
        <ReviewEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          editForm={editForm}
          setEditForm={setEditForm}
          hoverRating={hoverRating}
          setHoverRating={setHoverRating}
          busy={!!busyReviewId}
          onClose={closeEdit}
          onSubmit={submitEdit}
        />
      ) : null}
    </div>
  );
}
