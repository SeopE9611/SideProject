'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
      <div className="text-center py-8">
        <p className="text-muted-foreground">위시리스트가 비어있습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {wishlist.map((item) => (
        <div key={item.id} className="flex items-center justify-between border-b pb-4 last:border-b-0 last:pb-0">
          <div>
            <div className="font-medium">{item.name}</div>
            <div className="text-sm font-bold">{item.price.toLocaleString()}원</div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/products/${item.id}`}>상세보기</Link>
            </Button>
            <Button size="sm">장바구니에 담기</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
