import Link from "next/link";

import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-hero-night bg-hero-night text-hero-on-dark">
      <div className="mx-auto w-full max-w-site px-page py-14 sm:px-page-wide sm:py-16">
        <div className="grid gap-10 border-b border-hero-on-dark/20 pb-12 md:grid-cols-[1.1fr_0.8fr_0.9fr] md:gap-12">
          <section aria-labelledby="footer-about-heading">
            <h2 id="footer-about-heading">
              <Link
                className="text-safe-wrap inline-flex min-h-11 items-center text-heading font-bold text-hero-on-dark underline decoration-hero-on-dark/70 underline-offset-4 transition-colors hover:text-sun-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hero-on-dark"
                href="/"
              >
                {siteConfig.name}
              </Link>
            </h2>
            <p className="text-safe-wrap mt-4 max-w-md text-body text-hero-muted">
              지체 및 지적 장애인이 함께 생활하는 장애인거주시설입니다.
            </p>
          </section>

          <nav aria-label="푸터 이용 안내">
            <h2 className="text-small font-bold text-hero-on-dark">이용 안내</h2>
            <ul className="mt-4 space-y-1">
              {siteConfig.footerNavigation.map((item) => (
                <li key={item.href}>
                  <Link
                    className="text-safe-wrap inline-flex min-h-10 items-center text-small font-semibold text-hero-muted underline decoration-hero-on-dark/50 underline-offset-4 transition-colors hover:text-sun-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-on-dark"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  className="text-safe-wrap inline-flex min-h-10 items-center text-small font-semibold text-hero-muted underline decoration-hero-on-dark/50 underline-offset-4 transition-colors hover:text-sun-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-on-dark"
                  href={siteConfig.instagram}
                >
                  인스타그램
                </a>
              </li>
            </ul>
          </nav>

          <section aria-labelledby="footer-contact-heading">
            <h2 id="footer-contact-heading" className="text-small font-bold text-hero-on-dark">
              연락처
            </h2>
            <address className="mt-4 space-y-2 text-small not-italic text-hero-muted">
              <p>
                <span className="block font-bold text-hero-on-dark">주소</span>
                <Link
                  className="text-safe-wrap mt-1 inline-flex min-h-10 items-center underline decoration-hero-on-dark/60 underline-offset-4 transition-colors hover:text-sun-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-on-dark"
                  href="/about/directions"
                >
                  {siteConfig.address}
                </Link>
              </p>
              <p>
                <span className="block font-bold text-hero-on-dark">
                  대표 전화
                </span>
                <a
                  className="text-safe-wrap mt-1 inline-flex min-h-10 items-center underline decoration-hero-on-dark/60 underline-offset-4 transition-colors hover:text-sun-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-on-dark"
                  href={`tel:${siteConfig.phone}`}
                >
                  {siteConfig.phone}
                </a>
              </p>
            </address>
          </section>
        </div>

        <div className="flex flex-col gap-2 pt-7 text-small text-hero-muted sm:flex-row sm:items-center sm:justify-between">
          <p>공식 홈페이지에 공개 승인된 정보만 안내합니다.</p>
          <p className="text-safe-wrap">
            © {new Date().getFullYear()} {siteConfig.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
