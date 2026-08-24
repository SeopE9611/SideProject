import Link from "next/link";

import { siteConfig } from "@/config/site";

const homeNavigationDescriptions = {
  "/about": "시설 소개와 공식 기본 정보를 확인합니다.",
  "/life": "생활과 프로그램 안내를 확인합니다.",
  "/news": "공지사항과 활동 소식을 확인합니다.",
  "/support": "후원과 자원봉사 참여 정보를 확인합니다.",
  "/transparency": "공개가 승인된 운영 자료를 확인합니다.",
} satisfies Record<
  (typeof siteConfig.mainNavigation)[number]["href"],
  string
>;

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-primary-soft">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-soft opacity-70"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-surface opacity-50"
        />

        <div className="relative mx-auto grid w-full max-w-site items-center gap-10 px-page py-16 sm:px-page-wide sm:py-20 lg:min-h-[36rem] lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
          <div>
            <p className="inline-flex rounded-full border border-border bg-surface px-4 py-2 text-small font-semibold text-primary">
              {siteConfig.description}
            </p>
            <h1 className="mt-6 max-w-3xl text-display font-bold text-foreground sm:text-display-lg">
              샬롬의 집 홈페이지에 오신 것을 환영합니다
            </h1>
            <p className="mt-6 max-w-2xl text-body text-muted-foreground">
              시설 소개와 생활, 소식, 후원과 봉사, 운영 정보를 한곳에서
              확인할 수 있도록 준비하고 있습니다.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-control border border-primary bg-primary px-5 py-3 text-base font-bold text-primary-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:border-primary-hover hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                href="/about"
              >
                시설 소개 보기
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-control border border-border-strong bg-surface px-5 py-3 text-base font-bold text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:border-primary hover:bg-primary-soft hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                href="/support"
              >
                후원과 봉사 안내
              </Link>
            </div>
          </div>

          <aside
            aria-labelledby="home-basic-info-heading"
            className="relative rounded-card border border-border bg-surface p-6 shadow-card sm:p-8"
          >
            <p className="text-small font-bold text-primary">기본 안내</p>
            <h2
              id="home-basic-info-heading"
              className="mt-2 text-heading font-bold text-foreground"
            >
              샬롬의 집 연락처
            </h2>
            <address className="mt-6 space-y-5 not-italic">
              <div>
                <p className="text-small font-bold text-foreground">주소</p>
                <p className="mt-1 text-body text-muted-foreground">
                  {siteConfig.address}
                </p>
              </div>
              <div>
                <p className="text-small font-bold text-foreground">전화</p>
                <p className="mt-1 text-body text-muted-foreground">
                  <a
                    className="inline-flex rounded-control text-primary underline underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                    href={`tel:${siteConfig.phone}`}
                  >
                    {siteConfig.phone}
                  </a>
                </p>
              </div>
            </address>
          </aside>
        </div>
      </section>

      <section
        aria-labelledby="home-navigation-heading"
        className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide"
      >
        <h2
          id="home-navigation-heading"
          className="text-title font-bold text-foreground"
        >
          찾고 계신 정보를 선택하세요
        </h2>
        <p className="mt-4 max-w-2xl text-body text-muted-foreground">
          샬롬의 집의 주요 정보와 참여 방법을 메뉴별로 확인할 수 있습니다.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-6">
          {siteConfig.mainNavigation.map((item) => {
            const isSupport = item.href === "/support";
            const isWide =
              item.href === "/support" || item.href === "/transparency";

            return (
              <Link
                key={item.href}
                className={`group flex h-full min-h-48 flex-col justify-between rounded-card border p-6 shadow-card transition-colors duration-[var(--motion-duration-standard)] ease-standard focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring ${
                  isWide ? "lg:col-span-3" : "lg:col-span-2"
                } ${
                  isSupport
                    ? "border-primary bg-primary text-primary-foreground hover:border-primary-hover hover:bg-primary-hover"
                    : "border-border bg-surface text-foreground hover:border-primary hover:bg-primary-soft"
                }`}
                href={item.href}
              >
                <div>
                  <h3
                    className={`text-heading font-bold ${
                      isSupport ? "text-primary-foreground" : "text-foreground"
                    }`}
                  >
                    {item.label}
                  </h3>
                  <p
                    className={`mt-4 text-body ${
                      isSupport
                        ? "text-primary-foreground opacity-90"
                        : "text-muted-foreground"
                    }`}
                  >
                    {homeNavigationDescriptions[item.href]}
                  </p>
                </div>
                <span
                  className={`mt-8 inline-flex items-center gap-2 text-small font-bold ${
                    isSupport ? "text-primary-foreground" : "text-foreground"
                  }`}
                >
                  바로가기
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
