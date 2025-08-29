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

//  React.memo로 감싸서 props가 실제로 바뀌었을 때만 재렌더링 되도록 최적화
const ProductCard = React.memo(
  function ProductCard({ product, viewMode, brandLabel }: Props) {
    const router = useRouter();
    const { has, toggle } = useWishlist();
    const inWish = has(product._id);

    if (viewMode === 'list') {
      return (
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 hover:border-emerald-300 dark:hover:border-emerald-500">
          <div className="flex flex-col md:flex-row">
            <div className="relative w-full md:w-48 h-48 flex-shrink-0">
              <Image src={(product.images?.[0] as string) || '/placeholder.svg?height=200&width=200&query=tennis+string'} alt={product.name} fill className="object-cover" />
              {product.isNew && <Badge className="absolute right-2 top-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg">NEW</Badge>}
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
                  <div className="text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{product.price.toLocaleString()}원</div>
                  <div className="text-sm text-muted-foreground line-through">{Math.round(product.price * 1.2).toLocaleString()}원</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4 mb-4">
                {product.features ? (
                  Object.entries(product.features).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{keyMap[key as keyof typeof keyMap] || key}:</span>
                      <span className="text-sm font-medium">
                        {'★'.repeat(value)}
                        {'☆'.repeat(5 - value)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-sm">성능 정보 없음</div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Link href={`/products/${product._id}`} className="flex-1">
                  <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 dark:from-emerald-500 dark:to-teal-500 dark:hover:from-emerald-600 dark:hover:to-teal-600">
                    <Eye className="w-4 h-4 mr-2" />
                    상세보기
                  </Button>
                </Link>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className={`bg-white/90 dark:bg-slate-700/90 hover:bg-white dark:hover:bg-slate-600 ${inWish ? 'border-red-300 text-red-600 dark:border-red-400 dark:text-red-400' : ''}`}
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
                  <Button variant="outline" size="icon" className="hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-900/20 dark:hover:border-emerald-500 bg-transparent">
                    <ShoppingCart className="w-4 h-4" />
                  </Button>
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
        <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 hover:border-emerald-300 dark:hover:border-emerald-500 group">
          <div className="relative">
            <Image
              src={(product.images?.[0] as string) || '/placeholder.svg?height=300&width=300&query=tennis+string'}
              alt={product.name}
              width={300}
              height={300}
              className="h-48 md:h-56 w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {product.isNew && <Badge className="absolute right-3 top-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg">NEW</Badge>}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-white text-black hover:bg-gray-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  보기
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className={`bg-white/90 dark:bg-slate-700/90 hover:bg-white dark:hover:bg-slate-600 ${inWish ? 'border-red-300 text-red-600 dark:border-red-400 dark:text-red-400' : ''}`}
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
            <CardTitle className="text-base md:text-lg mb-3 line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors dark:text-white">{product.name}</CardTitle>

            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">(128)</span>
            </div>

            <div className="space-y-1 mb-4 text-xs">
              {product.features ? (
                Object.entries(product.features)
                  .slice(0, 3)
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground">{keyMap[key as keyof typeof keyMap] || key}:</span>
                      <span className="font-medium">
                        {'★'.repeat(value)}
                        {'☆'.repeat(5 - value)}
                      </span>
                    </div>
                  ))
              ) : (
                <div className="text-muted-foreground">성능 정보 없음</div>
              )}
            </div>
          </CardContent>

          <CardFooter className="p-4 md:p-5 pt-0 flex justify-between items-center">
            <div>
              <div className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{product.price.toLocaleString()}원</div>
            </div>
            <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 dark:from-emerald-500 dark:to-teal-500 dark:hover:from-emerald-600 dark:hover:to-teal-600 shadow-lg">
              <ShoppingCart className="w-4 h-4 mr-1" />
              담기
            </Button>
          </CardFooter>
        </Card>
      </Link>
    );
  },
  // 커스텀 비교: 실제 의미 있는 props 변화 있을 때만 렌더
  (prev, next) => prev.product._id === next.product._id && prev.viewMode === next.viewMode && prev.brandLabel === next.brandLabel
);

export default ProductCard;
