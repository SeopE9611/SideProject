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
  const pickFirst = (v: string | string[] | undefined): string | null => (typeof v === 'string' ? v : Array.isArray(v) ? (v[0] ?? null) : null);

  const initialBrand = pickFirst(sp.brand);
  const initialCondition = pickFirst(sp.cond);
  const initialQ = pickFirst(sp.q);
  const initialMinPrice = pickFirst(sp.minPrice);
  const initialMaxPrice = pickFirst(sp.maxPrice);

  const from = pickFirst(sp.from);
  const rentOnly = pickFirst(sp.rentOnly) === '1';

  // /rackets -> /rackets/finder 로 "현재 필터 상태"를 들고 가는 링크
  const finderHref = (() => {
    const p = new URLSearchParams();
    if (initialBrand) p.set('brand', initialBrand);
    if (initialCondition) p.set('condition', initialCondition);
    if (initialQ) p.set('q', initialQ);
    if (initialMinPrice) p.set('minPrice', initialMinPrice);
    if (initialMaxPrice) p.set('maxPrice', initialMaxPrice);
    const qs = p.toString();
    return qs ? `/rackets/finder?${qs}` : '/rackets/finder';
  })();

  return (
    <div className="min-h-full bg-gradient-to-br from-background via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-muted dark:to-muted">
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700 py-10 bp-sm:py-12 bp-md:py-24">
        <div className="absolute inset-0 bg-overlay/20" />
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
            <h1 className="text-3xl bp-sm:text-4xl bp-md:text-5xl bp-lg:text-6xl font-bold mb-3 bp-sm:mb-4 bp-md:mb-6 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent leading-tight">중고 라켓</h1>
            <p className="text-base bp-sm:text-lg bp-md:text-2xl mb-5 bp-sm:mb-6 bp-md:mb-8 text-primary dark:text-primary max-w-3xl mx-auto leading-relaxed px-4">도깨비 테니스의 중고 라켓으로 합리적인 가격에 대여하세요.</p>
            <div className="mt-2 flex items-center justify-center">
              <Button asChild size="lg" variant="secondary">
                <Link href={finderHref} aria-label="라켓 파인더로 이동">
                  <Search className="mr-2 h-5 w-5" />
                  스펙으로 찾기 (라켓 파인더)
                </Link>
              </Button>
            </div>
            <p className="mt-2 text-sm text-primary">헤드·무게·밸런스·RA·SW 범위로 빠르게 좁혀보세요.</p>
          </div>
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-6 bp-sm:py-8 bp-md:py-12">
        {from === 'apply' && (
          <div className="sticky top-[72px] z-40 mb-4 bp-sm:mb-6">
            <div className="rounded-xl border border-border bg-card/90 backdrop-blur p-4 bp-sm:p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm bp-sm:text-base font-semibold text-foreground">교체·장착 신청을 위한 라켓 선택 단계예요</p>
                  <p className="mt-1 text-xs bp-sm:text-sm text-muted-foreground dark:text-muted-foreground leading-relaxed">
                    라켓을 선택한 뒤, 결제/대여 흐름에서 신청서가 자동으로 이어질 수 있어요.
                    <span className="block mt-1 text-sm text-foreground dark:text-foreground">[현재 보기: {rentOnly ? '대여 가능 라켓만' : '전체(구매/대여)'}]</span>
                  </p>
                </div>

                <div className="flex w-full bp-sm:w-auto items-center gap-2 flex-wrap">
                  <Button asChild variant="outline" className="flex-1 bp-sm:flex-none border-border bg-card text-foreground">
                    <Link href="/services/apply" className="flex items-center gap-2">
                      <span className="text-base">←</span>
                      신청 화면으로
                    </Link>
                  </Button>

                  {/* segmented-control: 전체 / 대여가능만 */}
                  <div className="flex-1 bp-sm:flex-none">
                    <div className="inline-flex w-full bp-sm:w-[320px] rounded-full border border-border bg-card p-1">
                      <Link
                        href="/rackets?from=apply"
                        aria-current={!rentOnly ? 'page' : undefined}
                        className={`flex-1 text-center text-sm font-semibold rounded-full px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          rentOnly ? 'text-foreground hover:bg-background/70' : 'bg-primary text-primary-foreground shadow hover:bg-primary/90'
                        }`}
                      >
                        전체보기
                      </Link>

                      <Link
                        href="/rackets?from=apply&rentOnly=1"
                        aria-current={rentOnly ? 'page' : undefined}
                        className={`flex-1 text-center text-sm font-semibold rounded-full px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          rentOnly ? 'bg-primary text-primary-foreground shadow hover:bg-primary/90' : 'text-foreground hover:bg-background/70'
                        }`}
                      >
                        대여가능만
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <Suspense>
          <FilterableRacketList initialBrand={initialBrand} initialCondition={initialCondition} />
        </Suspense>
      </SiteContainer>
    </div>
  );
}
