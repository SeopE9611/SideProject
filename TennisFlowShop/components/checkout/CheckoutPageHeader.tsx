import type { ReactNode } from "react";

import SiteContainer from "@/components/layout/SiteContainer";
import { cn } from "@/lib/utils";

export type CheckoutPageHeaderProps = {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export default function CheckoutPageHeader({
  eyebrow,
  title,
  description,
  icon,
  children,
  className,
}: CheckoutPageHeaderProps) {
  return (
    <header className={cn("border-b border-border/80 bg-muted/30 text-foreground", className)}>
      <SiteContainer variant="wide" className="py-4 bp-sm:py-6">
        <div className="flex flex-col gap-4 bp-md:flex-row bp-md:items-end bp-md:justify-between">
          <div className="flex min-w-0 items-start gap-3 bp-sm:gap-4">
            {icon && (
              <div
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-brand-highlight-muted bg-brand-highlight-muted text-brand-highlight-ink bp-sm:h-11 bp-sm:w-11"
              >
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-ui-label font-semibold uppercase tracking-[0.18em] text-brand-highlight-ink">
                {eyebrow}
              </p>
              <h1 className="mt-1 text-balance font-brand-heading text-ui-page-title font-semibold leading-tight tracking-tight text-foreground bp-sm:text-ui-page-title-lg">
                {title}
              </h1>
              {description && (
                <p className="mt-2 max-w-3xl break-keep text-ui-body-sm leading-relaxed text-muted-foreground bp-sm:text-ui-body">
                  {description}
                </p>
              )}
            </div>
          </div>
          {children && <div className="min-w-0 bp-md:max-w-[52%]">{children}</div>}
        </div>
      </SiteContainer>
    </header>
  );
}
