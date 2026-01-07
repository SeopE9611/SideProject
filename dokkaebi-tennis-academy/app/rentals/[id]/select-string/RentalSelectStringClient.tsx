'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { racketBrandLabel } from '@/lib/constants';
import { useInfiniteProducts } from '@/app/products/hooks/useInfiniteProducts';
import SiteContainer from '@/components/layout/SiteContainer';

type RacketMini = {
  id: string;
  brand: string;
  model: string;
  condition: 'A' | 'B' | 'C';
  image: string | null;
};

export default function RentalSelectStringClient({ racket, period }: { racket: RacketMini; period: 7 | 15 | 30 }) {
  const router = useRouter();
  const [q, setQ] = useState('');

  const { products, isLoadingInitial, isFetchingMore, hasMore, loadMore } = useInfiniteProducts({
    limit: 6,
    q: q.trim(),
  });

  const title = useMemo(() => {
    const brand = racketBrandLabel(racket.brand) ?? racket.brand;
    return `${brand} ${racket.model}`;
  }, [racket.brand, racket.model]);

  const goCheckout = (stringId: string) => {
    router.push(`/rentals/${encodeURIComponent(racket.id)}/checkout?period=${period}&stringId=${stringId}&requestStringing=1`);
  };

  const skip = () => {
    router.push(`/rentals/${encodeURIComponent(racket.id)}/checkout?period=${period}`);
  };

  if (isLoadingInitial) {
    return (
      <SiteContainer variant="wide" className="py-16">
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
            <p className="text-sm text-slate-500">스트링을 불러오는 중...</p>
          </div>
        </div>
      </SiteContainer>
    );
  }

  return (
    <SiteContainer variant="wide" className="py-8 space-y-6">
      <Card className="border-0 shadow-xl overflow-hidden">
        <div className="p-6 flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-56">
            <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100">
              {racket.image ? <Image src={racket.image} alt={title} fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">이미지 없음</div>}
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <CardTitle className="text-xl md:text-2xl">{title}</CardTitle>
            <CardDescription className="text-sm">
              대여 기간: <span className="font-medium">{period}일</span> · 스트링 교체를 원하면 아래에서 스트링을 선택하세요.
            </CardDescription>

            <div className="pt-3 flex flex-col sm:flex-row gap-3">
              <Button onClick={skip} variant="outline" className="h-11">
                스트링 교체 없이 계속하기
              </Button>
              <Button onClick={() => router.push(`/rackets/${encodeURIComponent(racket.id)}`)} variant="ghost" className="h-11">
                라켓 상세로 돌아가기
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="스트링 검색 (예: 폴리, RPM, 알루파워...)" className="h-11" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {(products ?? []).map((prod: any) => {
          const img = prod?.thumbnail || (Array.isArray(prod?.images) && prod.images.length > 0 ? prod.images[0] : null);

          return (
            <Card key={prod._id} className={cn('border shadow-sm hover:shadow-md transition cursor-pointer')} onClick={() => goCheckout(prod._id)}>
              <CardContent className="p-4 space-y-3">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-slate-100">
                  {img ? <Image src={img} alt={prod?.name ?? 'string'} fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">이미지 없음</div>}
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold line-clamp-2">{prod?.name}</div>
                  <div className="text-xs text-slate-500">{Number(prod?.price ?? 0).toLocaleString()}원</div>
                </div>
                <Button className="w-full h-10">이 스트링 선택</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center pt-2">
        <button onClick={loadMore} disabled={isFetchingMore || !hasMore} className="h-11 px-8 border rounded">
          {!hasMore ? '마지막 상품입니다' : isFetchingMore ? '불러오는 중...' : '더 불러오기'}
        </button>
      </div>
    </SiteContainer>
  );
}
