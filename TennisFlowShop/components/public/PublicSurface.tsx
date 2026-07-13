import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type PublicSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "muted" | "elevated" | "feature" | "floating" | "inverse";
  padding?: "none" | "sm" | "md" | "lg";
};

const variants = {
  default: "bg-card shadow-sm",
  muted: "bg-muted/30 shadow-sm",
  elevated: "bg-card shadow-md",
  feature: "rounded-panel border-border/80 bg-card shadow-soft",
  floating: "rounded-control border-border/70 bg-card shadow-float",
  inverse:
    "rounded-panel border-surface-inverse-foreground/15 bg-surface-inverse text-surface-inverse-foreground shadow-soft",
};

const paddings = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export function PublicSurface({
  variant = "default",
  padding = "md",
  className,
  ...props
}: PublicSurfaceProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border text-card-foreground",
        variants[variant],
        paddings[padding],
        className,
      )}
      {...props}
    />
  );
}
