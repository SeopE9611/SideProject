import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', {
  variants: {
    variant: {
      default: 'border-transparent bg-primary text-primary-foreground bg-primary/80',
      secondary: 'border-transparent bg-secondary text-brand-text bg-secondary/80',
      destructive: 'border-transparent bg-destructive text-destructive-foreground bg-destructive/80',
      success: 'border-transparent bg-success/15 text-success dark:bg-success/20',
      warning: 'border-transparent bg-warning/20 text-warning-foreground dark:bg-warning/30',
      danger: 'border-transparent bg-danger/15 text-danger dark:bg-danger/20',
      outline: 'text-foreground',
      product: 'bg-accent/15 text-accent border-accent/30',
      service: 'bg-secondary text-brand-text border-border',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
