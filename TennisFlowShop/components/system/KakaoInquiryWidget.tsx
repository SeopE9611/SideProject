"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Kakao?: any;
  }
}

const guideLinks = [
  { label: "교체서비스 시작하기", href: "/services#service-start" },
  { label: "새 스트링 고르고 장착 신청", href: "/products?from=apply" },
  { label: "라켓 구매/대여 + 장착", href: "/rackets?from=apply" },
  { label: "아카데미 신청", href: "/academy" },
  { label: "주문/신청 상태 확인", href: "/mypage" },
] as const;

function normalizeChannelPublicId(raw: string) {
  // 실수 방지:
  // - "_uxjpH" (정상)
  // - "https://pf.kakao.com/_uxjpH" (전체 URL 넣는 실수)
  // - "https://pf.kakao.com/_uxjpH/chat" (chat까지 넣는 실수)
  let id = raw.trim();
  id = id.replace(/^https?:\/\/pf\.kakao\.com\//, "");
  id = id.replace(/\/chat.*$/i, "");
  id = id.replace(/\/+$/, "");
  return id;
}

/**
 * 우측 하단 "문의" 위젯
 * - 버그 제보(오픈채팅) + 카카오 문의(채널 1:1)
 * - 패널은 한 번에 하나만 열림
 * - Kakao SDK 로딩이 늦을 수 있어 간단 폴링으로 init 보장
 */
export default function KakaoInquiryWidget() {
  const pathname = usePathname();
  const authHiddenPrefixes = [
    "/login",
    "/forgot-password",
    "/reset-password",
    "/account",
    "/order-lookup",
  ];
  const hideOnAuthRoute = authHiddenPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  // 어떤 패널이 열려있는지(중복 오픈 방지)
  const [panel, setPanel] = useState<"guide" | null>(null);

  // outside click 닫기용 ref
  const compactTriggerRef = useRef<HTMLButtonElement | null>(null);
  const compactPanelRef = useRef<HTMLDivElement | null>(null);

  // 하단 고정 바(모바일 CTA 등)와 겹치지 않도록 위로 올리는 픽셀
  const [liftPx, setLiftPx] = useState(0);
  const [hideForOverlay, setHideForOverlay] = useState(false);

  // 클라이언트 노출 가능한 env만 사용 (NEXT_PUBLIC_*)
  const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "";
  const rawChannelPublicId = process.env.NEXT_PUBLIC_KAKAO_CHANNEL_PUBLIC_ID ?? "";
  const channelPublicId = normalizeChannelPublicId(rawChannelPublicId);

  // 버그 제보: 카카오 오픈채팅 URL (예: https://open.kakao.com/o/xxxx)
  const bugOpenChatUrl = (process.env.NEXT_PUBLIC_KAKAO_BUG_OPENCHAT_URL ?? "").trim();

  // 훅 개수 불일치 방지 - "숨김 여부"는 계산만 하고, return은 마지막에만 처리
  const hideAll = pathname?.startsWith("/admin") || hideOnAuthRoute;
  const canShowInquiry = !!jsKey && !!channelPublicId;
  const canShowBug = !!bugOpenChatUrl;

  const canShowGuide = true;

  // 목적 선택은 Kakao env와 무관하게 노출한다.
  const shouldHide = hideAll || (!canShowGuide && !canShowInquiry && !canShowBug);
  const hideOnFinderTouch = pathname === "/rackets/finder";
  const hideOnCartMobile = pathname === "/cart";

  useEffect(() => {
    // 숨김 상태로 전환되면 패널은 닫아줌(UX + 상태 정리)
    if (shouldHide) {
      setPanel(null);
      return;
    }
    // 문의 위젯이 비활성화되면 Kakao SDK init도 불필요하므로 여기서 종료
    if (!canShowInquiry) return;

    let ticks = 0;

    const initOnce = () => {
      const Kakao = window.Kakao;
      if (!Kakao) return false;

      try {
        // 이미 init 된 경우 중복 init 방지
        if (!Kakao.isInitialized?.()) {
          Kakao.init(jsKey);
        }
      } catch {
        // init 실패는 여기서 터뜨리지 않음(클릭 시 fallback 있음)
      }
      return true;
    };

    // 즉시 init 시도
    if (initOnce()) return;

    // SDK 로딩이 늦는 경우 대비: 짧게 폴링
    const timer = window.setInterval(() => {
      ticks += 1;
      if (initOnce() || ticks > 120) {
        window.clearInterval(timer);
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, [jsKey, shouldHide, canShowInquiry]);

  /**
   * 모바일 하단 고정 CTA(장바구니/상품상세/라켓상세 등)가 있는 페이지에서는
   * 우측 하단 문의 위젯이 버튼/콘텐츠를 가리지 않도록 "자동으로 위로 띄움".
   *
   * - 하단 고정 바 래퍼에 data-bottom-sticky="1" 을 달아두면 그 높이를 감지
   * - 없으면 기존 위치 유지
   */
  useEffect(() => {
    if (shouldHide) return;

    let raf = 0;
    let ro: ResizeObserver | null = null;

    const pickTargets = (): HTMLElement[] => {
      const marked = Array.from(document.querySelectorAll<HTMLElement>('[data-bottom-sticky="1"]'));
      if (marked.length) return marked.filter((el) => !isWidgetOverlay(el));
      // (예비) 혹시 마킹을 빠뜨린 경우를 대비한 fallback
      return Array.from(document.querySelectorAll<HTMLElement>(".fixed.inset-x-0.bottom-0")).filter(
        (el) => !isWidgetOverlay(el),
      );
    };

    const isWidgetOverlay = (el: HTMLElement) =>
      el.matches('[data-kakao-widget-hide="1"], [role="dialog"]') ||
      Boolean(el.closest('[data-kakao-widget-hide="1"], [role="dialog"]'));

    const hasBlockingOverlay = () =>
      Array.from(document.querySelectorAll<HTMLElement>('[data-kakao-widget-hide="1"]')).some(
        (el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        },
      );

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const targets = pickTargets();
        setHideForOverlay(hasBlockingOverlay());

        let maxCover = 0;
        for (const el of targets) {
          const rect = el.getBoundingClientRect();
          // display:none 등으로 안 보이는 경우 제외
          if (rect.width <= 0 || rect.height <= 0) continue;
          // "진짜 하단에 붙어있는 바"만 대상으로(바텀에서 떨어져 있으면 제외)
          if (rect.bottom < window.innerHeight - 2) continue;

          const coverFromBottom = Math.max(0, window.innerHeight - rect.top);
          maxCover = Math.max(maxCover, coverFromBottom);
        }

        // 여유 간격(클릭 여백/시각 여백)
        const next = maxCover > 0 ? maxCover + 12 : 0;
        setLiftPx((prev) => (prev === next ? prev : next));

        // 높이 변화(텍스트 줄바꿈 등)에도 반응하도록 ResizeObserver 연결
        ro?.disconnect();
        ro = new ResizeObserver(() => schedule());
        targets.forEach((t) => ro!.observe(t));
      });
    };

    // 페이지 전환/조건부 렌더로 하단 바가 생겼다/사라지는 것도 감지
    const mo = new MutationObserver(() => schedule());
    mo.observe(document.body, { childList: true, subtree: true });

    schedule();
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      mo.disconnect();
      ro?.disconnect();
    };
  }, [shouldHide, pathname]);

  // X 안 눌러도: compact 패널 바깥 클릭 시 닫기
  useEffect(() => {
    if (panel !== "guide") return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      if (compactPanelRef.current?.contains(target)) return;
      if (compactTriggerRef.current?.contains(target)) return;

      setPanel(null);
    };

    // 캡처 단계로 잡으면(= true) 다른 UI 핸들러보다 먼저 안정적으로 닫힘 처리 가능
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [panel]);

  const openKakaoChat = () => {
    const Kakao = window.Kakao;

    // 1) SDK가 준비되어 있으면 공식 API로 채팅 오픈
    try {
      if (Kakao?.Channel?.chat) {
        Kakao.Channel.chat({ channelPublicId });
        setPanel(null);
        return;
      }
    } catch {
      // ignore
    }

    // 2) fallback: 채널 채팅 URL로 이동(최소 동작 보장)
    window.open(`https://pf.kakao.com/${channelPublicId}/chat`, "_blank", "noopener,noreferrer");
    setPanel(null);
  };

  const openBugChat = () => {
    // 오픈채팅 URL은 SDK 없이 새 탭으로 이동
    window.open(bugOpenChatUrl, "_blank", "noopener,noreferrer");
    setPanel(null);
  };

  if (shouldHide || hideForOverlay) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-3 z-[70] bp-sm:bottom-4 bp-sm:right-4",
        hideOnFinderTouch && "hidden bp-lg:block",
        hideOnCartMobile && "hidden bp-lg:block",
        "bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] bp-lg:bottom-4",
      )}
      style={liftPx ? { transform: `translateY(-${liftPx}px)` } : undefined}
    >
      <div className="flex flex-col items-end gap-2 bp-sm:gap-3">
        {canShowGuide || canShowBug || canShowInquiry ? (
          <div className="relative">
            <div
              className={[
                "absolute right-0 bottom-[58px]",
                "transition-all duration-150",
                panel === "guide"
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 translate-y-2 pointer-events-none",
              ].join(" ")}
            >
              <div ref={compactPanelRef} id="compact-inquiry-panel" className="relative">
                <Card className="relative w-[min(320px,calc(100vw-2rem))] rounded-panel border-border shadow-float">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-ui-body-sm font-semibold">
                      무엇을 도와드릴까요?
                    </CardTitle>
                    <button
                      type="button"
                      aria-label="닫기"
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                      onClick={() => setPanel(null)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </CardHeader>
                  <CardContent className="max-h-[min(70vh,520px)] space-y-4 overflow-y-auto">
                    <div className="space-y-2">
                      <p className="text-ui-label font-semibold text-muted-foreground">빠른 이동</p>
                      {guideLinks.map(({ label, href }) => (
                        <Link
                          key={href}
                          href={href}
                          className="flex min-h-11 items-center rounded-control border border-border bg-card px-3 py-2 text-ui-body-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setPanel(null)}
                        >
                          {label}
                        </Link>
                      ))}
                    </div>
                    {canShowBug || canShowInquiry ? (
                      <div className="space-y-2 border-t border-border pt-4">
                        <p className="text-ui-label font-semibold text-muted-foreground">지원</p>
                        {canShowBug ? (
                          <button
                            type="button"
                            onClick={openBugChat}
                            className="min-h-11 w-full rounded-control border border-border bg-card px-3 py-2 text-left text-ui-body-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            버그 제보
                          </button>
                        ) : null}
                        {canShowInquiry ? (
                          <button
                            type="button"
                            onClick={openKakaoChat}
                            className="min-h-11 w-full rounded-control border border-border bg-card px-3 py-2 text-left text-ui-body-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            카카오톡 문의
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </div>
            <button
              type="button"
              ref={compactTriggerRef}
              aria-label="문의 메뉴 열기"
              aria-expanded={panel === "guide"}
              aria-controls="compact-inquiry-panel"
              onClick={() => setPanel((cur) => (cur === "guide" ? null : "guide"))}
              className="flex h-11 w-11 items-center justify-center gap-2 rounded-full bg-primary p-0 text-ui-body-sm font-semibold text-primary-foreground shadow-float hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bp-sm:h-auto bp-sm:w-auto bp-sm:px-4"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="sr-only bp-sm:not-sr-only bp-sm:inline">문의</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
