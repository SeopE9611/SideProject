import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

type Props = {
  primaryHref: string;
  primaryLabel: string;
};

const methods = [
  {
    no: "01",
    title: "기존 정보에서 가져오기",
    copy: "테니스 프로필과 완료된 교체서비스 이력을 불러와 라켓과 최근 스트링 정보를 빠르게 등록합니다.",
    bullets: ["프로필 정보 활용", "완료된 교체 이력 활용", "필요한 정보만 추가 입력"],
  },
  {
    no: "02",
    title: "직접 입력하기",
    copy: "라켓, 최근 스트링, 마지막 교체일과 플레이 빈도를 직접 입력해 관리 기준을 만듭니다.",
    bullets: ["라켓 별칭과 모델", "최근 스트링 정보", "마지막 교체일과 플레이 빈도"],
  },
] as const;

export default function RacketCareMethodsSection({ primaryHref, primaryLabel }: Props) {
  return (
    <section className="space-y-6">
      <div className="grid gap-4 bp-lg:grid-cols-[0.35fr_0.75fr_0.55fr] bp-lg:items-end">
        <div><span className="grid h-10 w-10 place-items-center rounded-full bg-brand-highlight text-brand-highlight-foreground text-ui-label font-semibold">00</span><p className="mt-3 text-ui-kicker text-muted-foreground">EASY START</p></div>
        <h2 className="break-keep font-brand-heading text-ui-section-title bp-lg:text-[3rem] bp-lg:leading-[1.05]">내 기록에 맞는 방법으로<br />빠르게 시작하세요.</h2>
        <p className="break-keep text-ui-body-sm text-muted-foreground">프로필과 완료 이력을 활용하거나 필요한 정보를 직접 입력해 시작할 수 있습니다.</p>
      </div>
      <div className="grid gap-4 bp-md:grid-cols-2">
        {methods.map((method) => (
          <Card key={method.no} variant="feature" className="rounded-panel">
            <CardContent className="p-5 bp-sm:p-6">
              <p className="text-ui-label font-semibold text-brand-highlight">{method.no}</p>
              <h3 className="mt-4 text-ui-card-title-lg font-bold tracking-[-0.01em]">{method.title}</h3>
              <p className="mt-3 break-keep text-ui-body-sm text-muted-foreground">{method.copy}</p>
              <div className="mt-6 grid gap-2">
                {method.bullets.map((bullet) => (
                  <div key={bullet} className="rounded-control border border-border bg-card px-4 py-3 text-ui-body-sm">
                    {bullet}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-col gap-3 rounded-panel border border-border bg-card p-5 shadow-soft bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
        <p className="break-keep text-ui-body-sm text-muted-foreground">실제 라켓 등록과 관리는 내 라켓 관리 화면에서 이용할 수 있습니다.</p>
        <Button asChild variant="highlight" wrap="responsive">
          <Link href={primaryHref}>{primaryLabel}</Link>
        </Button>
      </div>
    </section>
  );
}
