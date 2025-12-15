'use client';

import { useRouter } from 'next/navigation';
import { useInfiniteProducts } from '@/app/products/hooks/useInfiniteProducts';

export default function SelectStringClient({ orderId }: { orderId: string }) {
  const router = useRouter();

  // 기존 훅 재사용(필요 시 limit 조정 가능)
  const { products, isLoadingInitial, isFetchingMore, hasMore, loadMore, error } = useInfiniteProducts({ limit: 6 });

  // 초기 로딩: 스켈레톤 그리드
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

  // 2) 빈 목록: 안내 문구
  if (!products || products.length === 0) {
    return <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">표시할 스트링이 없습니다. 필터를 변경하거나 나중에 다시 시도해 주세요.</div>;
  }

  // 3) 목록 렌더: 카드형 버튼 + 선택 시 신청 페이지로 이동
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p: any) => (
          <button
            key={p._id}
            type="button"
            className="rounded-lg border p-3 text-left transition hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            onClick={() => router.push(`/services/apply?orderId=${orderId}&productId=${p._id}`)}
          >
            <div className="font-medium">{p.name}</div>
            <div className="text-sm text-slate-600">{typeof p.price === 'number' ? `${p.price.toLocaleString()}원` : '가격 정보 없음'}</div>
            <div className="mt-2 text-blue-600 text-sm">이 스트링 선택</div>
          </button>
        ))}
      </div>

      {hasMore && (
        <div className="pt-2">
          <button type="button" onClick={loadMore} disabled={isFetchingMore} className="w-full rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60">
            {isFetchingMore ? '불러오는 중…' : '더 보기'}
          </button>
        </div>
      )}
    </div>
  );
}
