'use client';

import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingCart, Trash2, ArrowRight, Package } from 'lucide-react';

interface WishlistItem {
  id: number;
  name: string;
  price: number;
}

interface WishlistProps {
  wishlist: WishlistItem[];
}

export default function Wishlist({ wishlist }: WishlistProps) {
  if (!wishlist.length) {
    return (
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <CardContent className="p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900 dark:to-rose-900">
            <Heart className="h-10 w-10 text-pink-600 dark:text-pink-400" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-slate-100">위시리스트가 비어있습니다</h3>
          <p className="mb-6 text-slate-600 dark:text-slate-400">마음에 드는 상품을 위시리스트에 추가해보세요!</p>
          <Button asChild className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
            <Link href="/products" className="inline-flex items-center gap-2">
              상품 둘러보기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {wishlist.map((item) => (
        <Card key={item.id} className="group relative overflow-hidden border-0 bg-white dark:bg-slate-900 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          {/* Gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ padding: '1px' }}>
            <div className="h-full w-full bg-white dark:bg-slate-900 rounded-lg" />
          </div>

          <CardContent className="relative p-6">
            <div className="flex items-center justify-between">
              {/* Product Info */}
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900 dark:to-rose-900">
                  <Package className="h-8 w-8 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">{item.name}</h3>
                  <Badge variant="secondary" className="bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-900 dark:to-rose-900 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800">
                    {item.price.toLocaleString()}원
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  장바구니
                </Button>
                <Button size="sm" variant="outline" className="border-slate-200 hover:border-red-300 hover:bg-red-50 dark:border-slate-700 dark:hover:border-red-600 dark:hover:bg-red-950 text-red-600 hover:text-red-700 bg-transparent">
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
