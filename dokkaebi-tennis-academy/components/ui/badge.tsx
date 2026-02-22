import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', {
  variants: {
    variant: {
      default: 'border-primary/20 bg-primary/10 text-primary',
      highlight: 'border-primary/20 bg-primary/10 text-primary',
      info: 'border-border bg-muted text-foreground',
      neutral: 'border-border bg-muted text-foreground',
      secondary: 'border-transparent bg-secondary text-brand-text bg-secondary/80',
      destructive: 'border-destructive/30 bg-destructive/15 text-destructive',
      success: 'border-success/30 bg-success/15 text-success',
      warning: 'border-warning/30 bg-warning/15 text-warning',
      danger: 'border-transparent bg-destructive/15 text-destructive',
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
