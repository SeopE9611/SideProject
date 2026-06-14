import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PublicPageHeroProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  align?: "left" | "center";
  className?: string;
};

export function PublicPageHero({
  eyebrow,
  title,
  description,
  actions,
  children,
  align = "left",
  className,
}: PublicPageHeroProps) {
  const centered = align === "center";

  return (
    <header
      className={cn(
        "border-b border-border bg-muted/30 px-4 py-10 sm:px-6 sm:py-14",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-6xl flex-col gap-6",
          centered && "items-center text-center",
        )}
      >
        <div className={cn("max-w-3xl space-y-3", centered && "mx-auto")}>
          {eyebrow && (
            <div className="text-sm font-medium text-primary">{eyebrow}</div>
          )}
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          {description && (
            <div className="max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              {description}
            </div>
          )}
        </div>
        {actions && (
          <div
            className={cn(
              "flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap",
              centered && "sm:justify-center",
            )}
          >
            {actions}
          </div>
        )}
        {children}
      </div>
    </header>
  );
}
