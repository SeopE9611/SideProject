import FilterableRacketList from "@/app/rackets/_components/FilterableRacketList";
import SiteContainer from "@/components/layout/SiteContainer";
import HeroCourtBackdrop from "@/components/system/HeroCourtBackdrop";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "중고 라켓 구매·대여",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function RacketsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  // 유틸: string | string[] | undefined → string | null 로 정리
  const pickFirst = (v: string | string[] | undefined): string | null =>
    typeof v === "string" ? v : Array.isArray(v) ? (v[0] ?? null) : null;

  const initialBrand = pickFirst(sp.brand);
  const initialCondition = pickFirst(sp.cond);
  const initialQ = pickFirst(sp.q);
  const initialMinPrice = pickFirst(sp.minPrice);
  const initialMaxPrice = pickFirst(sp.maxPrice);

  const from = pickFirst(sp.from);
  // /rackets -> /rackets/finder 로 "현재 필터 상태"를 들고 가는 링크
  const finderHref = (() => {
    const p = new URLSearchParams();
    if (initialBrand) p.set("brand", initialBrand);
    if (initialCondition) p.set("condition", initialCondition);
    if (initialQ) p.set("q", initialQ);
    if (initialMinPrice) p.set("minPrice", initialMinPrice);
    if (initialMaxPrice) p.set("maxPrice", initialMaxPrice);
    const qs = p.toString();
    return qs ? `/rackets/finder?${qs}` : "/rackets/finder";
  })();

  return (
    <div className="min-h-full bg-muted/30">
      <div className="relative overflow-hidden bg-muted/30 py-10 bp-sm:py-12 bp-md:py-24">
        <div className="absolute inset-0 bg-overlay/20" />
        <HeroCourtBackdrop className="hidden bp-md:block h-full w-full text-primary opacity-[0.10] dark:opacity-[0.12]" />

        <SiteContainer variant="wide" className="relative">
          <div className="text-center text-foreground">
            <h1 className="text-3xl bp-sm:text-4xl bp-md:text-4xl bp-lg:text-5xl font-bold mb-3 bp-sm:mb-4 bp-md:mb-6 text-foreground leading-tight">
              중고 라켓 구매·대여
            </h1>
            <p className="text-base bp-sm:text-lg bp-md:text-xl mb-5 bp-sm:mb-6 bp-md:mb-8 text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
              검수된 중고 라켓 구매·대여와 스트링 교체를 동시에 신청하세요.
            </p>
            <div className="mt-2 flex items-center justify-center">
              <Button asChild size="lg" variant="secondary">
                <Link href={finderHref} aria-label="라켓 검색로 이동">
                  <Search className="mr-2 h-5 w-5" />
                  스펙으로 찾기 (라켓 검색)
                </Link>
              </Button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              무게·밸런스 등 상세 스펙으로 바로 찾아보세요
            </p>
          </div>
        </SiteContainer>
      </div>

      <SiteContainer
        variant="wide"
        className="py-6 bp-sm:py-8 bp-md:py-12 bp-lg:max-w-[1600px] bp-xl:max-w-[1680px]"
      >
        {from === "apply" && (
          <div className="mb-4 rounded-xl border border-border bg-card p-3 shadow-sm bp-sm:p-4">
            <div className="flex flex-col gap-3 bp-md:flex-row bp-md:items-center bp-md:justify-between">
              <div className="min-w-0">
                <p className="break-keep text-sm font-semibold text-foreground bp-sm:text-base">
                  라켓 선택 후 스트링 장착까지 이어집니다
                </p>
                <p className="mt-0.5 break-keep text-xs leading-relaxed text-muted-foreground">
                  구매는 스트링 선택 후 결제로, 대여는 기간 선택 후 장착
                  설정으로 이동합니다.
                </p>
              </div>

              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-9 w-full whitespace-nowrap border-border bg-card text-foreground bp-sm:w-auto"
              >
                <Link
                  href="/services/apply"
                  className="flex items-center justify-center gap-1.5"
                >
                  <span aria-hidden="true">←</span>
                  신청 화면으로
                </Link>
              </Button>
            </div>
          </div>
        )}
        <FilterableRacketList
          initialBrand={initialBrand}
          initialCondition={initialCondition}
        />
      </SiteContainer>
    </div>
  );
}
