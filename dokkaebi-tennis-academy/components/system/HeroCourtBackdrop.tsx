import { cn } from '@/lib/utils';

const heroPatternOpacity = {
  soft: {
    light: 'opacity-[0.02]',
    dark: 'dark:opacity-[0.05]',
  },
  normal: {
    light: 'opacity-[0.10]',
    dark: 'dark:opacity-[0.12]',
  },
} as const;

type HeroCourtBackdropProps = {
  className?: string;
  opacity?: keyof typeof heroPatternOpacity;
};

export default function HeroCourtBackdrop({ className, opacity = 'normal' }: HeroCourtBackdropProps) {
  const opacityClass = heroPatternOpacity[opacity];

  return (
    <svg
      className={cn('pointer-events-none absolute inset-0', opacityClass.light, opacityClass.dark, className)}
      viewBox="0 0 1200 600"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect x="80" y="70" width="1040" height="460" rx="24" stroke="currentColor" strokeWidth="2" />
      <line x1="600" y1="70" x2="600" y2="530" stroke="currentColor" strokeWidth="2" />
      <line x1="80" y1="300" x2="1120" y2="300" stroke="currentColor" strokeWidth="2" />
      <rect x="260" y="150" width="680" height="300" rx="16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
