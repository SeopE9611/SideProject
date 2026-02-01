'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useInfiniteProducts } from '@/app/products/hooks/useInfiniteProducts';
import { usePdpBundleStore } from '@/app/store/pdpBundleStore';
import { CheckCircle2, Minus, Plus, ShoppingCart } from 'lucide-react';
import SiteContainer from '@/components/layout/SiteContainer';
import { Input } from '@/components/ui/input';

type RacketMini = {
  id: string;
  name: string;
  price: number;
  image?: string;
  status?: string;
  maxQty?: number;
};

export default function RacketSelectStringClient({ racket }: { racket: RacketMini }) {
  const router = useRouter();
  const setItems = usePdpBundleStore((s) => s.setItems);
  const clear = usePdpBundleStore((s) => s.clear);

  /**
   * "번들 수량" = 라켓 구매 수량 = 스트링 구매 수량
   * - 이 값만큼 라켓/스트링이 동일 수량으로 체크아웃에 담기고, 결제 금액도 함께 증가.
   * - 신청서 STEP2의 "라켓별 세부 장착 정보" 라인도 이 수량 기준으로 자동 생성.
   * - 수량 변경은 이 화면(스트링 선택)에서만 하도록 UX를 단단하게 묶는 것을 전제로 함.
   */
  const [workCount, setWorkCount] = useState<number>(1);

  const clampWorkCount = (v: number) => {
    if (!Number.isFinite(v)) return 1;
    const max = Number.isFinite(racket.maxQty) && (racket.maxQty as number) > 0 ? (racket.maxQty as number) : 1;
    return Math.max(1, Math.min(max, Math.trunc(v)));
  };

  useEffect(() => {
    clear();
  }, [clear]);

  const { products, isLoadingInitial, isFetchingMore, hasMore, loadMore } = useInfiniteProducts({
    limit: 6,
    // 교체 서비스에 사용되는 "스트링"만 노출
    purpose: 'stringing',
  });

  const handleSelectString = (p: any) => {
    const stringImage = p?.images?.[0] ?? p?.imageUrl;

    const qty = clampWorkCount(workCount);

    setItems([
      { id: racket.id, name: racket.name, price: racket.price, quantity: qty, image: racket.image, kind: 'racket' },
      // 번들 수량(workCount)만큼 라켓/스트링을 "같은 수량"으로 함께 결제
      { id: String(p._id), name: p.name, price: p.price, quantity: qty, image: stringImage, kind: 'product' },
    ]);

    router.push(`/checkout?mode=buynow&withService=1`);
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <SiteContainer variant="wide" className="py-8 bp-md:py-12 space-y-8 bp-md:space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h1 className="text-2xl bp-md:text-4xl font-bold tracking-tight text-slate-900">스트링 선택</h1>
          <p className="text-sm bp-md:text-base text-slate-600 leading-relaxed">라켓과 함께 구매하실 스트링을 선택해주세요. 선택한 스트링은 라켓과 함께 한 번에 결제됩니다.</p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-3xl opacity-50 -z-0" />
            <div className="relative z-10 p-4 bp-md:p-6 flex gap-4 bp-md:gap-6 items-center">
              <div className="flex-shrink-0">
                {racket.image ? (
                  <img src={racket.image || '/placeholder.svg'} alt={racket.name} className="w-20 h-20 bp-md:w-24 bp-md:h-24 object-cover rounded-xl shadow-md ring-2 ring-slate-100" />
                ) : (
                  <div className="w-20 h-20 bp-md:w-24 bp-md:h-24 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shadow-md">
                    <ShoppingCart className="w-10 h-10 text-slate-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-green-600 mb-1">선택된 라켓</p>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">{racket.name}</h3>
                    <p className="text-lg font-semibold text-slate-700">{racket.price.toLocaleString()}원</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* 작업 개수(= 스트링 결제 개수) */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 bp-md:p-6 shadow-sm">
            <div className="flex flex-col bp-md:flex-row bp-md:items-center bp-md:justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">번들 수량 (라켓 + 스트링)</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  이 수량만큼 <span className="font-medium">라켓/스트링/교체비</span>가 체크아웃에서 함께 계산되고, 신청서 STEP2의 <span className="font-medium">라켓별 세부 장착 정보</span>도 자동으로 생성됩니다.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start bp-md:self-auto">
                <Button type="button" variant="outline" className="h-10 w-10 p-0" onClick={() => setWorkCount((prev) => clampWorkCount(prev - 1))} aria-label="번들 수량 감소">
                  <Minus className="h-4 w-4" />
                </Button>

                <Input type="number" inputMode="numeric" min={1} max={30} value={workCount} onChange={(e) => setWorkCount(clampWorkCount(Number(e.target.value)))} className="h-10 w-20 text-center" />

                <Button type="button" variant="outline" className="h-10 w-10 p-0" onClick={() => setWorkCount((prev) => clampWorkCount(prev + 1))} aria-label="번들 수량 증가">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center">사용 가능한 스트링</h2>
          <div className="grid grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-3 gap-4 bp-md:gap-6">
            {products.map((p: any) => {
              const stringImage = p?.images?.[0] ?? p?.imageUrl;

              return (
                <div key={String(p._id)} className="group relative overflow-hidden border border-slate-200 rounded-2xl bg-white hover:border-slate-300 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  <div className="p-5 flex flex-col h-full">
                    {/* String Image */}
                    <div className="mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 aspect-square flex items-center justify-center">
                      {stringImage ? (
                        <img src={stringImage || '/placeholder.svg'} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                      ) : (
                        <div className="text-slate-300">
                          <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">{p.name}</h3>
                      <p className="text-lg font-bold text-slate-900">{Number(p.price ?? 0).toLocaleString()}원</p>
                    </div>

                    {/* Select Button */}
                    <Button className="mt-4 w-full bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl py-5 group-hover:bg-blue-600 group-hover:shadow-lg transition-all duration-300" onClick={() => handleSelectString(p)}>
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
        </div>

        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button onClick={loadMore} disabled={isFetchingMore} className="px-8 py-6 rounded-xl font-medium bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-all duration-300">
              {isFetchingMore ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
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
      </SiteContainer>
    </div>
  );
}
