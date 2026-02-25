'use client';

import RentDialog from '@/app/rackets/[id]/_components/RentDialog';
import { CompareRacketItem, useRacketCompareStore } from '@/app/store/racketCompareStore';
import StatusBadge from '@/components/badges/StatusBadge';
import SiteContainer from '@/components/layout/SiteContainer';
import HeroCourtBackdrop from '@/components/system/HeroCourtBackdrop';
import MaskedBlock from '@/components/reviews/MaskedBlock';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { racketBrandLabel } from '@/lib/constants';
import { racketStockBadgeVariant } from '@/lib/badge-style';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { ArrowLeft, Calendar, Check, ChevronLeft, ChevronRight, FileText, Pencil, Scale, Settings, Shield, ShoppingCart, Star, Truck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';

import PhotosReorderGrid from '@/components/reviews/PhotosReorderGrid';
import PhotosUploader from '@/components/reviews/PhotosUploader';

import { Eye, EyeOff, Loader2, MoreHorizontal, Trash2 } from 'lucide-react';

interface RacketDetailClientProps {
  racket: any;
  stock: {
    quantity: number;
    available: number;
  };
}

export default function RacketDetailClient({ racket, stock }: RacketDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rentSectionRef = useRef<HTMLDivElement>(null);
  const [autoOpen, setAutoOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  type DetailTab = 'description' | 'specifications' | 'reviews';

  const initialTab = (searchParams.get('tab') as DetailTab) || 'description';
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);

  useEffect(() => {
    const tab = (searchParams.get('tab') as DetailTab) || 'description';
    setActiveTab(tab);
  }, [searchParams]);

  const updateTabInUrl = (tab: DetailTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };
  const soldOut = stock.available <= 0;

  // 라켓 ID 정규화
  const racketId = String(racket?.id ?? racket?._id ?? '');
  const canBuy = !soldOut && racketId !== '';

  // 리뷰 탭 표시를 위한 데이터
  // - racket API에서 reviews/reviewSummary를 함께 내려주도록 되어 있어야 함
  const baseReviews = Array.isArray(racket?.reviews) ? racket.reviews : [];
  const reviewsLen = baseReviews.length;

  const fetcher = async (url: string) => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return null;
    return res.json();
  };

  // 로그인 여부 (내 비공개 리뷰는 /api/reviews/self로 원문을 받아 병합)
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/users/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === 'object' && 'error' in data) setUser(null);
        else setUser(data);
      })
      .catch(() => setUser(null));
  }, []);

  const isAdmin = !!user && ((user as any).role === 'admin' || (user as any).role === 'ADMIN' || (user as any).isAdmin === true || (Array.isArray((user as any).roles) && (user as any).roles.includes('admin')));

  // 화면에 보이는 개수만큼만 가져와 병합(과한 트래픽 방지)
  const reviewsCount = reviewsLen || 10;
  const { data: adminReviews, mutate: mutateAdminReviews } = useSWR(isAdmin ? `/api/reviews/admin?productId=${racketId}&limit=${reviewsCount}` : null, fetcher, { revalidateOnFocus: false });
  const { data: myReview, mutate: mutateMyReview } = useSWR(user ? `/api/reviews/self?productId=${racketId}` : null, fetcher, { revalidateOnFocus: false });

  const isMine = (rv: any) => !!rv?.ownedByMe || (!!(myReview as any)?._id && String(rv?._id) === String((myReview as any)._id));

  // 서버가 내려준 racket.reviews는 숨김 리뷰를 마스킹
  // myReview가 있으면 동일 _id 항목을 원문으로 덮어쓰기 + 마스킹 해제
  // isAdmin이면 adminReviews로 표시 범위 내 항목을 원문으로 덮어쓰기 + 마스킹 해제
  const mergedReviews = useMemo(() => {
    let next = baseReviews;

    // 내 리뷰 덮어쓰기 (있을 때만)
    if (myReview && (myReview as any)._id) {
      const i = next.findIndex((r: any) => String(r._id) === String((myReview as any)._id));
      if (i !== -1) {
        next = [...next];
        next[i] = {
          ...next[i],
          user: (myReview as any).userName ?? next[i].user,
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

  // 인라인 수정 다이얼로그 상태/핸들러
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<{ rating: number | ''; content: string; photos: string[] }>({
    rating: '',
    content: '',
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
  const closeViewer = () => setViewerOpen(false);
  const nextViewer = () => setViewerIndex((i) => (i + 1) % viewerImages.length);
  const prevViewer = () => setViewerIndex((i) => (i - 1 + viewerImages.length) % viewerImages.length);

  const openEdit = (review: any) => {
    setEditing(review);
    setEditForm({
      rating: typeof review.rating === 'number' ? review.rating : '',
      content: review.content ?? '',
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
        return { ...prev, rating: rating === '' ? prev.rating : Number(rating), content, photos: editForm.photos, ownedByMe: true, masked: false };
      }, false);
    } else if (isAdmin) {
      mutateAdminReviews?.((prev: any[] | undefined) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((r) => (String(r._id) === String(editing._id) ? { ...r, rating: rating === '' ? r.rating : Number(rating), content, photos: editForm.photos, masked: false } : r));
      }, false);
    }

    try {
      const res = await fetch(`/api/reviews/${editing._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: rating === '' ? undefined : Number(rating), content, photos: editForm.photos }),
      });
      if (!res.ok) throw new Error('수정 실패');

      // 재검증
      if (isMine(editing)) await mutateMyReview?.();
      else if (isAdmin) await mutateAdminReviews?.();

      // 탭 유지 + 서버컴포넌트 리프레시
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'reviews');
      router.replace(`?${params.toString()}`, { scroll: false });
      router.refresh();

      showSuccessToast('리뷰를 수정했어요.');
      closeEdit();
    } catch (err: any) {
      if (isMine(editing)) await mutateMyReview?.();
      else if (isAdmin) await mutateAdminReviews?.();
      showErrorToast(err?.message || '리뷰 수정에 실패했습니다.');
    } finally {
      setBusyReviewId(null);
    }
  };

  // 대여중 수량(상세는 count를 굳이 안 받아도 quantity-available로 복원 가능)
  const rentedCount = Math.max(0, stock.quantity - stock.available);

  // 상태 구분
  const isSold = stock.quantity <= 0; // 판매 완료(보유 0)
  const isAllRented = !isSold && soldOut && rentedCount > 0; // 전량 대여중(임시 품절)

  // 버튼/라벨용 문구
  const stockLabel = isSold ? '판매 완료' : isAllRented ? `전량 대여중 (${rentedCount}/${stock.quantity})` : `가용 ${stock.available}/${stock.quantity}${rentedCount > 0 ? ` · 대여중 ${rentedCount}` : ''}`;
  const rentalState = !racket?.rental?.enabled || isSold ? 'unavailable' : isAllRented ? 'rented' : 'available';

  const images = racket.images || [];
  const open = searchParams.get('open'); // 'rent' 면 자동 오픈

  // 비교(Compare) 연동
  const { items: compareItems, add: addToCompare, remove: removeFromCompare } = useRacketCompareStore();

  const compareCount = useMemo(() => (compareItems || []).filter(Boolean).length, [compareItems]);
  const isCompared = useMemo(() => (compareItems || []).some((x: any) => x?.id === racketId), [compareItems, racketId]);

  const compareItem = useMemo<CompareRacketItem>(() => {
    const toNum = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    return {
      id: racketId,
      brand: racket?.brand ?? '',
      model: racket?.model ?? '',
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
      },
    };
  }, [racketId, racket, images]);

  const toggleCompare = () => {
    if (!racketId) return;
    if (isCompared) {
      removeFromCompare(racketId);
      showSuccessToast('비교 목록에서 제거했습니다.');
      return;
    }
    // 최대 4개 제한 (스토어가 처리하더라도 UI에서 1차 방어)
    if (compareCount >= 4) {
      showErrorToast('비교는 최대 4개까지 가능합니다.');
      return;
    }
    addToCompare(compareItem);
    showSuccessToast('비교 목록에 담았습니다.');
  };

  useEffect(() => {
    if (open === 'rent' && racket?.rental?.enabled) {
      setAutoOpen(true);
      // 가격/CTA 카드로 부드럽게 스크롤
      rentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [open, racket?.rental?.enabled]);

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="min-h-full bg-muted/30">
      {/* Hero Section with Breadcrumb */}
      <div className="relative bg-muted text-foreground py-8 border border-primary/20 rounded-2xl">
        <div className="absolute inset-0 bg-overlay/20"></div>
        <HeroCourtBackdrop className="h-full w-full text-primary opacity-[0.10] dark:opacity-[0.12]" />
        <SiteContainer variant="wide" className="relative z-10">
          <div className="flex items-center gap-2 text-sm mb-4 opacity-90">
            <Link href="/" className="hover:text-primary transition-colors">
              홈
            </Link>
            <span>/</span>
            <Link href="/rackets" className="hover:text-primary transition-colors">
              중고 라켓
            </Link>
            <span>/</span>
            <span className="text-primary">
              {racketBrandLabel(racket.brand)} {racket.model}
            </span>
          </div>
          <Button variant="ghost" className="mb-4 p-0 text-primary hover:bg-primary/10 dark:hover:bg-primary/20" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            이전 페이지로
          </Button>
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-8 pb-28 md:pb-24">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* 상품 이미지 */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="overflow-hidden border-0 shadow-2xl bg-card/90 backdrop-blur-sm dark:bg-card/90">
              <div className="relative aspect-square">
                {images.length > 0 ? (
                  <Image src={images[selectedImageIndex] || '/placeholder.svg'} alt={`${racketBrandLabel(racket.brand)} ${racket.model}`} fill className="object-cover transition-transform duration-300 hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">이미지 없음</div>
                )}
                {images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 text-foreground border border-border shadow-sm hover:bg-background dark:bg-background/30 dark:hover:bg-background/40"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 text-foreground border border-border shadow-sm hover:bg-background dark:bg-background/30 dark:hover:bg-background/40"
                      onClick={nextImage}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge variant="brand">중고</Badge>
                  <StatusBadge kind="rental" state={rentalState} />
                </div>
              </div>
            </Card>

            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.slice(0, 5).map((image: string, index: number) => (
                  <Card key={index} className={`overflow-hidden cursor-pointer transition-all duration-200 ${selectedImageIndex === index ? 'ring-2 ring-ring shadow-lg' : 'hover:shadow-md'}`} onClick={() => setSelectedImageIndex(index)}>
                    <div className="aspect-square relative">
                      <Image src={image || '/placeholder.svg'} alt={`${racketBrandLabel(racket.brand)} ${racket.model} ${index + 1}`} fill className="object-cover" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* 상품 정보 */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-0 shadow-xl bg-card/90 backdrop-blur-sm dark:bg-card/90">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* 브랜드와 제품명 */}
                  <div>
                    <Badge variant="outline" className="mb-2">
                      {racketBrandLabel(racket.brand)}
                    </Badge>
                    <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{racket.model}</h1>
                    <div className="mt-2 flex items-center gap-2">
                      <StatusBadge kind="condition" state={racket.condition} />

                      {racket?.rental?.enabled === false ? (
                        <StatusBadge kind="rental" state="unavailable" />
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap" title={`보유 ${stock.quantity}개 / 대여중 ${rentedCount}개 / 가용 ${stock.available}개`}>
                          {isSold ? (
                            <Badge variant={racketStockBadgeVariant('sold')}>판매 완료</Badge>
                          ) : isAllRented ? (
                            <Badge variant={racketStockBadgeVariant('allRented')}>
                              전량 대여중 ({rentedCount}/{stock.quantity})
                            </Badge>
                          ) : (
                            <Badge variant={racketStockBadgeVariant('available')}>
                              가용 {stock.available}/{stock.quantity}
                            </Badge>
                          )}

                          {/* 보조: 대여중 수량 (가용 상태일 때만 추가로 강조) */}
                          {rentedCount > 0 && !isSold && !isAllRented && <Badge variant={racketStockBadgeVariant('rented')}>대여중 {rentedCount}</Badge>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 가격 정보 */}
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-bold text-primary">{racket.price?.toLocaleString()}원</span>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted border border-border rounded-lg p-3">* 중고 상품 특성상 단순 변심 환불이 제한될 수 있어요.</div>
                  </div>

                  {/* CTA 영역 */}
                  <div ref={rentSectionRef} className="space-y-3 pt-4 border-t">
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 min-w-0 h-12 bg-primary text-primary-foreground shadow hover:bg-primary/90"
                        onClick={() => router.push(`/rackets/${racketId}/select-string`)}
                        disabled={soldOut}
                        title={soldOut ? (isAllRented ? '현재 전량 대여중이라 구매/대여가 불가합니다. 반납 시 다시 가능합니다.' : '판매가 종료된 상품입니다.') : undefined}
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        {soldOut ? '품절(구매 불가)' : '구매하기'}
                      </Button>

                      {racket?.rental?.enabled ? (
                        soldOut ? (
                          <Button className="flex-1 bg-muted text-muted-foreground dark:bg-card dark:text-muted-foreground" disabled title="현재 대여 가능 수량이 없습니다.">
                            <Calendar className="mr-2 h-4 w-4" />
                            품절(대여 불가)
                          </Button>
                        ) : (
                          <div className="flex-1 min-w-0">
                            <RentDialog id={racketId} rental={racket.rental} brand={racketBrandLabel(racket.brand)} model={racket.model} autoOpen={autoOpen} full />
                          </div>
                        )
                      ) : (
                        <Button className="flex-1 bg-muted text-muted-foreground dark:bg-card dark:text-muted-foreground" disabled>
                          <Calendar className="mr-2 h-4 w-4" />
                          대여 불가
                        </Button>
                      )}
                    </div>
                    {/* 비교 버튼(상세에서도 비교 담기/이동 가능) */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className={`flex-1 h-12 ${isCompared ? 'bg-primary/10 border-border text-primary hover:bg-primary/20' : ''}`}
                        onClick={toggleCompare}
                        disabled={!racketId}
                        title={!racketId ? '상품 ID가 없어 비교 목록에 담을 수 없습니다.' : !isCompared && compareCount >= 4 ? '비교는 최대 4개까지 가능합니다.' : undefined}
                      >
                        <Scale className="mr-2 h-4 w-4" />
                        {isCompared ? `비교 선택됨 (${compareCount}/4)` : `다른 라켓과 비교 (${compareCount}/4)`}
                      </Button>

                      <Button variant="outline" className="flex-1 h-12" onClick={() => router.push('/rackets/compare')} disabled={compareCount < 2} title={compareCount < 2 ? '비교는 최소 2개부터 가능합니다.' : undefined}>
                        비교하기{compareCount < 2 ? '(2개↑)' : ''}
                      </Button>
                    </div>

                    {racket?.rental?.enabled === false && racket?.rental?.disabledReason && (
                      <div className="mt-3 text-sm text-foreground border border-destructive/30 bg-destructive/10 dark:bg-destructive/15 rounded-lg p-3">대여 불가 사유: {racket.rental.disabledReason}</div>
                    )}
                  </div>

                  {/* 배송 정보 */}
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold mb-3 flex items-center">
                      <Truck className="mr-2 h-5 w-5 text-primary" />
                      배송 정보
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success" />
                        <span>3,000원 (30,000원 이상 무료)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success" />
                        <span>오후 2시 이전 주문 시 당일 출고</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-success" />
                        <span>중고 상품 검수 완료</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <Link href="/rackets" className="text-sm text-primary hover:underline inline-flex items-center">
                <ArrowLeft className="mr-1 h-3 w-3" />
                목록으로
              </Link>
            </div>
          </div>
        </div>

        {/* 스펙 카드 */}
        <Card className="mt-8 border-0 shadow-xl bg-card/90 backdrop-blur-sm dark:bg-card/90">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={(v) => updateTabInUrl(v as any)} className="w-full">
              <TabsList className="w-full grid grid-cols-3 h-16 bg-muted/30 rounded-t-lg">
                <TabsTrigger
                  value="description"
                  className="text-base font-medium h-full data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:text-primary dark:data-[state=active]:bg-card dark:data-[state=active]:text-primary"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  상품 설명
                </TabsTrigger>
                <TabsTrigger
                  value="specifications"
                  className="text-base font-medium h-full data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:text-primary dark:data-[state=active]:bg-card dark:data-[state=active]:text-primary"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  상세 스펙
                </TabsTrigger>
                <TabsTrigger value="reviews" className="text-base font-medium h-full data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:text-primary dark:data-[state=active]:bg-card dark:data-[state=active]:text-primary">
                  <Star className="h-4 w-4 mr-2" />
                  리뷰
                  <span className="ml-1">({reviewsLen})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="p-8">
                <div className="prose max-w-none">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-lg border border-primary/20 bg-primary/10 text-primary dark:bg-primary/20 flex items-center justify-center">
                      <FileText className="h-6 w-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">상품 설명</h3>
                  </div>
                  <div className="bg-muted p-6 rounded-lg">
                    <p className="text-foreground leading-relaxed text-lg">
                      {racketBrandLabel(racket.brand)} {racket.model} 중고 라켓입니다. 상태 등급은 {racket.condition}이며, 전문가의 검수를 거쳐 안전하게 사용하실 수 있습니다.
                      {racket?.rental?.enabled && ' 대여 서비스도 이용 가능합니다.'}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="specifications" className="p-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-lg border border-primary/20 bg-primary/10 text-primary dark:bg-primary/20 flex items-center justify-center">
                      <Settings className="h-6 w-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">상세 스펙</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {racket.spec?.weight && (
                      <div className="bg-muted p-4 rounded-lg border border-border">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-primary">무게</span>
                          <span className="text-foreground font-medium">{racket.spec.weight} g</span>
                        </div>
                      </div>
                    )}
                    {racket.spec?.balance && (
                      <div className="bg-muted p-4 rounded-lg border border-border">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-primary">밸런스</span>
                          <span className="text-foreground font-medium">{racket.spec.balance} mm</span>
                        </div>
                      </div>
                    )}
                    {racket.spec?.headSize && (
                      <div className="bg-muted p-4 rounded-lg border border-border">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-primary">헤드사이즈</span>
                          <span className="text-foreground font-medium">{racket.spec.headSize} in²</span>
                        </div>
                      </div>
                    )}
                    {racket.spec?.pattern && (
                      <div className="bg-muted p-4 rounded-lg border border-border">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-primary">패턴</span>
                          <span className="text-foreground font-medium">{racket.spec.pattern}</span>
                        </div>
                      </div>
                    )}
                    {racket.spec?.gripSize && (
                      <div className="bg-muted p-4 rounded-lg border border-border">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-primary">그립</span>
                          <span className="text-foreground font-medium">{racket.spec.gripSize}</span>
                        </div>
                      </div>
                    )}
                    <div className="bg-muted p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-primary">상태</span>
                        <span className="text-foreground font-medium">{racket.condition}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="reviews" className="p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
                        <Star className="h-6 w-6" />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground">고객 리뷰</h3>
                    </div>

                    <Button asChild variant="outline" className="bg-primary/10 dark:bg-primary/20 border border-primary/20 text-primary hover:bg-primary/15 dark:hover:bg-primary/25 shadow-lg">
                      <Link href={`/reviews/write?productId=${racketId}`}>
                        <Pencil className="h-4 w-4 mr-2" />
                        리뷰 작성하기
                      </Link>
                    </Button>
                  </div>

                  {mergedReviews.length > 0 ? (
                    <div className="space-y-4">
                      {mergedReviews.map((review: any, index: number) => (
                        <Card key={String(review?._id ?? index)} className="border border-border shadow-sm bg-card">
                          <CardContent className="p-5 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-foreground shrink-0">{(review?.user ?? '익명').slice(0, 1)}</div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="font-bold text-foreground truncate">{review?.status === 'hidden' ? (review?.ownedByMe ? `${review?.user ?? '내 리뷰'} (비공개)` : '비공개 리뷰') : (review?.user ?? '익명')}</div>

                                    {review?.status === 'hidden' && (
                                      <Badge variant="outline" className="text-xs">
                                        비공개
                                      </Badge>
                                    )}
                                  </div>

                                  {review?.date ? <div className="text-xs text-muted-foreground mt-0.5">{review.date}</div> : null}

                                  <div className="flex items-center gap-0.5 mt-1">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star key={i} className={`h-4 w-4 ${i < Number(review?.rating ?? 0) ? 'text-primary fill-primary' : 'text-muted-foreground/40'}`} />
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* 우측 상단 3점 메뉴 */}
                              <div className="shrink-0">
                                {(isAdmin || isMine(review)) && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>

                                    <DropdownMenuContent align="end" className="w-44">
                                      {/* 비공개/공개 토글: 내 리뷰 or 관리자 */}
                                      <DropdownMenuItem
                                        onClick={async () => {
                                          if (!review?._id) return;

                                          const nextStatus = review?.status === 'hidden' ? 'visible' : 'hidden';
                                          setBusyReviewId(String(review._id));

                                          // 낙관적 업데이트
                                          if (isMine(review)) {
                                            mutateMyReview?.((prev: any) => {
                                              if (!prev?._id || String(prev._id) !== String(review._id)) return prev;
                                              return { ...prev, status: nextStatus };
                                            }, false);
                                          } else if (isAdmin) {
                                            mutateAdminReviews?.((prev: any[] | undefined) => {
                                              if (!Array.isArray(prev)) return prev;
                                              return prev.map((r) => (String(r._id) === String(review._id) ? { ...r, status: nextStatus } : r));
                                            }, false);
                                          }

                                          try {
                                            const res = await fetch(`/api/reviews/${review._id}`, {
                                              method: 'PATCH',
                                              credentials: 'include',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ status: nextStatus }),
                                            });
                                            if (!res.ok) throw new Error('상태 변경 실패');

                                            // 탭 유지 + 서버 리프레시
                                            const params = new URLSearchParams(searchParams.toString());
                                            params.set('tab', 'reviews');
                                            router.replace(`?${params.toString()}`, { scroll: false });
                                            router.refresh();

                                            showSuccessToast(nextStatus === 'hidden' ? '비공개로 전환했어요.' : '공개로 전환했어요.');
                                          } catch (err: any) {
                                            // 롤백(재검증)
                                            if (isMine(review)) await mutateMyReview?.();
                                            else if (isAdmin) await mutateAdminReviews?.();
                                            showErrorToast(err?.message || '상태 변경에 실패했습니다.');
                                          } finally {
                                            setBusyReviewId(null);
                                          }
                                        }}
                                      >
                                        {review?.status === 'hidden' ? (
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

                                      {/* 수정: 내 리뷰 or 관리자 */}
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
                                              if (!confirm('정말 삭제할까요?')) return;

                                              setBusyReviewId(String(review._id));
                                              try {
                                                const res = await fetch(`/api/reviews/${review._id}`, {
                                                  method: 'DELETE',
                                                  credentials: 'include',
                                                });
                                                if (!res.ok) throw new Error('삭제 실패');

                                                // 재검증 + 탭 유지
                                                await mutateAdminReviews?.();
                                                const params = new URLSearchParams(searchParams.toString());
                                                params.set('tab', 'reviews');
                                                router.replace(`?${params.toString()}`, { scroll: false });
                                                router.refresh();

                                                showSuccessToast('리뷰를 삭제했어요.');
                                              } catch (err: any) {
                                                showErrorToast(err?.message || '리뷰 삭제에 실패했습니다.');
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

                            {review?.masked ? <MaskedBlock /> : <p className="text-sm text-foreground whitespace-pre-line">{review?.content || ''}</p>}

                            {/* 이미지 썸네일 → 뷰어 */}
                            {Array.isArray(review?.photos) && review.photos.length > 0 ? (
                              <div className="flex gap-2 overflow-x-auto pb-1">
                                {review.photos.slice(0, 4).map((src: string, i: number) => (
                                  <button key={i} type="button" onClick={() => openViewer(review.photos, i)} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted" title="확대 보기">
                                    <Image src={src} alt={`리뷰 이미지 ${i + 1}`} fill className="object-cover" />
                                    {/* 4장 넘어가면 +N 표시 */}
                                    {i === 3 && review.photos.length > 4 ? <div className="absolute inset-0 bg-foreground/45 flex items-center justify-center text-background text-sm font-semibold">+{review.photos.length - 4}</div> : null}
                                  </button>
                                ))}
                              </div>
                            ) : null}

                            {/* 작업 중 오버레이 */}
                            {busyReviewId && String(busyReviewId) === String(review?._id) ? (
                              <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                처리 중...
                              </div>
                            ) : null}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-muted p-6 rounded-lg border border-border text-muted-foreground">아직 등록된 리뷰가 없습니다.</div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </SiteContainer>

      {/* 리뷰 이미지 뷰어 */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>리뷰 이미지</DialogTitle>
          </DialogHeader>

          {viewerImages.length > 0 ? (
            <div className="space-y-3">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
                <Image src={viewerImages[viewerIndex]} alt={`리뷰 이미지 ${viewerIndex + 1}`} fill className="object-contain" />
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button variant="outline" onClick={prevViewer} disabled={viewerImages.length <= 1}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  이전
                </Button>

                <div className="text-sm text-muted-foreground">
                  {viewerIndex + 1} / {viewerImages.length}
                </div>

                <Button variant="outline" onClick={nextViewer} disabled={viewerImages.length <= 1}>
                  다음
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* 리뷰 수정 다이얼로그 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>리뷰 수정</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* 별점 */}
            <div className="space-y-2">
              <Label>별점</Label>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => {
                  const score = i + 1;
                  const active = (hoverRating ?? (editForm.rating === '' ? 0 : Number(editForm.rating))) >= score;
                  return (
                    <button key={i} type="button" className="p-1" onMouseEnter={() => setHoverRating(score)} onMouseLeave={() => setHoverRating(null)} onClick={() => setEditForm((p) => ({ ...p, rating: score }))} aria-label={`별점 ${score}점`}>
                      <Star className={`h-5 w-5 ${active ? 'text-primary fill-primary' : 'text-muted-foreground/40'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 내용 */}
            <div className="space-y-2">
              <Label>내용</Label>
              <Textarea value={editForm.content} onChange={(e) => setEditForm((p) => ({ ...p, content: e.target.value }))} rows={6} placeholder="리뷰 내용을 입력하세요." />
            </div>

            {/* 이미지 업로드 */}
            <div className="space-y-2">
              <Label>사진</Label>
              <PhotosUploader value={editForm.photos} onChange={(photos) => setEditForm((p) => ({ ...p, photos }))} />
              <PhotosReorderGrid value={editForm.photos} onChange={(photos) => setEditForm((p) => ({ ...p, photos }))} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeEdit} disabled={!!busyReviewId}>
                취소
              </Button>
              <Button onClick={submitEdit} disabled={!!busyReviewId}>
                {busyReviewId ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  '저장'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 모바일 전용 하단 Sticky */}
      <div data-bottom-sticky="1" className="fixed inset-x-0 bottom-0 z-50 md:hidden border-t border-border/60">
        <div className="bg-card shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)]">
          <div className="mx-auto max-w-6xl px-4 py-3 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center gap-3 pb-3 border-b border-border/60 dark:border-border/60">
              <div className="relative w-14 h-14 rounded-md overflow-hidden bg-muted dark:bg-card shrink-0 border border-border">
                {images[0] ? (
                  <Image src={images[0] || '/placeholder.svg'} alt={`${racketBrandLabel(racket.brand)} ${racket.model}`} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">이미지 없음</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate leading-tight">
                  {racketBrandLabel(racket.brand)} {racket.model}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-foreground">{racket.price?.toLocaleString()}원</span>
                </div>
              </div>
            </div>

            <div className="pt-3 flex gap-2">
              <button
                type="button"
                onClick={() => router.push(`/rackets/${racketId}/select-string`)}
                disabled={!canBuy}
                title={!canBuy ? (racketId === '' ? '상품 ID가 없어 구매 경로를 만들 수 없습니다.' : isAllRented ? '현재 전량 대여중입니다.' : '판매가 종료된 상품입니다.') : undefined}
                className={`flex-1 h-12 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 ${canBuy ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
              >
                <ShoppingCart className="h-4 w-4" />
                {soldOut ? '품절(구매 불가)' : '구매하기'}
              </button>
              {racket?.rental?.enabled && !soldOut && racketId !== '' ? (
                <div className="flex-1 min-w-0">
                  <RentDialog id={racketId} rental={racket.rental} brand={racketBrandLabel(racket.brand)} model={racket.model} autoOpen={autoOpen} full />
                </div>
              ) : (
                <button type="button" disabled className="flex-1 h-12 rounded-lg border border-border bg-muted dark:bg-card text-muted-foreground font-semibold text-sm cursor-not-allowed flex items-center justify-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {racket?.rental?.enabled === false ? '대여 불가' : soldOut ? '품절' : '대여 불가'}
                </button>
              )}
            </div>
            {/* 모바일: 비교(토글/이동) */}
            <div className="pt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={toggleCompare}
                disabled={!racketId}
                title={!racketId ? '상품 ID가 없어 비교 목록에 담을 수 없습니다.' : !isCompared && compareCount >= 4 ? '비교는 최대 4개까지 가능합니다.' : undefined}
                className={`h-11 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 ${isCompared ? 'border-border bg-primary/10 text-primary' : 'border-border bg-card text-foreground'} ${!racketId || (!isCompared && compareCount >= 4) ? 'opacity-60 cursor-not-allowed' : ''} dark:bg-primary/20`}
              >
                <Scale className="h-4 w-4" />
                {isCompared ? `비교 선택됨 (${compareCount}/4)` : `비교 담기 (${compareCount}/4)`}
              </button>

              <button
                type="button"
                onClick={() => router.push('/rackets/compare')}
                disabled={compareCount < 2}
                title={compareCount < 2 ? '비교는 최소 2개부터 가능합니다.' : undefined}
                className={`h-11 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 ${compareCount < 2 ? 'border-border bg-muted text-muted-foreground cursor-not-allowed' : 'border-border bg-card text-foreground'}`}
              >
                비교하기
              </button>
            </div>
            {racket?.rental?.enabled === false && racket?.rental?.disabledReason && (
              <p className="mt-3 text-sm text-foreground border border-destructive/30 bg-destructive/10 dark:bg-destructive/15 rounded px-3 py-2">대여 불가 사유: {racket.rental.disabledReason}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
