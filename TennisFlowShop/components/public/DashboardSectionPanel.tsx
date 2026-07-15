import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type DashboardSectionPanelProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: "default" | "feature";
};

export function DashboardSectionPanel({
  icon,
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  variant = "default",
}: DashboardSectionPanelProps) {
  const titleId = useId();

  return (
    <section
      className={cn(
        "overflow-hidden rounded-panel border border-border/80 bg-card text-card-foreground shadow-soft",
        className,
      )}
      aria-labelledby={titleId}
    >
      <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-4 py-3 bp-sm:px-5 bp-sm:py-4 bp-md:flex-row bp-md:items-start bp-md:justify-between bp-lg:px-6">
        <div className="flex min-w-0 items-start gap-3">
          {icon ? (
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-border bg-muted text-muted-foreground",
                variant === "feature" && "border-brand-highlight/30 bg-brand-highlight-muted text-brand-highlight",
              )}
              aria-hidden="true"
            >
              {icon}
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className={cn(
                "text-ui-body font-semibold text-foreground bp-sm:text-ui-card-title-lg",
                variant === "feature" && "font-brand-heading tracking-[-0.015em]",
              )}
            >
              {title}
            </h2>
            {description ? (
              <div className="mt-0.5 text-ui-label text-muted-foreground bp-sm:text-ui-body-sm">
                {description}
              </div>
            ) : null}
          </div>
        </div>

        {action ? (
          <div className="flex w-full shrink-0 flex-wrap gap-2 bp-md:w-auto">{action}</div>
        ) : null}
      </div>

      <div className={cn("p-3 bp-sm:p-5 bp-lg:p-6", contentClassName)}>{children}</div>
    </section>
  );
}
