import type { ReactNode } from "react";

import { adminTypography } from "@/components/admin/admin-typography";
import { cn } from "@/lib/utils";

type SectionProps = {
  children: ReactNode;
  className?: string;
  variant?: "card" | "plain";
};

export function Section({ children, className, variant = "card" }: SectionProps) {
  return (
    <section
      className={cn(
        variant === "card" &&
          "rounded-2xl border border-border/70 bg-card/70 shadow-sm dark:bg-card/70",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  title,
  description,
  aside,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-t-2xl border-b border-border/70 bg-background/70 px-5 py-3",
        description && "flex-row items-start gap-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className={adminTypography.panelTitle}>{title}</h3>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-foreground/75">{description}</p>
        ) : null}
      </div>
      {aside}
    </div>
  );
}

export function SectionBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-6 py-4", className)}>{children}</div>;
}
