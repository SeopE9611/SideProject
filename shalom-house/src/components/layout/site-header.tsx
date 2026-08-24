import Link from "next/link";

import { siteConfig } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-site flex-col gap-4 px-page py-5 sm:flex-row sm:items-center sm:justify-between sm:px-page-wide">
        <Link
          className="text-lg font-bold text-foreground underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
          href="/"
        >
          {siteConfig.name}
        </Link>
        <nav aria-label="주요 메뉴">
          <ul className="flex flex-wrap gap-x-5 gap-y-3">
            {siteConfig.mainNavigation.map((item) => (
              <li key={item.href}>
                <Link
                  className="text-sm font-medium text-muted-foreground underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
                  href={item.href}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
