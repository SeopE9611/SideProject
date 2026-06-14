import type { HTMLAttributes, ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type InteractiveCardProps = {
  href?: string;
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

const interactiveClassName =
  "block rounded-xl border border-border bg-card p-5 text-foreground transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function InteractiveCard({
  href,
  className,
  children,
  ...props
}: InteractiveCardProps) {
  if (href) {
    return (
      <Link href={href} className={cn(interactiveClassName, className)}>
        {children}
      </Link>
    );
  }

  return (
    <div
      className={cn("rounded-xl border border-border bg-card p-5", className)}
      {...props}
    >
      {children}
    </div>
  );
}
