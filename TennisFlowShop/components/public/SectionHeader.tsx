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
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        centered && "items-center text-center sm:flex-col sm:items-center",
        className,
      )}
    >
      <div className="max-w-2xl space-y-2">
        {eyebrow && (
          <div className="text-sm font-medium text-primary">{eyebrow}</div>
        )}
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description && (
          <div className="text-sm text-muted-foreground sm:text-base">
            {description}
          </div>
        )}
      </div>
      {actions && (
        <div className={cn("shrink-0", centered && "flex justify-center")}>
          {actions}
        </div>
      )}
    </div>
  );
}
