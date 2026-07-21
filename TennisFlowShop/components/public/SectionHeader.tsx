import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SectionHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  align?: "left" | "center";
  className?: string;
  variant?: "standard" | "brand";
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  align = "left",
  className,
  variant = "standard",
}: SectionHeaderProps) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        centered && "items-center text-center sm:flex-col sm:items-center",
        className,
      )}
    >
      <div className="max-w-2xl space-y-2">
        {eyebrow && (
          <div className="text-ui-caption font-ui-medium uppercase tracking-[0.14em] text-primary sm:text-ui-label">
            {eyebrow}
          </div>
        )}

        <h2
          className={cn(
            "text-ui-section-title font-ui-bold tracking-normal text-foreground sm:text-ui-section-title-lg",
            variant === "brand" && "font-brand-heading tracking-[-0.015em]",
          )}
        >
          {title}
        </h2>

        {description && (
          <div className="text-ui-body-sm font-ui-regular text-muted-foreground sm:text-ui-body">{description}</div>
        )}
      </div>
      {actions && (
        <div
          className={cn(
            "flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center",
            centered && "justify-center",
          )}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
