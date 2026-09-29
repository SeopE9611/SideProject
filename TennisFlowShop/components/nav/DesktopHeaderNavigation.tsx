"use client";

import { DESKTOP_NAV_ITEMS, NAV_LINKS } from "@/components/nav/nav.config";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type React from "react";
import { useEffect, useRef, useState } from "react";

type MenuKind = (typeof DESKTOP_NAV_ITEMS)[number]["kind"];
type OpenMenuKind = Exclude<MenuKind, "link"> | null;
type MenuLink = { id?: string; name: string; href: string; description?: string; mobile?: boolean };

const OPEN_DELAY_MS = 150;
const CLOSE_DELAY_MS = 280;
const panelLinkClass =
  "group flex min-h-11 items-center justify-between rounded-control border border-transparent px-3 py-2 text-ui-body-sm font-ui-medium text-foreground transition-colors hover:border-border hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover";

const isSectionActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

function isMenuActive(kind: MenuKind, pathname: string) {
  switch (kind) {
    case "services":
      return isSectionActive(pathname, "/services");
    case "strings":
      return isSectionActive(pathname, "/products");
    case "rackets":
      return (
        isSectionActive(pathname, "/rackets") ||
        isSectionActive(pathname, "/racket-care") ||
        isSectionActive(pathname, "/mypage/racket-care")
      );
    case "boards":
      return (
        (isSectionActive(pathname, "/board") &&
          !["/board/notice", "/board/event", "/board/qna"].some((href) =>
            isSectionActive(pathname, href),
          )) ||
        isSectionActive(pathname, "/reviews")
      );
    case "support":
      return (
        isSectionActive(pathname, "/support") ||
        ["/board/notice", "/board/event", "/board/qna"].some((href) =>
          isSectionActive(pathname, href),
        )
      );
    case "link":
      return false;
  }
}

function isCurrentHref(href: string, pathname: string, currentSearch: string) {
  const target = new URL(href, "https://dokkaebi-tennis.local");
  const targetSearch = new URLSearchParams(target.search);
  const current = new URLSearchParams(currentSearch);
  targetSearch.sort();
  current.sort();
  return pathname === target.pathname && targetSearch.toString() === current.toString();
}

function CompactMenu({
  kind,
  onLinkClick,
  pathname,
  currentSearch,
}: {
  kind: Exclude<MenuKind, "link" | "strings" | "rackets">;
  onLinkClick: React.MouseEventHandler<HTMLAnchorElement>;
  pathname: string;
  currentSearch: string;
}) {
  const links: readonly MenuLink[] =
    kind === "services"
      ? NAV_LINKS.services
      : kind === "boards"
        ? [NAV_LINKS.boards.root, ...NAV_LINKS.boards.links]
        : NAV_LINKS.support;

  return (
    <div className="w-64 max-w-full space-y-1">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={isCurrentHref(link.href, pathname, currentSearch) ? "page" : undefined}
          className={panelLinkClass}
          onClick={onLinkClick}
        >
          <span>
            <span className="block">{link.name}</span>
            {link.description && (
              <span className="block text-ui-caption font-normal text-muted-foreground">
                {link.description}
              </span>
            )}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-brand-highlight-ink" aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}

function CommerceMegaMenu({
  kind,
  onLinkClick,
  pathname,
  currentSearch,
}: {
  kind: "strings" | "rackets";
  onLinkClick: React.MouseEventHandler<HTMLAnchorElement>;
  pathname: string;
  currentSearch: string;
}) {
  const isStrings = kind === "strings";
  const quickLinks: readonly (MenuLink & { cta?: boolean })[] = isStrings
    ? NAV_LINKS.strings.quickLinks
    : NAV_LINKS.rackets.quickLinks;
  const brands = isStrings ? NAV_LINKS.strings.brands : NAV_LINKS.rackets.brands;

  return (
    <div
      className={cn(
        "grid max-w-full gap-5",
        isStrings
          ? "w-[min(840px,calc(100vw-4.5rem))] grid-cols-[250px_minmax(0,1fr)]"
          : "w-[min(590px,calc(100vw-4.5rem))] grid-cols-[225px_minmax(0,1fr)]",
      )}
    >
      <section className="border-r border-border pr-5">
        <p className="mb-2 text-ui-label font-ui-medium text-muted-foreground">빠른 이동</p>
        <div className="space-y-1">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isCurrentHref(link.href, pathname, currentSearch) ? "page" : undefined}
              className={cn(
                panelLinkClass,
                link.cta && "bg-brand-highlight-muted hover:bg-brand-highlight-muted",
              )}
              onClick={onLinkClick}
            >
              <span>
                <span className="block">{link.name}</span>
                <span className="block text-ui-caption font-normal text-muted-foreground">
                  {link.description}
                </span>
              </span>
              <ChevronRight
                className="h-3.5 w-3.5 shrink-0 text-brand-highlight-ink"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>
      <section>
        <p className="mb-2 text-ui-label font-ui-medium text-muted-foreground">브랜드</p>
        <div className={cn("grid gap-1", isStrings ? "grid-cols-3" : "grid-cols-2")}>
          {brands.map((brand) => (
            <Link
              key={brand.href}
              href={brand.href}
              aria-current={isCurrentHref(brand.href, pathname, currentSearch) ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center rounded-control px-3 text-ui-body-sm font-ui-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
                isCurrentHref(brand.href, pathname, currentSearch) && "bg-muted/60",
              )}
              onClick={onLinkClick}
            >
              {brand.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function DesktopHeaderNavigation() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const navigationSignature = `${pathname}?${searchParams.toString()}`;
  const [openMenu, setOpenMenu] = useState<OpenMenuKind>(null);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerCloseMenusRef = useRef<Set<Exclude<MenuKind, "link">>>(new Set());

  const clearTimeouts = () => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };
  const scheduleOpen = (kind: Exclude<MenuKind, "link">) => {
    clearTimeouts();
    const delay = openMenu === null ? OPEN_DELAY_MS : 0;
    openTimeoutRef.current = setTimeout(() => {
      setOpenMenu((current) => {
        if (current && current !== kind) pointerCloseMenusRef.current.add(current);
        return kind;
      });
    }, delay);
  };
  const scheduleClose = (kind: Exclude<MenuKind, "link">) => {
    clearTimeouts();
    closeTimeoutRef.current = setTimeout(() => {
      setOpenMenu((current) => {
        if (current === kind) {
          pointerCloseMenusRef.current.add(kind);
          return null;
        }
        return current;
      });
    }, CLOSE_DELAY_MS);
  };
  const closeAfterNavigation = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    setOpenMenu(null);
  };

  useEffect(() => {
    clearTimeouts();
    setOpenMenu(null);
  }, [navigationSignature]);
  useEffect(
    () => () => {
      clearTimeouts();
      pointerCloseMenusRef.current.clear();
    },
    [],
  );

  return (
    <nav
      className="hidden h-11 w-full items-center justify-center gap-1 whitespace-nowrap border-t border-border/70 bp-lg:flex"
      aria-label="주요 메뉴"
    >
      {DESKTOP_NAV_ITEMS.map((item) => {
        const active =
          item.kind === "link"
            ? isSectionActive(pathname, item.href)
            : isMenuActive(item.kind, pathname);

        if (item.kind === "link") {
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={
                isCurrentHref(item.href, pathname, searchParams.toString()) ? "page" : undefined
              }
              className={cn(
                "relative inline-flex h-11 items-center rounded-control px-3 text-ui-body font-ui-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active &&
                  "bg-brand-highlight-muted after:absolute after:bottom-1 after:left-3 after:right-3 after:h-0.5 after:bg-brand-highlight-ink",
              )}
            >
              {item.name}
            </Link>
          );
        }

        const isOpen = openMenu === item.kind;
        const content =
          item.kind === "strings" || item.kind === "rackets" ? (
            <CommerceMegaMenu
              kind={item.kind}
              onLinkClick={closeAfterNavigation}
              pathname={pathname}
              currentSearch={searchParams.toString()}
            />
          ) : (
            <CompactMenu
              kind={item.kind}
              onLinkClick={closeAfterNavigation}
              pathname={pathname}
              currentSearch={searchParams.toString()}
            />
          );

        return (
          <Popover
            key={item.name}
            open={isOpen}
            onOpenChange={(nextOpen) =>
              setOpenMenu((current) =>
                nextOpen ? item.kind : current === item.kind ? null : current,
              )
            }
          >
            <div
              className="relative"
              onPointerEnter={(event) => {
                if (event.pointerType !== "mouse") return;
                scheduleOpen(item.kind);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType !== "mouse") return;
                scheduleClose(item.kind);
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  className={cn(
                    "relative inline-flex h-11 items-center gap-1 rounded-control px-3 text-ui-body font-ui-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    isOpen && "bg-secondary",
                    active &&
                      "bg-brand-highlight-muted after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-brand-highlight-ink",
                  )}
                >
                  {item.name}
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")}
                    aria-hidden="true"
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent
                portalled={false}
                align="center"
                sideOffset={4}
                collisionPadding={16}
                onOpenAutoFocus={(event) => event.preventDefault()}
                onCloseAutoFocus={(event) => {
                  if (pointerCloseMenusRef.current.delete(item.kind)) event.preventDefault();
                }}
                className="w-auto max-w-[calc(100vw-2rem)] rounded-panel border-border bg-popover p-5 text-popover-foreground shadow-float"
              >
                {content}
              </PopoverContent>
            </div>
          </Popover>
        );
      })}
    </nav>
  );
}
