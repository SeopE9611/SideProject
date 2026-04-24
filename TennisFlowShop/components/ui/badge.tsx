import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        neutral: "border-border bg-card text-foreground dark:bg-card",
        info:
          "border-info/45 bg-info/10 text-info dark:border-info/55 dark:bg-info/18 dark:text-info",
        success:
          "border-success/45 bg-success/10 text-success dark:border-success/55 dark:bg-success/18 dark:text-success",
        warning:
          "border-warning/50 bg-warning/12 text-warning dark:border-warning/55 dark:bg-warning/20 dark:text-warning",
        danger:
          "border-destructive/45 bg-destructive/10 text-destructive dark:border-destructive/55 dark:bg-destructive/18 dark:text-destructive",
        brand:
          "border-primary/40 bg-primary/10 text-primary dark:border-primary/55 dark:bg-primary/18 dark:text-primary",
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
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
