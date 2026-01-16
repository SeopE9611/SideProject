import FilterableRacketList from '@/app/rackets/_components/FilterableRacketList';
import SiteContainer from '@/components/layout/SiteContainer';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function RacketsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;

  // 유틸: string | string[] | undefined → string | null 로 정리
  const pickFirst = (v: string | string[] | undefined): string | null => (typeof v === 'string' ? v : Array.isArray(v) ? v[0] ?? null : null);

  const initialBrand = pickFirst(sp.brand);
  const initialCondition = pickFirst(sp.cond);

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700 py-10 bp-sm:py-12 bp-md:py-24">
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

        <div className="hidden bp-md:block absolute top-10 left-4 bp-md:left-10 w-16 h-16 bp-md:w-20 bp-md:h-20 bg-white/10 rounded-full blur-xl animate-float" />
        <div className="hidden bp-md:block absolute bottom-10 right-4 bp-md:right-10 w-24 h-24 bp-md:w-32 bp-md:h-32 bg-white/5 rounded-full blur-2xl animate-float-delayed" />
        <div className="hidden bp-md:block absolute top-1/2 left-1/4 w-12 h-12 bg-blue-300/20 rounded-full blur-lg animate-pulse" />

        <SiteContainer variant="wide" className="relative">
          <div className="text-center text-white">
            <h1 className="text-3xl bp-sm:text-4xl bp-md:text-5xl bp-lg:text-6xl font-bold mb-3 bp-sm:mb-4 bp-md:mb-6 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent leading-tight">중고 라켓</h1>
            <p className="text-base bp-sm:text-lg bp-md:text-2xl mb-5 bp-sm:mb-6 bp-md:mb-8 text-blue-100 dark:text-blue-200 max-w-3xl mx-auto leading-relaxed px-4">도깨비 테니스의 중고 라켓으로 합리적인 가격에 대여하세요.</p>
            <div className="mt-2 flex items-center justify-center">
              <Button asChild size="lg" className="bg-white text-blue-700 hover:bg-blue-50">
                <Link href="/rackets/finder" aria-label="라켓 파인더로 이동">
                  <Search className="mr-2 h-5 w-5" />
                  스펙으로 찾기 (라켓 파인더)
                </Link>
              </Button>
            </div>
            <p className="mt-2 text-sm text-blue-100/90">헤드·무게·밸런스·RA·SW 범위로 빠르게 좁혀보세요.</p>
          </div>
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-6 bp-sm:py-8 bp-md:py-12">
        <Suspense>
          <FilterableRacketList initialBrand={initialBrand} initialCondition={initialCondition} />
        </Suspense>
      </SiteContainer>
    </div>
  );
}
