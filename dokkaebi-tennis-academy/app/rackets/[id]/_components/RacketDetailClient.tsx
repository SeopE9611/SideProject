'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Truck, Shield, Calendar, ShoppingCart, FileText, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RentDialog from '@/app/rackets/[id]/_components/RentDialog';
import { racketBrandLabel } from '@/lib/constants';
import StatusBadge from '@/components/badges/StatusBadge';

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
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Hero Section with Breadcrumb */}
      <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-8">
        <div className="absolute inset-0 bg-black/20"></div>
        {/* Tennis court line pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 800 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="detail-court-lines" patternUnits="userSpaceOnUse" width="100" height="50">
                <rect width="100" height="50" fill="transparent" />
                <line x1="0" y1="25" x2="100" y2="25" stroke="white" strokeWidth="1" opacity="0.3" />
                <line x1="50" y1="0" x2="50" y2="50" stroke="white" strokeWidth="1" opacity="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#detail-court-lines)" />
          </svg>
        </div>
        <div className="container relative z-10">
          <div className="flex items-center gap-2 text-sm mb-4 opacity-90">
            <Link href="/" className="hover:text-blue-200 transition-colors">
              홈
            </Link>
            <span>/</span>
            <Link href="/rackets" className="hover:text-blue-200 transition-colors">
              중고 라켓
            </Link>
            <span>/</span>
            <span className="text-blue-200">
              {racketBrandLabel(racket.brand)} {racket.model}
            </span>
          </div>
          <Button variant="ghost" className="text-white hover:bg-white/10 mb-4 p-0" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            이전 페이지로
          </Button>
        </div>
      </div>

      <div className="container py-8 pb-28 md:pb-24">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* 상품 이미지 */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="overflow-hidden border-0 shadow-2xl bg-white/90 backdrop-blur-sm dark:bg-slate-800/90">
              <div className="relative aspect-square">
                {images.length > 0 ? (
                  <Image src={images[selectedImageIndex] || '/placeholder.svg'} alt={`${racketBrandLabel(racket.brand)} ${racket.model}`} fill className="object-cover transition-transform duration-300 hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500">이미지 없음</div>
                )}
                {images.length > 1 && (
                  <>
                    <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70" onClick={prevImage}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70" onClick={nextImage}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">중고</Badge>
                  <StatusBadge kind="rental" state={rentalState} />
                </div>
              </div>
            </Card>

            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.slice(0, 5).map((image: string, index: number) => (
                  <Card key={index} className={`overflow-hidden cursor-pointer transition-all duration-200 ${selectedImageIndex === index ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}`} onClick={() => setSelectedImageIndex(index)}>
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
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm dark:bg-slate-800/90">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* 브랜드와 제품명 */}
                  <div>
                    <Badge variant="outline" className="mb-2 text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800">
                      {racketBrandLabel(racket.brand)}
                    </Badge>
                    <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{racket.model}</h1>
                    <div className="mt-2 flex items-center gap-2">
                      <StatusBadge kind="condition" state={racket.condition} />

                      {racket?.rental?.enabled === false ? (
                        <StatusBadge kind="rental" state="unavailable" />
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap" title={`보유 ${stock.quantity}개 / 대여중 ${rentedCount}개 / 가용 ${stock.available}개`}>
                          {isSold ? (
                            <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">판매 완료</Badge>
                          ) : isAllRented ? (
                            <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
                              전량 대여중 ({rentedCount}/{stock.quantity})
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                              가용 {stock.available}/{stock.quantity}
                            </Badge>
                          )}

                          {/* 보조: 대여중 수량 (가용 상태일 때만 추가로 강조) */}
                          {rentedCount > 0 && !isSold && !isAllRented && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">대여중 {rentedCount}</Badge>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 가격 정보 */}
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">{racket.price?.toLocaleString()}원</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">* 중고 상품 특성상 단순 변심 환불이 제한될 수 있어요.</div>
                  </div>

                  {/* CTA 영역 */}
                  <div ref={rentSectionRef} className="space-y-3 pt-4 border-t">
                    <div className="flex gap-2">
                      <Button
                        className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow hover:from-indigo-600 hover:to-blue-600"
                        onClick={() => router.push(`/rackets/${racket.id}/select-string`)}
                        disabled={soldOut}
                        title={soldOut ? (isAllRented ? '현재 전량 대여중이라 구매/대여가 불가합니다. 반납 시 다시 가능합니다.' : '판매가 종료된 상품입니다.') : undefined}
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        {soldOut ? '품절(구매 불가)' : '구매하기'}
                      </Button>

                      {racket?.rental?.enabled ? (
                        soldOut ? (
                          <Button className="flex-1 bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500" disabled title="현재 대여 가능 수량이 없습니다.">
                            <Calendar className="mr-2 h-4 w-4" />
                            품절(대여 불가)
                          </Button>
                        ) : (
                          <RentDialog id={racket.id} rental={racket.rental} brand={racketBrandLabel(racket.brand)} model={racket.model} autoOpen={autoOpen} />
                        )
                      ) : (
                        <Button className="flex-1 bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500" disabled>
                          <Calendar className="mr-2 h-4 w-4" />
                          대여 불가
                        </Button>
                      )}
                    </div>
                    {racket?.rental?.enabled === false && racket?.rental?.disabledReason && <div className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">대여 불가 사유: {racket.rental.disabledReason}</div>}
                  </div>

                  {/* 배송 정보 */}
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold mb-3 flex items-center">
                      <Truck className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                      배송 정보
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>3,000원 (30,000원 이상 무료)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>오후 2시 이전 주문 시 당일 출고</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-600" />
                        <span>중고 상품 검수 완료</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <Link href="/rackets" className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center">
                <ArrowLeft className="mr-1 h-3 w-3" />
                목록으로
              </Link>
            </div>
          </div>
        </div>

        {/* 스펙 카드 */}
        <Card className="mt-8 border-0 shadow-xl bg-white/90 backdrop-blur-sm dark:bg-slate-800/90">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="w-full grid grid-cols-2 h-16 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 rounded-t-lg">
                <TabsTrigger
                  value="description"
                  className="text-base font-medium h-full data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-700 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-blue-400"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  상품 설명
                </TabsTrigger>
                <TabsTrigger
                  value="specifications"
                  className="text-base font-medium h-full data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-700 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-blue-400"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  상세 스펙
                </TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="p-8">
                <div className="prose max-w-none">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">상품 설명</h3>
                  </div>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg">
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-lg">
                      {racketBrandLabel(racket.brand)} {racket.model} 중고 라켓입니다. 상태 등급은 {racket.condition}이며, 전문가의 검수를 거쳐 안전하게 사용하실 수 있습니다.
                      {racket?.rental?.enabled && ' 대여 서비스도 이용 가능합니다.'}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="specifications" className="p-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                      <Settings className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">상세 스펙</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {racket.spec?.weight && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-blue-700 dark:text-blue-400">무게</span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{racket.spec.weight} g</span>
                        </div>
                      </div>
                    )}
                    {racket.spec?.balance && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-blue-700 dark:text-blue-400">밸런스</span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{racket.spec.balance} mm</span>
                        </div>
                      </div>
                    )}
                    {racket.spec?.headSize && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-blue-700 dark:text-blue-400">헤드사이즈</span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{racket.spec.headSize} in²</span>
                        </div>
                      </div>
                    )}
                    {racket.spec?.pattern && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-blue-700 dark:text-blue-400">패턴</span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{racket.spec.pattern}</span>
                        </div>
                      </div>
                    )}
                    {racket.spec?.gripSize && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-blue-700 dark:text-blue-400">그립</span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{racket.spec.gripSize}</span>
                        </div>
                      </div>
                    )}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-blue-700 dark:text-blue-400">상태</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{racket.condition}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* 모바일 전용 하단 Sticky */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:hidden border-t border-slate-200 dark:border-slate-800">
        <div className="bg-white dark:bg-slate-900 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)]">
          <div className="mx-auto max-w-6xl px-4 py-3">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="relative w-14 h-14 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                {images[0] ? (
                  <Image src={images[0] || '/placeholder.svg'} alt={`${racketBrandLabel(racket.brand)} ${racket.model}`} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">이미지 없음</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">
                  {racketBrandLabel(racket.brand)} {racket.model}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{racket.price?.toLocaleString()}원</span>
                </div>
              </div>
            </div>

            <div className="pt-3 flex gap-2">
              <button type="button" disabled className="flex-1 h-12 rounded-lg bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-sm cursor-not-allowed flex items-center justify-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                구매(준비중)
              </button>
              {racket?.rental?.enabled && !soldOut ? (
                <RentDialog id={racket.id} rental={racket.rental} brand={racketBrandLabel(racket.brand)} model={racket.model} autoOpen={autoOpen} />
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex-1 h-12 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-semibold text-sm cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  {racket?.rental?.enabled === false ? '대여 불가' : soldOut ? '품절' : '대여 불가'}
                </button>
              )}
            </div>
            {racket?.rental?.enabled === false && racket?.rental?.disabledReason && <p className="mt-3 text-sm text-red-600 bg-red-50 rounded px-3 py-2">대여 불가 사유: {racket.rental.disabledReason}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
