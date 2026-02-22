'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Eye, Heart } from 'lucide-react';
import { useWishlist } from '@/app/features/wishlist/useWishlist';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { useBuyNowStore } from '@/app/store/buyNowStore';
import { usePdpBundleStore } from '@/app/store/pdpBundleStore';

// 제품 타입 (필요시 공통으로 뺄 수도 있음)
export type Product = {
  _id: string;
  name: string;
  brand: string;
  price: number;
  images?: string[];
  features?: Record<string, number>;
  isNew?: boolean;
  mountingFee?: number; // 교체(장착) 공임(1자루 기준)
  ratingAvg?: number; // reviews API가 업데이트하는 필드
  ratingCount?: number; // 리뷰 개수
  ratingAverage?: number; // 레거시/호환(maintenance에서 쓰던 키)
  inventory?: {
    stock?: number;
    status?: 'instock' | 'outofstock' | 'backorder' | string;
    manageStock?: boolean;
    allowBackorder?: boolean;
  };
};

// 한글 라벨 매핑
const keyMap: Record<string, string> = {
  power: '반발력',
  durability: '내구성',
  spin: '스핀',
  control: '컨트롤',
  comfort: '편안함',
};

function RatingStars({ avg, starClassName = 'w-3 h-3' }: { avg: number; starClassName?: string }) {
  const safe = Math.max(0, Math.min(5, Number(avg) || 0)); // 0~5 고정

  return (
    <div className="flex items-center">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, safe - i)); // i번째 별의 채움 비율(0~1)

        return (
          <span key={i} className={`relative inline-block ${starClassName}`}>
            <Star className={`${starClassName} text-warning`} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={`${starClassName} text-warning fill-current`} />
            </span>
          </span>
        );
      })}
    </div>
  );
}

type Props = {
  product: Product;
  viewMode: 'grid' | 'list';
  brandLabel: string;
  isApplyFlow?: boolean;
};

const ProductCard = React.memo(
  function ProductCard({ product, viewMode, brandLabel, isApplyFlow = false }: Props) {
    const router = useRouter();
    const ratingAvg = Number(product.ratingAvg ?? product.ratingAverage ?? 0);
    const ratingCount = Number(product.ratingCount ?? 0);
    const { has, toggle } = useWishlist();
    const inWish = has(product._id);

    const inventory = product.inventory;
    const stockRaw = typeof inventory?.stock === 'number' ? inventory.stock : null;
    const manageStock = inventory?.manageStock === true;
    const allowBackorder = inventory?.allowBackorder === true;
    const status = String(inventory?.status ?? '');

    const isSoldOut = status === 'outofstock' || (manageStock && (stockRaw ?? 0) <= 0 && !allowBackorder);
    const stockForItem = typeof stockRaw === 'number' ? stockRaw : undefined;

    const detailHref = isApplyFlow ? `/products/${product._id}?from=apply` : `/products/${product._id}`;

    const setBuyNowItem = useBuyNowStore((s) => s.setItem); // buyNowStore에 맞는 setter 사용
    const clearPdpBundle = usePdpBundleStore((s) => s.clear);

    const handleStringSingleBuy = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isSoldOut) {
        showErrorToast('품절된 상품입니다.');
        return;
      }

      // (중요) 이전 PDP 번들 흔적이 있으면 Checkout이 번들을 우선 사용함 → 단품 구매는 clear가 안전
      clearPdpBundle();

      const image = product.images?.[0] ?? '';

      setBuyNowItem({
        id: String(product._id),
        name: product.name,
        price: Number(product.price ?? 0),
        quantity: 1,
        image,
        stock: stockForItem,
        kind: 'product',
      });

      router.push('/checkout?mode=buynow');
    };

    const handleStringServiceApply = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isSoldOut) {
        showErrorToast('품절된 상품입니다.');
        return;
      }

      // (중요) 이전 PDP 번들 흔적이 있으면 Checkout이 번들을 우선 사용함 → 작업의뢰도 clear가 안전
      clearPdpBundle();

      const image = product.images?.[0] ?? '';

      // Buy-Now 전용 상태에 현재 상품 1건만 저장
      setBuyNowItem({
        id: String(product._id),
        name: product.name,
        price: Number(product.price ?? 0),
        quantity: 1,
        image,
        stock: stockForItem,
        kind: 'product',
      });

      const search = new URLSearchParams({
        mode: 'buynow',
        withService: '1',
      });

      router.push(`/checkout?${search.toString()}`);
    };

    if (viewMode === 'list') {
      return (
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl bg-card/90 dark:bg-card backdrop-blur-sm border border-border hover:border-border dark:hover:border-border relative">
          <div className="absolute inset-0 opacity-5 dark:opacity-10">
            <svg className="w-full h-full" viewBox="0 0 400 200" fill="none">
              <rect x="0" y="0" width="400" height="200" stroke="currentColor" strokeWidth="2" />
              <line x1="200" y1="0" x2="200" y2="200" stroke="currentColor" strokeWidth="2" />
              <rect x="50" y="50" width="300" height="100" stroke="currentColor" strokeWidth="1" />
              <line x1="50" y1="100" x2="350" y2="100" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>

          <div className="flex flex-col bp-md:flex-row relative z-10">
            <div className="relative w-full bp-md:w-48 aspect-[4/3] bp-md:aspect-square flex-shrink-0 overflow-hidden">
              <Image src={(product.images?.[0] as string) || '/placeholder.svg?height=200&width=200&query=tennis+string'} alt={product.name} fill sizes="(max-width: 768px) 100vw, 192px" className="object-cover" />
              <Image src={(product.images?.[0] as string) || '/placeholder.svg?height=200&width=200&query=tennis+string'} alt={product.name} fill className="object-cover" />
              {product.isNew && (
                <Badge variant="info" className="absolute right-2 top-2 shadow-sm">
                  NEW
                </Badge>
              )}
            </div>
            <div className="flex-1 p-4 bp-md:p-5">
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex-1">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1 font-medium">{brandLabel}</div>
                  <h3 className="text-base sm:text-lg md:text-xl font-bold mb-2 text-foreground line-clamp-2">{product.name}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <RatingStars avg={ratingAvg} starClassName="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm text-muted-foreground">({ratingCount})</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-xl sm:text-2xl font-bold text-primary">{product.price.toLocaleString()}원</div>
                  <div className="text-sm text-muted-foreground line-through">{Math.round(product.price * 1.2).toLocaleString()}원</div>
                </div>
              </div>

              {product.features && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {Object.entries(product.features)
                      .slice(0, 3)
                      .map(([k, v]) => (
                        <span key={k} className="px-2 py-1 rounded-md bg-primary text-primary-foreground">
                          {keyMap[k as keyof typeof keyMap] || k}: {v}/5
                        </span>
                      ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 bp-sm:flex gap-2">
                <Link href={detailHref} className="bp-sm:flex-1">
                  <Button variant="default" size="sm" className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                    <Eye className="w-3 h-3 bp-sm:w-4 bp-sm:h-4 mr-1.5" />
                    상세보기
                  </Button>
                </Link>

                <Button type="button" size="sm" variant="outline" onClick={handleStringSingleBuy} disabled={isSoldOut} className="h-9 sm:h-10 text-xs sm:text-sm">
                  {isApplyFlow ? '단품만 구매' : '단품 구매'}
                </Button>

                <Button type="button" size="sm" variant="secondary" onClick={handleStringServiceApply} disabled={isSoldOut} className="h-9 sm:h-10 text-xs sm:text-sm col-span-2 sm:col-span-1">
                  {isApplyFlow ? '교체 서비스 포함 결제' : '작업 의뢰'}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className={`h-9 sm:h-10 ${inWish ? 'border-destructive text-destructive dark:border-destructive dark:text-destructive' : ''}`}
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      await toggle(product._id);
                      showSuccessToast(inWish ? '위시리스트에서 제거했습니다.' : '위시리스트에 추가했습니다.');
                    } catch (e: any) {
                      if (e?.message === 'unauthorized') {
                        const target = detailHref;
                        router.push(`/login?redirectTo=${encodeURIComponent(target)}`);
                      } else {
                        showErrorToast('처리 중 오류가 발생했습니다.');
                      }
                    }
                  }}
                  title={inWish ? '위시리스트에서 제거' : '위시리스트에 추가'}
                >
                  <Heart className={`w-3 h-3 sm:w-4 sm:h-4 ${inWish ? 'text-destructive fill-current' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Link href={detailHref}>
        <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-card/90 dark:bg-card backdrop-blur-sm border border-border hover:border-border dark:hover:border-border group relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-background via-muted to-card opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="relative w-full aspect-[4/3] bp-md:aspect-square overflow-hidden">
            <Image
              src={(product.images?.[0] as string) || '/placeholder.svg?height=300&width=300&query=tennis+string'}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {product.isNew && (
              <Badge variant="info" className="absolute right-2 sm:right-3 top-2 sm:top-3 text-xs shadow-sm">
                NEW
              </Badge>
            )}
            <div className="absolute inset-0 bg-overlay/0 group-hover:bg-overlay/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex gap-2">
                <Button size="sm" variant="default" className="h-8 sm:h-9 text-xs sm:text-sm shadow-lg" onClick={(e) => e.stopPropagation()}>
                  <Eye className="w-3 h-3 bp-sm:w-4 bp-sm:h-4 mr-1" />
                  보기
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className={`h-8 sm:h-9 shadow-lg ${inWish ? 'border-destructive text-destructive dark:border-destructive dark:text-destructive' : ''}`}
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      await toggle(product._id);
                      showSuccessToast(inWish ? '위시리스트에서 제거했습니다.' : '위시리스트에 추가했습니다.');
                    } catch {
                      showErrorToast('처리 중 오류가 발생했습니다.');
                    }
                  }}
                  title={inWish ? '위시리스트에서 제거' : '위시리스트에 추가'}
                >
                  <Heart className={`w-3 h-3 sm:w-4 sm:h-4 ${inWish ? 'text-destructive fill-current' : ''}`} />
                </Button>
              </div>
            </div>
          </div>

          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-muted-foreground mb-1.5 font-medium">{brandLabel}</div>
            <CardTitle className="text-sm sm:text-base font-semibold mb-2 line-clamp-2 text-foreground group-hover:text-primary transition-colors min-h-[2.5rem] sm:min-h-[3rem]">{product.name}</CardTitle>

            <div className="flex items-center gap-1.5 mb-2">
              <RatingStars avg={ratingAvg} starClassName="w-3 h-3" />
              <span className="text-xs text-muted-foreground">({ratingCount})</span>
            </div>

            <div className="hidden sm:block space-y-1.5 mb-3 text-xs">
              {product.features &&
                Object.entries(product.features)
                  .slice(0, 3)
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-1.5 rounded-md bg-gradient-to-r from-background to-card dark:from-background dark:to-card">
                      <span className="text-muted-foreground font-medium">{keyMap[key as keyof typeof keyMap] || key}:</span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < value ? 'bg-primary' : 'bg-muted'}`} />
                        ))}
                      </div>
                    </div>
                  ))}
            </div>
            <div className="flex justify-end">
              <div className="font-bold text-base sm:text-lg text-primary">{product.price.toLocaleString()}원</div>
            </div>
          </CardContent>

          <CardFooter className="p-2.5 bp-sm:p-3 bp-md:p-4 pt-0 flex gap-1.5 bp-sm:gap-2  bp-xxs:flex-col">
            <Button type="button" variant="outline" className="flex-1 rounded-lg h-8 sm:h-9 text-[11px] sm:text-xs" onClick={handleStringSingleBuy} disabled={isSoldOut}>
              {isApplyFlow ? '단품만 구매' : '단품 구매'}
            </Button>

            <Button type="button" variant="outline" className="flex-1 rounded-lg h-8 sm:h-9 text-[11px] sm:text-xs" onClick={handleStringServiceApply} disabled={isSoldOut}>
              {isApplyFlow ? '교체 서비스 포함 결제' : '작업의뢰'}
            </Button>
          </CardFooter>
        </Card>
      </Link>
    );
  },
  (prev, next) => prev.product._id === next.product._id && prev.viewMode === next.viewMode && prev.brandLabel === next.brandLabel && Boolean(prev.isApplyFlow) === Boolean(next.isApplyFlow),
);

export default ProductCard;
