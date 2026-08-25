import Link from "next/link";

import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-primary-hover bg-primary text-primary-foreground">
      <div className="mx-auto w-full max-w-site px-page py-12 sm:px-page-wide">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          <section aria-labelledby="footer-about-heading">
            <h2 id="footer-about-heading">
              <Link
                className="inline-flex text-heading font-bold text-primary-foreground underline decoration-primary-foreground underline-offset-4 transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-foreground"
                href="/"
              >
                {siteConfig.name}
              </Link>
            </h2>
            <p className="mt-3 max-w-md text-body text-primary-foreground">
              {siteConfig.description}
            </p>
          </section>

          <nav
            aria-label="푸터 주요 메뉴"
            className="lg:border-l lg:border-primary-foreground/30 lg:pl-8"
          >
            <h2 className="text-base font-bold text-primary-foreground">
              바로가기
            </h2>
            <ul className="mt-3">
              {siteConfig.mainNavigation.map((item) => (
                <li key={item.href}>
                  <Link
                    className="inline-flex min-h-11 items-center px-2 text-small font-semibold text-primary-foreground underline decoration-primary-foreground underline-offset-4 transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <section
            aria-labelledby="footer-contact-heading"
            className="lg:border-l lg:border-primary-foreground/30 lg:pl-8"
          >
            <h2
              id="footer-contact-heading"
              className="text-base font-bold text-primary-foreground"
            >
              연락처
            </h2>
            <address className="mt-3 space-y-3 text-small not-italic text-primary-foreground">
              <p>
                <span className="block font-bold text-primary-foreground">
                  주소
                </span>
                {siteConfig.address}
              </p>
              <p>
                <span className="block font-bold text-primary-foreground">
                  대표 전화
                </span>
                <a
                  className="inline-flex min-h-11 items-center px-2 text-primary-foreground underline decoration-primary-foreground underline-offset-4 transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
                  href={`tel:${siteConfig.phone}`}
                >
                  {siteConfig.phone}
                </a>
              </p>
            </address>
          </section>
        </div>

        <div className="mt-10 border-t border-primary-foreground/30 pt-6 text-small text-primary-foreground">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
