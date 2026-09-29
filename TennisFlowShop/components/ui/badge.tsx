import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit max-w-full items-center whitespace-nowrap border font-ui-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
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
        neutral_solid: "border-transparent bg-foreground text-background shadow-sm",
        signal: "border-brand-highlight-ink/30 bg-brand-highlight-muted text-brand-highlight-ink",
        signal_solid:
          "border-transparent bg-brand-highlight text-brand-highlight-foreground shadow-sm",
        secondary:
          "border-border/80 bg-muted/80 text-muted-foreground dark:bg-muted/55 dark:text-foreground",
        outline: "border-border bg-background text-foreground",
        neutral_outline: "border-border bg-background text-foreground",
        info_outline: "border-info/55 bg-background text-info",
        success_outline: "border-success/55 bg-background text-success",
        warning_outline: "border-warning/60 bg-background text-warning",
        danger_outline: "border-destructive/55 bg-background text-destructive",
        brand_outline: "border-primary/55 bg-background text-primary",
        signal_outline: "border-brand-highlight-ink/45 bg-background text-brand-highlight-ink",

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
      size: {
        xs: "min-h-5 px-2 py-0.5 text-ui-micro",
        sm: "px-2.5 py-0.5 text-ui-micro",
        md: "min-h-7 px-3 py-1 text-ui-label",
      },
    },
    defaultVariants: {
      variant: "neutral",
      wrap: "nowrap",
      shape: "pill",
      size: "sm",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, wrap, shape, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, wrap, shape, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
