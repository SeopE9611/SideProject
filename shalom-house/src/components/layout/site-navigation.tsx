"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { siteConfig } from "@/config/site";

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNavigation() {
  const pathname = usePathname();
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const [openPathname, setOpenPathname] = useState<string | null>(null);
  const isOpen = openPathname === pathname;

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!navigationRef.current?.contains(event.target as Node)) {
        setOpenPathname(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenPathname(null);
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
            const isSupport = item.href === "/support";

            return (
              <li key={item.href}>
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center rounded-control px-3 py-2 text-small font-semibold transition-colors duration-[var(--motion-duration-fast)] ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
                    isSupport
                      ? `border border-primary bg-primary text-primary-foreground hover:border-primary-hover hover:bg-primary-hover hover:text-primary-foreground ${
                          isActive ? "border-primary-hover bg-primary-hover font-bold" : ""
                        }`
                      : isActive
                        ? "bg-primary-soft font-bold text-primary"
                        : "text-muted-foreground hover:bg-primary-soft hover:text-primary"
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
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-border-strong bg-surface text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary-soft hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring lg:hidden"
        onClick={() => setOpenPathname(isOpen ? null : pathname)}
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
      </button>

      {isOpen && (
        <nav
          id={menuId}
          aria-label="모바일 주요 메뉴"
          className="absolute inset-x-0 top-full border-b border-border bg-surface shadow-card lg:hidden"
        >
          <ul className="mx-auto w-full max-w-site px-page py-4 sm:px-page-wide">
            {siteConfig.mainNavigation.map((item) => {
              const isActive = isCurrentPath(pathname, item.href);
              const isSupport = item.href === "/support";

              return (
                <li key={item.href}>
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-11 w-full items-center rounded-control px-4 py-3 text-base font-semibold transition-colors duration-[var(--motion-duration-fast)] ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
                      isSupport
                        ? `mt-2 justify-center border border-primary bg-primary text-primary-foreground hover:border-primary-hover hover:bg-primary-hover hover:text-primary-foreground ${
                            isActive ? "border-primary-hover bg-primary-hover font-bold" : ""
                          }`
                        : isActive
                          ? "bg-primary-soft font-bold text-primary"
                          : "text-foreground hover:bg-primary-soft hover:text-primary"
                    }`}
                    href={item.href}
                    onClick={() => setOpenPathname(null)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
