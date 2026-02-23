'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useWishlist } from '@/app/features/wishlist/useWishlist';
import { useCartStore } from '@/app/store/cartStore';
import { showSuccessToast } from '@/lib/toast';
import clsx from 'clsx';
import { useState } from 'react';

type Props = {
  className?: string;
  variant?: 'sidebar' | 'inline'; // inline: 장바구니 목록 아래에 붙는 모드
};

export default function WishlistSidebar({ className, variant = 'sidebar' }: Props) {
  const { items, clear, remove } = useWishlist();
  const add = useCartStore((s) => s.addItem);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemove(id: string) {
    try {
      setRemovingId(id);
      await remove(id); // 서버 삭제 + SWR 갱신
    } finally {
      setRemovingId(null);
    }
  }

  if (items.length === 0) return null;

  const title = `내 위시리스트${variant === 'inline' ? ` (${items.length}개)` : ''}`;
  const list = variant === 'inline' ? items : items.slice(0, 5);

  return (
    <Card variant="muted" className={clsx('mt-6', className)}>
      <CardHeader className={clsx('rounded-t-lg', variant === 'inline' && 'bg-muted/50 dark:bg-card/40 border-b border-border')}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-foreground" />
            {title}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={clear} className="border-border bg-transparent hover:bg-primary/10 dark:hover:bg-primary/20">
            <Trash2 className="h-4 w-4 mr-2" />
            위시리스트 비우기
          </Button>
        </div>
      </CardHeader>

      <CardContent className={variant === 'inline' ? 'p-0' : ''}>
        <div className={clsx(variant === 'inline' ? 'divide-y' : 'space-y-3')}>
          {list.map((it) => (
            <div
              key={it.id}
              className={clsx(
                'flex items-center gap-4',
                variant === 'inline' ? 'p-4' : 'p-3',
                'min-w-0' // 말줄임을 위해 필요
              )}
            >
              <Image src={it.image || '/placeholder.svg'} alt={it.name} width={56} height={56} className="h-14 w-14 rounded-xl border object-cover flex-shrink-0 shadow-sm" />
              {/* 이름/가격 영역 - 긴 이름은 말줄임 */}
              <div className="flex-1 min-w-0">
                <Link href={`/products/${it.id}`} className="block truncate text-[15px] font-medium transition-colors hover:text-primary hover:underline">
                  {it.name}
                </Link>
                <div className="text-sm text-muted-foreground">{it.price.toLocaleString()}원</div>
              </div>

              {/* 액션 버튼: 크기/간격 통일 */}
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 w-9 border-border bg-transparent p-0 hover:bg-primary/10 dark:hover:bg-primary/20"
                  onClick={() => {
                    add({ id: it.id, name: it.name, price: it.price, quantity: 1, image: it.image, stock: it.stock });
                    showSuccessToast('장바구니에 담았습니다.');
                  }}
                  aria-label="장바구니에 담기"
                  title="장바구니에 담기"
                  // remove(it.id); -> 자동삭제 전용 (지워서 활성화 시켜도됨)
                >
                  <ShoppingCart className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 p-0 text-muted-foreground hover:bg-destructive/10 dark:hover:bg-destructive/15 hover:text-destructive"
                  onClick={() => handleRemove(it.id)}
                  disabled={removingId === it.id}
                  aria-label="위시리스트에서 삭제"
                  title="위시리스트에서 삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
