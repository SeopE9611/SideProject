'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, X } from 'lucide-react';

declare global {
  interface Window {
    Kakao?: any;
  }
}

/**
 * 우측 하단 "문의" 위젯
 * - open: 카드(패널) 토글
 * - "카카오톡으로 문의하기": Kakao.Channel.chat() 호출
 * - Kakao SDK 로딩이 늦을 수 있어 간단 폴링으로 init 보장
 */
export default function KakaoInquiryWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // 클라이언트 노출 가능한 env만 사용 (NEXT_PUBLIC_*)
  const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  const channelPublicId = process.env.NEXT_PUBLIC_KAKAO_CHANNEL_PUBLIC_ID;

  // 관리자 페이지에서는 위젯이 UI를 가리지 않도록 숨김
  if (pathname?.startsWith('/admin')) return null;

  // 키가 없으면 렌더 자체를 하지 않음(배포/로컬 실수 방지)
  if (!jsKey || !channelPublicId) return null;

  useEffect(() => {
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
  }, [jsKey]);

  const openKakaoChat = () => {
    const Kakao = window.Kakao;

    // 1) SDK가 준비되어 있으면 공식 API로 채팅 오픈
    try {
      if (Kakao?.Channel?.chat) {
        Kakao.Channel.chat({ channelPublicId });
        return;
      }
    } catch {
      // ignore
    }

    // 2) fallback: 채널 채팅 URL로 이동(최소 동작 보장)
    window.open(`https://pf.kakao.com/${channelPublicId}/chat`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed bottom-5 right-5 z-[70] bp-sm:bottom-4 bp-sm:right-4">
      {open && (
        <Card className="mb-3 w-[280px] shadow-lg">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">문의하기</CardTitle>
            <button type="button" aria-label="닫기" className="rounded-md p-1 text-muted-foreground hover:bg-muted" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </CardHeader>

          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">카카오톡 채널로 1:1 문의를 남겨주세요. 운영시간 외에는 답변이 늦을 수 있어요.</p>
            <Button className="w-full" onClick={openKakaoChat}>
              카카오톡으로 문의하기
            </Button>
          </CardContent>
        </Card>
      )}

      <Button type="button" size="icon" className="h-12 w-12 rounded-full shadow-lg" aria-label="카카오톡 문의" onClick={() => setOpen((v) => !v)}>
        <MessageCircle className="h-6 w-6" />
      </Button>
    </div>
  );
}
