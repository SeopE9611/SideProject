'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useInfiniteProducts } from '@/app/products/hooks/useInfiniteProducts';
import { Button } from '@/components/ui/button';

type SelectableStringProduct = {
  _id: string;
  name?: string;
  price?: number;
  mountingFee?: number;
};

export default function SelectStringClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

  const { products, isLoadingInitial, isFetchingMore, hasMore, loadMore, error } = useInfiniteProducts({ limit: 6 });

  // 스트링 선택 핸들러: 주문은 건드리지 않고 단순히 "선택 정보"만 들고 신청 페이지로 이동
  const handleSelectString = async (productId: string) => {
    // 중복 클릭 방지
    if (addingProductId) return;

    setAddingProductId(productId);

    try {
      // 주문에 스트링을 추가하지 않고,
      //    orderId + productId 만 쿼리로 넘겨서
      //    /services/apply 쪽에서 productId 기준 mini API로 공임/가격을 확정한다.
      router.push(`/services/apply?orderId=${orderId}&productId=${productId}`);
    } finally {
      setAddingProductId(null);
    }
  };

  if (isLoadingInitial) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-cy="racket-string-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg border border-border bg-card" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="rounded-lg border border-border bg-card p-4 text-sm text-destructive">목록을 불러오는 중 오류가 발생했습니다. {error}</div>;
  }

  if (!products || products.length === 0) {
    return <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">표시할 스트링이 없습니다. 필터를 변경하거나 나중에 다시 시도해 주세요.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p: SelectableStringProduct) => {
          const isAdding = addingProductId === p._id;

          return (
            <button
              key={p._id}
              type="button"
              data-cy="racket-string-option"
              disabled={!!addingProductId}
              className="rounded-lg border border-border bg-card p-3 text-left text-foreground transition hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => handleSelectString(p._id)}
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-muted-foreground">{typeof p.price === 'number' ? `${p.price.toLocaleString()}원` : '가격 정보 없음'}</div>
              {typeof p.mountingFee === 'number' && <div className="mt-1 text-xs text-muted-foreground">장착비: {p.mountingFee.toLocaleString()}원</div>}
              <div className="mt-2 text-sm text-primary">{isAdding ? '이동 중…' : '이 스트링 선택'}</div>
            </button>
          );
        })}
      </div>

      {hasMore && (
        <div className="pt-2">
          <Button type="button" variant="outline" data-cy="racket-string-load-more" onClick={loadMore} disabled={isFetchingMore || !!addingProductId} className="w-full border-border bg-card text-foreground">
            {isFetchingMore ? '불러오는 중…' : '더 보기'}
          </Button>
        </div>
      )}
    </div>
  );
}
