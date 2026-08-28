import Link from "next/link";

import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-hero-night bg-hero-night text-hero-on-dark">
      <div className="mx-auto w-full max-w-site px-page py-14 sm:px-page-wide sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.35fr] lg:gap-20">
          <section aria-labelledby="footer-about-heading">
            <h2 id="footer-about-heading">
              <Link
                className="inline-flex text-title font-bold text-hero-on-dark underline decoration-hero-on-dark/70 underline-offset-4 transition-colors hover:text-sun-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hero-on-dark"
                href="/"
              >
                {siteConfig.name}
              </Link>
            </h2>
            <p className="mt-4 max-w-md text-body text-hero-muted">
              지체 및 지적 장애인이 함께 생활하며 지역사회와 일상을 이어가는
              따뜻한 보금자리입니다.
            </p>
          </section>

          <nav aria-label="푸터 주요 메뉴">
            <h2 className="text-base font-bold text-hero-on-dark">바로가기</h2>
            <ul className="mt-4 grid border-t border-hero-on-dark/25 sm:grid-cols-2">
              {siteConfig.mainNavigation.map((item) => (
                <li
                  key={item.href}
                  className="border-b border-hero-on-dark/25 sm:odd:pr-5 sm:even:pl-5"
                >
                  <Link
                    className="group flex min-h-20 items-center justify-between gap-4 py-4 text-hero-on-dark transition-colors hover:text-sun-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-on-dark"
                    href={item.href}
                  >
                    <span>
                      <span className="block text-base font-bold">
                        {item.label}
                      </span>
                      <span className="mt-1 block text-small text-hero-muted">
                        {item.description}
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-xl font-bold">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 grid gap-6 border-t border-hero-on-dark/25 pt-8 text-small text-hero-muted md:grid-cols-[1fr_auto] md:items-end">
          <address className="space-y-2 not-italic">
            <p>
              <span className="mr-3 font-bold text-hero-on-dark">주소</span>
              {siteConfig.address}
            </p>
            <p>
              <span className="mr-3 font-bold text-hero-on-dark">
                대표 전화
              </span>
              <a
                className="inline-flex min-h-11 items-center underline decoration-hero-on-dark/70 underline-offset-4 transition-colors hover:text-sun-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-on-dark"
                href={`tel:${siteConfig.phone}`}
              >
                {siteConfig.phone}
              </a>
            </p>
          </address>
          <p>
            © {new Date().getFullYear()} {siteConfig.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
