import Link from "next/link";

import { siteConfig } from "@/config/site";

type NavigationHref = (typeof siteConfig.mainNavigation)[number]["href"];

const quickLinks = [
  {
    href: "/about",
    title: "시설 소개",
    description: "샬롬의 집의 기본 정보와 연락처를 확인하세요.",
  },
  {
    href: "/life",
    title: "함께하는 생활",
    description: "생활 안내와 주요 프로그램을 살펴보세요.",
  },
  {
    href: "/news",
    title: "샬롬 소식",
    description: "공지사항과 활동 소식을 확인하세요.",
  },
  {
    href: "/support",
    title: "후원 및 봉사",
    description: "후원과 자원봉사 참여 방법을 알아보세요.",
  },
  {
    href: "/transparency",
    title: "투명한 운영",
    description: "공개가 승인된 운영 자료를 확인하세요.",
  },
] satisfies ReadonlyArray<{
  href: NavigationHref;
  title: string;
  description: string;
}>;

export default function Home() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-amber-700 via-orange-700 to-primary">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-slate-950/70"
        />
        <div className="mx-auto w-full max-w-site px-page py-20 sm:px-page-wide sm:py-28">
          <div className="max-w-content">
            <p className="text-small font-bold text-amber-100">
              {siteConfig.description}
            </p>
            <h1 className="mt-5 text-display font-bold text-white sm:text-display-lg">
              서로의 일상을 존중하며 함께 살아갑니다
            </h1>
            <h2 className="sr-only">샬롬의 집 홈페이지 소개</h2>
            <p className="mt-6 max-w-2xl text-body text-white">
              샬롬의 집은 모든 사람이 존중받는 따뜻한 일상을 함께 만들어
              갑니다. 시설 안내부터 후원과 봉사까지 필요한 정보를 편리하게
              확인하세요.
            </p>
            <Link
              className="mt-8 inline-flex min-h-11 items-center justify-center rounded-control border border-white bg-white px-6 py-3 text-base font-bold text-primary transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-amber-100 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              href="/about"
            >
              샬롬의 집 알아보기
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
        <h2 className="sr-only">주요 메뉴 바로가기</h2>
        <div aria-hidden="true">
          <p className="text-small font-bold text-primary">빠른 안내</p>
          <p className="mt-2 text-title font-bold text-foreground">
            자주 찾는 메뉴
          </p>
        </div>
        <p className="mt-4 max-w-content text-body text-muted-foreground">
          원하는 메뉴의 카드 전체를 누르면 해당 안내 페이지로 이동합니다.
        </p>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <li key={link.href}>
              <Link
                className="group flex min-h-44 h-full flex-col justify-between rounded-card border border-border bg-surface p-6 text-foreground shadow-card transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:border-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
                href={link.href}
              >
                <span>
                  <span className="block text-heading font-bold group-hover:text-primary">
                    {link.title}
                  </span>
                  <span className="mt-3 block text-body text-muted-foreground">
                    {link.description}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="mt-6 self-end text-xl font-bold text-primary"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-border bg-primary-soft">
        <h2 className="sr-only">기본 연락 안내</h2>
        <div className="mx-auto grid w-full max-w-site gap-6 px-page py-10 sm:grid-cols-2 sm:px-page-wide">
          <div>
            <h3 className="text-small font-bold text-foreground">주소</h3>
            <p className="mt-2 break-words text-body text-muted-foreground">
              {siteConfig.address}
            </p>
          </div>
          <div>
            <h3 className="text-small font-bold text-foreground">대표 전화</h3>
            <a
              className="mt-1 inline-flex min-h-11 items-center text-body font-bold text-primary underline underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              href={`tel:${siteConfig.phone}`}
            >
              {siteConfig.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
