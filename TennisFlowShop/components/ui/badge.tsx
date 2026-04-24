import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        neutral: "border-border bg-card text-foreground dark:bg-card",
        info: "border-info bg-info text-info-foreground",
        success: "border-success bg-success text-success-foreground",
        warning: "border-warning bg-warning text-warning-foreground",
        danger:
          "border-destructive bg-destructive text-destructive-foreground",
        brand: "border-primary bg-primary text-primary-foreground",
        secondary:
          "border-border/80 bg-muted/80 text-muted-foreground dark:bg-muted/55 dark:text-foreground",
        outline: "border-border bg-background text-foreground",

        // Legacy aliases kept for gradual migration.
        default: "border-border bg-card text-foreground dark:bg-card",
        highlight: "border-primary bg-primary text-primary-foreground",
        destructive:
          "border-destructive bg-destructive text-destructive-foreground",
        product: "border-info bg-info text-info-foreground",
        service: "border-warning bg-warning text-warning-foreground",
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
