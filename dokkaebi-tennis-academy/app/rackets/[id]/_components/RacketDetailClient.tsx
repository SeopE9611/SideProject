'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Truck, Shield, Calendar, ShoppingCart, FileText, Settings, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RentDialog from '@/app/rackets/[id]/_components/RentDialog';
import { racketBrandLabel } from '@/lib/constants';
import StatusBadge from '@/components/badges/StatusBadge';
import SiteContainer from '@/components/layout/SiteContainer';
import { CompareRacketItem, useRacketCompareStore } from '@/app/store/racketCompareStore';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

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
  const [activeTab, setActiveTab] = useState<'description' | 'specifications'>('description');

  const soldOut = stock.available <= 0;

  // 라켓 ID 정규화
  const racketId = String(racket?.id ?? racket?._id ?? '');
  const canBuy = !soldOut && racketId !== '';

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
    <div className="min-h-full bg-gradient-to-br from-background via-muted to-card dark:from-background dark:via-muted dark:to-muted">
      {/* Hero Section with Breadcrumb */}
      <div className="relative bg-primary text-primary-foreground py-8">
        <div className="absolute inset-0 bg-overlay/20"></div>
        {/* Tennis court line pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full text-foreground" viewBox="0 0 800 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="detail-court-lines" patternUnits="userSpaceOnUse" width="100" height="50">
                <rect width="100" height="50" fill="transparent" />
                <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" strokeWidth="1" opacity="0.3" />
                <line x1="50" y1="0" x2="50" y2="50" stroke="currentColor" strokeWidth="1" opacity="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#detail-court-lines)" />
          </svg>
        </div>
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
          <Button variant="ghost" className="text-primary-foreground hover:bg-primary/80 mb-4 p-0" onClick={() => router.back()}>
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
                    <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 bg-overlay/50 text-primary-foreground hover:bg-overlay/70" onClick={prevImage}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 bg-overlay/50 text-primary-foreground hover:bg-overlay/70" onClick={nextImage}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge className="bg-primary text-primary-foreground">중고</Badge>
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
                    <Badge variant="outline" className="mb-2 text-primary border-border dark:text-primary dark:border-border">
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
                            <Badge className="bg-muted text-foreground dark:bg-card dark:text-foreground">판매 완료</Badge>
                          ) : isAllRented ? (
                            <Badge className="bg-destructive/10 text-destructive dark:bg-destructive/10 dark:text-destructive">
                              전량 대여중 ({rentedCount}/{stock.quantity})
                            </Badge>
                          ) : (
                            <Badge className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary">
                              가용 {stock.available}/{stock.quantity}
                            </Badge>
                          )}

                          {/* 보조: 대여중 수량 (가용 상태일 때만 추가로 강조) */}
                          {rentedCount > 0 && !isSold && !isAllRented && <Badge className="bg-muted text-primary dark:bg-muted dark:text-primary">대여중 {rentedCount}</Badge>}
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

                    {racket?.rental?.enabled === false && racket?.rental?.disabledReason && <div className="mt-3 text-sm text-destructive bg-destructive/10 border border-border rounded-lg p-3">대여 불가 사유: {racket.rental.disabledReason}</div>}
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
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="w-full grid grid-cols-2 h-16 bg-gradient-to-r from-background via-muted to-card dark:from-background dark:via-muted dark:to-card rounded-t-lg">
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
              </TabsList>

              <TabsContent value="description" className="p-8">
                <div className="prose max-w-none">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary-foreground" />
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
                    <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                      <Settings className="h-6 w-6 text-primary-foreground" />
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
            </Tabs>
          </CardContent>
        </Card>
      </SiteContainer>

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
                  <span className="text-lg font-bold text-foreground ">{racket.price?.toLocaleString()}원</span>
                </div>
              </div>
            </div>

            <div className="pt-3 flex gap-2">
              <button
                type="button"
                onClick={() => router.push(`/rackets/${racketId}/select-string`)}
                disabled={!canBuy}
                title={!canBuy ? (racketId === '' ? '상품 ID가 없어 구매 경로를 만들 수 없습니다.' : isAllRented ? '현재 전량 대여중입니다.' : '판매가 종료된 상품입니다.') : undefined}
                className={`flex-1 h-12 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 ${
                  canBuy ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                <ShoppingCart className="h-4 w-4" />
                {soldOut ? '품절(구매 불가)' : '구매하기'}
              </button>
              {racket?.rental?.enabled && !soldOut && racketId !== '' ? (
                <div className="flex-1 min-w-0">
                  <RentDialog id={racketId} rental={racket.rental} brand={racketBrandLabel(racket.brand)} model={racket.model} autoOpen={autoOpen} full />
                </div>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex-1 h-12 rounded-lg border border-border bg-muted dark:bg-card text-muted-foreground font-semibold text-sm cursor-not-allowed flex items-center justify-center gap-2"
                >
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
                className={`h-11 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 ${
                  isCompared ? 'border-border bg-primary/10 text-primary' : 'border-border bg-card text-foreground'
                } ${!racketId || (!isCompared && compareCount >= 4) ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <Scale className="h-4 w-4" />
                {isCompared ? `비교 선택됨 (${compareCount}/4)` : `비교 담기 (${compareCount}/4)`}
              </button>

              <button
                type="button"
                onClick={() => router.push('/rackets/compare')}
                disabled={compareCount < 2}
                title={compareCount < 2 ? '비교는 최소 2개부터 가능합니다.' : undefined}
                className={`h-11 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 ${
                  compareCount < 2 ? 'border-border bg-muted text-muted-foreground cursor-not-allowed' : 'border-border bg-card text-foreground'
                }`}
              >
                비교하기
              </button>
            </div>
            {racket?.rental?.enabled === false && racket?.rental?.disabledReason && <p className="mt-3 text-sm text-destructive bg-destructive rounded px-3 py-2">대여 불가 사유: {racket.rental.disabledReason}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
