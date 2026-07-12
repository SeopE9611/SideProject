import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Camera, ShieldCheck } from "lucide-react";

const trustItems = [
  { label: "구매·이용 확인", icon: ShieldCheck },
  { label: "대상별 1회 작성", icon: CheckCircle2 },
  { label: "사진 최대 5장", icon: Camera },
];

export default function ReviewHubHero() {
  return (
    <Card variant="feature" className="overflow-hidden rounded-hero">
      <CardContent className="grid gap-7 p-5 bp-sm:p-8 bp-lg:grid-cols-[1.08fr_0.92fr] bp-lg:items-center bp-lg:p-10">
        <div className="min-w-0">
          <Badge variant="signal" className="w-fit">VERIFIED REVIEW</Badge>
          <h1 className="mt-5 break-keep font-brand-heading text-ui-section-title font-bold tracking-[-0.01em] bp-lg:text-[3.25rem] bp-lg:leading-[1.05]">
            실제 플레이에서 나온 후기
          </h1>
          <p className="mt-4 max-w-2xl break-keep text-ui-body text-muted-foreground">
            구매·대여·교체서비스를 완료한 고객의 실제 사용 경험을 한곳에서 확인하세요.
          </p>
          <div className="mt-6 grid gap-2 bp-sm:flex bp-sm:flex-wrap">
            <Button asChild variant="highlight" wrap="responsive" className="min-h-11">
              <Link href="/mypage?tab=orders&scope=todo">작성 가능한 후기 확인</Link>
            </Button>
            <Button asChild variant="outline" wrap="responsive" className="min-h-11">
              <Link href="/reviews/write">후기 작성 기준</Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-3">
          <p className="text-ui-kicker text-muted-foreground">VERIFIED PLAY LOG</p>
          <div className="grid gap-3 bp-sm:grid-cols-3 bp-lg:grid-cols-1">
            {trustItems.map(({ label, icon: Icon }) => (
              <div key={label} className="flex min-h-16 items-center gap-3 rounded-control border border-border bg-card p-4 shadow-sm">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-highlight-muted text-brand-highlight-foreground dark:text-brand-highlight">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="break-keep text-ui-body-sm font-semibold text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
