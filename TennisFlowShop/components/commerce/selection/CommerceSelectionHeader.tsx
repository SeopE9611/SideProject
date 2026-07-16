import { Check, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type SelectionStep = {
  id: string;
  label: string;
  shortLabel: string;
  status: "complete" | "current" | "upcoming";
};

type CommerceSelectionHeaderProps = {
  backHref?: string;
  backLabel?: string;
  title: string;
  description: string;
  steps: SelectionStep[];
};

export function CommerceSelectionHeader({
  backHref,
  backLabel = "뒤로 가기",
  title,
  description,
  steps,
}: CommerceSelectionHeaderProps) {
  return (
    <section className="rounded-panel border border-border bg-card p-4 shadow-sm bp-md:p-5">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex max-w-full items-center gap-2 whitespace-nowrap text-ui-body-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 overflow-hidden text-ellipsis">{backLabel}</span>
        </Link>
      )}

      <nav aria-label="진행 단계" className="mt-4">
        <ol className="grid grid-cols-3 gap-2">
          {steps.map((step, index) => {
            const current = step.status === "current";
            const complete = step.status === "complete";
            return (
              <li
                key={step.id}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "min-w-0 rounded-xl border px-2.5 py-2 text-center text-ui-label font-semibold",
                  complete && "border-primary/30 bg-primary/10 text-foreground",
                  current && "border-brand-highlight-ink/40 bg-brand-highlight-muted text-foreground",
                  step.status === "upcoming" && "border-border bg-muted/20 text-muted-foreground",
                )}
              >
                <span className="flex min-w-0 items-center justify-center gap-1.5">
                  {complete ? (
                    <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <span className="shrink-0 tabular-nums">{index + 1}</span>
                  )}
                  <span className="min-w-0 bp-sm:hidden">{step.shortLabel}</span>
                  <span className="hidden min-w-0 bp-sm:inline">{step.label}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-4">
        <h1 className="break-keep text-ui-page-title font-semibold tracking-tight text-foreground bp-md:text-ui-page-title-lg">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl break-keep text-ui-body-sm leading-relaxed text-muted-foreground bp-md:text-ui-body">
          {description}
        </p>
      </div>
    </section>
  );
}
