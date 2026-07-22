import { Button } from "@/components/ui/button";
import Link from "next/link";

type Props = {
  primaryHref: string;
  primaryLabel: string;
};

export default function RacketCareFinalCta({ primaryHref, primaryLabel }: Props) {
  return (
    <section className="rounded-hero border border-border bg-brand-highlight-muted p-5 bp-sm:p-8 bp-lg:p-12">
      <div className="grid gap-6 bp-lg:grid-cols-[1fr_auto] bp-lg:items-end">
        <div>
          <p className="text-ui-kicker text-brand-highlight-ink">START YOUR RACKET CARE</p>
          <h2 className="mt-4 break-keep font-ui-bold text-ui-section-title bp-lg:text-[3.5rem] bp-lg:leading-none">
            라켓 관리를 기록이 아닌
            <br />
            하나의 흐름으로 바꿔보세요.
          </h2>
          <p className="mt-4 max-w-2xl break-keep text-ui-body-sm text-muted-foreground">
            등록부터 상태 확인, 맞춤 추천과 다음 교체 신청까지 라켓 케어에서 이어집니다.
          </p>
        </div>
        <div className="grid gap-2 bp-sm:flex bp-sm:flex-wrap">
          <Button asChild variant="highlight" wrap="responsive">
            <Link href={primaryHref}>{primaryLabel}</Link>
          </Button>
          <Button asChild variant="outline" wrap="responsive">
            <Link href="/services">교체서비스 알아보기</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
