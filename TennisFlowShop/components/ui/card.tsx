import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, VariantProps } from 'class-variance-authority';

const cardVariants = cva('rounded-lg bg-card text-card-foreground shadow-sm', {
  variants: {
    variant: {
      // 기존 기본값 유지
      outline: 'border',
      // 테두리 없는 카드
      ghost: '',
      // 배경 강조가 필요한 섹션 카드
      muted: 'border bg-muted text-foreground',
      elevatedGradient: 'border border-border bg-card shadow-xl overflow-hidden',
    },
  },
  defaultVariants: {
    variant: 'outline',
  },
});

type CardProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>;

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, variant, ...props }, ref) => <div ref={ref} className={cn(cardVariants({ variant }), className)} {...props} />);
Card.displayName = 'Card';

const cardHeaderVariants = cva('flex flex-col space-y-1.5 p-6', {
  variants: {
    variant: {
      default: '',
      sectionGradient: 'bg-muted/50 dark:bg-card/40 border-b border-border',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type CardHeaderProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardHeaderVariants>;

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(({ className, variant, ...props }, ref) => <div ref={ref} className={cn(cardHeaderVariants({ variant }), className)} {...props} />);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => <h3 ref={ref} className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
