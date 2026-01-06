import * as React from 'react';
import { cn } from '@/lib/utils';

type Props = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'wide' | 'full';
};

export default function SiteContainer({ className, children, variant = 'default', ...props }: Props) {
  return (
    <div
      {...props}
      className={cn(
        'mx-auto w-full px-3 bp-sm:px-4 bp-md:px-6',
        variant === 'default' && 'bp-lg:max-w-[1200px] bp-lg:px-6',
        variant === 'wide' && 'bp-lg:max-w-[1400px] bp-lg:px-6',
        variant === 'full' && 'bp-lg:max-w-none bp-lg:px-6',
        className
      )}
    >
      {children}
    </div>
  );
}
