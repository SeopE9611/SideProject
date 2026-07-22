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
  nextActionTitle?: ReactNode;
  nextActionDescription?: ReactNode;
  nextActionSlot?: ReactNode;
  summary?: ReactNode;
  className?: string;
  variant?: "default" | "feature";
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
  variant = "default",
}: MypageDetailHeroProps) {
  const hasNextAction =
    Boolean(nextActionTitle) || Boolean(nextActionDescription) || Boolean(nextActionSlot);

  const isFeature = variant === "feature";

  return (
    <section
      className={cn(
        mypageDetailLayout.heroSection,
        isFeature && "border-brand-highlight-ink/25 bg-brand-highlight-muted/40 shadow-none",
        className,
      )}
    >
      <div className="flex flex-col gap-4 bp-lg:flex-row bp-lg:items-start bp-lg:justify-between">
        <div className="min-w-0 space-y-1">
          <div
            className={cn(
              "text-ui-label font-medium text-primary",
              isFeature && "text-brand-highlight-ink",
            )}
          >
            {eyebrow}
          </div>
          <h2
            className={cn(
              "break-keep text-ui-card-title-lg text-foreground bp-sm:text-ui-section-title",
              isFeature ? "font-ui-bold tracking-normal" : "font-ui-medium",
            )}
          >
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

      <div
        className={cn(
          mypageDetailLayout.heroShell,
          isFeature &&
            "border border-brand-highlight-ink/20 bg-background/75 ring-brand-highlight-ink/15",
        )}
      >
        <div className={cn(mypageDetailLayout.heroGrid, !hasNextAction && "bp-lg:grid-cols-1")}>
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={cn(
                "shrink-0 rounded-xl bg-primary/10 p-2.5 ring-1 ring-primary/10",
                isFeature &&
                  "bg-brand-highlight-muted text-brand-highlight-ink ring-brand-highlight-ink/20",
              )}
            >
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

          {hasNextAction ? (
            <div
              className={cn(
                mypageDetailLayout.actionPanel,
                isFeature && "border-brand-highlight-ink/25 bg-brand-highlight-muted/55",
              )}
            >
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-ui-label font-medium text-primary",
                    isFeature && "text-brand-highlight-ink",
                  )}
                >
                  다음 할 일
                </p>

                {nextActionTitle ? (
                  <div className="mt-1 break-keep text-ui-body-sm font-medium text-foreground">
                    {nextActionTitle}
                  </div>
                ) : null}

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
          ) : null}
        </div>

        {summary ? <div className={mypageDetailLayout.summaryGrid}>{summary}</div> : null}
      </div>
    </section>
  );
}
