'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useInfiniteProducts } from '@/app/products/hooks/useInfiniteProducts';
import { usePdpBundleStore } from '@/app/store/pdpBundleStore';

type RacketMini = {
  id: string;
  name: string;
  price: number;
  image?: string;
  status?: string;
};

export default function RacketSelectStringClient({ racket }: { racket: RacketMini }) {
  const router = useRouter();
  const { items, setItems, clear } = usePdpBundleStore();

  useEffect(() => {
    if (items.length > 0) clear();
  }, [items.length, clear]);

  const { products, isLoadingInitial, isFetchingMore, hasMore, loadMore } = useInfiniteProducts({ limit: 6 });

  const handleSelectString = (p: any) => {
    const stringImage = p?.images?.[0] ?? p?.imageUrl;

    setItems([
      { id: racket.id, name: racket.name, price: racket.price, quantity: 1, image: racket.image, kind: 'racket' },
      { id: String(p._id), name: p.name, price: p.price, quantity: 1, image: stringImage, kind: 'product' },
    ]);

    router.push(`/checkout?mode=buynow&withService=1`);
  };

  if (isLoadingInitial) return <div className="container py-10">로딩 중...</div>;

  return (
    <div className="container py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">스트링 선택</h1>
        <p className="text-sm text-slate-500">선택한 스트링은 라켓과 함께 Checkout에서 1회 결제됩니다.</p>
      </div>

      <div className="rounded-xl border p-4 flex gap-4 items-center">
        {racket.image ? <img src={racket.image} alt={racket.name} className="w-16 h-16 object-cover rounded-lg" /> : <div className="w-16 h-16 rounded-lg bg-slate-100" />}
        <div>
          <div className="font-semibold">{racket.name}</div>
          <div className="text-sm text-slate-500">{racket.price.toLocaleString()}원</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p: any) => (
          <div key={String(p._id)} className="border rounded-xl p-4 flex flex-col">
            <div className="font-semibold line-clamp-1">{p.name}</div>
            <div className="text-sm text-slate-500 mt-1">{Number(p.price ?? 0).toLocaleString()}원</div>
            <Button className="mt-4" onClick={() => handleSelectString(p)}>
              선택
            </Button>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button onClick={loadMore} disabled={isFetchingMore}>
            {isFetchingMore ? '불러오는 중...' : '더 보기'}
          </Button>
        </div>
      )}
    </div>
  );
}
