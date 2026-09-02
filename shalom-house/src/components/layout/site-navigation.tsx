"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { siteConfig } from "@/config/site";

const DESKTOP_MEDIA_QUERY = "(min-width: 64rem)";

function isCurrentSection(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isCurrentPage(pathname: string, href: string) {
  return pathname === href;
}

type NavigationItem = (typeof siteConfig.mainNavigation)[number];

function isCurrentNavigationItem(pathname: string, item: NavigationItem) {
  return isCurrentSection(pathname, item.href) || item.children.some((child) => isCurrentSection(pathname, child.href));
}

type SiteNavigationContentProps = {
  pathname: string;
};

function SiteNavigationContent({ pathname }: SiteNavigationContentProps) {
  const mobileMenuId = useId();
  const mobileButtonRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const desktopButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const activeExpandableItem = siteConfig.mainNavigation.find(
    (item) => item.children.length > 0 && isCurrentNavigationItem(pathname, item),
  );
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openDesktopHref, setOpenDesktopHref] = useState<string | null>(null);
  const [openMobileHref, setOpenMobileHref] = useState<string | null>(activeExpandableItem?.href ?? null);

  useEffect(() => {
    const desktopMediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);

    function handleDesktopChange(event: MediaQueryListEvent) {
      if (event.matches) {
        setIsMobileOpen(false);
      } else {
        setOpenDesktopHref(null);
      }
    }

    desktopMediaQuery.addEventListener("change", handleDesktopChange);

    return () => {
      desktopMediaQuery.removeEventListener("change", handleDesktopChange);
    };
  }, []);

  useEffect(() => {
    if (!isMobileOpen && openDesktopHref === null) return;

    function handlePointerDown(event: PointerEvent) {
      if (!navigationRef.current?.contains(event.target as Node)) {
        setIsMobileOpen(false);
        setOpenDesktopHref(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (openDesktopHref !== null) {
        const desktopButton = desktopButtonRefs.current[openDesktopHref];
        setOpenDesktopHref(null);
        desktopButton?.focus();
        return;
      }

      setIsMobileOpen(false);
      mobileButtonRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileOpen, openDesktopHref]);

  function closeMobileMenu() {
    setIsMobileOpen(false);
  }

  return (
    <div ref={navigationRef}>
      <nav aria-label="주요 메뉴" className="hidden lg:block">
        <ul className="flex items-center gap-2">
          {siteConfig.mainNavigation.map((item, index) => {
            const hasChildren = item.children.length > 0;
            const isActive = isCurrentNavigationItem(pathname, item);
            const isSubmenuOpen = openDesktopHref === item.href;
            const submenuId = `${mobileMenuId}-desktop-${index}`;
            const inactiveClassName = item.emphasis
              ? "border-primary bg-primary-soft text-primary hover:border-primary-hover hover:bg-primary hover:text-primary-foreground"
              : "border-transparent text-foreground hover:border-primary hover:text-primary";

            return (
              <li
                key={item.href}
                className="relative"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setOpenDesktopHref((current) => (current === item.href ? null : current));
                  }
                }}
                onPointerEnter={() => {
                  if (hasChildren) setOpenDesktopHref(item.href);
                }}
                onPointerLeave={(event) => {
                  if (hasChildren && !event.currentTarget.contains(document.activeElement)) {
                    setOpenDesktopHref(null);
                  }
                }}
              >
                <div
                  className={`flex min-h-11 items-stretch border-b-2 transition-colors duration-[var(--motion-duration-fast)] ease-standard ${
                    isActive
                      ? item.emphasis
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-primary text-primary"
                      : `${item.emphasis ? "ml-2 rounded-control border" : ""} ${inactiveClassName}`
                  }`}
                >
                  <Link
                    aria-current={isCurrentPage(pathname, item.href) ? "page" : undefined}
                    className="text-safe-wrap inline-flex min-h-11 items-center whitespace-nowrap px-3 py-2 text-base font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring xl:px-3"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                  {hasChildren ? (
                    <button
                      ref={(node) => {
                        desktopButtonRefs.current[item.href] = node;
                      }}
                      type="button"
                      aria-controls={submenuId}
                      aria-expanded={isSubmenuOpen}
                      aria-label={`${item.label} 하위 메뉴 ${isSubmenuOpen ? "닫기" : "열기"}`}
                      className="inline-flex min-h-11 min-w-9 items-center justify-center border-l border-current/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                      onClick={() => setOpenDesktopHref((current) => (current === item.href ? null : item.href))}
                    >
                      <svg
                        aria-hidden="true"
                        focusable="false"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform duration-[var(--motion-duration-fast)] ease-standard ${
                          isSubmenuOpen ? "rotate-180" : ""
                        }`}
                      >
                        <path d="m7 10 5 5 5-5" />
                      </svg>
                    </button>
                  ) : null}
                </div>

                {hasChildren ? (
                  <div id={submenuId} className="absolute right-0 top-full w-80 pt-3" hidden={!isSubmenuOpen}>
                    <div className="border-t-4 border-primary bg-surface p-4 shadow-elevated">
                      <p className="text-safe-wrap border-b border-border px-3 pb-4 pt-1 text-xs font-semibold text-muted-foreground">
                        {item.description}
                      </p>
                      <ul className="space-y-1">
                        {item.children.map((child) => {
                          const isChildActive = isCurrentPage(pathname, child.href);

                          return (
                            <li key={child.href}>
                              <Link
                                aria-current={isChildActive ? "page" : undefined}
                                className={`block border-l-2 px-3 py-3 transition-colors duration-[var(--motion-duration-fast)] ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
                                  isChildActive
                                    ? "border-primary bg-primary-soft text-primary"
                                    : "border-transparent text-foreground hover:border-primary hover:bg-primary-soft hover:text-primary"
                                }`}
                                href={child.href}
                              >
                                <span className="text-safe-wrap block text-small font-bold">{child.label}</span>
                                <span className="text-safe-wrap mt-1 block text-xs text-muted-foreground">
                                  {child.description}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>

      <button
        ref={mobileButtonRef}
        type="button"
        aria-controls={mobileMenuId}
        aria-expanded={isMobileOpen}
        aria-label={isMobileOpen ? "주요 메뉴 닫기" : "주요 메뉴 열기"}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-border-strong bg-surface px-3 text-small font-bold text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary-soft hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring lg:hidden"
        onClick={() => setIsMobileOpen((current) => !current)}
      >
        {isMobileOpen ? (
          <svg
            aria-hidden="true"
            focusable="false"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            focusable="false"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
        <span>{isMobileOpen ? "닫기" : "메뉴"}</span>
      </button>

      <nav
        id={mobileMenuId}
        aria-label="모바일 주요 메뉴"
        className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border-strong bg-surface shadow-nav sm:max-h-[calc(100dvh-5rem)] lg:hidden"
        hidden={!isMobileOpen}
      >
        <ul className="mx-auto w-full max-w-site divide-y divide-border px-page py-2 sm:px-page-wide">
          {siteConfig.mainNavigation.map((item, index) => {
            const hasChildren = item.children.length > 0;
            const isActive = isCurrentNavigationItem(pathname, item);
            const isSubmenuOpen = openMobileHref === item.href;
            const submenuId = `${mobileMenuId}-mobile-${index}`;
            const mobileItemContainerClassName = isActive
              ? item.emphasis
                ? "border-accent bg-accent-soft"
                : "border-primary bg-primary-soft"
              : "border-transparent bg-transparent";
            const mobileItemTextClassName = item.emphasis && !isActive ? "text-accent" : "text-foreground";

            return (
              <li key={item.href} className="py-1">
                <div className={`flex border-l-4 ${mobileItemContainerClassName}`}>
                  <Link
                    aria-current={isCurrentPage(pathname, item.href) ? "page" : undefined}
                    className={`flex min-h-14 min-w-0 flex-1 items-center px-4 py-3 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${mobileItemTextClassName}`}
                    href={item.href}
                    onClick={closeMobileMenu}
                  >
                    <span>
                      <span className="text-safe-wrap block text-base font-bold">{item.label}</span>
                    </span>
                  </Link>
                  {hasChildren ? (
                    <button
                      type="button"
                      aria-controls={submenuId}
                      aria-expanded={isSubmenuOpen}
                      aria-label={`${item.label} 하위 메뉴 ${isSubmenuOpen ? "닫기" : "열기"}`}
                      className={`inline-flex min-h-14 min-w-12 items-center justify-center border-l border-border hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${mobileItemTextClassName}`}
                      onClick={() => setOpenMobileHref((current) => (current === item.href ? null : item.href))}
                    >
                      <svg
                        aria-hidden="true"
                        focusable="false"
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform duration-[var(--motion-duration-fast)] ease-standard ${
                          isSubmenuOpen ? "rotate-180" : ""
                        }`}
                      >
                        <path d="m7 10 5 5 5-5" />
                      </svg>
                    </button>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="inline-flex min-w-14 items-center justify-center text-xl font-bold"
                    >
                      →
                    </span>
                  )}
                </div>

                {hasChildren ? (
                  <ul id={submenuId} className="ml-4 border-l border-border py-1 pl-4" hidden={!isSubmenuOpen}>
                    {item.children.map((child) => {
                      const isChildActive = isCurrentPage(pathname, child.href);

                      return (
                        <li key={child.href}>
                          <Link
                            aria-current={isChildActive ? "page" : undefined}
                            className={`flex min-h-12 items-center px-4 py-2 transition-colors duration-[var(--motion-duration-fast)] ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
                              isChildActive
                                ? "bg-primary text-primary-foreground"
                                : "text-foreground hover:bg-primary-soft hover:text-primary"
                            }`}
                            href={child.href}
                            onClick={closeMobileMenu}
                          >
                            <span className="text-safe-wrap block text-small font-bold">{child.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
        <ul className="mx-auto grid w-full max-w-site grid-cols-2 border-t border-border px-page py-3 sm:px-page-wide">
          <li>
            <a
              className="inline-flex min-h-11 w-full items-center justify-center font-bold text-primary underline focus-visible:outline-2 focus-visible:outline-focus-ring"
              href={`tel:${siteConfig.phone}`}
              onClick={closeMobileMenu}
            >
              전화하기
            </a>
          </li>
          <li>
            <Link
              className="inline-flex min-h-11 w-full items-center justify-center border-l border-border font-bold text-primary underline focus-visible:outline-2 focus-visible:outline-focus-ring"
              href="/about/directions"
              onClick={closeMobileMenu}
            >
              찾아오시는 길
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export function SiteNavigation() {
  const pathname = usePathname();

  return <SiteNavigationContent key={pathname} pathname={pathname} />;
}
