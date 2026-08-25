import Link from "next/link";

import { siteConfig } from "@/config/site";

type NavigationHref = (typeof siteConfig.mainNavigation)[number]["href"];

const homeInformationFlows = [
  {
    title: "시설과 생활",
    description: "샬롬의 집의 기본 정보와 생활 관련 안내를 확인합니다.",
    links: [
      { href: "/about", description: "시설의 기본 정보와 연락 안내" },
      { href: "/life", description: "생활과 프로그램 안내" },
    ],
  },
  {
    title: "소식과 참여",
    description:
      "공지사항과 활동 소식, 후원과 자원봉사 안내 경로를 확인합니다.",
    links: [
      { href: "/news", description: "공지사항과 활동 소식" },
      { href: "/support", description: "후원과 자원봉사 안내" },
    ],
  },
  {
    title: "운영 정보",
    description: "공개가 승인된 운영 자료를 확인합니다.",
    links: [
      { href: "/transparency", description: "공개가 승인된 운영 자료" },
    ],
  },
] satisfies ReadonlyArray<{
  title: string;
  description: string;
  links: ReadonlyArray<{ href: NavigationHref; description: string }>;
}>;

function getNavigationLabel(href: NavigationHref) {
  const navigationItem = siteConfig.mainNavigation.find(
    (item) => item.href === href,
  );

  if (!navigationItem) {
    throw new Error(`등록되지 않은 홈페이지 경로입니다: ${href}`);
  }

  return navigationItem.label;
}

export default function Home() {
  return (
    <>
      <section className="border-b border-border bg-primary-soft">
        <div className="mx-auto w-full max-w-site px-page py-16 sm:px-page-wide sm:py-20">
          <div className="max-w-content">
            <p className="text-small font-bold text-primary">
              {siteConfig.description}
            </p>
            <h1 className="mt-5 text-display font-bold text-foreground sm:text-display-lg">
              샬롬의 집 정보를 한곳에서 확인하세요
            </h1>
            <p className="mt-6 text-body text-muted-foreground">
              시설 소개와 생활, 소식, 후원과 봉사, 공개 운영 자료를 메뉴별로
              확인할 수 있습니다.
            </p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-control border border-primary bg-primary px-5 py-3 text-base font-bold text-primary-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:border-primary-hover hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                href="/about"
              >
                시설 소개 보기
              </Link>
              <Link
                className="inline-flex min-h-11 items-center gap-2 px-2 py-3 text-base font-bold text-primary underline underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                href="/life"
              >
                함께하는 생활 보기
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <aside
        aria-labelledby="home-contact-heading"
        className="border-b border-border bg-surface"
      >
        <div className="mx-auto w-full max-w-site px-page py-8 sm:px-page-wide">
          <h2
            id="home-contact-heading"
            className="text-heading font-bold text-foreground"
          >
            기본 연락 안내
          </h2>
          <address className="mt-5 grid gap-5 not-italic sm:grid-cols-2 sm:gap-8">
            <div className="min-w-0">
              <p className="text-small font-bold text-foreground">주소</p>
              <p className="mt-1 break-words text-body text-muted-foreground">
                {siteConfig.address}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-small font-bold text-foreground">대표 전화</p>
              <a
                className="mt-1 inline-flex min-h-11 items-center text-body text-primary underline underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                href={`tel:${siteConfig.phone}`}
              >
                {siteConfig.phone}
              </a>
            </div>
          </address>
        </div>
      </aside>

      <section
        aria-labelledby="home-information-heading"
        className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide"
      >
        <p className="text-small font-bold text-primary">정보 안내</p>
        <h2
          id="home-information-heading"
          className="mt-2 text-title font-bold text-foreground"
        >
          필요한 정보를 찾아보세요
        </h2>
        <p className="mt-4 max-w-content text-body text-muted-foreground">
          방문 목적에 따라 시설과 생활, 소식과 참여, 운영 정보를 확인할 수
          있습니다.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-3 lg:gap-8">
          {homeInformationFlows.map((flow) => (
            <section
              key={flow.title}
              aria-labelledby={`home-flow-${flow.links[0].href.slice(1)}`}
              className="border-t border-border-strong pt-6"
            >
              <h3
                id={`home-flow-${flow.links[0].href.slice(1)}`}
                className="text-heading font-bold text-foreground"
              >
                {flow.title}
              </h3>
              <p className="mt-3 text-body text-muted-foreground">
                {flow.description}
              </p>
              <ul className="mt-6 divide-y divide-border border-y border-border">
                {flow.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      className="group flex min-h-11 items-center justify-between gap-4 py-4 text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                      href={link.href}
                    >
                      <span className="min-w-0">
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
          ))}
        </div>
      </section>
    </>
  );
}
