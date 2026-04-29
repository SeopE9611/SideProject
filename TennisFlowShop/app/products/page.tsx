import FilterableProductList from "@/app/products/components/FilterableProductList";
import SiteContainer from "@/components/layout/SiteContainer";
import HeroCourtBackdrop from "@/components/system/HeroCourtBackdrop";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "스트링",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;

  // 유틸: string | string[] | undefined → string | null 로 정리
  const pickFirst = (v: string | string[] | undefined): string | null => (typeof v === "string" ? v : Array.isArray(v) ? (v[0] ?? null) : null);

  const initialBrand = pickFirst(sp.brand);
  const initialMaterial = pickFirst(sp.material);

  const from = pickFirst(sp.from);

  return (
    <div className="min-h-full bg-muted/30">
      <div className="relative overflow-hidden bg-muted/30 py-10 bp-sm:py-12 bp-md:py-24">
        <div className="absolute inset-0 bg-overlay/10 dark:bg-overlay/30" />
        <HeroCourtBackdrop className="hidden bp-md:block h-full w-full text-primary opacity-[0.10] dark:opacity-[0.12]" />


        <SiteContainer variant="wide" className="relative">
          <div className="text-center text-foreground">
            <h1 className="font-bold text-3xl bp-sm:text-4xl bp-md:text-4xl bp-lg:text-5xl mb-3 bp-sm:mb-4 bp-md:mb-6 text-foreground leading-tight">테니스 스트링</h1>
            <p className="text-base bp-sm:text-lg bp-md:text-2xl mb-5 bp-sm:mb-6 bp-md:mb-8 text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">도깨비테니스 스트링으로 플레이를 한 단계 업그레이드하세요</p>
          </div>
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-6 bp-sm:py-8 bp-md:py-12">
        <Card className="mb-4 border-border bg-muted/30 bp-sm:mb-6">
          <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                어떤 스트링이 맞을지 모르겠나요?
              </p>
              <p className="text-sm text-muted-foreground">
                간단한 질문에 답하면 플레이 성향에 맞는 스트링 선택 방향을 확인할 수 있어요.
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/products/recommend">스트링 추천받기</Link>
            </Button>
          </CardContent>
        </Card>

        {from === "apply" && (
          <div className="mb-4 bp-sm:mb-6 rounded-xl border border-border bg-card p-4 bp-sm:p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm bp-sm:text-base font-semibold text-foreground">교체서비스 신청용 스트링을 고르는 중이에요</p>
                <p className="mt-1 text-xs bp-sm:text-sm text-muted-foreground leading-relaxed">원하는 스트링을 선택하면 체크아웃에서 신청과 결제를 함께 진행할 수 있어요.</p>
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
        <FilterableProductList initialBrand={initialBrand} initialMaterial={initialMaterial} />
      </SiteContainer>
    </div>
  );
}
