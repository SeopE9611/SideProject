'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  href?: string; // 이동 대상 링크(없으면 rentalId 기반으로 기본값 생성)
  rentalId: string;
  seconds?: number;
  backHref?: string;
};

export default function RentalApplyHandoffClient({ href, rentalId, seconds = 12, backHref }: Props) {
  const safeHref = typeof href === 'string' && href.length > 0 ? href : `/services/apply?rentalId=${encodeURIComponent(String(rentalId))}`;
  const safeBackHref = typeof backHref === 'string' && backHref.length > 0 ? backHref : `/mypage?tab=rentals&rentalId=${encodeURIComponent(String(rentalId))}`;
  const safeSuccessHref = `/rentals/success?id=${encodeURIComponent(String(rentalId))}`;
  const router = useRouter();
  const [remain, setRemain] = useState(seconds);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (cancelled) return;

    if (remain <= 0) {
      router.replace(safeHref);
      return;
    }

    const t = window.setTimeout(() => setRemain((v) => v - 1), 1000);
    return () => window.clearTimeout(t);
  }, [remain, cancelled, safeHref, router]);

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-start justify-center bg-muted py-10 bp-sm:py-14 px-3">
      <Card className="w-full max-w-lg shadow-sm border-border">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-success/30 bg-success/10 text-success dark:bg-success/15">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl bp-sm:text-3xl">대여 신청 접수 완료</CardTitle>
          <CardDescription className="text-base">
            대여 신청이 정상적으로 접수되었습니다.
            <br />
            교체 서비스 신청서 작성을 진행해주세요.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">대여 번호</div>
            <div className="font-mono text-sm font-semibold">{rentalId}</div>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-primary dark:bg-primary/20">
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">스트링 교체 신청서로 이동 중</div>
                <div className="mt-1 text-xs text-foreground">{cancelled ? <>자동 이동이 취소되었습니다. 준비되면 아래 버튼으로 이동해 주세요.</> : <>준비되면 신청서 페이지로 자동 이동합니다. ({remain}s)</>}</div>
              </div>
              {!cancelled ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button asChild className="w-full" size="lg">
            <Link href={safeHref} className="flex items-center justify-center gap-2">
              신청서 작성하기 <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          {!cancelled ? (
            <Button variant="outline" className="w-full" size="lg" onClick={() => setCancelled(true)}>
              자동 이동 취소
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="w-full" size="lg">
                <Link href={safeSuccessHref}>대여 접수 완료 페이지로</Link>
              </Button>

              {/* 마이페이지(대여 탭)에서 해당 대여 상세로 이동 */}
              <Button asChild variant="ghost" className="w-full" size="lg">
                <Link href={safeBackHref}>대여 상세로 이동</Link>
              </Button>
            </>
          )}

          <p className="text-xs text-muted-foreground text-center">대여 내역은 마이페이지에서 언제든지 확인할 수 있으며, 최종 결제/입금 계좌/요금 요약 등은 신청서 제출 후 성공 페이지에서 안내됩니다.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
