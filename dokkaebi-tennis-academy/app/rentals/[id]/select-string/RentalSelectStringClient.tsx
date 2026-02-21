'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { racketBrandLabel } from '@/lib/constants';
import { useInfiniteProducts } from '@/app/products/hooks/useInfiniteProducts';
import SiteContainer from '@/components/layout/SiteContainer';

import { CheckCircle2, ShoppingCart } from 'lucide-react';

type RacketMini = {
  id: string;
  brand: string;
  model: string;
  condition: 'A' | 'B' | 'C';
  image: string | null;
};

export default function RentalSelectStringClient({ racket, period }: { racket: RacketMini; period: 7 | 15 | 30 }) {
  const router = useRouter();

  const { products, isLoadingInitial, isFetchingMore, hasMore, loadMore } = useInfiniteProducts({
    limit: 6,
    purpose: 'stringing',
  });

  const title = useMemo(() => {
    const brand = racketBrandLabel(racket.brand) ?? racket.brand;
    const condition = racket.condition ? `상태 ${racket.condition}` : '';
    return `${brand} ${racket.model}${condition ? ` · ${condition}` : ''}`;
  }, [racket.brand, racket.model, racket.condition]);

  const goCheckout = (stringId?: string) => {
    const base = `/rentals/${encodeURIComponent(racket.id)}/checkout?period=${period}`;
    const url = stringId ? `${base}&stringId=${encodeURIComponent(stringId)}` : base;
    router.push(url);
  };

  if (isLoadingInitial) {
    return (
      <SiteContainer variant="wide" className="py-16">
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
            <p className="text-sm text-muted-foreground">스트링을 불러오는 중...</p>
          </div>
        </div>
      </SiteContainer>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-card">
      <SiteContainer variant="wide" className="py-8 bp-md:py-12 space-y-8 bp-md:space-y-10">
        {/* Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h1 className="text-2xl bp-md:text-4xl font-bold tracking-tight text-foreground">스트링 선택</h1>
          <p className="text-sm bp-md:text-base text-muted-foreground leading-relaxed">대여 라켓에 장착할 스트링을 선택해주세요. 선택한 스트링은 대여 결제에 포함됩니다.</p>
        </div>

        {/* Selected Racket Summary (구매 select-string과 동일 골격) */}
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-background to-card rounded-full blur-3xl opacity-50 -z-0" />

            <div className="relative z-10 p-4 bp-md:p-6 flex gap-4 bp-md:gap-6 items-center">
              <div className="flex-shrink-0">
                {racket.image ? (
                  <img src={racket.image || '/placeholder.svg'} alt={title} className="w-20 h-20 bp-md:w-24 bp-md:h-24 object-cover rounded-xl shadow-md ring-2 ring-border/60" />
                ) : (
                  <div className="w-20 h-20 bp-md:w-24 bp-md:h-24 rounded-xl bg-gradient-to-br from-muted to-card flex items-center justify-center shadow-md">
                    <ShoppingCart className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-success mb-1">선택된 라켓 (대여)</p>
                    <h3 className="text-xl font-bold text-foreground mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground">
                      대여 기간: <span className="font-semibold text-foreground">{period}일</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Skip CTA (대여 전용) */}
              <div className="hidden bp-md:block flex-shrink-0">
                <Button variant="outline" className="h-11" onClick={() => goCheckout()}>
                  스트링 없이 결제하기
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Skip CTA */}
          <div className="bp-md:hidden flex justify-center">
            <Button variant="outline" className="h-11 w-full max-w-xs" onClick={() => goCheckout()}>
              스트링 없이 결제하기
            </Button>
          </div>
        </div>

        {/* Strings */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground text-center">사용 가능한 스트링</h2>

          <div className="grid grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-3 gap-4 bp-md:gap-6">
            {(products ?? []).map((p: any) => {
              const stringImage = p?.images?.[0] ?? p?.imageUrl;
              const id = String(p?._id ?? '');

              return (
                <div key={id} className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  <div className="p-5 flex flex-col h-full">
                    {/* String Image */}
                    <div className="mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-muted/60 to-card aspect-square flex items-center justify-center">
                      {stringImage ? <img src={stringImage || '/placeholder.svg'} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">이미지 없음</div>}
                    </div>

                    {/* String Info */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">{p.name}</h3>
                      {p.shortDescription ? <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{p.shortDescription}</p> : null}
                      <p className="text-xl font-bold text-foreground">{Number(p.price ?? 0).toLocaleString()}원</p>
                    </div>

                    {/* Select Button */}
                    <Button className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300" onClick={() => goCheckout(id)}>
                      <span className="flex items-center justify-center gap-2">
                        선택하기
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" className="w-full max-w-xs mx-auto h-11 border-border hover:bg-muted/60" onClick={loadMore} disabled={isFetchingMore}>
                {isFetchingMore ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-foreground" />
                    불러오는 중...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    더 보기
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                )}
              </Button>
            </div>
          )}

          {!hasMore && (products ?? []).length > 0 ? <p className="text-center text-sm text-muted-foreground">마지막 상품입니다</p> : null}
        </div>
      </SiteContainer>
    </div>
  );
}
