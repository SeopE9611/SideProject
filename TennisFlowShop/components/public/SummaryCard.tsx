import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SummaryCardProps = {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: "default" | "feature" | "inverse";
};

export function SummaryCard({
  eyebrow,
  title,
  description,
  action,
  footer,
  children,
  className,
  contentClassName,
  variant = "default",
}: SummaryCardProps) {
  const inverse = variant === "inverse";

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card text-card-foreground shadow-sm",
        variant === "feature" && "rounded-panel border-border/80 shadow-soft",
        inverse &&
          "rounded-panel border-surface-inverse-foreground/15 bg-surface-inverse text-surface-inverse-foreground shadow-soft",
        className,
      )}
    >
      {(eyebrow || title || description || action) && (
        <div
          className={cn(
            "flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6",
            inverse && "border-surface-inverse-foreground/15",
          )}
        >
          <div className="min-w-0 space-y-1.5">
            {eyebrow && (
              <div
                className={cn(
                  "text-ui-caption font-ui-medium uppercase tracking-[0.14em] text-primary",
                  inverse && "text-surface-inverse-muted",
                )}
              >
                {eyebrow}
              </div>
            )}

            {title && (
              <h2
                className={cn(
                  "text-ui-card-title-lg font-ui-medium text-foreground",
                  inverse && "text-surface-inverse-foreground",
                )}
              >
                {title}
              </h2>
            )}

            {description && (
              <div
                className={cn(
                  "text-ui-body-sm text-muted-foreground",
                  inverse && "text-surface-inverse-muted",
                )}
              >
                {description}
              </div>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children && <div className={cn("p-5 sm:p-6", contentClassName)}>{children}</div>}
      {footer && (
        <div
          className={cn(
            "border-t border-border p-5 sm:p-6",
            inverse && "border-surface-inverse-foreground/15",
          )}
        >
          {footer}
        </div>
      )}
    </section>
  );
}
