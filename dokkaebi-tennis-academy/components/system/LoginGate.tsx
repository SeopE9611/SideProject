'use client';

import Link from 'next/link';
import { LogIn, Ticket, Shield, Star, ShoppingCart, Truck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export type LoginGateVariant = 'packages' | 'checkout' | 'orderLookup' | 'default';

type Perk = {
  icon: React.ReactNode;
  text: string;
};

function variantCopy(variant: LoginGateVariant) {
  if (variant === 'packages') {
    return {
      minHeight: 'min-h-[60vh]',
      description: (
        <>
          패키지 상품은 <span className="font-medium">회원 전용 서비스</span>입니다.
        </>
      ),
      perks: [
        { icon: <Ticket className="h-4 w-4 text-indigo-600" />, text: '패키지 잔여 횟수 관리' },
        { icon: <Shield className="h-4 w-4 text-emerald-600" />, text: '안전한 주문 조회' },
        { icon: <Star className="h-4 w-4 text-amber-600" />, text: '멤버 전용 혜택' },
      ] satisfies Perk[],
      secondary: { href: '/services/packages', label: '패키지 둘러보기' },
    };
  }

  if (variant === 'checkout') {
    return {
      minHeight: 'min-h-[100svh]',
      description: <>주문을 진행하려면 로그인 후 다시 시도해주세요.</>,
      perks: [
        { icon: <ShoppingCart className="h-4 w-4 text-indigo-600" />, text: '주문/구매 내역 관리' },
        { icon: <Truck className="h-4 w-4 text-sky-600" />, text: '배송/수령 상태 확인' },
        { icon: <Shield className="h-4 w-4 text-emerald-600" />, text: '안전한 결제/보안' },
      ] satisfies Perk[],
      secondary: { href: '/cart', label: '장바구니로' },
    };
  }

  if (variant === 'orderLookup') {
    return {
      minHeight: 'min-h-[60vh]',
      description: (
        <>
          현재 <span className="font-medium">비회원 주문 조회</span>는 중단되었습니다.
          <br />
          로그인 후 <span className="font-medium">마이페이지</span>에서 주문내역을 확인해주세요.
        </>
      ),
      perks: [
        { icon: <ShoppingCart className="h-4 w-4 text-indigo-600" />, text: '주문/구매 내역 확인' },
        { icon: <Truck className="h-4 w-4 text-sky-600" />, text: '배송/수령 상태 확인' },
        { icon: <Shield className="h-4 w-4 text-emerald-600" />, text: '보안 인증 기반 조회' },
      ] satisfies Perk[],
      secondary: { href: '/', label: '홈으로' },
    };
  }

  return {
    minHeight: 'min-h-[60vh]',
    description: <>해당 기능을 이용하려면 로그인 해주세요.</>,
    perks: [
      { icon: <Shield className="h-4 w-4 text-emerald-600" />, text: '안전한 계정 보호' },
      { icon: <Star className="h-4 w-4 text-amber-600" />, text: '멤버 전용 혜택' },
      { icon: <Ticket className="h-4 w-4 text-indigo-600" />, text: '회원 전용 서비스' },
    ] satisfies Perk[],
    secondary: { href: '/', label: '홈으로' },
  };
}

export default function LoginGate({ next, variant = 'default' }: { next: string; variant?: LoginGateVariant }) {
  const v = variantCopy(variant);
  const loginHref = `/login?redirectTo=${encodeURIComponent(next)}`;

  return (
    <div className={`${v.minHeight} bg-gradient-to-br from-slate-50 via-blue-50/40 to-purple-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900`}>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <Card className="relative overflow-hidden border-0 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] backdrop-blur-sm bg-white/90 dark:bg-slate-800/85">
            {/* top gradient bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500" />

            <CardContent className="p-8">
              {/* Icon bubble */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-content-center shadow-lg mb-6">
                <LogIn className="h-7 w-7" />
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
                <span className="text-blue-600">로그인</span>이 필요합니다.
              </h1>
              <p className="text-slate-600 dark:text-slate-300">{v.description}</p>

              {/* perks chips – 테두리 대신 아주 옅은 ring만 */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {v.perks.map((p) => (
                  <div key={p.text} className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-700/70">
                    {p.icon}
                    <span className="text-sm">{p.text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <Badge className="bg-blue-600/10 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-300/40">로그인 후 원래 페이지로 자동 복귀</Badge>
              </div>
            </CardContent>

            <CardFooter className="px-8 pb-8">
              <div className="flex flex-wrap gap-3">
                <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <Link href={loginHref}>로그인하고 계속하기</Link>
                </Button>
                <Button asChild variant="outline" className="border-slate-200 dark:border-slate-700">
                  <Link href={v.secondary.href}>{v.secondary.label}</Link>
                </Button>
              </div>
            </CardFooter>

            {/* soft glows */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-44 w-44 rounded-full bg-blue-400/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-purple-400/25 blur-3xl" />
          </Card>
        </div>
      </div>
    </div>
  );
}
