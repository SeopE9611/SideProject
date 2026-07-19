import FilterableRacketList from "@/app/rackets/_components/FilterableRacketList";
import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero } from "@/components/public/PublicPageHero";
import { PublicSurface } from "@/components/public/PublicSurface";
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
      <PublicPageHero
        align="center"
        title="중고 라켓 구매·대여"
        description="검수된 중고 라켓을 구매·대여하고 스트링 교체까지 한 번에 신청하세요."
        actions={
          <Button asChild size="lg" variant="secondary" wrap="responsive">
            <Link href={finderHref} aria-label="라켓 검색으로 이동">
              <Search />
              스펙으로 라켓 찾기
            </Link>
          </Button>
        }
      />

      <SiteContainer
        variant="wide"
        className="py-6 bp-sm:py-8 bp-md:py-12 bp-lg:max-w-[1600px] bp-xl:max-w-[1680px]"
      >
        {from === "apply" && (
          <PublicSurface variant="elevated" padding="sm" className="mb-4">
            <div className="flex flex-col gap-3 bp-md:flex-row bp-md:items-center bp-md:justify-between">
              <div className="min-w-0">
                <p className="break-keep text-ui-body-sm font-semibold text-foreground bp-sm:text-ui-body">
                  라켓 선택 후 스트링 장착까지 이어집니다
                </p>
                <p className="mt-0.5 break-keep text-ui-label leading-relaxed text-muted-foreground">
                  구매는 스트링 선택 후 결제로, 대여는 기간 선택 후 장착 설정으로 이동합니다.
                </p>
              </div>

              <Button
                asChild
                size="sm"
                variant="outline"
                wrap="responsive"
                className="w-full bp-sm:w-auto"
              >
                <Link
                  href="/services#service-start"
                  className="flex items-center justify-center gap-1.5"
                >
                  <span aria-hidden="true">←</span>
                  신청 방식 다시 선택
                </Link>
              </Button>
            </div>
          </PublicSurface>
        )}
        <div id="racket-list">
          <FilterableRacketList initialBrand={initialBrand} initialCondition={initialCondition} />
        </div>
      </SiteContainer>
    </div>
  );
}
