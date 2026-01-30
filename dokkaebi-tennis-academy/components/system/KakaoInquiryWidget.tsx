'use client';

import { useEffect, useState } from 'react';
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
    <div className="fixed bottom-5 right-5 z-[70] bp-sm:bottom-4 bp-sm:right-4">
      <div className="flex flex-col items-end gap-3">
        {/* ---------------- 버그 제보 ---------------- */}
        {canShowBug ? (
          <div className="relative">
            <div className={['absolute right-0 bottom-[76px]', 'transition-all duration-150', panel === 'bug' ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'].join(' ')}>
              <Card
                className={[
                  'relative w-[320px] shadow-xl',
                  'border border-gray-200',
                  "before:content-[''] before:absolute before:-bottom-2 before:right-7",
                  'before:h-4 before:w-4 before:rotate-45',
                  'before:bg-white before:border-b before:border-r before:border-gray-200', // 화살표 테두리
                ].join(' ')}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold">버그 제보</CardTitle>
                  <button type="button" aria-label="닫기" className="rounded-md p-1 text-muted-foreground hover:bg-muted" onClick={() => setPanel(null)}>
                    <X className="h-4 w-4" />
                  </button>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">사이트 이용 중 문제가 생겼거나 버그를 발견하셨나요? 아래 오픈채팅으로 제보해주시면 빠르게 확인할게요.</p>

                  <div className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
                    <div className="font-medium text-foreground">제보 시 함께 적어주면 좋아요</div>
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      <li>어떤 페이지/기능에서 발생했는지</li>
                      <li>재현 절차(무슨 버튼을 눌렀는지)</li>
                      <li>기대 결과 vs 실제 결과 + 스크린샷</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={openBugChat}
                    className={['w-full rounded-md py-3 text-sm font-semibold', 'bg-[#FEE500] text-[#191919]', 'hover:bg-[#FDDC00]', 'focus:outline-none focus:ring-2 focus:ring-[#FEE500]/60 focus:ring-offset-2'].join(' ')}
                  >
                    오픈채팅으로 제보하기
                  </button>
                </CardContent>
              </Card>
            </div>

            <button
              type="button"
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
              <Card
                className={[
                  'relative w-[320px] shadow-xl',
                  'border border-gray-200',
                  "before:content-[''] before:absolute before:-bottom-2 before:right-7",
                  'before:h-4 before:w-4 before:rotate-45',
                  'before:bg-white before:border-b before:border-r before:border-gray-200', // 화살표 테두리
                ].join(' ')}
              >
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
            </div>

            <button
              type="button"
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
