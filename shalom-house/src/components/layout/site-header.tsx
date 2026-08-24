import Link from "next/link";

import { siteConfig } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <Link
          className="text-lg font-bold text-gray-950 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
          href="/"
        >
          {siteConfig.name}
        </Link>
        <nav aria-label="주요 메뉴">
          <ul className="flex flex-wrap gap-x-5 gap-y-3">
            {siteConfig.mainNavigation.map((item) => (
              <li key={item.href}>
                <Link
                  className="text-sm font-medium text-gray-700 underline decoration-gray-400 underline-offset-4 hover:text-gray-950 focus-visible:outline-2 focus-visible:outline-offset-4"
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
