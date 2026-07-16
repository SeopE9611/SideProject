import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StickyAsideProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function StickyAside({ children, className, contentClassName }: StickyAsideProps) {
  return (
    <aside className={cn("sticky top-[calc(var(--header-h,64px)+1rem)]", className)}>
      <div
        className={cn(
          "max-h-[calc(100svh-var(--header-h,64px)-2rem)] overflow-y-auto overscroll-contain [scrollbar-gutter:stable]",
          contentClassName,
        )}
      >
        {children}
      </div>
    </aside>
  );
}
