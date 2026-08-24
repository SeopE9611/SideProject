import Link from "next/link";

import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-subtle">
      <div className="mx-auto w-full max-w-site px-page py-12 sm:px-page-wide">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          <section aria-labelledby="footer-about-heading">
            <h2 id="footer-about-heading">
              <Link
                className="inline-flex rounded-control text-heading font-bold text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
                href="/"
              >
                {siteConfig.name}
              </Link>
            </h2>
            <p className="mt-3 max-w-md text-body text-muted-foreground">
              {siteConfig.description}
            </p>
          </section>

          <nav aria-label="푸터 주요 메뉴">
            <h2 className="text-base font-bold text-foreground">바로가기</h2>
            <ul className="mt-3 space-y-2">
              {siteConfig.mainNavigation.map((item) => (
                <li key={item.href}>
                  <Link
                    className="inline-flex rounded-control py-1 text-small font-semibold text-muted-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <section aria-labelledby="footer-contact-heading">
            <h2
              id="footer-contact-heading"
              className="text-base font-bold text-foreground"
            >
              연락처
            </h2>
            <address className="mt-3 space-y-3 text-small not-italic text-muted-foreground">
              <p>
                <span className="block font-semibold text-foreground">주소</span>
                {siteConfig.address}
              </p>
              <p>
                <span className="block font-semibold text-foreground">전화</span>
                <a
                  className="text-primary underline underline-offset-4 transition-colors hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                  href={`tel:${siteConfig.phone}`}
                >
                  {siteConfig.phone}
                </a>
              </p>
            </address>
          </section>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-small text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
