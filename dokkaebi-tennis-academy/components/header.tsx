"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Menu,
  ChevronRight,
  ChevronDown,
  Gift,
  MessageSquareText,
  Grid2X2,
  Package,
  MessageSquare,
  UserIcon,
  Mail,
  Loader2,
} from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/nav/UserNav";
import { useRouter, usePathname } from "next/navigation";
import SearchPreview from "@/components/SearchPreview";
import { useCartStore } from "@/app/store/cartStore";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { MdSportsTennis } from "react-icons/md";
import { WeatherBadge } from "@/components/WeatherBadge";
import { Badge } from "@/components/ui/badge";
import { useUnreadMessageCount } from "@/lib/hooks/useUnreadMessageCount";
import SiteContainer from "@/components/layout/SiteContainer";

/** 재질 카테고리(스트링 타입) 노출 온/오프 */
const SHOW_MATERIAL_MENU = false;

/** 모바일 브랜드 그리드 */
function MobileBrandGrid({
  brands,
  onPick,
}: {
  brands: { name: string; href: string }[];
  onPick: (href: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const VISIBLE = 6;
  const list = expanded ? brands : brands.slice(0, VISIBLE);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {list.map((b) => (
          <Button
            key={b.name}
            variant="outline"
            className="relative z-0 h-9 justify-center rounded-lg border-border text-sm hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-200 bg-transparent hover:shadow-sm hover:ring-1 hover:ring-inset hover:ring-ring/40 hover:z-10 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            onClick={() => onPick(b.href)}
          >
            {b.name}
          </Button>
        ))}
      </div>
      {brands.length > VISIBLE && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "접기" : "더보기"}
        </Button>
      )}
    </div>
  );
}

const Header = () => {
  const router = useRouter();
  const headerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // 장바구니 아이템 총 수량 (Zustand selector로 필요한 값만 구독)
  const cartCount = useCartStore((s) =>
    s.items.reduce((sum, it) => sum + (it.quantity || 0), 0),
  );
  const cartBadge = cartCount > 99 ? "99+" : String(cartCount);

  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  /**
   * "인터랙티브" 오버플로우 메뉴
   * - nav 실제 너비(픽셀 단위)를 ResizeObserver로 관측
   * - 각 메뉴/더보기 버튼의 실제 렌더 폭을 숨은 측정 DOM에서 계산
   * - 남는 폭에 따라 마지막 메뉴부터 1개씩 overflow로 이동
   */
  const navRef = useRef<HTMLElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);

  const [overflowCount, setOverflowCount] = useState(0);
  // "⋯ 더보기" 드롭다운은 Header(레이아웃)에 남아있어서 라우트 이동 시 open 상태가 유지될 수 있음
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);

  const recomputeOverflow = useCallback(() => {
    // nav 폭 + 실제 메뉴 텍스트 폭(활성 시 font-semibold 포함)을 기준으로 overflow 계산
    const navEl = navRef.current;
    const root = measureRef.current;
    if (!navEl || !root) return;

    const wrap = root.querySelector<HTMLElement>("[data-measure-wrap]");
    if (!wrap) return;

    const style = window.getComputedStyle(wrap);
    const gap = Number.parseFloat(style.columnGap || style.gap || "0") || 0;

    const itemEls = Array.from(
      root.querySelectorAll<HTMLElement>("[data-measure-item]"),
    );
    const itemWidths = itemEls.map((el) => el.offsetWidth);

    const dotsEl = root.querySelector<HTMLElement>("[data-measure-dots]");
    const dotsW = dotsEl ? dotsEl.offsetWidth : 0;

    const n = itemWidths.length;
    if (n === 0) return;

    // 상단 헤더는 스크롤 시 transform: scale(...)을 사용하므로,
    // clientWidth는 "스케일 전" 레이아웃 폭이라 계산이 틀어질 수 있음 → getBoundingClientRect() 사용
    const available = Math.max(0, navEl.getBoundingClientRect().width);

    const prefixWidth = (count: number) => {
      if (count <= 0) return 0;
      let w = 0;
      for (let i = 0; i < count; i++) w += itemWidths[i] || 0;
      w += gap * Math.max(0, count - 1);
      return w;
    };

    let nextOverflow = 0;
    let found = false;

    // 가능한 한 많이 보여주되, 안 들어가면 끝에서부터 "..."로
    for (let visible = n; visible >= 0; visible--) {
      const overflow = n - visible;
      const base = prefixWidth(visible);
      const total =
        overflow === 0 ? base : base + (visible > 0 ? gap : 0) + dotsW;

      if (total <= available) {
        nextOverflow = overflow;
        found = true;
        break;
      }
    }

    // FAIL-SAFE:
    // 어떤 이유로든(폰트 로딩/활성 메뉴 bold/아주 작은 폭) 위 루프에서 매칭을 못 찾으면,
    // 최소한 "⋯"는 보이도록 전부 overflow 처리.
    if (!found) {
      nextOverflow = n; // visibleCount = 0 → "⋯"만 노출
    }

    setOverflowCount((prev) => (prev === nextOverflow ? prev : nextOverflow));
  }, []);

  useLayoutEffect(() => {
    recomputeOverflow();
  }, [recomputeOverflow]);

  // 페이지 이동 시(활성 메뉴 font-semibold으로 폭 변화)에도 overflow 재계산
  useEffect(() => {
    // 라우트 이동하면 드롭다운(⋯)은 무조건 닫기
    setOverflowMenuOpen(false);
    recomputeOverflow();
    // 스크롤 상태 변화(scale 변경)도 실측 폭에 영향을 주므로 재계산 트리거로 포함
  }, [recomputeOverflow, pathname, isScrolled]);

  useEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return;

    const ro = new ResizeObserver(() => recomputeOverflow());
    ro.observe(navEl);

    const onResize = () => recomputeOverflow();
    window.addEventListener("resize", onResize);

    // 폰트 로딩(특히 첫 진입 시)이 끝난 뒤 텍스트 폭이 바뀌면 오차가 생길 수 있어
    // best-effort로 한번 더 계산
    const fonts = (document as any).fonts as FontFaceSet | undefined;
    if (fonts?.ready) {
      fonts.ready.then(() => recomputeOverflow()).catch(() => {});
    }

    // 첫 렌더 직후 한 틱 더(레이아웃 확정)
    const t = window.setTimeout(() => recomputeOverflow(), 0);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, [recomputeOverflow]);

  const { user, loading } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const { count: unreadCount } = useUnreadMessageCount(!loading && !!user);

  // 소셜 로그인 제공자 배지
  const socialProviders = user?.socialProviders ?? [];
  const hasKakao = socialProviders.includes("kakao");
  const hasNaver = socialProviders.includes("naver");

  // 헤더 포인트 표시(로그인 유저만)
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setPointsBalance(null);
      return;
    }

    let cancelled = false;

    fetch("/api/points/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;

        const raw = data?.ok ? Number(data.balance ?? 0) : 0;
        const bal = Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
        setPointsBalance(bal);
      })
      .catch(() => {
        if (cancelled) return;
        setPointsBalance(0);
      });

    return () => {
      cancelled = true;
    };
    // pathname을 넣어두면 페이지 이동 후에도(체크아웃 성공 이동 등) 헤더 값이 갱신됨
  }, [user?.id, pathname]);

  const NAV_LINKS = {
    strings: {
      root: "/products",
      brands: [
        { name: "윌슨", href: "/products?brand=wilson" },
        { name: "바볼랏", href: "/products?brand=babolat" },
        { name: "럭실론", href: "/products?brand=luxilon" },
        { name: "요넥스", href: "/products?brand=yonex" },
        { name: "헤드", href: "/products?brand=head" },
        { name: "테크니화이버", href: "/products?brand=tecnifibre" },
        { name: "솔린코", href: "/products?brand=solinco" },
        { name: "프린스", href: "/products?brand=prince" },
      ],
    },
    rackets: {
      root: "/rackets",
      brands: [
        { name: "헤드", href: "/rackets?brand=head" },
        { name: "윌슨", href: "/rackets?brand=wilson" },
        { name: "바볼랏", href: "/rackets?brand=babolat" },
        { name: "테크니화이버", href: "/rackets?brand=tecnifibre" },
      ],
    },
    services: [
      { name: "장착 서비스 홈", href: "/services" },
      { name: "텐션 가이드", href: "/services/tension-guide" },
      { name: "장착 비용 안내", href: "/services/pricing" },
      { name: "매장/예약 안내", href: "/services/locations" },
    ],
    packages: [{ name: "패키지 안내", href: "/services/packages" }],
    support: [
      { name: "고객센터 홈", href: "/support/notice" },
      { name: "공지사항", href: "/board/notice" },
      { name: "QnA", href: "/board/qna" },
    ],

    boards: [
      { name: "게시판 홈", href: "/board" },
      { name: "자유 게시판", href: "/board/free" },
      { name: "중고 거래", href: "/board/market" },
      { name: "장비 사용기", href: "/board/gear" },
      { name: "리뷰 게시판", href: "/reviews" },
    ],
  };

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

  /** 탑 메뉴 항목들 */
  const menuItems = [
    { name: "스트링", href: "/products", hasMegaMenu: true },
    { name: "라켓", href: "/rackets", hasMegaMenu: true, isRacketMenu: true },
    {
      name: "장착 서비스",
      href: "/services",
      hasMegaMenu: true,
      isServiceMenu: true,
    },
    {
      name: "패키지",
      href: "/services/packages",
      hasMegaMenu: true,
      isPackageMenu: true,
    },

    { name: "고객센터", href: "/support" },

    // 앞으로 커뮤니티(리뷰, 자유게시판 등) 허브가 될 /board
    { name: "게시판", href: "/board", hasMegaMenu: true, isBoardMenu: true },
    { name: "라켓 파인더", href: "/rackets/finder", hasMegaMenu: false },
  ];

  const visibleCount = Math.max(0, menuItems.length - overflowCount);
  const primaryMenuItems = menuItems.slice(0, visibleCount);
  const overflowMenuItems = menuItems.slice(visibleCount);

  const isActiveMenu = (item: (typeof menuItems)[number]) => {
    const p = pathname ?? "";
    if (item.isServiceMenu) return p === item.href;
    if (item.isRacketMenu)
      return (
        p === item.href ||
        (p.startsWith("/rackets/") && !p.startsWith("/rackets/finder"))
      );
    return p.startsWith(item.href);
  };

  return (
    <>
      {/* 스킵 링크 */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
      >
        메인 콘텐츠로 건너뛰기
      </a>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-[300px] bp-sm:w-[320px] bg-card p-0 flex flex-col border-r border-border"
          onOpenAutoFocus={(e) => {
            if (typeof window !== "undefined" && window.innerWidth < 768)
              e.preventDefault();
          }}
        >
          {/* 상단 로고/검색 */}
          <div
            className="shrink-0 p-6 pb-4 border-b border-border bg-muted/30"
          >
            <Link
              href="/"
              className="flex flex-col group"
              aria-label="도깨비 테니스 홈"
              onClick={() => setOpen(false)}
            >
              <div className="font-bold text-lg text-foreground whitespace-nowrap">
                도깨비 테니스
              </div>
              <div className="text-xs tracking-wider text-muted-foreground font-medium">
                DOKKAEBI TENNIS SHOP
              </div>
            </Link>
            <div className="mt-4">
              <SearchPreview
                placeholder="스트링 / 라켓 검색."
                className="w-full rounded-lg border-border focus-within:border-border focus-within:ring-2 focus-within:ring-ring transition-colors"
                onSelect={() => setOpen(false)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide p-4 bg-card">
            <Accordion type="single">
              {/* 스트링 */}
              <AccordionItem value="strings" className="border-none">
                <AccordionTrigger
                  value="strings"
                  className="py-3 px-3 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 hover:no-underline transition-all group"
                >
                  <span className="inline-flex items-center gap-2.5 text-base font-bold">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-primary">
                      <Grid2X2 className="h-4 w-4" />
                    </div>
                    <span className="text-foreground">스트링</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent
                  value="strings"
                  className="pb-2 pt-1 space-y-0.5"
                >
                  <Button
                    variant="ghost"
                    className="group w-full justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 dark:hover:bg-primary/20 transition-all relative z-0 hover:shadow-sm hover:ring-1 hover:ring-inset hover:ring-ring/40 hover:z-10 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    onClick={() => {
                      router.push(NAV_LINKS.strings.root);
                    }}
                  >
                    전체 보기
                    <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    className="group w-full justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 dark:hover:bg-primary/20 transition-all"
                    onClick={() => {
                      setOpen(false);
                      router.push("/services/apply");
                    }}
                  >
                    <span className="font-semibold text-primary">
                      장착 서비스 즉시 예약
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Button>

                  {/* 접어두는 하위 그룹(안내/브랜드) */}
                  <div className="mt-2 pl-2">
                    <Accordion type="single" className="space-y-1">
                      <AccordionItem
                        value="strings-service"
                        className="border-none"
                      >
                        <AccordionTrigger
                          value="strings-service"
                          className="px-3 py-2 text-[12px] font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20"
                        >
                          장착 서비스 안내
                        </AccordionTrigger>
                        <AccordionContent
                          value="strings-service"
                          className="pb-0"
                        >
                          <div className="space-y-0.5">
                            {NAV_LINKS.services.map((it) => (
                              <Button
                                key={it.name}
                                variant="ghost"
                                className="w-full justify-between rounded-md px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-primary/10 dark:hover:bg-primary/20 transition-all"
                                onClick={() => {
                                  setOpen(false);
                                  router.push(it.href);
                                }}
                              >
                                {it.name}
                                <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                              </Button>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem
                        value="strings-brand"
                        className="border-none"
                      >
                        <AccordionTrigger
                          value="strings-brand"
                          className="px-3 py-2 text-[12px] font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20"
                        >
                          브랜드
                        </AccordionTrigger>
                        <AccordionContent
                          value="strings-brand"
                          className="pb-0"
                        >
                          <div className="px-1 pt-2">
                            <MobileBrandGrid
                              brands={NAV_LINKS.strings.brands}
                              onPick={(href) => {
                                setOpen(false);
                                router.push(href);
                              }}
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* 게시판 */}
              <AccordionItem value="boards" className="border-none">
                <AccordionTrigger
                  value="boards"
                  className="py-3 px-3 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 hover:no-underline transition-all group"
                >
                  <span className="inline-flex items-center gap-2.5 text-base font-bold">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-primary">
                      <MessageSquareText className="h-4 w-4" />
                    </div>
                    <span className="text-foreground">게시판</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent
                  value="boards"
                  className="pb-2 pt-1 space-y-0.5"
                >
                  {NAV_LINKS.boards.map((it) => (
                    <Button
                      key={it.name}
                      variant="ghost"
                      className="group w-full justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 dark:hover:bg-primary/20 transition-all"
                      onClick={() => {
                        setOpen(false);
                        router.push(it.href);
                      }}
                    >
                      {it.name}
                      <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Button>
                  ))}
                </AccordionContent>
              </AccordionItem>

              {/* 패키지 */}
              <AccordionItem value="packages" className="border-none">
                <AccordionTrigger
                  value="packages"
                  className="py-3 px-3 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 hover:no-underline transition-all group"
                >
                  <span className="inline-flex items-center gap-2.5 text-base font-bold">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-primary">
                      <Gift className="h-4 w-4" />
                    </div>
                    <span className="text-foreground">패키지</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent
                  value="packages"
                  className="pb-2 pt-1 space-y-0.5"
                >
                  {NAV_LINKS.packages.map((it) => (
                    <Button
                      key={it.name}
                      variant="ghost"
                      className="group w-full justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 dark:hover:bg-primary/20 transition-all"
                      onClick={() => {
                        setOpen(false);
                        router.push(it.href);
                      }}
                    >
                      {it.name}
                      <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Button>
                  ))}
                </AccordionContent>
              </AccordionItem>

              {/* 중고 라켓 */}
              <AccordionItem value="rackets" className="border-none">
                <AccordionTrigger
                  value="rackets"
                  className="py-3 px-3 rounded-lg hover:no-underline transition-all group"
                >
                  <span className="inline-flex items-center gap-2.5 text-base font-bold">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-primary">
                      <MdSportsTennis className="h-4 w-4" />
                    </div>
                    <span className="text-foreground">중고 라켓</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent
                  value="rackets"
                  className="pb-2 pt-1 space-y-0.5"
                >
                  <Button
                    variant="ghost"
                    className="group w-full justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 dark:hover:bg-primary/20 transition-all"
                    onClick={() => {
                      setOpen(false);
                      router.push(NAV_LINKS.rackets.root);
                    }}
                  >
                    전체 보기
                    <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Button>

                  {/* 브랜드 서브메뉴 */}
                  <div className="mt-2 pl-2 space-y-0.5">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1">
                      브랜드
                    </div>
                    {NAV_LINKS.rackets.brands.map((b) => (
                      <Button
                        key={b.href}
                        variant="ghost"
                        className="w-full justify-between rounded-md px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-primary/10 dark:hover:bg-primary/20 transition-all"
                        onClick={() => {
                          setOpen(false);
                          router.push(b.href);
                        }}
                      >
                        {b.name}
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* 고객센터 */}
              <AccordionItem value="support" className="border-none">
                <AccordionTrigger
                  value="support"
                  className="py-3 px-3 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 hover:no-underline transition-all group"
                >
                  <span className="inline-flex items-center gap-2.5 text-base font-bold">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-primary">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <span className="text-foreground">고객센터</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent
                  value="support"
                  className="pb-2 pt-1 space-y-0.5"
                >
                  {NAV_LINKS.support.map((it) => (
                    <Button
                      key={it.name}
                      variant="ghost"
                      className="group w-full justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 dark:hover:bg-primary/20 transition-all"
                      onClick={() => {
                        setOpen(false);
                        router.push(it.href);
                      }}
                    >
                      {it.name}
                      <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Button>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* 하단 고정 영역(모바일) */}
          <div className="shrink-0 border-t border-border p-4 bg-card space-y-3">
            {user ? (
              <>
                {/* 사용자 정보 카드 */}
                <div className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-start justify-between">
                    {/* <Avatar className="h-10 w-10 border-2 border-border shadow-sm">
                          <AvatarImage src={user.image || '/placeholder.svg'} />
                          <AvatarFallback
                            className="bg-card text-primary font-semibold"
                          >
                            {user.name?.charAt(0) ?? 'U'}
                          </AvatarFallback>
                        </Avatar> */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground truncate">
                          {user.name} 님
                        </span>
                        <Link
                          href="/mypage?tab=points"
                          onClick={() => setOpen(false)}
                          className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                          aria-label="포인트 보기"
                        >
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                            P
                          </span>
                          <span className="inline-flex items-center gap-1">
                            {pointsBalance === null ? (
                              <>
                                <Loader2
                                  className="h-3.5 w-3.5 animate-spin text-muted-foreground"
                                  aria-hidden="true"
                                />
                                <span className="sr-only">
                                  포인트 불러오는 중
                                </span>
                              </>
                            ) : (
                              <>{pointsBalance.toLocaleString()}P</>
                            )}
                          </span>
                        </Link>

                        {isAdmin && (
                          <Badge
                            variant="success"
                            className="border-0 px-2 py-0 text-[10px] h-5"
                          >
                            관리자
                          </Badge>
                        )}
                      </div>

                      {(hasKakao || hasNaver) && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {hasKakao && (
                            <Badge
                              variant="info"
                              className="border-0 text-[10px] h-5 px-2"
                            >
                              카카오
                            </Badge>
                          )}
                          {hasNaver && (
                            <Badge
                              variant="neutral"
                              className="border-0 text-[10px] h-5 px-2"
                            >
                              네이버
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 주요 액션(아이콘 전용) - 모바일 Sheet 하단 높이/복잡도 축소 */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="relative h-11 w-full rounded-xl border-border bg-background hover:bg-primary/10 dark:hover:bg-primary/20"
                    onClick={() => {
                      setOpen(false);
                      router.push("/mypage");
                    }}
                    aria-label="마이페이지"
                  >
                    <UserIcon className="h-5 w-5" />
                    <span className="sr-only">마이페이지</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    className="relative h-11 w-full rounded-xl border-border bg-background hover:bg-primary/10 dark:hover:bg-primary/20"
                    onClick={() => {
                      setOpen(false);
                      router.push("/messages");
                    }}
                    aria-label="쪽지함"
                  >
                    <Mail className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                    <span className="sr-only">쪽지함</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    className="relative h-11 w-full rounded-xl border-border bg-background hover:bg-primary/10 dark:hover:bg-primary/20"
                    onClick={() => {
                      setOpen(false);
                      router.push("/cart");
                    }}
                    aria-label="장바구니"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {cartBadge}
                      </span>
                    )}
                    <span className="sr-only">장바구니</span>
                  </Button>
                </div>

                {/* 보조 액션 버튼 */}
                <div className="space-y-2">
                  {isAdmin && (
                    <Button
                      variant="secondary"
                      className="w-full justify-center rounded-xl h-10 transition-all duration-200"
                      onClick={() => {
                        setOpen(false);
                        router.push("/admin/dashboard");
                      }}
                    >
                      관리자 페이지
                    </Button>
                  )}

                  <Button
                    variant="destructive"
                    className="w-full justify-center rounded-xl h-10 transition-all duration-200"
                    onClick={async () => {
                      await fetch("/api/logout", {
                        method: "POST",
                        credentials: "include",
                      });
                      window.location.href = "/";
                    }}
                  >
                    로그아웃
                  </Button>
                </div>
              </>
            ) : (
              <Button
                className="w-full justify-center rounded-xl h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all duration-200"
                onClick={() => {
                  setOpen(false);
                  const redirectTo =
                    typeof window !== "undefined"
                      ? window.location.pathname + window.location.search
                      : "/";
                  router.push(`/login?next=${encodeURIComponent(redirectTo)}`);
                }}
              >
                로그인
              </Button>
            )}

            {/* 테마 토글 */}
            <div className="pt-2 flex justify-center">
              <ThemeToggle />
            </div>
          </div>
        </SheetContent>
        <header
          ref={headerRef as any}
          data-scrolled={isScrolled}
          className={`app-header fixed top-0 inset-x-0 z-[40] w-full isolate transition-[height] duration-300 ${isScrolled ? "h-[56px]" : "h-[72px]"}`}
        >
          <div
            aria-hidden="true"
            className={`absolute left-0 right-0 top-0 z-0 pointer-events-none transition-[height,background] duration-300 ${isScrolled ? "h-[56px]" : "h-[72px]"} bg-background/70 backdrop-blur-md border-b border-border`}
          />
          <SiteContainer
            className="bp-lg:mx-0 bp-lg:max-w-none bp-lg:pl-64 bp-lg:pr-8 2xl:pl-72 2xl:pr-16 h-full flex items-center justify-between overflow-visible transition-transform duration-300"
            style={{
              transform: isScrolled ? "scale(0.96)" : "scale(1)",
              transformOrigin: "top center",
              willChange: "transform",
            }}
          >
            <div className="flex items-center justify-between w-full bp-lg:hidden">
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-primary/10 dark:hover:bg-primary/20 p-2 focus-visible:ring-2 ring-ring"
                  aria-label="메뉴 열기"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <Link
                href="/"
                className="flex flex-col items-center group"
                aria-label="도깨비 테니스 홈"
                onClick={() => setOpen(false)}
              >
                <div className="font-black text-[15px] tracking-tight text-foreground group-hover:text-foreground transition-colors">
                  도깨비 테니스
                </div>
                <div className="text-[10px] tracking-wider text-muted-foreground font-medium whitespace-nowrap">
                  DOKKAEBI TENNIS SHOP
                </div>
              </Link>

              <div className="flex items-center gap-1.5">
                <Link href="/cart">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-full hover:bg-primary/10 dark:hover:bg-primary/20 p-2 focus-visible:ring-2 ring-ring"
                    aria-label="장바구니"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 text-[10px] h-4 min-w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {cartBadge}
                      </span>
                    )}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="hidden bp-lg:flex items-center w-full min-w-0 gap-3 bp-lg:gap-4">
              <Link
                href="/"
                className="flex flex-col group"
                aria-label="도깨비 테니스 홈"
              >
                <div className="font-black text-lg bp-lg:text-xl tracking-tight text-foreground group-hover:text-foreground transition-colors">
                  도깨비 테니스
                </div>
                <div className="text-xs tracking-wider text-muted-foreground font-medium whitespace-nowrap">
                  DOKKAEBI TENNIS SHOP
                </div>
              </Link>

              <nav
                ref={navRef}
                className="hidden bp-lg:flex items-center gap-1.5 ml-2 whitespace-nowrap flex-1 min-w-0 overflow-hidden"
              >
                {primaryMenuItems.map((item) => {
                  const active = isActiveMenu(item);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex shrink-0 items-center h-9 px-2.5 rounded-lg text-sm leading-none transition whitespace-nowrap ${active ? "bg-primary text-primary-foreground font-semibold" : "text-foreground hover:text-foreground hover:bg-primary/10 dark:hover:bg-primary/20"}`}
                      aria-current={active ? "page" : undefined}
                      aria-label={`${item.name} 페이지로 이동`}
                    >
                      {item.name}
                    </Link>
                  );
                })}

                {/* bp-lg(1200+)~1580px 미만 구간: 우측 메뉴가 검색 영역에 가려질 수 있어 '더보기'로 이동 */}
                {overflowMenuItems.length > 0 && (
                  <DropdownMenu
                    modal={false}
                    open={overflowMenuOpen}
                    onOpenChange={setOverflowMenuOpen}
                  >
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex shrink-0 items-center h-9 gap-1 px-2.5 rounded-lg text-sm leading-none transition whitespace-nowrap text-foreground hover:text-foreground hover:bg-primary/10 dark:hover:bg-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        aria-label="더보기 메뉴"
                      >
                        ⋯
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="start" sideOffset={8}>
                      {overflowMenuItems.map((item) => {
                        const active = isActiveMenu(item);
                        return (
                          <DropdownMenuItem
                            key={item.name}
                            className={
                              active
                                ? "bg-primary text-primary-foreground font-semibold"
                                : undefined
                            }
                            onSelect={(e) => {
                              e.preventDefault();
                              setOverflowMenuOpen(false);
                              router.push(item.href);
                            }}
                          >
                            {item.name}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </nav>

              {/* <div className="max-w-md w-full">
              <WeatherBadge />
            </div> */}

              {/* 검색 (PC 전용) */}
              <div className="ml-auto shrink-0 flex justify-end">
                <div
                  className="min-w-[180px]"
                  style={{ width: "clamp(220px, 24vw, 560px)" }}
                >
                  <SearchPreview
                    placeholder="스트링 / 라켓 검색..."
                    className="w-full rounded-full bg-background/80 border border-border focus-within:ring-2 focus-within:ring-ring transition-all duration-200"
                  />
                </div>
              </div>

              {/* 숨은 측정 DOM: 실제 렌더 폭(텍스트/패딩/아이콘/갭)을 그대로 재기 */}
              <div
                ref={measureRef}
                className="absolute -left-[9999px] top-0 opacity-0 pointer-events-none"
              >
                <div
                  data-measure-wrap
                  className="flex items-center gap-1.5 ml-2 whitespace-nowrap"
                >
                  {menuItems.map((it) => (
                    <span
                      key={`measure-${it.name}`}
                      data-measure-item
                      className="inline-flex shrink-0 items-center h-9 px-2.5 rounded-lg text-sm leading-none whitespace-nowrap font-semibold"
                    >
                      {it.name}
                    </span>
                  ))}

                  <span
                    data-measure-dots
                    className="inline-flex shrink-0 items-center h-9 gap-1 px-2.5 rounded-lg text-sm leading-none whitespace-nowrap font-semibold"
                  >
                    ⋯ <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
              </div>

              {/* 아이콘/유저 */}
              <div className="flex items-center gap-3 bp-lg:gap-4 pl-2 shrink-0">
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bp-lg:hidden rounded-full hover:bg-primary/10 dark:hover:bg-primary/20 p-2 transition-all duration-300 focus-visible:ring-2 ring-ring"
                    aria-label="메뉴 열기"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <Link href="/cart">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-full hover:bg-primary/10 dark:hover:bg-primary/20 p-2 transition-all duration-300 focus-visible:ring-2 ring-ring"
                    aria-label="장바구니"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 text-[10px] min-w-[18px] h-[18px] px-[5px] rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {cartBadge}
                      </span>
                    )}
                  </Button>
                </Link>

                {user && (
                  <Button
                    variant="ghost"
                    className="h-9 px-3 rounded-full"
                    asChild
                  >
                    <Link
                      href="/mypage?tab=points"
                      className="flex items-center gap-2"
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                        P
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums">
                        {pointsBalance === null ? (
                          <>
                            <Loader2
                              className="h-4 w-4 animate-spin text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span className="sr-only">포인트 불러오는 중</span>
                          </>
                        ) : (
                          <>{pointsBalance.toLocaleString()}P</>
                        )}
                      </span>
                    </Link>
                  </Button>
                )}

                <div className="max-w-[140px] overflow-hidden">
                  <UserNav unreadCount={unreadCount} />
                </div>
                <ThemeToggle />
              </div>
            </div>
          </SiteContainer>
        </header>
      </Sheet>
    </>
  );
};

export default Header;
