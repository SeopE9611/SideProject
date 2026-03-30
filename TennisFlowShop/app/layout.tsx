import { AuthHydrator } from "@/app/providers/AuthHydrator";
import Footer from "@/components/footer";
import Header from "@/components/header";
import AppShell from "@/components/layout/AppShell";
import ClaimsAutoLinker from "@/components/system/ClaimsAutoLinker";
import GlobalTokenGuard from "@/components/system/GlobalTokenGuard";
import KakaoInquiryWidget from "@/components/system/KakaoInquiryWidget";
import RootScrollLockBridge from "@/components/system/RootScrollLockBridge";
import ScrollToTopOnPathChange from "@/components/system/ScrollToTopOnPathChange";
import SessionWatcher from "@/components/system/SessionWatcher";
import TokenRefresher from "@/components/system/TokenRefresher";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { verifyAccessToken } from "@/lib/auth.utils";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import type React from "react";
import "spoqa-han-sans/css/SpoqaHanSansNeo.css";
import "./globals.css";

declare global {
  interface Window {
    __resumeDebugMounted?: boolean;
    __resumeDebug?: {
      lastVisibilityChangeAt: number | null;
      lastHiddenAt: number | null;
      lastVisibleAt: number | null;
      lastPageShowAt: number | null;
      lastOnlineAt: number | null;
      online: boolean | null;
    };
  }
}

export const metadata: Metadata = {
  title: "상호명 미정",
  description: "테니스 스트링 및 장비 전문 쇼핑몰",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const token = (await cookies()).get("accessToken")?.value;

  let initialUser: any = null;
  if (token) {
    const payload = verifyAccessToken(token);
    if (payload?.sub) {
      // 루트 layout은 모든 페이지 전환의 공통 경로이므로,
      // 여기서 매번 DB users.findOne()까지 수행하면 전환 체감이 느려질 수 있다.
      // 따라서 이번 단계에서는 토큰 payload 기반 "최소 initialUser"만 주입하고,
      // 상세 사용자 동기화는 기존 bootstrap(/api/users/me → refresh 재시도) 흐름에 맡긴다.
      initialUser = {
        id: String(payload.sub),
        name: typeof payload.name === "string" ? payload.name : null,
        email: typeof payload.email === "string" ? payload.email : null,
        role: typeof payload.role === "string" ? payload.role : "user",
        image: null,
      };
    }
  }
  // throw new Error('[TEST] app/global error.tsx 동작 확인용');
  return (
    <html lang="ko" suppressHydrationWarning className="scroll-smooth overflow-x-hidden">
      <body className="bg-background text-foreground">
        {/* Kakao JavaScript SDK (채널 1:1 문의용) */}
        <Script id="kakao-jssdk" src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.9/kakao.min.js" strategy="afterInteractive" crossOrigin="anonymous" />
        <Script
          id="resume-debug-listeners"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(() => {
  if (typeof window === 'undefined') return;
  if (window.__resumeDebugMounted) return;

  window.__resumeDebugMounted = true;

  const state = {
    lastVisibilityChangeAt: null,
    lastHiddenAt: null,
    lastVisibleAt: null,
    lastPageShowAt: null,
    lastOnlineAt: null,
    online: typeof navigator === 'undefined' ? null : navigator.onLine,
  };

  window.__resumeDebug = state;

  const now = () => Date.now();

  const onVisibilityChange = () => {
    const ts = now();
    state.lastVisibilityChangeAt = ts;
    state.online = typeof navigator === 'undefined' ? state.online : navigator.onLine;
    if (document.visibilityState === 'hidden') {
      state.lastHiddenAt = ts;
    }
    if (document.visibilityState === 'visible') {
      state.lastVisibleAt = ts;
    }
  };

  const onPageShow = () => {
    state.lastPageShowAt = now();
    state.online = typeof navigator === 'undefined' ? state.online : navigator.onLine;
  };

  const onOnline = () => {
    state.lastOnlineAt = now();
    state.online = true;
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pageshow', onPageShow);
  window.addEventListener('online', onOnline);

  window.addEventListener('pagehide', () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pageshow', onPageShow);
    window.removeEventListener('online', onOnline);
    window.__resumeDebugMounted = false;
  }, { once: true });
})();`,
          }}
        />
        <AuthHydrator initialUser={initialUser} />
        <GlobalTokenGuard />
        <TokenRefresher />
        <SessionWatcher />
        <ClaimsAutoLinker />
        <RootScrollLockBridge />
        <ScrollToTopOnPathChange />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <div className="flex min-h-screen flex-col">
            <Header />

            {/* SideMenu + 좌측패딩은 AppShell이 경로별로 처리 */}
            <AppShell>{children}</AppShell>

            {/* 우측 하단 카카오 문의 위젯(관리자 페이지는 자동 숨김) */}
            <KakaoInquiryWidget />

            <Footer />
          </div>

          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
