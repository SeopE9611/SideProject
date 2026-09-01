import type { Metadata } from "next";

import { SectionPageHeader } from "@/components/layout/section-page-header";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "찾아오시는 길",
  description: `${siteConfig.name} 주소와 방문 문의 연락처를 안내합니다.`,
};
const mapLinks = [
  {
    label: "네이버 지도에서 보기(새 창)",
    href: `https://map.naver.com/p/search/${encodeURIComponent(siteConfig.address)}`,
  },
  {
    label: "카카오맵에서 보기(새 창)",
    href: `https://map.kakao.com/?q=${encodeURIComponent(siteConfig.address)}`,
  },
];

export default function DirectionsPage() {
  return (
    <>
      <SectionPageHeader
        sectionHref="/about"
        eyebrow="시설소개"
        title="찾아오시는 길"
        description="샬롬의 집 방문에 필요한 주소와 연락처를 안내합니다."
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "시설소개", href: "/about" }, { label: "찾아오시는 길" }]}
      />
      <section className="bg-surface py-12 sm:py-16" aria-labelledby="directions-address-heading">
        <div className="mx-auto grid max-w-site gap-10 px-page sm:px-page-wide lg:grid-cols-[1.2fr_0.8fr]">
          <div className="border-t-4 border-primary">
            <h2 id="directions-address-heading" className="text-safe-wrap py-5 text-heading font-bold">
              주소 및 외부 지도 링크
            </h2>
            <address className="text-safe-wrap border-y border-border py-5 text-body font-semibold not-italic">
              {siteConfig.address}
            </address>
            <ul className="divide-y divide-border">
              {mapLinks.map((link) => (
                <li key={link.href}>
                  <a
                    className="text-safe-wrap inline-flex min-h-11 items-center font-bold text-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <aside className="border-t-4 border-primary" aria-labelledby="directions-contact-heading">
            <h2 id="directions-contact-heading" className="text-safe-wrap py-5 text-heading font-bold">
              방문 전 문의
            </h2>
            <p className="text-safe-wrap border-y border-border py-5 text-muted-foreground">
              방문 일정과 시설 출입 안내는 대표 전화로 확인할 수 있습니다.
            </p>
            <a
              className="text-safe-wrap inline-flex min-h-11 items-center font-bold text-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              href={`tel:${siteConfig.phone}`}
            >
              대표 전화 {siteConfig.phone}
            </a>
          </aside>
        </div>
      </section>
    </>
  );
}
