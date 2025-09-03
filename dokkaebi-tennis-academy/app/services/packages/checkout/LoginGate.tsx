'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogIn, Ticket, Shield, Star } from 'lucide-react';

export default function LoginGate({ next }: { next: string }) {
  return (
    <div className="min-h-[60vh] bg-gradient-to-br from-slate-50 via-blue-50/40 to-purple-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
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
              <p className="text-slate-600 dark:text-slate-300">
                패키지 상품은 <span className="font-medium">회원 전용 서비스</span>입니다.
              </p>

              {/* perks chips – 테두리 대신 아주 옅은 ring만 */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-700/70">
                  <Ticket className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm">패키지 잔여 횟수 관리</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-700/70">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm">안전한 주문 조회</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-700/70">
                  <Star className="h-4 w-4 text-amber-600" />
                  <span className="text-sm">멤버 전용 혜택</span>
                </div>
              </div>

              <div className="mt-4">
                <Badge className="bg-blue-600/10 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-300/40">로그인 후 원래 페이지로 자동 복귀</Badge>
              </div>
            </CardContent>

            <CardFooter className="px-8 pb-8">
              <div className="flex flex-wrap gap-3">
                {/* <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <Link href={`/login?next=${encodeURIComponent(next)}`}>로그인하고 계속하기</Link>
                </Button> */}
                <Button asChild variant="outline" className="border-slate-200 dark:border-slate-700">
                  <Link href="/services/packages">패키지 둘러보기</Link>
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
