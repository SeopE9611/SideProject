import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  align = "left",
  className,
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
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-primary sm:text-sm">
            {eyebrow}
          </div>
        )}
        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        {description && (
          <div className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </div>
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
