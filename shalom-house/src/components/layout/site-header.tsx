import Link from "next/link";

import { SiteNavigation } from "@/components/layout/site-navigation";
import { siteConfig } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background shadow-nav">
      <div className="mx-auto flex min-h-20 w-full max-w-site items-center justify-between gap-4 px-page py-3 sm:px-page-wide">
        <Link
          aria-label={`${siteConfig.name} 홈`}
          className="group inline-flex min-w-0 items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
          href="/"
        >
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-control bg-primary text-lg font-bold text-primary-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard group-hover:bg-primary-hover"
          >
            샬
          </span>
          <span className="min-w-0">
            <span className="block text-xl font-bold tracking-tight text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard group-hover:text-primary sm:text-2xl">
              {siteConfig.name}
            </span>
            <span className="hidden text-xs font-semibold text-muted-foreground sm:block">
              장애인거주시설
            </span>
          </span>
        </Link>
        <SiteNavigation />
      </div>
    </header>
  );
}
