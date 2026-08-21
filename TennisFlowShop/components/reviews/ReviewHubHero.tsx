import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const trustItems = [
  "구매·이용 확인",
  "대상별 1회 작성",
  "사진 최대 5장",
];

export default function ReviewHubHero() {
  return (
    <Card variant="feature" className="overflow-hidden rounded-hero">
      <CardContent className="grid gap-7 p-5 bp-sm:p-8 bp-lg:grid-cols-[1.08fr_0.92fr] bp-lg:items-center bp-lg:p-10">
        <div className="min-w-0">
          <h1 className="break-keep font-ui-bold text-ui-section-title bp-lg:text-[3.25rem] bp-lg:leading-[1.05]">
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
              <Link href="/mypage?tab=reviews">내 후기 관리</Link>
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-control border border-border bg-card">
          <div className="divide-y divide-border">
            {trustItems.map((label) => (
              <div
                key={label}
                className="px-4 py-3 text-ui-body-sm font-semibold text-foreground"
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
