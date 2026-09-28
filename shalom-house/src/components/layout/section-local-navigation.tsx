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
  const matchingLinks = links.filter((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));
  const activeHref = matchingLinks.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? section.href;

  return (
    <nav aria-label={`${section.label} 세부 메뉴`} className="section-tabs">
      <div className="mx-auto max-w-site px-page sm:px-page-wide">
        <ul className="items-stretch">
          {links.map((link) => {
            const isActive = link.href === activeHref;
            return (
              <li key={link.href}>
                <Link aria-current={isActive ? "page" : undefined} className="public-focus-ring" href={link.href}>
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
