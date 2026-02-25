import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', {
  variants: {
    variant: {
      default: 'border-border bg-card text-foreground',
      highlight: 'border-primary/40 bg-primary/20 text-primary dark:border-primary/50 dark:bg-primary/25',
      info: 'border-border bg-card text-foreground',
      neutral: 'border-border bg-card text-foreground',
      secondary: 'border-transparent bg-secondary text-brand-text bg-secondary/80',
      destructive: 'border-destructive/40 bg-destructive/20 text-destructive dark:border-destructive/50 dark:bg-destructive/25',
      success: 'border-success/40 bg-success/20 text-success dark:border-success/50 dark:bg-success/25',
      warning: 'border-warning/40 bg-warning/20 text-warning dark:border-warning/50 dark:bg-warning/25',
      danger: 'border-destructive/40 bg-destructive/20 text-destructive dark:border-destructive/50 dark:bg-destructive/25',
      outline: 'text-foreground',
      product: 'border-primary/40 bg-primary/20 text-primary dark:border-primary/50 dark:bg-primary/25',
      service: 'border-primary/40 bg-primary/20 text-primary dark:border-primary/50 dark:bg-primary/25',
    },
  },
  defaultVariants: {
    variant: 'neutral',
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
