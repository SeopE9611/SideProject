import Link from "next/link";

import { SiteNavigation } from "@/components/layout/site-navigation";
import { siteConfig } from "@/config/site";
import { getPublicContactInformation } from "@/features/site-content/site-content.repository";
import { createTelephoneHref } from "@/features/site-content/site-content.types";

export async function SiteHeader() {
  const contact = await getPublicContactInformation();
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface">
      <div className="hidden border-b border-border lg:block">
        <div className="mx-auto flex min-h-8 max-w-site items-center justify-between gap-6 px-page-wide text-xs text-muted-foreground">
          <p>샬롬의 집 · 장애인거주시설</p>
          <div className="flex items-center gap-6">
            <Link
              className="py-1 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              href="/about/directions"
            >
              찾아오시는 길
            </Link>
            <a
              className="py-1 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              href={createTelephoneHref(contact.phone)}
            >
              대표 전화 {contact.phone}
            </a>
          </div>
        </div>
      </div>
      <div className="mx-auto flex min-h-20 max-w-site items-center justify-between gap-5 px-page py-3 sm:px-page-wide lg:min-h-24">
        <Link
          aria-label={siteConfig.name + " 홈"}
          className="inline-flex min-h-11 min-w-0 flex-col items-start justify-center text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
          href="/"
        >
          <span className="text-xs font-medium tracking-wide text-muted-foreground lg:hidden">장애인거주시설</span>
          <span className="text-[1.875rem] font-extrabold leading-tight tracking-[-0.055em] lg:text-[2.125rem]">
            {siteConfig.name}
          </span>
        </Link>
        <SiteNavigation phone={contact.phone} />
      </div>
    </header>
  );
}
