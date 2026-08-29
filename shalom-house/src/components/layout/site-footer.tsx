import Link from "next/link";

import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-hero-night bg-hero-night text-hero-on-dark">
      <div className="mx-auto w-full max-w-site px-page py-12 sm:px-page-wide sm:py-14">
        <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-start md:gap-16">
          <section aria-labelledby="footer-about-heading">
            <h2 id="footer-about-heading">
              <Link
                className="text-safe-wrap inline-flex min-h-11 items-center text-heading font-bold text-hero-on-dark underline decoration-hero-on-dark/70 underline-offset-4 transition-colors hover:text-sun-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hero-on-dark"
                href="/"
              >
                {siteConfig.name}
              </Link>
            </h2>
            <p className="text-safe-wrap mt-3 max-w-xl text-body text-hero-muted">
              지체 및 지적 장애인이 함께 생활하는 장애인거주시설입니다.
            </p>
          </section>

          <nav aria-label="푸터 이용 안내">
            <h2 className="text-small font-bold text-hero-on-dark">이용 안내</h2>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {siteConfig.footerNavigation.map((item) => (
                <li key={item.href}>
                  <Link
                    className="text-safe-wrap inline-flex min-h-11 items-center text-small font-semibold text-hero-muted underline decoration-hero-on-dark/50 underline-offset-4 transition-colors hover:text-sun-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-on-dark"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  className="text-safe-wrap inline-flex min-h-11 items-center text-small font-semibold text-hero-muted underline decoration-hero-on-dark/50 underline-offset-4 transition-colors hover:text-sun-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-on-dark"
                  href={siteConfig.instagram}
                >
                  인스타그램
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 grid gap-6 border-t border-hero-on-dark/25 pt-7 text-small text-hero-muted md:grid-cols-[1fr_auto] md:items-end">
          <address className="space-y-1 not-italic">
            <p>
              <span className="mr-3 font-bold text-hero-on-dark">주소</span>
              <Link
                className="text-safe-wrap inline-flex min-h-11 items-center underline decoration-hero-on-dark/60 underline-offset-4 transition-colors hover:text-sun-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-on-dark"
                href="/about/directions"
              >
                {siteConfig.address}
              </Link>
            </p>
            <p>
              <span className="mr-3 font-bold text-hero-on-dark">
                대표 전화
              </span>
              <a
                className="text-safe-wrap inline-flex min-h-11 items-center underline decoration-hero-on-dark/60 underline-offset-4 transition-colors hover:text-sun-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-on-dark"
                href={`tel:${siteConfig.phone}`}
              >
                {siteConfig.phone}
              </a>
            </p>
          </address>
          <p className="text-safe-wrap">
            © {new Date().getFullYear()} {siteConfig.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
