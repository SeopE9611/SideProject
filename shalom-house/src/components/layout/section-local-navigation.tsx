"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { siteConfig } from "@/config/site";

export type SectionHref = "/about" | "/life" | "/news" | "/support";

type SectionLocalNavigationProps = {
  sectionHref: SectionHref;
};

export function SectionLocalNavigation({ sectionHref }: SectionLocalNavigationProps) {
  const pathname = usePathname();
  const section = siteConfig.mainNavigation.find((item) => item.href === sectionHref);

  if (!section) return null;

  const overviewChild = section.children.find((child) => child.href === section.href);
  const links = [
    { label: overviewChild?.label ?? section.label, href: section.href },
    ...section.children.filter((child) => child.href !== section.href),
  ];
  const matchingLinks = links.filter(
    (link) => pathname === link.href || pathname.startsWith(`${link.href}/`),
  );
  const activeHref = matchingLinks.sort((a, b) => b.href.length - a.href.length)[0]?.href
    ?? section.href;

  return (
    <nav aria-label={`${section.label} 세부 메뉴`} className="border-y border-border bg-surface">
      <div className="mx-auto max-w-site overflow-x-auto px-page sm:px-page-wide">
        <ul className="flex w-max min-w-full items-stretch gap-6 sm:gap-8">
          {links.map((link) => {
            const isActive = link.href === activeHref;
            return (
              <li key={link.href}>
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center whitespace-nowrap border-b-2 pt-0.5 text-small transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus-ring ${isActive ? "border-primary font-bold text-primary" : "border-transparent text-foreground hover:border-border-strong hover:text-primary"}`}
                  href={link.href}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
