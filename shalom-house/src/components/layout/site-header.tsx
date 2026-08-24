import Link from "next/link";

import { SiteNavigation } from "@/components/layout/site-navigation";
import { siteConfig } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="relative z-40 border-b border-border bg-surface">
      <div className="mx-auto flex min-h-20 w-full max-w-site items-center justify-between gap-4 px-page py-4 sm:px-page-wide">
        <Link
          aria-label={`${siteConfig.name} 홈`}
          className="group inline-flex min-w-0 flex-col rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
          href="/"
        >
          <span className="text-xl font-bold tracking-tight text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard group-hover:text-primary">
            {siteConfig.name}
          </span>
          <span className="text-small font-medium text-muted-foreground">
            공식 홈페이지
          </span>
        </Link>
        <SiteNavigation />
      </div>
    </header>
  );
}
