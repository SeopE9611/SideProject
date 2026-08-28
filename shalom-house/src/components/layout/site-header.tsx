import Link from "next/link";

import { SiteNavigation } from "@/components/layout/site-navigation";
import { siteConfig } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background shadow-nav">
      <div className="hidden border-b border-border bg-primary-soft lg:block">
        <div className="mx-auto flex min-h-8 w-full max-w-site items-center justify-between gap-6 px-page-wide text-xs font-semibold text-muted-foreground">
          <p>서울 강서구 장애인거주시설</p>
          <a
            className="inline-flex min-h-8 items-center gap-2 underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            href={`tel:${siteConfig.phone}`}
          >
            <span>대표 전화</span>
            <span>{siteConfig.phone}</span>
          </a>
        </div>
      </div>

      <div className="mx-auto flex min-h-[4.5rem] w-full max-w-site items-center justify-between gap-4 px-page py-3 sm:px-page-wide">
        <Link
          aria-label={`${siteConfig.name} 홈`}
          className="group inline-flex min-w-0 items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
          href="/"
        >
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard group-hover:bg-primary-hover"
          >
            샬
          </span>
          <span className="min-w-0">
            <span className="block text-xl font-bold tracking-tight text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard group-hover:text-primary sm:text-2xl">
              {siteConfig.name}
            </span>
            <span className="hidden text-xs font-semibold text-muted-foreground sm:block">
              함께 살아가는 따뜻한 보금자리
            </span>
          </span>
        </Link>
        <SiteNavigation />
      </div>
    </header>
  );
}
