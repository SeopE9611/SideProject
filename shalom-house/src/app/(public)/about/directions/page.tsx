import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "찾아오시는 길",
  description: `${siteConfig.name} 주소와 방문 문의 연락처를 안내합니다.`,
};

const mapLinks = [
  {
    label: "네이버 지도에서 보기",
    href: `https://map.naver.com/p/search/${encodeURIComponent(siteConfig.address)}`,
  },
  {
    label: "카카오맵에서 보기",
    href: `https://map.kakao.com/?q=${encodeURIComponent(siteConfig.address)}`,
  },
];

export default function DirectionsPage() {
  return (
    <div className="bg-background">
      <section className="border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide lg:py-section-wide">
          <nav aria-label="현재 위치" className="text-small text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link
                  className="text-safe-wrap inline-flex min-h-11 items-center underline decoration-border-strong underline-offset-4 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                  href="/"
                >
                  홈
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  className="text-safe-wrap inline-flex min-h-11 items-center underline decoration-border-strong underline-offset-4 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                  href="/about"
                >
                  시설소개
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li
                aria-current="page"
                className="text-safe-wrap font-bold text-foreground"
              >
                찾아오시는 길
              </li>
            </ol>
          </nav>

          <div className="mt-8 max-w-content">
            <p className="text-small font-bold text-primary">방문 안내</p>
            <h1 className="text-safe-wrap mt-3 text-display font-bold text-foreground sm:text-display-lg">
              찾아오시는 길
            </h1>
            <p className="text-safe-wrap mt-5 text-body text-muted-foreground">
              샬롬의 집 방문에 필요한 주소와 연락처를 안내합니다.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="directions-address-heading">
        <div className="mx-auto grid w-full max-w-site gap-8 px-page py-section sm:px-page-wide lg:grid-cols-[1.2fr_0.8fr] lg:gap-12 lg:py-section-wide">
          <div className="rounded-panel border border-border bg-surface p-6 shadow-card sm:p-8">
            <div className="flex size-12 items-center justify-center rounded-control bg-primary-soft text-primary">
              <svg
                aria-hidden="true"
                focusable="false"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </div>
            <h2
              id="directions-address-heading"
              className="text-safe-wrap mt-6 text-heading font-bold text-foreground"
            >
              주소
            </h2>
            <address className="text-safe-wrap mt-3 text-body font-semibold not-italic text-foreground">
              {siteConfig.address}
            </address>
            <ul className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {mapLinks.map((link) => (
                <li key={link.href}>
                  <a
                    className="text-safe-wrap inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-border-strong bg-surface px-5 py-2 text-small font-bold text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:border-primary hover:bg-primary-soft hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:w-auto"
                    href={link.href}
                  >
                    {link.label}
                    <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <aside
            aria-labelledby="directions-contact-heading"
            className="rounded-panel bg-primary p-6 text-primary-foreground sm:p-8"
          >
            <p className="text-safe-wrap text-small font-bold text-primary-foreground">
              방문 전 확인
            </p>
            <h2
              id="directions-contact-heading"
              className="text-safe-wrap mt-3 text-heading font-bold text-primary-foreground"
            >
              대표 전화로 문의해 주세요
            </h2>
            <p className="text-safe-wrap mt-4 text-body text-primary-foreground">
              방문 일정과 시설 출입 안내는 대표 전화로 확인할 수 있습니다.
            </p>
            <a
              className="text-safe-wrap mt-7 inline-flex min-h-11 items-center justify-center rounded-control bg-surface px-5 py-2 text-small font-bold text-primary transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-foreground"
              href={`tel:${siteConfig.phone}`}
            >
              대표 전화 {siteConfig.phone}
            </a>
          </aside>
        </div>
      </section>
    </div>
  );
}
