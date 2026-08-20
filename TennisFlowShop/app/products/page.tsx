import FilterableProductList from "@/app/products/components/FilterableProductList";
import { CommerceCatalogHero } from "@/components/commerce";
import SiteContainer from "@/components/layout/SiteContainer";
import { PublicSurface } from "@/components/public/PublicSurface";
import { StepIndicator } from "@/components/public/StepIndicator";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "스트링",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  // 유틸: string | string[] | undefined → string | null 로 정리
  const pickFirst = (v: string | string[] | undefined): string | null =>
    typeof v === "string" ? v : Array.isArray(v) ? (v[0] ?? null) : null;

  const initialBrand = pickFirst(sp.brand);
  const initialMaterial = pickFirst(sp.material);

  const from = pickFirst(sp.from);

  return (
    <div className="min-h-full bg-background">
      <CommerceCatalogHero
        eyebrow={null}
        title="테니스 스트링"
        description="플레이 스타일에 맞는 스트링을 고르고, 교체서비스까지 이어서 신청하세요."
        actions={
          <Button
            asChild
            size="lg"
            variant="highlight_soft"
            wrap="responsive"
            className="min-h-11 w-full bp-sm:w-auto"
          >
            <Link href="/products/recommend">내게 맞는 스트링 찾기</Link>
          </Button>
        }
        guideTitle="스트링 선택 순서"
        guideItems={[
          {
            label: "플레이 성향 확인",
            description: "원하는 타구감과 플레이 스타일을 살펴보세요.",
          },
          { label: "색상·게이지 선택", description: "취향과 성능에 맞는 옵션을 비교하세요." },
          { label: "교체서비스 연결", description: "선택한 스트링으로 장착 신청을 이어가세요." },
        ]}
      />

      <SiteContainer
        variant="wide"
        className="py-6 bp-sm:py-8 bp-md:py-12 bp-lg:max-w-[1600px] bp-xl:max-w-[1680px]"
      >
        {from === "apply" && (
          <PublicSurface className="mb-4 bp-sm:mb-6">
            <div className="flex flex-col gap-5">
              <div className="min-w-0 space-y-2">
                <p className="text-ui-body-sm bp-sm:text-ui-body font-semibold text-foreground">
                  1단계: 장착할 스트링을 선택해주세요
                </p>
                <p className="text-ui-label leading-relaxed text-muted-foreground bp-sm:text-ui-body-sm">
                  선택 후 결제 화면에서 수령 방식과 장착 요청사항을 입력합니다. 결제와 함께
                  교체서비스 신청이 접수됩니다.
                </p>
                <p className="text-ui-label text-muted-foreground bp-sm:text-ui-body-sm">
                  현재 스트링 단품 구매는 운영하지 않으며, 스트링 교체 신청과 함께 이용할 수
                  있습니다.
                </p>
              </div>

              <StepIndicator
                currentStep="string"
                steps={[
                  {
                    id: "string",
                    label: "스트링 선택",
                    description: "장착할 상품 고르기",
                  },
                  {
                    id: "checkout",
                    label: "결제/수령 입력",
                    description: "요청사항 작성",
                  },
                  {
                    id: "complete",
                    label: "접수 완료",
                    description: "결제와 함께 신청 접수",
                  },
                ]}
              />

              <div className="flex w-full flex-col gap-2 bp-sm:flex-row bp-sm:justify-end">
                <Button
                  asChild
                  variant="outline"
                  wrap="responsive"
                  className="min-h-11 w-full bp-sm:w-auto"
                >
                  <Link href="/services#service-start">신청 방식 다시 선택</Link>
                </Button>
                <Button
                  asChild
                  variant="secondary"
                  wrap="responsive"
                  className="min-h-11 w-full bp-sm:w-auto"
                >
                  <Link href="/services/pricing">가격표 보기</Link>
                </Button>
              </div>
            </div>
          </PublicSurface>
        )}
        <div id="product-list" className="scroll-mt-24 bp-md:scroll-mt-28">
          <FilterableProductList initialBrand={initialBrand} initialMaterial={initialMaterial} />
        </div>
      </SiteContainer>
    </div>
  );
}
