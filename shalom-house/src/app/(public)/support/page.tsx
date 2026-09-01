import { createPublicPageMetadata } from "@/features/seo/metadata";

export const metadata = createPublicPageMetadata("/support");

import Link from "next/link";

import { SectionPageHeader } from "@/components/layout/section-page-header";
import { siteConfig } from "@/config/site";

const links = [
  {
    title: "후원하기",
    description: "후원 절차와 확인 방법을 안내합니다.",
    href: "/support/donation",
  },
  {
    title: "자원봉사",
    description: "참여 가능 여부와 문의 절차를 안내합니다.",
    href: "/support/volunteer",
  },
  {
    title: "문의하기",
    description: "현재 확인된 연락 경로를 안내합니다.",
    href: "/support/contact",
  },
];

export default function SupportPage() {
  return (
    <>
      <SectionPageHeader
        sectionHref="/support"
        eyebrow="함께하기"
        title="함께하기"
        description="후원, 자원봉사와 참여 문의에 필요한 경로를 안내합니다."
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "함께하기" }]}
        notice="정확한 참여 방법과 최신 절차는 담당 안내를 통해 확인해 주세요."
      />
      <section className="mx-auto max-w-site px-page py-12 sm:px-page-wide sm:py-16">
        <h2 className="text-safe-wrap text-heading font-bold">참여 방법 선택</h2>
        <ul className="mt-6 divide-y divide-border border-y">
          {links.map((item) => (
            <li key={item.href}>
              <Link
                className="block py-5 hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-focus-ring"
                href={item.href}
              >
                <strong className="text-safe-wrap text-heading">{item.title}</strong>
                <span className="text-safe-wrap mt-2 block text-muted-foreground">{item.description}</span>
              </Link>
            </li>
          ))}
        </ul>
        <h2 className="text-safe-wrap mt-10 text-heading font-bold">대표 전화</h2>
        <a
          className="text-safe-wrap mt-3 inline-flex min-h-11 items-center text-heading font-bold text-primary underline"
          href={`tel:${siteConfig.phone}`}
        >
          {siteConfig.phone}
        </a>
        <p className="text-safe-wrap mt-3 text-muted-foreground">
          문의 목적을 먼저 말씀해 주시면 필요한 안내를 확인할 수 있습니다.
        </p>
      </section>
    </>
  );
}
