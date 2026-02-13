import type React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Toaster } from '@/components/ui/sonner';
import Script from 'next/script';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { AuthHydrator } from '@/app/providers/AuthHydrator';
import GlobalTokenGuard from '@/components/system/GlobalTokenGuard';
import TokenRefresher from '@/components/system/TokenRefresher';
import SessionWatcher from '@/components/system/SessionWatcher';
import ClaimsAutoLinker from '@/components/system/ClaimsAutoLinker';
import AppShell from '@/components/layout/AppShell';
import KakaoInquiryWidget from '@/components/system/KakaoInquiryWidget';
import ScrollLockCompensator from '@/components/system/ScrollLockCompensator';
import ScrollLockKeepScrollbar from '@/components/system/ScrollLockKeepScrollbar';
import 'spoqa-han-sans/css/SpoqaHanSansNeo.css';

export const metadata: Metadata = {
  title: '도깨비 테니스 아카데미',
  description: '테니스 스트링 및 장비 전문 쇼핑몰',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const token = (await cookies()).get('accessToken')?.value;

  let initialUser: any = null;
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      if (payload?.sub) {
        const db = await getDb();
        const doc = await db.collection('users').findOne({ _id: new ObjectId(payload.sub) });
        if (doc) {
          initialUser = {
            id: doc._id.toString(),
            name: doc.name ?? null,
            email: doc.email,
            role: doc.role ?? 'user',
            image: doc.image ?? null,
          };
        }
      }
    } catch {
      // 토큰 오류는 초기유저 null
    }
  }
  // throw new Error('[TEST] app/global error.tsx 동작 확인용');
  return (
    <html lang="ko" suppressHydrationWarning className="scroll-smooth overflow-x-hidden">
      <body className="bg-background text-foreground">
        <Script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="beforeInteractive" />
        {/* Kakao JavaScript SDK (채널 1:1 문의용) */}
        <Script id="kakao-jssdk" src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.9/kakao.min.js" strategy="afterInteractive" crossOrigin="anonymous" />
        <AuthHydrator initialUser={initialUser} />
        <GlobalTokenGuard />
        <TokenRefresher />
        <SessionWatcher />
        <ClaimsAutoLinker />
        <ScrollLockCompensator />
        <ScrollLockKeepScrollbar />
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
