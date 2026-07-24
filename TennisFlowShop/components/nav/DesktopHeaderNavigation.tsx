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
type MenuLink = { name: string; href: string; description?: string };

const CLOSE_DELAY_MS = 150;
const panelLinkClass =
  "group flex min-h-10 items-center justify-between rounded-control border border-transparent px-3 py-2 text-ui-body-sm font-ui-medium text-foreground transition-colors hover:border-border hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
        ? [{ name: "커뮤니티 홈", href: "/board" }, ...NAV_LINKS.boards]
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
          {link.name}
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
  const quickLinks: readonly MenuLink[] = isStrings
    ? [
        { name: "모든 스트링", href: NAV_LINKS.strings.root, description: "전체 상품을 둘러보세요." },
        { name: "스트링 추천", href: "/products/recommend", description: "플레이 성향에 맞춰 추천받으세요." },
        { name: "교체서비스 시작하기", href: "/services", description: "전문가 교체서비스를 신청하세요." },
        { name: "텐션 가이드", href: "/services/tension-guide", description: "적정 텐션을 알아보세요." },
      ]
    : [
        { name: "모든 중고 라켓", href: NAV_LINKS.rackets.root, description: "인증 중고 라켓을 둘러보세요." },
        { name: "대여 가능한 라켓", href: "/rackets?rentOnly=1", description: "대여 가능 상품만 확인하세요." },
        { name: "라켓 찾기", href: "/rackets/finder", description: "내게 맞는 라켓을 찾아보세요." },
        { name: "라켓 비교", href: "/rackets/compare", description: "사양을 한눈에 비교하세요." },
        { name: "라켓 케어", href: "/racket-care", description: "보유 라켓을 등록하고 관리하세요." },
      ];
  const brands = isStrings ? NAV_LINKS.strings.brands : NAV_LINKS.rackets.brands;

  return (
    <div
      className={cn(
        "grid max-w-full gap-5",
        isStrings
          ? "w-[min(840px,calc(100vw-4.5rem))] grid-cols-[250px_minmax(0,1fr)]"
          : "w-[min(640px,calc(100vw-4.5rem))] grid-cols-[240px_minmax(0,1fr)]",
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
              className={panelLinkClass}
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
                "flex min-h-10 items-center rounded-control px-3 text-ui-body-sm font-ui-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };
  const scheduleClose = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => setOpenMenu(null), CLOSE_DELAY_MS);
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
    setOpenMenu(null);
  }, [navigationSignature]);
  useEffect(() => () => clearCloseTimeout(), []);

  return (
    <nav className="hidden w-full items-center justify-center gap-1 whitespace-nowrap border-t border-border/70 py-1 bp-lg:flex" aria-label="주요 메뉴">
      {DESKTOP_NAV_ITEMS.map((item) => {
        const active = item.kind === "link" ? false : isMenuActive(item.kind, pathname);

        if (item.kind === "link") {
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isCurrentLink(item.href, pathname) ? "page" : undefined}
              className={cn(
                "relative inline-flex h-9 items-center rounded-control px-3 text-ui-body-sm font-ui-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
            onOpenChange={(nextOpen) => setOpenMenu(nextOpen ? item.kind : null)}
          >
            <div
              className="relative"
              onPointerEnter={(event) => {
                if (event.pointerType !== "mouse") return;
                clearCloseTimeout();
                setOpenMenu(item.kind);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType !== "mouse") return;
                scheduleClose();
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  className={cn(
                    "inline-flex h-9 items-center gap-1 rounded-control px-3 text-ui-body-sm font-ui-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    (active || isOpen) && "bg-secondary",
                    active &&
                      "after:absolute after:bottom-1 after:left-3 after:right-3 after:h-0.5 after:bg-brand-highlight-ink",
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
                className="w-auto max-w-[calc(100vw-2rem)] rounded-panel border-border p-5 shadow-float"
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
