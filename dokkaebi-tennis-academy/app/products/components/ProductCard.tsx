'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Eye, Heart, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

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

/**
 * React.memo로 감싸서 props가 실제로 바뀌었을 때만 재렌더링 되도록 최적화
 */
const ProductCard = React.memo(
  function ProductCard({ product, viewMode, brandLabel }: Props) {
    if (viewMode === 'list') {
      return (
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-2 hover:border-blue-300">
          <div className="flex">
            <div className="relative w-48 h-48 flex-shrink-0">
              <Image src={(product.images?.[0] as string) || '/placeholder.svg?height=200&width=200&query=tennis+string'} alt={product.name} fill className="object-cover" />
              {product.isNew && <Badge className="absolute right-2 top-2 bg-gradient-to-r from-red-500 to-pink-500 text-white">NEW</Badge>}
            </div>
            <div className="flex-1 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1 font-medium">{brandLabel}</div>
                  <h3 className="text-xl font-bold mb-2">{product.name}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">(128 리뷰)</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{product.price.toLocaleString()}원</div>
                  <div className="text-sm text-muted-foreground line-through">{Math.round(product.price * 1.2).toLocaleString()}원</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
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

              <div className="flex gap-2">
                <Link href={`/products/${product._id}`} className="flex-1">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    <Eye className="w-4 h-4 mr-2" />
                    상세보기
                  </Button>
                </Link>
                <Button variant="outline" size="icon" className="hover:bg-red-50 hover:border-red-300 bg-transparent">
                  <Heart className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="hover:bg-blue-50 hover:border-blue-300 bg-transparent">
                  <ShoppingCart className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      );
    }

    // grid view
    return (
      <Link href={`/products/${product._id}`}>
        <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-2 hover:border-blue-300 group">
          <div className="relative">
            <Image
              src={(product.images?.[0] as string) || '/placeholder.svg?height=300&width=300&query=tennis+string'}
              alt={product.name}
              width={300}
              height={300}
              className="h-56 w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {product.isNew && <Badge className="absolute right-3 top-3 bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg">NEW</Badge>}
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="bg-white/90 text-gray-800 shadow-lg">
                15% 할인
              </Badge>
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex gap-2">
                <Button size="sm" className="bg-white text-black hover:bg-gray-100">
                  <Eye className="w-4 h-4 mr-1" />
                  보기
                </Button>
                <Button size="sm" variant="outline" className="bg-white/90 hover:bg-white">
                  <Heart className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground mb-2 font-medium">{brandLabel}</div>
            <CardTitle className="text-lg mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">{product.name}</CardTitle>

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

          <CardFooter className="p-5 pt-0 flex justify-between items-center">
            <div>
              <div className="font-bold text-lg text-blue-600">{product.price.toLocaleString()}원</div>
              <div className="text-xs text-muted-foreground line-through">{Math.round(product.price * 1.2).toLocaleString()}원</div>
            </div>
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
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
