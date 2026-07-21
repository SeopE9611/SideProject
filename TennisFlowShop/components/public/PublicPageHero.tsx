import type { ReactNode } from "react";

import SiteContainer from "@/components/layout/SiteContainer";
import { cn } from "@/lib/utils";

export type PublicPageHeroVariant = "standard" | "feature" | "inverse";

export type PublicPageHeroProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  align?: "left" | "center";
  className?: string;
  variant?: PublicPageHeroVariant;
};

export function PublicPageHero({
  eyebrow,
  title,
  description,
  actions,
  children,
  align = "left",
  className,
  variant = "standard",
}: PublicPageHeroProps) {
  const centered = align === "center";

  if (variant === "standard") {
    return (
      <header className={cn("border-b border-border bg-muted/30 py-10 bp-sm:py-14", className)}>
        <SiteContainer
          className={cn("flex flex-col gap-6", centered && "items-center text-center")}
        >
          <div className={cn("max-w-3xl space-y-3", centered && "mx-auto")}>
            {eyebrow && <div className="text-ui-label font-ui-medium text-primary">{eyebrow}</div>}
            <h1 className="text-balance text-ui-page-title font-ui-bold tracking-normal text-foreground bp-sm:text-ui-page-title-lg">
              {title}
            </h1>
            {description && (
              <div className="max-w-2xl text-pretty text-ui-body font-ui-regular text-muted-foreground bp-sm:text-ui-body-lg">
                {description}
              </div>
            )}
          </div>
          {actions && (
            <div
              className={cn(
                "flex w-full flex-col gap-2 bp-sm:w-auto bp-sm:flex-row bp-sm:flex-wrap",
                centered && "bp-sm:justify-center",
              )}
            >
              {actions}
            </div>
          )}
          {children}
        </SiteContainer>
      </header>
    );
  }

  const inverse = variant === "inverse";

  return (
    <header className={cn("bg-background py-6 bp-sm:py-8", className)}>
      <SiteContainer>
        <div
          className={cn(
            "rounded-hero border p-5 shadow-soft bp-sm:p-6 bp-md:p-8",
            inverse
              ? "border-surface-inverse-foreground/15 bg-surface-inverse text-surface-inverse-foreground"
              : "border-border/80 bg-card text-card-foreground",
          )}
        >
          <div className={cn("flex flex-col gap-6", centered && "items-center text-center")}>
            <div className={cn("max-w-3xl space-y-3", centered && "mx-auto")}>
              {eyebrow && (
                <div
                  className={cn(
                    "text-ui-label font-ui-medium",
                    inverse ? "text-surface-inverse-muted" : "text-muted-foreground",
                  )}
                >
                  {eyebrow}
                </div>
              )}
              <h1
                className={cn(
                  "text-balance text-ui-page-title font-ui-bold tracking-normal bp-sm:text-ui-page-title-lg",
                  inverse ? "text-surface-inverse-foreground" : "text-foreground",
                )}
              >
                {title}
              </h1>
              {description && (
                <div
                  className={cn(
                    "max-w-2xl text-pretty text-ui-body font-ui-regular bp-sm:text-ui-body-lg",
                    inverse ? "text-surface-inverse-muted" : "text-muted-foreground",
                  )}
                >
                  {description}
                </div>
              )}
            </div>
            {actions && (
              <div
                className={cn(
                  "flex w-full flex-col gap-2 bp-sm:w-auto bp-sm:flex-row bp-sm:flex-wrap",
                  centered && "bp-sm:justify-center",
                )}
              >
                {actions}
              </div>
            )}
            {children}
          </div>
        </div>
      </SiteContainer>
    </header>
  );
}
