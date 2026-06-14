import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type PublicSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "muted" | "elevated";
  padding?: "none" | "sm" | "md" | "lg";
};

const variants = {
  default: "bg-card",
  muted: "bg-muted/40",
  elevated: "bg-card shadow-sm",
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
        "rounded-xl border border-border text-foreground",
        variants[variant],
        paddings[padding],
        className,
      )}
      {...props}
    />
  );
}
