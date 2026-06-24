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
}: SummaryCardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      {(eyebrow || title || description || action) && (
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="min-w-0 space-y-1.5">
            {eyebrow && (
              <div className="text-ui-caption font-medium uppercase tracking-[0.14em] text-primary">
                {eyebrow}
              </div>
            )}

            {title && (
              <h2 className="text-ui-card-title-lg font-semibold text-foreground">
                {title}
              </h2>
            )}

            {description && (
              <div className="text-ui-body-sm text-muted-foreground">
                {description}
              </div>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children && (
        <div className={cn("p-5 sm:p-6", contentClassName)}>{children}</div>
      )}
      {footer && (
        <div className="border-t border-border p-5 sm:p-6">{footer}</div>
      )}
    </section>
  );
}
