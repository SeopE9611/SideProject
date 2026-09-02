import Link from "next/link";

import { SiteNavigation } from "@/components/layout/site-navigation";
import { siteConfig } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 shadow-nav backdrop-blur-md">
      <div className="hidden border-b border-white/15 bg-foreground text-white/80 lg:block">
        <div className="mx-auto flex min-h-8 w-full max-w-site items-center justify-between gap-8 px-page-wide text-xs">
          <p className="text-safe-wrap">서울 강서구 장애인거주시설</p>
          <div className="flex items-center gap-6">
            <Link
              className="underline decoration-white/40 underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              href="/about/directions"
            >
              찾아오시는 길
            </Link>
            <a
              className="underline decoration-white/40 underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              href={`tel:${siteConfig.phone}`}
            >
              대표 전화 {siteConfig.phone}
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto flex min-h-16 w-full max-w-site items-center justify-between gap-5 px-page py-2 sm:min-h-20 sm:px-page-wide">
        <Link
          aria-label={`${siteConfig.name} 홈`}
          className="group inline-flex min-w-0 items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
          href="/"
        >
          <span className="min-w-0">
            <span className="block text-xl font-bold tracking-[-0.03em] text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard group-hover:text-primary sm:text-xl">
              {siteConfig.name}
            </span>
            <span className="mt-0.5 hidden text-[0.6875rem] font-semibold tracking-[0.13em] text-muted-foreground xl:block">
              장애인거주시설 · SHALOM HOUSE
            </span>
          </span>
        </Link>
        <SiteNavigation />
      </div>
    </header>
  );
}
