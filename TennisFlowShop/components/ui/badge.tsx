import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center whitespace-nowrap border px-2.5 py-0.5 text-ui-micro font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        neutral: "border-border bg-card text-foreground dark:bg-card",
        info: "border-info/45 bg-info/10 text-info dark:border-info/55 dark:bg-info/18 dark:text-info",
        success:
          "border-success/45 bg-success/10 text-success dark:border-success/55 dark:bg-success/18 dark:text-success",
        warning:
          "border-warning/50 bg-warning/12 text-warning dark:border-warning/55 dark:bg-warning/20 dark:text-warning",
        danger:
          "border-destructive/45 bg-destructive/10 text-destructive dark:border-destructive/55 dark:bg-destructive/18 dark:text-destructive",
        brand:
          "border-primary/40 bg-primary/10 text-primary dark:border-primary/55 dark:bg-primary/18 dark:text-primary",
        info_solid: "border-transparent bg-info text-info-foreground shadow-sm",
        success_solid: "border-transparent bg-success text-success-foreground shadow-sm",
        warning_solid: "border-transparent bg-warning text-warning-foreground shadow-sm",
        danger_solid: "border-transparent bg-destructive text-destructive-foreground shadow-sm",
        brand_solid: "border-transparent bg-primary text-primary-foreground shadow-sm",
        signal:
          "border-brand-highlight/35 bg-brand-highlight-muted text-brand-highlight-foreground dark:border-brand-highlight/45 dark:bg-brand-highlight-muted dark:text-brand-highlight",
        signal_solid:
          "border-transparent bg-brand-highlight text-brand-highlight-foreground shadow-sm",
        secondary:
          "border-border/80 bg-muted/80 text-muted-foreground dark:bg-muted/55 dark:text-foreground",
        outline: "border-border bg-background text-foreground",

        // Legacy aliases kept for gradual migration.
        default: "border-border bg-card text-foreground dark:bg-card",
        highlight:
          "border-primary/40 bg-primary/10 text-primary dark:border-primary/55 dark:bg-primary/18 dark:text-primary",
        destructive:
          "border-destructive/45 bg-destructive/10 text-destructive dark:border-destructive/55 dark:bg-destructive/18 dark:text-destructive",
        product:
          "border-info/45 bg-info/10 text-info dark:border-info/55 dark:bg-info/18 dark:text-info",
        service:
          "border-warning/50 bg-warning/12 text-warning dark:border-warning/55 dark:bg-warning/20 dark:text-warning",
      },
      wrap: {
        nowrap: "whitespace-nowrap",
        normal: "whitespace-normal break-keep text-left leading-snug",
      },
      shape: {
        rounded: "rounded-md",
        pill: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "neutral",
      wrap: "nowrap",
      shape: "pill",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, wrap, shape, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, wrap, shape }), className)} {...props} />;
}

export { Badge, badgeVariants };
