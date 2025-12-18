'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useInfiniteProducts } from '@/app/products/hooks/useInfiniteProducts';

export default function SelectStringClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

  const { products, isLoadingInitial, isFetchingMore, hasMore, loadMore, error } = useInfiniteProducts({ limit: 6 });

// 스트링 선택 핸들러: 주문은 건드리지 않고 단순히 "선택 정보"만 들고 신청 페이지로 이동
const handleSelectString = async (productId: string, mountingFee: number) => {
  // 중복 클릭 방지
  if (addingProductId) return;

  setAddingProductId(productId);

  try {
    // ✅ 주문에 스트링을 추가하지 않고,
    //    orderId + productId + mountingFee 만 쿼리로 넘겨서
    //    /services/apply 가 PDP 모드로 동작하게 만든다.
    router.push(
      `/services/apply?orderId=${orderId}&productId=${productId}&mountingFee=${mountingFee}`
    );
  } finally {
    setAddingProductId(null);
  }
};


  if (isLoadingInitial) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg border bg-white" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="rounded-lg border bg-white p-4 text-sm text-red-600">목록을 불러오는 중 오류가 발생했습니다. {error}</div>;
  }

  if (!products || products.length === 0) {
    return <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">표시할 스트링이 없습니다. 필터를 변경하거나 나중에 다시 시도해 주세요.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p: any) => {
          const isAdding = addingProductId === p._id;
          
          return (
            <button
              key={p._id}
              type="button"
              disabled={!!addingProductId}
              className="rounded-lg border p-3 text-left transition hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleSelectString(p._id, p.mountingFee || 0)}
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-slate-600">
                {typeof p.price === 'number' ? `${p.price.toLocaleString()}원` : '가격 정보 없음'}
              </div>
              {typeof p.mountingFee === 'number' && (
                <div className="text-xs text-slate-500 mt-1">
                  장착비: {p.mountingFee.toLocaleString()}원
                </div>
              )}
              <div className="mt-2 text-blue-600 text-sm">
                {isAdding ? '이동 중…' : '이 스트링 선택'}
              </div>
            </button>
          );
        })}
      </div>

      {hasMore && (
        <div className="pt-2">
          <button 
            type="button" 
            onClick={loadMore} 
            disabled={isFetchingMore || !!addingProductId} 
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
          >
            {isFetchingMore ? '불러오는 중…' : '더 보기'}
          </button>
        </div>
      )}
    </div>
  );
}