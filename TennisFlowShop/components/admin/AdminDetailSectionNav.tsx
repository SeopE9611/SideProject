import type { ReactNode } from "react";

import { adminTypography } from "@/components/admin/admin-typography";
import { cn } from "@/lib/utils";

type AdminDetailSectionNavItem = {
  href: string;
  label: ReactNode;
};

type AdminDetailSectionNavProps = {
  items: AdminDetailSectionNavItem[];
  label?: string;
  className?: string;
};

export default function AdminDetailSectionNav({
  items,
  label = "섹션 바로가기",
  className,
}: AdminDetailSectionNavProps) {
  if (!items.length) return null;

  return (
    <nav
      aria-label={label}
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-background/85 p-3 shadow-sm",
        className,
      )}
    >
      <span className={cn("mr-1", adminTypography.caption)}>{label}</span>
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className={cn(
            "inline-flex h-8 items-center rounded-full border border-border/70 bg-card px-3 text-ui-label font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5",
          )}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
