'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { useWishlist } from '@/app/features/wishlist/useWishlist';
import { useCartStore } from '@/app/store/cartStore';
import { showSuccessToast } from '@/lib/toast';

const LIMIT = 12;

export default function Wishlist() {
  const { items, remove } = useWishlist();
  const addItem = useCartStore((s) => s.addItem);

  // '더 보기' 노출 개수
  const [visible, setVisible] = useState(LIMIT);

  const hasMore = useMemo(() => items.length > visible, [items.length, visible]);
  const visibleItems = useMemo(() => items.slice(0, visible), [items, visible]);

  if (items.length === 0) {
    return (
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <CardContent className="p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/30">
            <Heart className="h-10 w-10 text-pink-600 dark:text-pink-400" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">위시리스트가 비어있습니다</h3>
          <p className="mb-6 text-muted-foreground">마음에 드는 상품을 위시리스트에 추가해보세요!</p>
          <Button asChild>
            <Link href="/products">상품 둘러보기</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {visibleItems.map((it) => (
          <Card key={it.id} className="overflow-hidden border">
            <CardContent className="p-4">
              <Link href={`/products/${it.id}`} className="block">
                <div className="relative w-full h-40">
                  <Image src={it.image} alt={it.name} fill sizes="(max-width:768px) 50vw, (max-width:1024px) 33vw, 25vw" className="object-cover rounded-md border" />
                </div>
                <div className="mt-3">
                  <div className="font-medium line-clamp-2 hover:underline">{it.name}</div>
                  <div className="text-sm text-muted-foreground">{it.price.toLocaleString()}원</div>
                </div>
              </Link>

              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    addItem({ id: it.id, name: it.name, price: it.price, quantity: 1, image: it.image, stock: it.stock });
                    showSuccessToast('장바구니에 담았습니다.');
                  }}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" /> 담기
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    remove(it.id);
                    // 현재 페이지에서 바로 사라지도록, 노출 개수 보정
                    setVisible((v) => Math.min(v, Math.max(0, items.length - 1)));
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> 삭제
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 더 보기 */}
      <div className="flex justify-center pt-2">
        {hasMore ? (
          <Button variant="outline" onClick={() => setVisible((v) => v + LIMIT)}>
            더 보기
          </Button>
        ) : (
          <span className="text-sm text-slate-500">마지막 페이지입니다</span>
        )}
      </div>
    </div>
  );
}
