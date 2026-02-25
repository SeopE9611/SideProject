import FilterableProductList from '@/app/products/components/FilterableProductList';
import SiteContainer from '@/components/layout/SiteContainer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Suspense } from 'react';
import { CardGridSkeleton } from '@/components/system/PageLoading';
import HeroCourtBackdrop from '@/components/system/HeroCourtBackdrop';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;

  // 유틸: string | string[] | undefined → string | null 로 정리
  const pickFirst = (v: string | string[] | undefined): string | null => (typeof v === 'string' ? v : Array.isArray(v) ? (v[0] ?? null) : null);

  const initialBrand = pickFirst(sp.brand);
  const initialMaterial = pickFirst(sp.material);

  const from = pickFirst(sp.from);

  return (
    <div className="min-h-full bg-muted/30">
      <div className="relative overflow-hidden bg-muted/30 py-10 bp-sm:py-12 bp-md:py-24">
        <div className="absolute inset-0 bg-overlay/10 dark:bg-overlay/30" />
        <HeroCourtBackdrop className="hidden bp-md:block h-full w-full text-primary opacity-[0.10] dark:opacity-[0.12]" />

        <div className="hidden bp-md:block absolute top-10 left-4 bp-md:left-10 w-16 h-16 bp-md:w-20 bp-md:h-20 bg-card/10 rounded-full blur-xl animate-float" />
        <div className="hidden bp-md:block absolute bottom-10 right-4 bp-md:right-10 w-24 h-24 bp-md:w-32 bp-md:h-32 bg-card/5 rounded-full blur-2xl animate-float-delayed" />
        <div className="hidden bp-md:block absolute top-1/2 left-1/4 w-12 h-12 bg-muted/60 dark:bg-card/60 rounded-full blur-lg animate-pulse" />

        <SiteContainer variant="wide" className="relative">
          <div className="text-center text-foreground">
            <h1 className="text-3xl bp-sm:text-4xl bp-md:text-5xl bp-lg:text-6xl font-bold mb-3 bp-sm:mb-4 bp-md:mb-6 text-foreground leading-tight">테니스 스트링</h1>
            <p className="text-base bp-sm:text-lg bp-md:text-2xl mb-5 bp-sm:mb-6 bp-md:mb-8 text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">도깨비 테니스 스트링으로 플레이를 한 단계 업그레이드하세요</p>
          </div>
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-6 bp-sm:py-8 bp-md:py-12">
        {from === 'apply' && (
          <div className="mb-4 bp-sm:mb-6 rounded-xl border border-border bg-card/90 dark:bg-card backdrop-blur p-4 bp-sm:p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm bp-sm:text-base font-semibold text-foreground">장착 서비스 신청용 스트링을 고르는 중이에요</p>
                <p className="mt-1 text-xs bp-sm:text-sm text-muted-foreground leading-relaxed">결제하면 신청서가 자동으로 연결돼요.</p>
              </div>

              <div className="flex w-full bp-sm:w-auto gap-2">
                <Button asChild variant="outline" className="flex-1 bp-sm:flex-none">
                  <Link href="/services">서비스 안내</Link>
                </Button>
                <Button asChild className="flex-1 bp-sm:flex-none">
                  <Link href="/services/pricing">가격표 보기</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
        <Suspense fallback={<CardGridSkeleton count={12} />}>
          <FilterableProductList initialBrand={initialBrand} initialMaterial={initialMaterial} />
        </Suspense>
      </SiteContainer>
    </div>
  );
}
