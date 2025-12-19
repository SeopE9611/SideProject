'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  href: string; // /services/apply?orderId=... (+productId, mountingFee 등)
  orderId: string; 
  seconds?: number;
};

export default function CheckoutApplyHandoffClient({ href, orderId, seconds = 8 }: Props) {
  const router = useRouter();
  const [remain, setRemain] = useState(seconds);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    // 자동 이동을 사용자가 취소했으면 아무것도 하지 않음
    if (cancelled) return;

    // 0초가 되면 즉시 이동
    if (remain <= 0) {
      router.push(href);
      return;
    }

    // 1초마다 카운트다운
    const t = window.setTimeout(() => setRemain((r) => r - 1), 1000);
    return () => window.clearTimeout(t);
  }, [remain, cancelled, href, router]);

  return (
    <div className="max-w-xl mx-auto">
      <Card className="border-slate-200/60 dark:border-slate-800/60">
        <CardHeader>
          <CardTitle className="text-lg">주문에 성공했습니다</CardTitle>
          <CardDescription>라켓/스트링 주문이 완료되어, 이제 교체 서비스 신청서 작성 단계로 넘어갑니다.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">주문 ID</span>
              <span className="font-medium">{orderId}</span>
            </div>
          </div>

          {!cancelled ? (
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                <b>{remain}초</b> 후 신청서 페이지로 자동 이동합니다. (안정성을 위해 페이지를 벗어나지 마세요)
              </span>
            </div>
          ) : (
            <div className="text-sm text-slate-700 dark:text-slate-300">자동 이동이 취소되었습니다. 아래 버튼으로 원할 때 이동할 수 있어요.</div>
          )}

          <div className="text-xs text-slate-500">페이지를 벗어나더라도, 주문 기반으로 언제든지 신청서를 이어서 작성할 수 있습니다. (마이페이지/주문내역에서 주문을 다시 열고 “신청서 작성”으로 진입)</div>
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button className="w-full" onClick={() => router.push(href)}>
            지금 신청서 작성하기 <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          {!cancelled ? (
            <Button variant="outline" onClick={() => setCancelled(true)}>
              자동 이동 취소
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link href={`/checkout/success?orderId=${orderId}`}>성공페이지 유지</Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
