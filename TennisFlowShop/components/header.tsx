"use client";

import { useCartStore } from "@/app/store/cartStore";
import SearchPreview from "@/components/SearchPreview";
import SiteContainer from "@/components/layout/SiteContainer";
import DesktopHeaderNavigation from "@/components/nav/DesktopHeaderNavigation";
import { NAV_LINKS } from "@/components/nav/nav.config";
import { UserNav } from "@/components/nav/UserNav";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IdentityBadge } from "@/components/ui/identity-badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getUserRoleLabel, isAdminRole } from "@/lib/admin/roles";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useUnreadMessageCount } from "@/lib/hooks/useUnreadMessageCount";
import {
  confirmBoardUnsavedChangesNavigation,
  runBoardUnsavedChangesNavigation,
} from "@/lib/hooks/useBoardUnsavedChangesGuard";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  Gift,
  Headset,
  Loader2,
  Mail,
  Menu,
  MoreHorizontal,
  ShoppingCart,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * 헤더 포인트는 "네비게이션마다" 재조회할 필요가 없습니다.
 * - 같은 세션 안에서는 짧은 TTL 캐시를 사용해 스피너 깜빡임을 줄입니다.
 * - 결제/적립 직후처럼 강제 갱신이 필요할 때만 커스텀 이벤트로 무효화할 수 있게 준비합니다.
 */
const HEADER_POINTS_CACHE_TTL_MS = 30_000;
let headerPointsCache: {
  fetchedAt: number;
  userId: string;
  balance: number;
} | null = null;

/** 모바일 브랜드 그리드 */
function MobileBrandGrid({
  brands,
  onPick,
}: {
  brands: readonly { name: string; href: string }[];
  onPick: (href: string) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {brands.map((b) => {
          return (
            <Button
              key={b.name}
              variant="outline"
              className={cn(
                "relative z-0 h-10 min-w-0 justify-center rounded-control border-border bg-transparent px-2 text-ui-label hover:bg-muted/40 transition-[background-color,color,border-color,box-shadow,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
              onClick={() => onPick(b.href)}
            >
              <span className="block min-w-0 whitespace-nowrap">{b.name}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

const mobileMenuItemClass = (active = false) =>
  cn(
    "group relative z-0 min-h-11 w-full min-w-0 justify-between rounded-control px-3 py-2.5 text-ui-body-sm transition-[background-color,color,border-color,box-shadow,opacity] before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded-full before:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    active
      ? "bg-muted/60 font-ui-medium text-foreground before:bg-brand-highlight"
      : "font-ui-medium text-foreground/85 hover:bg-muted/40 hover:text-foreground",
  );
const mobileNestedGroupClass = "mt-1 pl-1";
const mobileNestedTriggerClass =
  "min-h-11 min-w-0 px-3 py-2 text-ui-body-sm font-ui-medium text-foreground/75 hover:text-foreground rounded-control hover:bg-muted/40";
const mobileAccordionTriggerClass = (active = false) =>
  cn(
    "group relative z-0 rounded-lg px-3 py-2.5 transition-[background-color,color,border-color,box-shadow,opacity] before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded-full before:bg-transparent hover:bg-muted/40 hover:no-underline",
    active ? "font-ui-medium text-foreground before:bg-brand-highlight" : "font-ui-medium text-foreground/85",
  );
const mobileMenuGroupClass = "mt-1.5 pt-0";
const mobileGroupTitleClass = "min-w-0 break-keep whitespace-normal text-foreground";

const Header = () => {
  const router = useRouter();
  const headerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // 장바구니 아이템 총 수량 (Zustand selector로 필요한 값만 구독)
  const cartCount = useCartStore((s) => s.items.reduce((sum, it) => sum + (it.quantity || 0), 0));
  const cartBadge = cartCount > 99 ? "99+" : String(cartCount);

  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const { user, loading } = useCurrentUser();
  const displayName = user?.name?.trim() || "회원";
  const isAdmin = isAdminRole(user?.role);
  const { count: unreadCount, status: unreadStatus } = useUnreadMessageCount(!loading && !!user);
  const resolvedUnreadCount = unreadStatus === "ready" ? (unreadCount ?? 0) : null;

  // 소셜 로그인 제공자 배지
  const socialProviders = user?.socialProviders ?? [];
  const hasKakao = socialProviders.includes("kakao");
  const hasNaver = socialProviders.includes("naver");

  // 헤더 포인트 표시(로그인 유저만)
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);
  // 로딩/실패/실제 값(0 포함)을 분리해 잘못된 0 선노출을 막는다.
  const [pointsStatus, setPointsStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!user) {
      // 중요:
      // - 로그아웃(또는 인증 해제) 시 이전 사용자 캐시를 즉시 제거해야
      //   다음 사용자 로그인 순간에 타인 포인트가 잠깐 보이는 문제를 막을 수 있습니다.
      // - 이 초기화가 없으면 TTL 안에서 이전 계정 값이 재사용될 수 있습니다.
      headerPointsCache = null;
      setPointsBalance(null);
      setPointsStatus("loading");
      return;
    }

    let cancelled = false;
    const currentUserId = String(user.id ?? "");
    // 타입 안정성:
    // - headerPointsCache를 지역 상수로 먼저 받아두면
    //   아래 if 블록에서 TS가 null 아님을 안전하게 추론할 수 있습니다.
    // - 직접 headerPointsCache.balance에 접근하면
    //   정적 점검에서 "possibly null" 경고가 다시 발생할 수 있습니다.
    const cachedPoints = headerPointsCache;
    const canUseCache =
      !!cachedPoints &&
      cachedPoints.userId === currentUserId &&
      Date.now() - cachedPoints.fetchedAt < HEADER_POINTS_CACHE_TTL_MS;

    if (canUseCache) {
      // UX 목적:
      // - 라우팅/탭 이동 때 "매번 로딩 스피너"를 막기 위해 캐시된 값을 즉시 사용
      // - 캐시 TTL이 짧아 데이터 신선도도 크게 해치지 않음
      // userId 비교 이유:
      // - TTL만 보면 "다른 사용자"의 캐시까지 재사용되는 문제가 생깁니다.
      // - 반드시 로그인 사용자와 캐시 소유자(userId)가 같을 때만 사용합니다.
      setPointsBalance(cachedPoints.balance);
      setPointsStatus("ready");
      return;
    }

    setPointsStatus("loading");
    fetch("/api/points/me?summary=1", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `포인트 조회 실패 (${res.status})`);
        }
        return res.json().catch(() => null);
      })
      .then((data) => {
        if (cancelled) return;

        // 헤더는 잔액 숫자만 필요하므로 summary 응답 형식만 검증
        if (!data?.ok || typeof data?.balance !== "number") {
          throw new Error("포인트 응답 형식이 올바르지 않습니다.");
        }
        const raw = Number(data.balance);
        const bal = Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
        headerPointsCache = {
          fetchedAt: Date.now(),
          userId: currentUserId,
          balance: bal,
        };
        setPointsBalance(bal);
        setPointsStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        // 실패를 0으로 숨기지 않고, 알 수 없음 상태로 분리한다.
        setPointsBalance(null);
        setPointsStatus("error");
      });

    return () => {
      cancelled = true;
    };
    /**
     * 의존성 설명:
     * - user.id가 바뀔 때(로그인/로그아웃/계정전환)만 재조회
     * - pathname 의존성을 제거해 페이지 이동마다 불필요한 포인트 fetch를 막음
     */
  }, [user?.id]);

  const isMobileRouteCurrent = (href: string) => pathname === href;

  const isMobileSectionActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  const servicesGroupActive = isMobileSectionActive("/services") && !isMobileSectionActive("/services/packages");
  const stringsGroupActive = isMobileSectionActive(NAV_LINKS.strings.root);
  const racketsGroupActive = isMobileSectionActive(NAV_LINKS.rackets.root);
  const boardsGroupActive =
    (isMobileSectionActive("/board") &&
      !["/board/notice", "/board/event", "/board/qna"].some((href) => isMobileSectionActive(href))) ||
    isMobileSectionActive("/reviews");
  const supportGroupActive = NAV_LINKS.support.some((it) => isMobileSectionActive(it.href));
  const academyCurrent = isMobileRouteCurrent(NAV_LINKS.academy.href);
  const academySectionActive = isMobileSectionActive(NAV_LINKS.academy.href);
  const racketCareActive =
    isMobileSectionActive("/racket-care") || isMobileSectionActive("/mypage/racket-care");
  const racketCareCurrent = isMobileSectionActive("/racket-care");

  // 헤더 실제 높이를 CSS 변수로 노출 → 좌측 사이드 top 자동 반영
  useEffect(() => {
    const setVar = () => {
      const h = headerRef.current?.offsetHeight ?? 64;
      document.documentElement.style.setProperty("--header-h", `${h}px`);
    };
    setVar();
    const ro = new ResizeObserver(setVar);
    if (headerRef.current) ro.observe(headerRef.current);
    window.addEventListener("resize", setVar);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", setVar);
    };
  }, []);

  /** 스크롤/리사이즈 핸들링 */
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1200) setOpen(false);
    };

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        setIsScrolled((prev) => {
          if (!prev && y > 32) return true;
          if (prev && y < 4) return false;
          return prev;
        });
        ticking = false;
      });
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const guardedPush = (href: string, beforeNavigate?: () => void) =>
    runBoardUnsavedChangesNavigation(() => {
      // 확인을 취소한 경우 모바일 Sheet를 먼저 닫으면 작성 맥락이 사라지므로 승인 뒤에만 닫는다.
      beforeNavigate?.();
      router.push(href);
    });


  return (
    <>
      {/* 스킵 링크 */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-control focus:bg-brand-highlight focus:px-4 focus:py-2 focus:text-brand-highlight-foreground focus:shadow-soft"
      >
        메인 콘텐츠로 건너뛰기
      </a>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-[min(88vw,340px)] max-w-[340px] h-[100dvh] max-h-[100dvh] overflow-hidden bg-background p-0 flex flex-col border-r border-border/80"
          onOpenAutoFocus={(e) => {
            if (typeof window !== "undefined" && window.innerWidth < 768) e.preventDefault();
          }}
        >
          {/* 상단 로고/검색 */}
          <div className="shrink-0 border-b border-border/80 bg-card px-4 pt-5 pb-3 bp-sm:px-5 bp-sm:pt-6 bp-sm:pb-4">
            <Link
              href="/"
              className="inline-flex min-w-0 items-center gap-2 group"
              aria-label="도깨비테니스 홈"
              onClick={() => setOpen(false)}
            >
              <div className={cn("relative shrink-0 overflow-hidden transition-[width,height] duration-300", isScrolled ? "h-6 w-6" : "h-7 w-7")}>
                <Image
                  src="/brand/symbol-light.png"
                  alt=""
                  aria-hidden="true"
                  fill
                  className="object-contain dark:hidden"
                  priority
                />
                <Image
                  src="/brand/symbol-dark.png"
                  alt=""
                  aria-hidden="true"
                  fill
                  className="hidden object-contain dark:block"
                  priority
                />
              </div>
              <div className="min-w-0 truncate whitespace-nowrap font-brand-bold text-ui-card-title-lg text-foreground">
                도깨비테니스
              </div>
            </Link>
            <div className="mt-4">
              <SearchPreview
                placeholder="스트링 / 라켓 검색"
                className="w-full"
                onSelect={() => setOpen(false)}
                variant="chrome"
              />
            </div>
            <div className="mt-3">
              {user && (
                <div className="rounded-panel border border-border/80 bg-card p-3 shadow-soft">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <div className="min-w-0 max-w-[150px] truncate text-ui-body-sm font-ui-medium text-foreground bp-sm:max-w-[180px]">
                          {displayName} 님
                        </div>
                        {hasKakao && (
                          <IdentityBadge
                            tone="kakao"
                            className="h-4 min-h-0 shrink-0 whitespace-nowrap px-1.5 text-ui-micro leading-none"
                          >
                            카카오
                          </IdentityBadge>
                        )}
                        {hasNaver && (
                          <IdentityBadge
                            tone="naver"
                            className="h-4 min-h-0 shrink-0 whitespace-nowrap px-1.5 text-ui-micro leading-none"
                          >
                            네이버
                          </IdentityBadge>
                        )}
                        {isAdmin && (
                          <IdentityBadge
                            tone="admin"
                            className="h-4 min-h-0 shrink-0 whitespace-nowrap px-1.5 py-0 text-ui-micro leading-none"
                          >
                            {getUserRoleLabel(user?.role)}
                          </IdentityBadge>
                        )}
                      </div>
                      <Link
                        href="/mypage?tab=points"
                        onClick={() => setOpen(false)}
                        className="mt-1 inline-flex min-w-0 items-center gap-1 text-ui-micro font-ui-medium text-muted-foreground tabular-nums hover:text-foreground"
                        aria-label="포인트 보기"
                      >
                        <span className="text-ui-micro font-ui-medium">P</span>
                        {pointsStatus === "loading" ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                            <span className="sr-only">포인트 불러오는 중</span>
                          </>
                        ) : pointsStatus === "error" ? (
                          <span>-</span>
                        ) : (
                          <span>{(pointsBalance ?? 0).toLocaleString()}P</span>
                        )}
                      </Link>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <NotificationBell
                        enabled={!loading && !!user}
                        mode="mobileCard"
                        onNavigate={() => setOpen(false)}
                      />
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="-mr-1 -mt-1 h-8 w-8 shrink-0 rounded-control text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="사용자 메뉴 더보기"
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          sideOffset={8}
                          collisionPadding={12}
                          className="z-[60] w-44"
                        >
                          <DropdownMenuItem
                            className="h-9"
                            onSelect={() => {
                              guardedPush("/mypage", () => setOpen(false));
                            }}
                          >
                            마이페이지
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="h-9"
                            onSelect={() => {
                              guardedPush("/board/event", () => setOpen(false));
                            }}
                          >
                            이벤트
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem
                              className="h-9"
                              onSelect={() => {
                                setOpen(false);
                                window.open("/admin/operations", "_blank", "noopener,noreferrer");
                              }}
                            >
                              관리자 페이지
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="h-9 text-destructive focus:text-destructive"
                            onSelect={async () => {
                              if (!confirmBoardUnsavedChangesNavigation()) return;
                              setOpen(false);
                              // 로그아웃 직전 캐시를 선제적으로 비워
                              // 계정 전환 시 stale 포인트가 보이는 플래시를 예방합니다.
                              headerPointsCache = null;
                              await fetch("/api/logout", {
                                method: "POST",
                                credentials: "include",
                              });
                              router.replace("/");
                              router.refresh();
                            }}
                          >
                            로그아웃
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-ui-label font-ui-medium text-muted-foreground">
                    <button
                      type="button"
                      className="inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-control bg-muted/40 px-3 py-1.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="쪽지함으로 이동"
                      onClick={() => {
                        guardedPush("/messages", () => setOpen(false));
                      }}
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>쪽지</span>
                      {resolvedUnreadCount !== null && resolvedUnreadCount > 0 && (
                        <span className="tabular-nums text-destructive">
                          {resolvedUnreadCount > 99 ? "99+" : resolvedUnreadCount}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-control bg-muted/40 px-3 py-1.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="장바구니로 이동"
                      onClick={() => {
                        guardedPush("/cart", () => setOpen(false));
                      }}
                    >
                      <ShoppingCart className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>장바구니</span>
                      {cartCount > 0 && (
                        <span className="tabular-nums text-foreground">{cartBadge}</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hide bg-background px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+24px)] bp-sm:px-4">
            <Accordion type="single" className="space-y-1">
              {/* 교체서비스 */}
              <AccordionItem value="services" className="border-none">
                <AccordionTrigger value="services" className={mobileAccordionTriggerClass(servicesGroupActive)}>
                  <span className="inline-flex items-center gap-2.5 text-ui-card-title font-ui-medium"><span className={mobileGroupTitleClass}>교체서비스</span></span>
                </AccordionTrigger>
                <AccordionContent value="services" className="space-y-0.5 pb-2 pt-1">
                  {NAV_LINKS.services.map((it) => (
                    <Button key={it.href} variant="ghost" className={mobileMenuItemClass(isMobileRouteCurrent(it.href))} aria-current={isMobileRouteCurrent(it.href) ? "page" : undefined} onClick={() => guardedPush(it.href, () => setOpen(false))}>
                      {it.name}<ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  ))}
                </AccordionContent>
              </AccordionItem>

              {/* 스트링 */}
              <AccordionItem value="strings" className={cn("border-none", mobileMenuGroupClass)}>
                <AccordionTrigger value="strings" className={mobileAccordionTriggerClass(stringsGroupActive)}>
                  <span className="inline-flex items-center gap-2.5 text-ui-card-title font-ui-medium"><span className={mobileGroupTitleClass}>스트링</span></span>
                </AccordionTrigger>
                <AccordionContent value="strings" className="space-y-0.5 pb-2 pt-1">
                  <Button variant="ghost" className={mobileMenuItemClass(isMobileRouteCurrent(NAV_LINKS.strings.root))} aria-current={isMobileRouteCurrent(NAV_LINKS.strings.root) ? "page" : undefined} onClick={() => guardedPush(NAV_LINKS.strings.root, () => setOpen(false))}>전체 보기<ChevronRight className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" className={mobileMenuItemClass(isMobileRouteCurrent("/products/recommend"))} aria-current={isMobileRouteCurrent("/products/recommend") ? "page" : undefined} onClick={() => guardedPush("/products/recommend", () => setOpen(false))}>스트링 추천<ChevronRight className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" className={mobileMenuItemClass(false)} onClick={() => guardedPush("/products?material=hybrid", () => setOpen(false))}>하이브리드<ChevronRight className="h-3.5 w-3.5" /></Button>
                  <div className={mobileNestedGroupClass}><Accordion type="single"><AccordionItem value="strings-brand" className="border-none"><AccordionTrigger value="strings-brand" className={mobileNestedTriggerClass}>브랜드</AccordionTrigger><AccordionContent value="strings-brand" className="pb-0 pt-1"><div className="px-1 pt-2"><MobileBrandGrid brands={NAV_LINKS.strings.brands} onPick={(href) => guardedPush(href, () => setOpen(false))} /></div></AccordionContent></AccordionItem></Accordion></div>
                </AccordionContent>
              </AccordionItem>

              {/* 중고 라켓 */}
              <AccordionItem value="rackets" className={cn("border-none", mobileMenuGroupClass)}>
                <AccordionTrigger value="rackets" className={mobileAccordionTriggerClass(racketsGroupActive)}>
                  <span className="inline-flex items-center gap-2.5 text-ui-card-title font-ui-medium"><span className={mobileGroupTitleClass}>중고 라켓</span></span>
                </AccordionTrigger>
                <AccordionContent value="rackets" className="space-y-0.5 pb-2 pt-1">
                  <Button variant="ghost" className={mobileMenuItemClass(isMobileRouteCurrent(NAV_LINKS.rackets.root))} aria-current={isMobileRouteCurrent(NAV_LINKS.rackets.root) ? "page" : undefined} onClick={() => guardedPush(NAV_LINKS.rackets.root, () => setOpen(false))}>전체 보기<ChevronRight className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" className={mobileMenuItemClass(false)} onClick={() => guardedPush("/rackets?rentOnly=1", () => setOpen(false))}>대여 가능한 라켓<ChevronRight className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" className={mobileMenuItemClass(isMobileRouteCurrent("/rackets/finder"))} aria-current={isMobileRouteCurrent("/rackets/finder") ? "page" : undefined} onClick={() => guardedPush("/rackets/finder", () => setOpen(false))}>라켓 찾기<ChevronRight className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" className={mobileMenuItemClass(isMobileRouteCurrent("/rackets/compare"))} aria-current={isMobileRouteCurrent("/rackets/compare") ? "page" : undefined} onClick={() => guardedPush("/rackets/compare", () => setOpen(false))}>라켓 비교<ChevronRight className="h-3.5 w-3.5" /></Button>
                  <div className={mobileNestedGroupClass}><Accordion type="single"><AccordionItem value="rackets-brand" className="border-none"><AccordionTrigger value="rackets-brand" className={mobileNestedTriggerClass}>브랜드</AccordionTrigger><AccordionContent value="rackets-brand" className="pb-0 pt-1"><div className="px-1 pt-2"><MobileBrandGrid brands={NAV_LINKS.rackets.brands} onPick={(href) => guardedPush(href, () => setOpen(false))} /></div></AccordionContent></AccordionItem></Accordion></div>
                </AccordionContent>
              </AccordionItem>

              <div className={mobileMenuGroupClass}><Button variant="ghost" className={mobileMenuItemClass(isMobileSectionActive("/services/packages"))} aria-current={isMobileRouteCurrent("/services/packages") ? "page" : undefined} onClick={() => guardedPush("/services/packages", () => setOpen(false))}>패키지<ChevronRight className="h-3.5 w-3.5 shrink-0" /></Button></div>
              <div className={mobileMenuGroupClass}><Button variant="ghost" className={mobileMenuItemClass(academySectionActive)} aria-current={academyCurrent ? "page" : undefined} onClick={() => guardedPush(NAV_LINKS.academy.href, () => setOpen(false))}>아카데미<ChevronRight className="h-3.5 w-3.5 shrink-0" /></Button></div>
              <div className={mobileMenuGroupClass}><Button variant="ghost" className={mobileMenuItemClass(racketCareActive)} aria-current={racketCareCurrent ? "page" : undefined} onClick={() => guardedPush("/racket-care", () => setOpen(false))}>라켓 케어<ChevronRight className="h-3.5 w-3.5 shrink-0" /></Button></div>

              {/* 게시판 */}
              <AccordionItem value="boards" className={cn("border-none", mobileMenuGroupClass)}>
                <AccordionTrigger
                  value="boards"
                  className={mobileAccordionTriggerClass(boardsGroupActive)}
                >
                  <span className="inline-flex items-center gap-2.5 text-ui-card-title font-ui-medium">
                    {/* <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-primary">
                      <MessageSquareText className="h-4 w-4" />
                    </div> */}
                    <span className={mobileGroupTitleClass}>커뮤니티</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent value="boards" className="pb-2 pt-1 space-y-0.5">
                  {[{ name: "커뮤니티 홈", href: "/board" }, ...NAV_LINKS.boards].map((it) => (
                    <Button
                      key={it.name}
                      variant="ghost"
                      className={mobileMenuItemClass(isMobileRouteCurrent(it.href))}
                      aria-current={isMobileRouteCurrent(it.href) ? "page" : undefined}
                      onClick={() => {
                        guardedPush(it.href, () => setOpen(false));
                      }}
                    >
                      {it.name}
                      <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200" />
                    </Button>
                  ))}
                </AccordionContent>
              </AccordionItem>

              {/* 고객센터 */}
              <AccordionItem value="support" className={cn("border-none", mobileMenuGroupClass)}>
                <AccordionTrigger
                  value="support"
                  className={mobileAccordionTriggerClass(supportGroupActive)}
                >
                  <span className="inline-flex items-center gap-2.5 text-ui-card-title font-ui-medium">
                    {/* <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-primary">
                      <MessageSquare className="h-4 w-4" />
                    </div> */}
                    <span className={mobileGroupTitleClass}>고객센터</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent value="support" className="pb-2 pt-1 space-y-0.5">
                  {NAV_LINKS.support.map((it) => (
                    <Button
                      key={it.name}
                      variant="ghost"
                      className={mobileMenuItemClass(isMobileRouteCurrent(it.href))}
                      aria-current={isMobileRouteCurrent(it.href) ? "page" : undefined}
                      onClick={() => {
                        guardedPush(it.href, () => setOpen(false));
                      }}
                    >
                      {it.name}
                      <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200" />
                    </Button>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* 하단 보조 영역(모바일) */}
            <div className="mt-3 space-y-3">
              {!user && (
                <div className="space-y-3 rounded-panel border border-border/80 bg-card p-4">
                  <p className="break-keep text-ui-body-sm text-muted-foreground">
                    로그인하면 주문 조회와 교체서비스 신청 내역을 확인할 수 있어요.
                  </p>
                  <Button
                    className="h-10 w-full justify-center rounded-control bg-brand-highlight text-brand-highlight-foreground transition-[background-color,color,border-color,box-shadow,opacity] duration-200 hover:bg-brand-highlight/90"
                    onClick={() => {
                      const redirectTo =
                        typeof window !== "undefined"
                          ? window.location.pathname + window.location.search
                          : "/";
                      guardedPush(`/login?next=${encodeURIComponent(redirectTo)}`, () => setOpen(false));
                    }}
                  >
                    로그인
                  </Button>
                </div>
              )}

              {/* 테마 토글 */}
              <div className="pt-1 flex justify-center">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </SheetContent>
        <header
          ref={headerRef as any}
          data-scrolled={isScrolled}
          className={`app-header fixed top-0 inset-x-0 z-[40] w-full isolate transition-[height] duration-300 ${isScrolled ? "h-[64px] bp-lg:h-[100px]" : "h-[80px] bp-lg:h-[116px]"}`}
        >
          <div
            aria-hidden="true"
            className={`absolute inset-0 z-0 pointer-events-none bg-background/95 border-b border-border/80 ${isScrolled ? "shadow-soft" : ""}`}
          />
          <SiteContainer
            className="relative z-10 flex h-full items-center justify-between overflow-visible bp-lg:mx-0 bp-lg:flex-col bp-lg:justify-center bp-lg:max-w-none bp-lg:px-6 xl:px-8 2xl:px-10"
          >
            <div className="grid w-full grid-cols-[52px_minmax(0,1fr)_52px] items-center bp-sm:grid-cols-[56px_minmax(0,1fr)_56px] bp-lg:hidden">
              <div className="justify-self-start">
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-control p-2 hover:bg-muted focus-visible:ring-2 ring-ring"
                    aria-label="메뉴 열기"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              </div>

              <Link
                href="/"
                className="inline-flex min-w-0 items-center justify-center gap-1.5 justify-self-center group"
                aria-label="도깨비테니스 홈"
                onClick={() => setOpen(false)}
              >
                <div className={cn("relative shrink-0 overflow-hidden transition-[width,height] duration-300", isScrolled ? "h-6 w-6" : "h-7 w-7")}>
                  <Image
                    src="/brand/symbol-light.png"
                    alt=""
                    aria-hidden="true"
                    fill
                    className="object-contain dark:hidden"
                    priority
                  />
                  <Image
                    src="/brand/symbol-dark.png"
                    alt=""
                    aria-hidden="true"
                    fill
                    className="hidden object-contain dark:block"
                    priority
                  />
                </div>
                <div className="font-brand-bold text-ui-body tracking-normal text-foreground group-hover:text-foreground transition-colors whitespace-nowrap">
                  도깨비테니스
                </div>
              </Link>

              <div className="flex items-center gap-0.5 justify-self-end overflow-visible">
                <Link href="/cart">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-10 w-10 rounded-control p-2 hover:bg-muted focus-visible:ring-2 ring-ring"
                    aria-label="장바구니"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-surface-inverse px-1 text-ui-micro font-ui-medium text-surface-inverse-foreground">
                        {cartBadge}
                      </span>
                    )}
                  </Button>
                </Link>
              </div>
            </div>
            <div className="hidden w-full min-w-0 flex-1 grid-cols-[auto_minmax(220px,1fr)_auto] items-center gap-3 bp-lg:grid xl:gap-6">
              <div className="justify-self-start flex min-w-0 items-center gap-5">
                <Link
                  href="/"
                  className="flex items-center gap-2 shrink-0 group"
                  aria-label="도깨비테니스 홈"
                >
                  <div className={cn("relative shrink-0 overflow-hidden transition-[width,height] duration-300", isScrolled ? "h-10 w-10 xl:h-12 xl:w-12 2xl:h-14 2xl:w-14" : "h-12 w-12 xl:h-14 xl:w-14 2xl:h-[60px] 2xl:w-[60px]")}>
                    <Image
                      src="/brand/symbol-light.png"
                      alt=""
                      aria-hidden="true"
                      fill
                      className="object-contain dark:hidden"
                      priority
                    />
                    <Image
                      src="/brand/symbol-dark.png"
                      alt=""
                      aria-hidden="true"
                      fill
                      className="hidden object-contain dark:block"
                      priority
                    />
                  </div>

                  <div className="font-brand-bold text-ui-page-title xl:text-ui-page-title-lg tracking-normal text-foreground group-hover:text-foreground transition-colors whitespace-nowrap">
                    도깨비테니스
                  </div>
                </Link>

              </div>

              {/* 검색 (PC 전용) */}
              <div className="hidden min-w-0 justify-self-center px-2 bp-lg:block bp-lg:w-full xl:px-3 2xl:px-4">
                <div className="w-full max-w-[420px] xl:max-w-[520px] 2xl:max-w-[640px] mx-auto">
                  <SearchPreview
                    placeholder="스트링 / 라켓 검색"
                    className="w-full"
                    variant="chrome"
                  />
                </div>
              </div>



              {/* 아이콘/유저 */}
              <div className="justify-self-end flex min-w-0 items-center gap-1.5 xl:gap-2 2xl:gap-3 min-w-fit shrink-0 pl-2">
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bp-lg:hidden rounded-control p-2 transition-[background-color,color,border-color,box-shadow,opacity] duration-300 hover:bg-muted focus-visible:ring-2 ring-ring"
                    aria-label="메뉴 열기"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <Link href="/support" className="hidden 2xl:inline-flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-10 w-10 rounded-control p-0 transition-[background-color,color,border-color,box-shadow,opacity] duration-300 hover:bg-muted focus-visible:ring-2 ring-ring shrink-0"
                    aria-label="고객센터"
                    title="고객센터"
                  >
                    <Headset className="!h-5 !w-5" />
                  </Button>
                </Link>
                <Link href="/board/event">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-10 w-10 rounded-control p-0 transition-[background-color,color,border-color,box-shadow,opacity] duration-300 hover:bg-muted focus-visible:ring-2 ring-ring shrink-0"
                    aria-label="이벤트"
                    title="이벤트"
                  >
                    <Gift className="!h-5 !w-5" />
                  </Button>
                </Link>
                <Link href="/cart">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-10 w-10 rounded-control p-0 transition-[background-color,color,border-color,box-shadow,opacity] duration-300 hover:bg-muted focus-visible:ring-2 ring-ring shrink-0"
                    aria-label="장바구니"
                    title="장바구니"
                  >
                    <ShoppingCart className="!h-5 !w-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 text-ui-micro min-w-[18px] h-[18px] px-[5px] rounded-full bg-surface-inverse text-surface-inverse-foreground flex items-center justify-center font-ui-medium">
                        {cartBadge}
                      </span>
                    )}
                  </Button>
                </Link>

                {user && (
                  <Button
                    variant="ghost"
                    className="h-10 rounded-control px-2.5 hover:bg-muted 2xl:px-3 shrink-0"
                    asChild
                  >
                    <Link href="/mypage?tab=points" className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-ui-caption font-ui-medium text-muted-foreground">
                        P
                      </span>
                      <span className="hidden 2xl:inline-flex min-w-0 items-center gap-1 whitespace-nowrap text-ui-body-sm font-ui-medium tabular-nums">
                        {pointsStatus === "loading" ? (
                          <>
                            <Loader2
                              className="h-4 w-4 animate-spin text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span className="sr-only">포인트 불러오는 중</span>
                          </>
                        ) : pointsStatus === "error" ? (
                          <>-</>
                        ) : (
                          <>{(pointsBalance ?? 0).toLocaleString()}P</>
                        )}
                      </span>
                    </Link>
                  </Button>
                )}

                {user && <NotificationBell enabled={!loading && !!user} mode="desktop" />}

                <div className="max-w-[82px] xl:max-w-[108px] 2xl:max-w-[148px] overflow-hidden shrink-0">
                  <UserNav />
                </div>
                <div className="shrink-0">
                  <ThemeToggle />
                </div>
              </div>
            </div>
            <DesktopHeaderNavigation />
          </SiteContainer>
        </header>
      </Sheet>
    </>
  );
};

export default Header;
