import FilterableProductList from '@/app/products/components/FilterableProductList';
import SiteContainer from '@/components/layout/SiteContainer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Suspense } from 'react';
import { CardGridSkeleton } from '@/components/system/PageLoading';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;

  // 유틸: string | string[] | undefined → string | null 로 정리
  const pickFirst = (v: string | string[] | undefined): string | null => (typeof v === 'string' ? v : Array.isArray(v) ? (v[0] ?? null) : null);

  const initialBrand = pickFirst(sp.brand);
  const initialMaterial = pickFirst(sp.material);

  const from = pickFirst(sp.from);

  return (
    <div className="min-h-full bg-gradient-to-br from-background via-muted to-card dark:from-background dark:via-muted dark:to-card">
      <div className="relative overflow-hidden bg-gradient-to-r from-background via-muted to-card dark:from-background dark:via-muted dark:to-card py-10 bp-sm:py-12 bp-md:py-24">
        <div className="absolute inset-0 bg-black/10 dark:bg-black/30" />
        <div className="hidden bp-md:block absolute inset-0 opacity-20 dark:opacity-10">
          <svg className="w-full h-full" viewBox="0 0 800 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="court-lines" patternUnits="userSpaceOnUse" width="200" height="100">
                <rect width="200" height="100" fill="transparent" />
                <line x1="0" y1="50" x2="200" y2="50" stroke="white" strokeWidth="2" opacity="0.3" />
                <line x1="100" y1="0" x2="100" y2="100" stroke="white" strokeWidth="2" opacity="0.3" />
                <rect x="25" y="25" width="150" height="50" fill="none" stroke="white" strokeWidth="1" opacity="0.2" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#court-lines)" />
          </svg>
        </div>

        <div className="hidden bp-md:block absolute top-10 left-4 bp-md:left-10 w-16 h-16 bp-md:w-20 bp-md:h-20 bg-card/10 rounded-full blur-xl animate-float" />
        <div className="hidden bp-md:block absolute bottom-10 right-4 bp-md:right-10 w-24 h-24 bp-md:w-32 bp-md:h-32 bg-card/5 rounded-full blur-2xl animate-float-delayed" />
        <div className="hidden bp-md:block absolute top-1/2 left-1/4 w-12 h-12 bg-primary rounded-full blur-lg animate-pulse" />

        <SiteContainer variant="wide" className="relative">
          <div className="text-center text-white">
            <h1 className="text-3xl bp-sm:text-4xl bp-md:text-5xl bp-lg:text-6xl font-bold mb-3 bp-sm:mb-4 bp-md:mb-6 bg-gradient-to-r from-white to-card bg-clip-text text-transparent leading-tight">테니스 스트링</h1>
            <p className="text-base bp-sm:text-lg bp-md:text-2xl mb-5 bp-sm:mb-6 bp-md:mb-8 text-primary dark:text-primary max-w-3xl mx-auto leading-relaxed px-4">도깨비 테니스 스트링으로 플레이를 한 단계 업그레이드하세요</p>
          </div>
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-6 bp-sm:py-8 bp-md:py-12">
        {from === 'apply' && (
          <div className="mb-4 bp-sm:mb-6 rounded-xl border border-border bg-card/90 dark:bg-card backdrop-blur p-4 bp-sm:p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm bp-sm:text-base font-semibold text-foreground">장착 서비스 신청용 스트링을 고르는 중이에요</p>
                <p className="mt-1 text-xs bp-sm:text-sm text-muted-foreground leading-relaxed">스트링 선택 → “교체 서비스 포함 결제” → 결제 완료 후 신청서 페이지로 자동 이동합니다.</p>
              </div>

              <div className="flex w-full bp-sm:w-auto gap-2">
                <Button asChild variant="outline" className="flex-1 bp-sm:flex-none">
                  <Link href="/services">서비스 안내</Link>
                </Button>
                <Button asChild className="flex-1 bp-sm:flex-none">
                  <Link href="/services/pricing">가격 안내</Link>
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
