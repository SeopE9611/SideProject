import Image from "next/image";

import { SectionPageHeader } from "@/components/layout/section-page-header";
import { siteConfig } from "@/config/site";
import { createPublicPageMetadata } from "@/features/seo/metadata";

export const metadata = createPublicPageMetadata("/about/identity");

const logoColors = [
  { name: "남색", value: "#17384D", use: "집과 창문, 밝은 배경용 기관명" },
  { name: "청록색", value: "#087E83", use: "물결 형태의 선" },
  { name: "흰색", value: "#FFFFFF", use: "어두운 배경용 집과 창문, 기관명" },
];

export default function IdentityPage() {
  return (
    <div className="section-layout">
      <SectionPageHeader
        compact
        sectionHref="/about"
        eyebrow="시설소개"
        title="로고 소개"
        description={`${siteConfig.name}의 공식 로고와 실제 사용된 색상을 소개합니다.`}
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "시설소개", href: "/about" }, { label: "로고 소개" }]}
      />
      <div className="min-w-0 space-y-10 sm:space-y-12">
        <section aria-labelledby="identity-name-heading">
          <h2 id="identity-name-heading" className="text-heading font-bold">
            {siteConfig.name} 공식 로고
          </h2>
          <p className="text-safe-wrap mt-5 max-w-content text-body leading-8">
            로고는 집 형태의 선과 네 개의 창문, 물결 형태의 선으로 구성되어 있습니다.
            가로형과 세로형에는 공식 기관명 ‘{siteConfig.name}’이 함께 표시됩니다.
          </p>
        </section>

        <section aria-labelledby="identity-horizontal-heading">
          <h2 id="identity-horizontal-heading" className="text-heading font-bold">
            가로형 로고
          </h2>
          <p className="text-safe-wrap mt-3 text-small leading-7 text-muted-foreground">
            밝은 배경용과 어두운 배경용 로고를 각각의 배경에서 보여드립니다.
          </p>
          <div className="mt-5 grid min-w-0 gap-6 xl:grid-cols-2">
            <figure className="flex min-w-0 flex-col">
              <div className="flex min-h-40 items-center justify-center rounded-panel border border-border bg-paper p-6 sm:p-8">
                <Image
                  src="/brand/logo-header.svg"
                  width={1400}
                  height={360}
                  alt={`${siteConfig.name} 밝은 배경용 가로형 로고`}
                  className="h-auto w-full max-w-[35rem]"
                />
              </div>
              <figcaption className="text-safe-wrap mt-3 text-small text-muted-foreground">
                밝은 배경용 · 남색 집과 기관명, 청록색 물결
              </figcaption>
            </figure>
            <figure className="flex min-w-0 flex-col">
              <div className="flex min-h-40 items-center justify-center rounded-panel border border-brand-dark bg-brand-dark p-6 sm:p-8">
                <Image
                  src="/brand/logo-footer.svg"
                  width={1400}
                  height={360}
                  alt={`${siteConfig.name} 어두운 배경용 가로형 푸터 로고`}
                  className="h-auto w-full max-w-[35rem]"
                />
              </div>
              <figcaption className="text-safe-wrap mt-3 text-small text-muted-foreground">
                어두운 배경용 · 흰색 집과 기관명, 청록색 물결
              </figcaption>
            </figure>
          </div>
        </section>

        <section aria-labelledby="identity-variants-heading">
          <h2 id="identity-variants-heading" className="text-heading font-bold">
            세로형과 심볼형
          </h2>
          <div className="mt-5 grid min-w-0 gap-6 sm:grid-cols-2">
            <figure className="flex min-w-0 flex-col">
              <div className="flex min-h-72 flex-1 items-center justify-center rounded-panel border border-border bg-paper p-6 sm:p-8">
                <Image
                  src="/brand/logo-stacked.svg"
                  width={860}
                  height={860}
                  alt={`${siteConfig.name} 심볼 아래 기관명을 배치한 세로형 로고`}
                  className="h-auto w-full max-w-80"
                />
              </div>
              <figcaption className="text-safe-wrap mt-3 text-small text-muted-foreground">
                세로형 · 심볼 아래에 기관명을 가운데 정렬한 형태
              </figcaption>
            </figure>
            <figure className="flex min-w-0 flex-col">
              <div className="flex min-h-72 flex-1 items-center justify-center rounded-panel border border-border bg-paper p-6 sm:p-8">
                <Image
                  src="/brand/logo-symbol.svg"
                  width={256}
                  height={256}
                  alt={`${siteConfig.name} 집과 창문, 물결로 구성된 글자 없는 심볼형 로고`}
                  className="h-auto w-full max-w-40"
                />
              </div>
              <figcaption className="text-safe-wrap mt-3 text-small text-muted-foreground">
                심볼형 · 기관명 글자 없이 집과 물결을 표시한 형태
              </figcaption>
            </figure>
          </div>
        </section>

        <section aria-labelledby="identity-colors-heading" className="border-t border-border pt-8">
          <h2 id="identity-colors-heading" className="text-heading font-bold">
            로고에 사용된 색상
          </h2>
          <dl className="mt-5 grid gap-x-6 sm:grid-cols-3">
            {logoColors.map((color) => (
              <div key={color.value} className="min-w-0 border-b border-border py-5">
                <dt className="flex items-center gap-3 font-semibold">
                  <span
                    aria-hidden="true"
                    className="size-6 shrink-0 rounded-control border border-border-strong"
                    style={{ backgroundColor: color.value }}
                  />
                  {color.name}
                </dt>
                <dd className="mt-3">
                  <code className="text-small">{color.value}</code>
                  <p className="text-safe-wrap mt-2 text-small leading-7 text-muted-foreground">{color.use}</p>
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-safe-wrap mt-5 text-small leading-7 text-muted-foreground">
            이 페이지는 공식 로고 자산의 색상과 가로·세로 비율을 그대로 유지해 표시합니다.
          </p>
        </section>
      </div>
    </div>
  );
}
