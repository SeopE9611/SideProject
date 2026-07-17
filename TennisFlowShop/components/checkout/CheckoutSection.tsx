import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type CheckoutSectionProps = {
  id?: string;
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  tone?: "default" | "muted";
};

export default function CheckoutSection({
  id,
  icon,
  title,
  description,
  headerAction,
  children,
  className,
  contentClassName,
  tone = "default",
}: CheckoutSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className={cn(
        "scroll-mt-24 overflow-hidden rounded-panel border border-border/80 bg-card text-card-foreground shadow-soft",
        tone === "muted" && "bg-muted/30",
        className,
      )}
    >
      <div className="border-b border-border/80 bg-muted/20 px-4 py-4 bp-sm:px-5">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <div
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-brand-highlight-muted bg-brand-highlight-muted text-brand-highlight-ink bp-sm:h-10 bp-sm:w-10"
              >
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2
                id={id ? `${id}-title` : undefined}
                className="break-keep text-ui-card-title-lg font-semibold leading-snug text-foreground"
              >
                {title}
              </h2>
              {description && (
                <p className="mt-0.5 break-keep text-ui-label leading-relaxed text-muted-foreground bp-sm:text-ui-body-sm">
                  {description}
                </p>
              )}
            </div>
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      </div>
      <div className={cn("p-4 bp-sm:p-6", contentClassName)}>{children}</div>
    </section>
  );
}
