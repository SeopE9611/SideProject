import type { Metadata } from "next";
import { isVisualFixtureEnabled } from "@/content/fixtures/visual.fixture";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";
import { JsonLd } from "@/features/seo/json-ld";
import { createDynamicPublicMetadata } from "@/features/seo/metadata";
import { getSiteOrigin } from "@/features/seo/site-url";

export const metadata: Metadata = (() => {
  const value = createDynamicPublicMetadata({
    path: "/",
    title: "샬롬의 집",
    description: "지체 및 지적 장애인이 함께 생활하는 장애인거주시설 샬롬의 집 공식 홈페이지",
    type: "website",
  });
  return {
    openGraph: value.openGraph,
    twitter: value.twitter,
    ...(isVisualFixtureEnabled() ? { robots: { index: false, follow: false } } : {}),
  };
})();

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <JsonLd
        id="organization-json-ld"
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "@id": `${getSiteOrigin()}/#organization`,
          name: "샬롬의 집",
          description: "지체 및 지적 장애인이 함께 생활하는 장애인거주시설",
          url: getSiteOrigin(),
          telephone: "02-2662-2488",
          address: {
            "@type": "PostalAddress",
            streetAddress: "방화대로7가길 11",
            addressLocality: "강서구",
            addressRegion: "서울특별시",
            addressCountry: "KR",
          },
          sameAs: ["https://www.instagram.com/seoul_shalom_house/"],
        }}
      />
      <JsonLd
        id="website-json-ld"
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "샬롬의 집",
          url: getSiteOrigin(),
          inLanguage: "ko-KR",
          publisher: { "@id": `${getSiteOrigin()}/#organization` },
        }}
      />
      <SkipLink />
      <SiteHeader />
      {isVisualFixtureEnabled() ? (
        <aside
          aria-label="로컬 테스트 안내"
          className="border-b border-border bg-warning-soft px-page py-3 text-small text-warning sm:px-page-wide"
        >
          <div className="mx-auto max-w-site">
            로컬 화면 테스트 · 아래 예시 콘텐츠와 이미지는 실제 기관 자료가 아닙니다.
          </div>
        </aside>
      ) : null}
      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
