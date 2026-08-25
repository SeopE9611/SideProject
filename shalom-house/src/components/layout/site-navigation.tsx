"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { siteConfig } from "@/config/site";

const DESKTOP_MEDIA_QUERY = "(min-width: 64rem)";

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

type SiteNavigationContentProps = {
  pathname: string;
};

function SiteNavigationContent({ pathname }: SiteNavigationContentProps) {
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const desktopMediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);

    function handleDesktopChange(event: MediaQueryListEvent) {
      if (event.matches) {
        setIsOpen(false);
      }
    }

    desktopMediaQuery.addEventListener("change", handleDesktopChange);

    return () => {
      desktopMediaQuery.removeEventListener("change", handleDesktopChange);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!navigationRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={navigationRef}>
      <nav aria-label="주요 메뉴" className="hidden lg:block">
        <ul className="flex items-center gap-1">
          {siteConfig.mainNavigation.map((item) => {
            const isActive = isCurrentPath(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center border-b-2 px-2 py-2 text-small transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring xl:px-3 ${
                    isActive
                      ? "border-primary font-bold text-primary"
                      : "border-transparent font-semibold text-foreground hover:border-primary hover:text-primary"
                  }`}
                  href={item.href}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <button
        ref={buttonRef}
        type="button"
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-label={isOpen ? "주요 메뉴 닫기" : "주요 메뉴 열기"}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-border-strong bg-primary-soft px-3 text-small font-bold text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-surface hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring lg:hidden"
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? (
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
            <path d="M6 6l12 12M18 6L6 18" />
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
        <span>{isOpen ? "닫기" : "메뉴"}</span>
      </button>

      <nav
        id={menuId}
        aria-label="모바일 주요 메뉴"
        className="absolute inset-x-0 top-full max-h-[calc(100dvh-5rem)] overflow-y-auto border-b border-border-strong bg-surface-subtle shadow-card lg:hidden"
        hidden={!isOpen}
      >
        <ul className="mx-auto w-full max-w-site divide-y divide-border px-page py-2 sm:px-page-wide">
          {siteConfig.mainNavigation.map((item) => {
            const isActive = isCurrentPath(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-11 w-full items-center border-l-4 px-4 py-3 text-base transition-colors duration-[var(--motion-duration-fast)] ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
                    isActive
                      ? "border-primary bg-primary-soft font-bold text-foreground"
                      : "border-transparent font-semibold text-foreground hover:bg-primary-soft hover:text-primary"
                  }`}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function SiteNavigation() {
  const pathname = usePathname();

  return <SiteNavigationContent key={pathname} pathname={pathname} />;
}
