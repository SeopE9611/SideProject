import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { mypageDetailLayout } from "./mypage-detail-style";

type MypageDetailHeroProps = {
  title: ReactNode;
  description: ReactNode;
  eyebrow?: ReactNode;
  icon: ReactNode;
  status?: ReactNode;
  statusTitle: ReactNode;
  identifier?: ReactNode;
  actions?: ReactNode;
  nextActionTitle: ReactNode;
  nextActionDescription?: ReactNode;
  nextActionSlot?: ReactNode;
  summary?: ReactNode;
  className?: string;
};

export default function MypageDetailHero({
  title,
  description,
  eyebrow = "마이페이지",
  icon,
  status,
  statusTitle,
  identifier,
  actions,
  nextActionTitle,
  nextActionDescription,
  nextActionSlot,
  summary,
  className,
}: MypageDetailHeroProps) {
  return (
    <section className={cn(mypageDetailLayout.heroSection, className)}>
      <div className="flex flex-col gap-4 bp-lg:flex-row bp-lg:items-start bp-lg:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-ui-label font-medium text-primary">{eyebrow}</p>
          <h2 className="break-keep text-ui-card-title-lg font-medium text-foreground bp-sm:text-ui-section-title">
            {title}
          </h2>
          <p className="break-keep text-ui-body-sm text-muted-foreground">{description}</p>
        </div>

        {actions ? (
          <div className="flex w-full flex-col gap-2 bp-sm:w-auto bp-sm:flex-row bp-sm:flex-wrap bp-lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>

      <div className={mypageDetailLayout.heroShell}>
        <div className={mypageDetailLayout.heroGrid}>
          <div className="flex min-w-0 items-start gap-3">
            <div className="shrink-0 rounded-xl bg-primary/10 p-2.5 ring-1 ring-primary/10">
              {icon}
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                {status}
                <div className="break-keep text-ui-body-sm font-medium text-foreground">
                  {statusTitle}
                </div>
              </div>

              {identifier ? (
                <p className="break-all text-ui-body-sm text-muted-foreground">{identifier}</p>
              ) : null}
            </div>
          </div>

          <div className={mypageDetailLayout.actionPanel}>
            <div className="min-w-0 flex-1">
              <p className="text-ui-label font-medium text-primary">다음 할 일</p>
              <div className="mt-1 break-keep text-ui-body-sm font-medium text-foreground">
                {nextActionTitle}
              </div>
              {nextActionDescription ? (
                <div className="mt-1 break-keep text-ui-label text-muted-foreground">
                  {nextActionDescription}
                </div>
              ) : null}
            </div>

            {nextActionSlot ? (
              <div className="flex flex-col gap-2 bp-sm:flex-row bp-sm:flex-wrap bp-lg:flex-col">
                {nextActionSlot}
              </div>
            ) : null}
          </div>
        </div>

        {summary ? <div className={mypageDetailLayout.summaryGrid}>{summary}</div> : null}
      </div>
    </section>
  );
}
