import Link from "next/link";

import { SiteNavigation } from "@/components/layout/site-navigation";
import { siteConfig } from "@/config/site";
import { getPublicContactInformation } from "@/features/site-content/site-content.repository";
import { createTelephoneHref } from "@/features/site-content/site-content.types";

export async function SiteHeader() {
  const contact = await getPublicContactInformation();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 shadow-nav backdrop-blur-md">
      <div className="hidden bg-primary-soft text-muted-foreground lg:block">
        <div className="mx-auto flex min-h-9 w-full max-w-site items-center justify-between gap-8 px-page-wide text-small">
          <p className="text-safe-wrap">장애인거주시설</p>
          <div className="flex items-center gap-6">
            <Link
              className="underline decoration-border-strong underline-offset-4 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              href="/about/directions"
            >
              찾아오시는 길
            </Link>
            <a
              className="underline decoration-border-strong underline-offset-4 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              href={createTelephoneHref(contact.phone)}
            >
              대표 전화 {contact.phone}
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto grid min-h-16 w-full max-w-site grid-cols-[1fr_auto] items-center gap-5 px-page py-2 sm:min-h-24 sm:px-page-wide lg:grid-cols-12 lg:gap-0 lg:py-0">
        <Link
          aria-label={`${siteConfig.name} 홈`}
          className="group inline-flex min-w-0 items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring lg:col-span-3 lg:border-r lg:border-border lg:pr-8"
          href="/"
        >
          <span className="min-w-0">
            <span className="block text-2xl font-bold tracking-[-0.03em] text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard group-hover:text-primary sm:text-title">
              {siteConfig.name}
            </span>
            <span className="mt-1 hidden text-xs font-semibold tracking-[0.1em] text-muted-foreground xl:block">
              장애인거주시설 · SHALOM HOUSE
            </span>
          </span>
        </Link>
        <div className="lg:col-span-9 lg:h-full lg:pl-8"><SiteNavigation /></div>
      </div>
    </header>
  );
}
