import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

export const badgeToneToVariant = {
  neutral: 'neutral',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  brand: 'brand',
  destructive: 'danger',
} as const;

export type BadgeTone = keyof typeof badgeToneToVariant;

const badgeVariants = cva('inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', {
  variants: {
    variant: {
      neutral: 'border-border bg-card text-foreground dark:bg-card/90',
      info: 'border-info/45 bg-info/15 text-info dark:border-info/55 dark:bg-info/22',
      success: 'border-success/45 bg-success/15 text-success dark:border-success/55 dark:bg-success/24',
      warning: 'border-warning/45 bg-warning/15 text-warning dark:border-warning/55 dark:bg-warning/26',
      danger: 'border-destructive/45 bg-destructive/15 text-destructive dark:border-destructive/55 dark:bg-destructive/24',
      brand: 'border-primary/45 bg-primary/15 text-primary dark:border-primary/55 dark:bg-primary/24',
      secondary: 'border-border/80 bg-muted/80 text-muted-foreground dark:bg-muted/55 dark:text-foreground',
      outline: 'border-border bg-background text-foreground',

      // Legacy aliases kept for gradual migration.
      default: 'border-border bg-card text-foreground dark:bg-card/90',
      highlight: 'border-primary/45 bg-primary/15 text-primary dark:border-primary/55 dark:bg-primary/24',
      destructive: 'border-destructive/45 bg-destructive/15 text-destructive dark:border-destructive/55 dark:bg-destructive/24',
      product: 'border-info/45 bg-info/15 text-info dark:border-info/55 dark:bg-info/22',
      service: 'border-warning/45 bg-warning/15 text-warning dark:border-warning/55 dark:bg-warning/26',
    },
  },
  defaultVariants: {
    variant: 'neutral',
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export interface SemanticBadgeProps extends Omit<BadgeProps, 'variant'> {
  tone?: BadgeTone;
}

function SemanticBadge({ className, tone = 'neutral', ...props }: SemanticBadgeProps) {
  return <Badge variant={badgeToneToVariant[tone]} className={className} {...props} />;
}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
export { SemanticBadge };
