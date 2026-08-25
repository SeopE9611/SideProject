import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

type NavigationHref = (typeof siteConfig.mainNavigation)[number]["href"];

const aboutRelatedLinks = [
  { href: "/life", description: "생활과 프로그램 안내" },
  { href: "/transparency", description: "공개가 승인된 운영 자료" },
] satisfies ReadonlyArray<{ href: NavigationHref; description: string }>;

function getNavigationLabel(href: NavigationHref) {
  const navigationItem = siteConfig.mainNavigation.find(
    (item) => item.href === href,
  );

  if (!navigationItem) {
    throw new Error(`등록되지 않은 홈페이지 경로입니다: ${href}`);
  }

  return navigationItem.label;
}

export const metadata: Metadata = {
  title: "시설 소개",
  description: "샬롬의 집의 기본 정보와 공개 홈페이지 안내를 확인합니다.",
};

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-border bg-surface-subtle">
        <div className="mx-auto w-full max-w-site px-page py-16 sm:px-page-wide sm:py-20">
          <div className="max-w-content">
            <p className="text-small font-bold text-primary">시설 소개</p>
            <h1 className="mt-5 text-display font-bold text-foreground sm:text-display-lg">
              샬롬의 집을 소개합니다
            </h1>
            <div className="mt-6 space-y-3 text-body text-muted-foreground">
              <p>{siteConfig.description}입니다.</p>
              <p>
                현재 확인 가능한 시설 기본 정보와 공개가 승인된 홈페이지 안내를
                제공합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="about-basic-info-heading"
        className="border-b border-border bg-surface"
      >
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
          <p className="text-small font-bold text-primary">기본 정보</p>
          <h2
            id="about-basic-info-heading"
            className="mt-2 text-title font-bold text-foreground"
          >
            현재 확인된 시설 정보
          </h2>
          <address className="mt-10 not-italic">
            <dl className="grid border-y border-border md:grid-cols-3">
              <div className="border-b border-border py-6 md:border-r md:border-b-0 md:pr-8">
                <dt className="text-small font-bold text-foreground">시설명</dt>
                <dd className="mt-2 text-body text-muted-foreground">
                  {siteConfig.name}
                </dd>
              </div>
              <div className="border-b border-border py-6 md:border-r md:border-b-0 md:px-8">
                <dt className="text-small font-bold text-foreground">주소</dt>
                <dd className="mt-2 break-words text-body text-muted-foreground">
                  {siteConfig.address}
                </dd>
              </div>
              <div className="py-6 md:pl-8">
                <dt className="text-small font-bold text-foreground">
                  대표 전화
                </dt>
                <dd className="mt-1 text-body text-muted-foreground">
                  <a
                    className="inline-flex min-h-11 items-center text-primary underline underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                    href={`tel:${siteConfig.phone}`}
                  >
                    {siteConfig.phone}
                  </a>
                </dd>
              </div>
            </dl>
          </address>
        </div>
      </section>

      <section
        aria-labelledby="about-information-policy-heading"
        className="bg-primary-soft"
      >
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <p className="text-small font-bold text-primary">상세 소개 안내</p>
            <h2
              id="about-information-policy-heading"
              className="mt-2 max-w-xl text-title font-bold text-foreground"
            >
              더 자세한 시설 정보는 확인 후 공개합니다
            </h2>
          </div>
          <div className="mt-8 max-w-content space-y-5 border-t border-border-strong pt-6 text-body text-muted-foreground lg:mt-0">
            <p>
              시설의 연혁, 운영 방향과 시설 환경 등 상세 소개는 담당자 확인과
              공개 범위 검토를 거쳐 순차적으로 안내합니다.
            </p>
            <p>
              사진과 관계자 정보는 공개 동의와 개인정보 검수를 거친 자료만
              사용합니다.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="about-related-heading"
        className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide"
      >
        <h2
          id="about-related-heading"
          className="text-title font-bold text-foreground"
        >
          다음 정보를 이어서 확인하세요
        </h2>
        <p className="mt-4 max-w-content text-body text-muted-foreground">
          샬롬의 집의 생활 안내와 공개 운영 자료를 확인할 수 있습니다.
        </p>
        <ul className="mt-8 max-w-content divide-y divide-border border-y border-border">
          {aboutRelatedLinks.map((link) => (
            <li key={link.href}>
              <Link
                className="group flex min-h-11 items-center justify-between gap-5 py-5 text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                href={link.href}
              >
                <span>
                  <span className="block font-bold">
                    {getNavigationLabel(link.href)}
                  </span>
                  <span className="mt-1 block text-small text-muted-foreground group-hover:text-primary">
                    {link.description}
                  </span>
                </span>
                <span aria-hidden="true" className="shrink-0 font-bold">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
