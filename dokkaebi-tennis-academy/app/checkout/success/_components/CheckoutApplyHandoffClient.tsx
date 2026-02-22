'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  href: string;
  orderId: string;
  seconds?: number;
};

export default function CheckoutApplyHandoffClient({ href, orderId, seconds = 5 }: Props) {
  const router = useRouter();
  const [remain, setRemain] = useState(seconds);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (cancelled) return;

    if (remain <= 0) {
      router.push(href);
      return;
    }

    const t = window.setTimeout(() => setRemain((r) => r - 1), 1000);
    return () => window.clearTimeout(t);
  }, [remain, cancelled, href, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="text-center pb-4">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent dark:bg-success/10">
                <CheckCircle2 className="h-8 w-8 text-primary dark:text-success" />
              </div>
            </div>
            <CardTitle className="text-3xl font-semibold tracking-tight">주문 완료</CardTitle>
            <CardDescription className="mt-2 text-xl leading-relaxed">
              라켓/스트링 주문이 정상적으로 처리되었습니다.
              <br />
              교체 서비스 신청서 작성을 진행해주세요.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium text-muted-foreground">주문 번호</span>
                <span className="font-mono text-lg font-semibold tracking-wide">{orderId}</span>
              </div>
            </div>

            {!cancelled ? (
              <div className="flex items-start gap-3 rounded-lg bg-accent p-4 dark:bg-primary">
                <div className="flex h-5 w-5 items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-primary dark:text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-base font-medium text-primary dark:text-primary">자동 이동 중</p>
                  <p className="text-base text-primary dark:text-primary">
                    <span className="font-semibold">{remain}초</span> 후 신청서 페이지로 이동합니다
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <p className="text-base text-muted-foreground leading-relaxed">자동 이동이 취소되었습니다. 준비되면 아래 버튼으로 이동해주세요.</p>
              </div>
            )}

            <p className="text-base text-muted-foreground leading-relaxed">주문 내역은 마이페이지에서 언제든지 확인할 수 있으며, 신청서 작성은 나중에 이어서 진행하실 수 있습니다.</p>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button className="w-full h-11 font-medium" onClick={() => router.push(href)}>
              신청서 작성하기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            {!cancelled ? (
              <Button variant="ghost" className="w-full h-10 font-normal" onClick={() => setCancelled(true)}>
                자동 이동 취소
              </Button>
            ) : (
              <Button variant="ghost" className="w-full h-10 font-normal" asChild>
                <Link href={`/checkout/success?orderId=${orderId}`}>주문 완료 페이지로</Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
