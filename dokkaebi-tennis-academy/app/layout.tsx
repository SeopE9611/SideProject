import type React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
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
import SideMenu from '@/components/nav/SideMenu';
import SiteContainer from '@/components/layout/SiteContainer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '도깨비 테니스 아카데미',
  description: '테니스 스트링 및 장비 전문 쇼핑몰',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // 쿠키에서 토큰 읽기
  const token = (await cookies()).get('accessToken')?.value;

  // 토큰 검증 -> DB조회 -> 초기 유저 만들기
  let initialUser: any = null;
  if (token) {
    try {
      const payload = verifyAccessToken(token); // { sub, ... }
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
      // 토큰 오류는 초기유저 null로 둠
    }
  }
  return (
    <html lang="ko" suppressHydrationWarning className="scroll-smooth">
      <body className={`${inter.className} bg-background text-foreground overflow-x-hidden`}>
        <Script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="beforeInteractive" />
        {/* 초기 유저를 클라 스토어로 밀어넣기 */}
        <AuthHydrator initialUser={initialUser} />
        <GlobalTokenGuard />
        <TokenRefresher />
        <SessionWatcher />
        <ClaimsAutoLinker />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {/* 클라이언트에게 accessToken 전달 */}
          <div className="flex min-h-screen flex-col">
            <Header />
            {/* 데스크탑 전용 좌측 사이드 메뉴(고정) */}
            <SideMenu />
            <main id="main" className="flex-1">
              {/* 데스크탑 사이드메뉴 회피 패딩은 “바깥”에서 처리 */}
              <div className="bp-lg:pl-64 bp-lg:pr-8 xl:pl-72 xl:pr-12 2xl:pr-16">{children}</div>
            </main>

            <Footer />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
