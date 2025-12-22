'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Eye, Heart, ShoppingCart } from 'lucide-react';
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
};

// 한글 라벨 매핑
const keyMap: Record<string, string> = {
  power: '반발력',
  durability: '내구성',
  spin: '스핀',
  control: '컨트롤',
  comfort: '편안함',
};

type Props = {
  product: Product;
  viewMode: 'grid' | 'list';
  brandLabel: string;
};

const ProductCard = React.memo(
  function ProductCard({ product, viewMode, brandLabel }: Props) {
    const router = useRouter();
    const { has, toggle } = useWishlist();
    const inWish = has(product._id);

    const setBuyNowItem = useBuyNowStore((s) => s.setItem); // buyNowStore에 맞는 setter 사용
    const clearPdpBundle = usePdpBundleStore((s) => s.clear);

    const handleStringSingleBuy = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // (중요) 이전 PDP 번들 흔적이 있으면 Checkout이 번들을 우선 사용함 → 단품 구매는 clear가 안전
      clearPdpBundle();

      const image = product.images?.[0] ?? '';

      setBuyNowItem({
        id: String(product._id),
        name: product.name,
        price: Number(product.price ?? 0),
        quantity: 1,
        image,
        kind: 'product',
      });

      router.push('/checkout?mode=buynow');
    };

    const handleStringServiceApply = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      router.push(`/services/apply?productId=${encodeURIComponent(String(product._id))}`);
    };

    if (viewMode === 'list') {
      return (
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 relative">
          <div className="absolute inset-0 opacity-5 dark:opacity-10">
            <svg className="w-full h-full" viewBox="0 0 400 200" fill="none">
              <rect x="0" y="0" width="400" height="200" stroke="currentColor" strokeWidth="2" />
              <line x1="200" y1="0" x2="200" y2="200" stroke="currentColor" strokeWidth="2" />
              <rect x="50" y="50" width="300" height="100" stroke="currentColor" strokeWidth="1" />
              <line x1="50" y1="100" x2="350" y2="100" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>

          <div className="flex flex-col md:flex-row relative z-10">
            <div className="relative w-full md:w-48 h-48 flex-shrink-0">
              <Image src={(product.images?.[0] as string) || '/placeholder.svg?height=200&width=200&query=tennis+string'} alt={product.name} fill className="object-cover" />
              {product.isNew && <Badge className="absolute right-2 top-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">NEW</Badge>}
            </div>
            <div className="flex-1 p-4 md:p-6">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4 gap-4">
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground mb-1 font-medium">{brandLabel}</div>
                  <h3 className="text-lg md:text-xl font-bold mb-2 dark:text-white">{product.name}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">(128 리뷰)</span>
                  </div>
                </div>
                <div className="text-left lg:text-right">
                  <div className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">{product.price.toLocaleString()}원</div>
                  <div className="text-sm text-muted-foreground line-through">{Math.round(product.price * 1.2).toLocaleString()}원</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4 mb-4">
                {product.features ? (
                  Object.entries(product.features).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800">
                      <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">{keyMap[key as keyof typeof keyMap] || key}:</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className={`w-2 h-2 rounded-full ${i < value ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-600'}`} />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-sm">성능 정보 없음</div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Link href={`/products/${product._id}`} className="flex-1">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-500 dark:to-indigo-500 dark:hover:from-blue-600 dark:hover:to-indigo-600 shadow-lg">
                    <Eye className="w-4 h-4 mr-2" />
                    상세보기
                  </Button>
                </Link>

                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={handleStringSingleBuy} className="whitespace-nowrap">
                    단품 구매
                  </Button>

                  <Button type="button" size="sm" variant="outline" onClick={handleStringServiceApply} className="whitespace-nowrap">
                    작업 의뢰
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`bg-white/90 dark:bg-slate-700/90 hover:bg-white dark:hover:bg-slate-600 ${inWish ? 'border-red-300 text-red-600 dark:border-red-400 dark:text-red-400' : 'hover:border-blue-300 dark:hover:border-blue-500'}`}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        await toggle(product._id);
                        showSuccessToast(inWish ? '위시리스트에서 제거했습니다.' : '위시리스트에 추가했습니다.');
                      } catch (e: any) {
                        if (e?.message === 'unauthorized') {
                          showErrorToast('로그인이 필요합니다.');
                          router.push(`/login?from=/products/${product._id}`);
                        } else {
                          showErrorToast('처리 중 오류가 발생했습니다.');
                        }
                      }
                    }}
                    aria-pressed={inWish}
                    title={inWish ? '위시리스트에서 제거' : '위시리스트에 추가'}
                  >
                    <Heart className={`w-4 h-4 ${inWish ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                  {/* <Button variant="outline" size="icon" className="hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/20 dark:hover:border-blue-500 bg-transparent">
                    <ShoppingCart className="w-4 h-4" />
                  </Button> */}
                </div>
              </div>
            </div>
          </div>
        </Card>
      );
    }

    // grid view
    return (
      <Link href={`/products/${product._id}`}>
        <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 group relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="relative">
            <Image
              src={(product.images?.[0] as string) || '/placeholder.svg?height=300&width=300&query=tennis+string'}
              alt={product.name}
              width={300}
              height={300}
              className="h-48 md:h-56 w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {product.isNew && <Badge className="absolute right-3 top-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">NEW</Badge>}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-white text-black hover:bg-gray-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  상세보기
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className={`bg-white/90 dark:bg-slate-700/90 hover:bg-white dark:hover:bg-slate-600 shadow-lg ${inWish ? 'border-red-300 text-red-600 dark:border-red-400 dark:text-red-400' : ''}`}
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
                  aria-pressed={inWish}
                  title={inWish ? '위시리스트에서 제거' : '위시리스트에 추가'}
                >
                  <Heart className={`w-4 h-4 ${inWish ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
              </div>
            </div>
          </div>

          <CardContent className="p-4 md:p-5">
            <div className="text-sm text-muted-foreground mb-2 font-medium">{brandLabel}</div>
            <CardTitle className="text-base md:text-lg mb-3 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors dark:text-white">{product.name}</CardTitle>

            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">(128)</span>
            </div>

            <div className="space-y-2 mb-4 text-xs">
              {product.features ? (
                Object.entries(product.features)
                  .slice(0, 3)
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-2 rounded-md bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10">
                      <span className="text-slate-600 dark:text-slate-300 font-medium">{keyMap[key as keyof typeof keyMap] || key}:</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < value ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-600'}`} />
                        ))}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-muted-foreground">성능 정보 없음</div>
              )}
            </div>
            <div className="flex justify-end">
              <div className="font-bold text-lg text-blue-600 dark:text-blue-400">{product.price.toLocaleString()}원</div>
            </div>
          </CardContent>

          <CardFooter className="p-4 md:p-5 pt-0 flex gap-2">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={handleStringSingleBuy}>
              스트링 단품 구매
            </Button>

            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={handleStringServiceApply}>
              스트링 작업의뢰
            </Button>
          </CardFooter>
        </Card>
      </Link>
    );
  },
  (prev, next) => prev.product._id === next.product._id && prev.viewMode === next.viewMode && prev.brandLabel === next.brandLabel
);

export default ProductCard;
