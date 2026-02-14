'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bug, MessageCircle, X } from 'lucide-react';

declare global {
  interface Window {
    Kakao?: any;
  }
}

function normalizeChannelPublicId(raw: string) {
  // 실수 방지:
  // - "_uxjpH" (정상)
  // - "https://pf.kakao.com/_uxjpH" (전체 URL 넣는 실수)
  // - "https://pf.kakao.com/_uxjpH/chat" (chat까지 넣는 실수)
  let id = raw.trim();
  id = id.replace(/^https?:\/\/pf\.kakao\.com\//, '');
  id = id.replace(/\/chat.*$/i, '');
  id = id.replace(/\/+$/, '');
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
  // 어떤 패널이 열려있는지(중복 오픈 방지)
  const [panel, setPanel] = useState<'inquiry' | 'bug' | null>(null);

  // outside click 닫기용 ref
  const bugTriggerRef = useRef<HTMLButtonElement | null>(null);
  const inquiryTriggerRef = useRef<HTMLButtonElement | null>(null);
  const bugPanelRef = useRef<HTMLDivElement | null>(null);
  const inquiryPanelRef = useRef<HTMLDivElement | null>(null);

  // 하단 고정 바(모바일 CTA 등)와 겹치지 않도록 위로 올리는 픽셀
  const [liftPx, setLiftPx] = useState(0);

  // 클라이언트 노출 가능한 env만 사용 (NEXT_PUBLIC_*)
  const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? '';
  const rawChannelPublicId = process.env.NEXT_PUBLIC_KAKAO_CHANNEL_PUBLIC_ID ?? '';
  const channelPublicId = normalizeChannelPublicId(rawChannelPublicId);

  // 버그 제보: 카카오 오픈채팅 URL (예: https://open.kakao.com/o/xxxx)
  const bugOpenChatUrl = (process.env.NEXT_PUBLIC_KAKAO_BUG_OPENCHAT_URL ?? '').trim();

  // 훅 개수 불일치 방지 - "숨김 여부"는 계산만 하고, return은 마지막에만 처리
  const hideAll = pathname?.startsWith('/admin');
  const canShowInquiry = !!jsKey && !!channelPublicId;
  const canShowBug = !!bugOpenChatUrl;

  // 둘 다 없으면 위젯을 아예 숨김
  const shouldHide = hideAll || (!canShowInquiry && !canShowBug);

  useEffect(() => {
    // 숨김 상태로 전환되면 패널은 닫아줌(UX + 상태 정리)
    if (shouldHide) {
      setPanel(null);
      return;
    }

    // 문의 위젯이 비활성화되면
    // - 문의 패널은 자동 닫기
    // - Kakao SDK init도 불필요하므로 여기서 종료
    if (!canShowInquiry) {
      if (panel === 'inquiry') setPanel(null);
      return;
    }

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
  }, [jsKey, shouldHide, canShowInquiry, panel]);

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
      if (marked.length) return marked;
      // (예비) 혹시 마킹을 빠뜨린 경우를 대비한 fallback
      return Array.from(document.querySelectorAll<HTMLElement>('.fixed.inset-x-0.bottom-0'));
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const targets = pickTargets();

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
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      mo.disconnect();
      ro?.disconnect();
    };
  }, [shouldHide, pathname]);

  // X 안 눌러도: 패널 바깥 클릭 시 닫기
  useEffect(() => {
    if (!panel) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      const activePanelEl = panel === 'bug' ? bugPanelRef.current : inquiryPanelRef.current;
      const activeTriggerEl = panel === 'bug' ? bugTriggerRef.current : inquiryTriggerRef.current;

      // 패널 내부 클릭 or 트리거 버튼 클릭이면 유지
      if (activePanelEl?.contains(target)) return;
      if (activeTriggerEl?.contains(target)) return;

      // 그 외(바깥 클릭)면 닫기
      setPanel(null);
    };

    // 캡처 단계로 잡으면(= true) 다른 UI 핸들러보다 먼저 안정적으로 닫힘 처리 가능
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
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
    window.open(`https://pf.kakao.com/${channelPublicId}/chat`, '_blank', 'noopener,noreferrer');
    setPanel(null);
  };

  const openBugChat = () => {
    // 오픈채팅 URL은 SDK 없이 새 탭으로 이동
    window.open(bugOpenChatUrl, '_blank', 'noopener,noreferrer');
    setPanel(null);
  };

  if (shouldHide) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[70] bp-sm:bottom-4 bp-sm:right-4" style={liftPx ? { transform: `translateY(-${liftPx}px)` } : undefined}>
      <div className="flex flex-col items-end gap-3">
        {/* ---------------- 버그 제보 ---------------- */}
        {canShowBug ? (
          <div className="relative">
            <div className={['absolute right-0 bottom-[76px]', 'transition-all duration-150', panel === 'bug' ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'].join(' ')}>
              <div ref={bugPanelRef} className="relative">
                <Card
                  className={[
                    'relative w-[320px] shadow-xl',
                    // 다크/라이트 공통 테마 토큰
                    'border-border',
                  ].join(' ')}
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold">버그 제보</CardTitle>
                    <button type="button" aria-label="닫기" className="rounded-md p-1 text-muted-foreground hover:bg-muted" onClick={() => setPanel(null)}>
                      <X className="h-4 w-4" />
                    </button>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">사이트 이용 중 문제가 생겼거나 버그를 발견하셨나요? 아래 개발자의 오픈채팅으로 제보해주시면 빠르게 확인할게요.</p>

                    <div className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
                      <div className="font-medium text-foreground">제보 시 함께 적어주면 좋아요</div>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                        <li>어떤 페이지/기능에서 발생했는지</li>
                        <li>재현 절차(무슨 버튼을 눌렀는지)</li>
                        <li>스크린샷</li>
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={openBugChat}
                      className={['w-full rounded-md py-3 text-sm font-semibold', 'bg-[#FEE500] text-[#191919]', 'hover:bg-[#FDDC00]', 'focus:outline-none focus:ring-2 focus:ring-[#FEE500]/60 focus:ring-offset-2'].join(' ')}
                    >
                      개발자에게 제보하기
                    </button>
                  </CardContent>
                </Card>

                {/* 말풍선 꼬리 */}
                <svg aria-hidden="true" viewBox="0 0 24 12" className="absolute -bottom-3 right-7 h-3 w-6 [fill:hsl(var(--card))] [stroke:hsl(var(--border))]">
                  <path d="M1 1H23L12 11Z" strokeWidth="1" />
                </svg>
              </div>
            </div>

            <button
              type="button"
              ref={bugTriggerRef}
              aria-label="버그 제보"
              onClick={() => setPanel((cur) => (cur === 'bug' ? null : 'bug'))}
              className={['h-14 w-14 rounded-full shadow-xl', 'bg-[#FEE500] text-[#191919]', 'hover:bg-[#FDDC00]', 'focus:outline-none focus:ring-2 focus:ring-[#FEE500]/60 focus:ring-offset-2', 'flex items-center justify-center'].join(' ')}
            >
              <Bug className="h-7 w-7" />
            </button>
          </div>
        ) : null}

        {/* ---------------- 카카오 문의 ---------------- */}
        {canShowInquiry ? (
          <div className="relative">
            <div className={['absolute right-0 bottom-[76px]', 'transition-all duration-150', panel === 'inquiry' ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'].join(' ')}>
              <div ref={inquiryPanelRef} className="relative">
                <Card className={['relative w-[320px] shadow-xl', 'border-border'].join(' ')}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold">
                      문의하기 <span className="ml-1 text-xs font-normal text-muted-foreground">(카카오톡 1:1)</span>
                    </CardTitle>
                    <button type="button" aria-label="닫기" className="rounded-md p-1 text-muted-foreground hover:bg-muted" onClick={() => setPanel(null)}>
                      <X className="h-4 w-4" />
                    </button>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">카카오톡 채널로 1:1 문의를 남겨주세요. 운영시간 외에는 답변이 늦을 수 있어요.</p>

                    <button
                      type="button"
                      onClick={openKakaoChat}
                      className={['w-full rounded-md py-3 text-sm font-semibold', 'bg-[#FEE500] text-[#191919]', 'hover:bg-[#FDDC00]', 'focus:outline-none focus:ring-2 focus:ring-[#FEE500]/60 focus:ring-offset-2'].join(' ')}
                    >
                      카카오톡으로 문의하기
                    </button>
                  </CardContent>
                </Card>

                {/* 말풍선 꼬리 */}
                <svg aria-hidden="true" viewBox="0 0 24 12" className="absolute -bottom-3 right-7 h-3 w-6 [fill:hsl(var(--card))] [stroke:hsl(var(--border))]">
                  <path d="M1 1H23L12 11Z" strokeWidth="1" />
                </svg>
              </div>
            </div>

            <button
              type="button"
              ref={inquiryTriggerRef}
              aria-label="카카오톡 문의"
              onClick={() => setPanel((cur) => (cur === 'inquiry' ? null : 'inquiry'))}
              className={['h-14 w-14 rounded-full shadow-xl', 'bg-[#FEE500] text-[#191919]', 'hover:bg-[#FDDC00]', 'focus:outline-none focus:ring-2 focus:ring-[#FEE500]/60 focus:ring-offset-2', 'flex items-center justify-center'].join(' ')}
            >
              <MessageCircle className="h-7 w-7" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
