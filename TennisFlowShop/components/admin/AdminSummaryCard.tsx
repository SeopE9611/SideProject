import type { ComponentType, ReactNode } from "react";
import Link from "next/link";

import { adminTypography } from "@/components/admin/admin-typography";
import { cn } from "@/lib/utils";

type AdminTone = "neutral" | "success" | "warning" | "danger" | "info";

type AdminSummaryCardProps = {
  title: string;
  value: ReactNode;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  tone?: AdminTone;
  actionLabel?: string;
  href?: string;
  onAction?: () => void;
  active?: boolean;
  compact?: boolean;
  className?: string;
};

const toneClass: Record<AdminTone, string> = {
  neutral: "border-border bg-card",
  success: "border-success/35 bg-success/5",
  warning: "border-warning/35 bg-warning/5",
  danger: "border-destructive/35 bg-destructive/5",
  info: "border-info/35 bg-info/5",
};

const accentClass: Record<AdminTone, string> = {
  neutral: "text-foreground/75",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
};

export default function AdminSummaryCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "neutral",
  actionLabel,
  href,
  onAction,
  active = false,
  compact = false,
  className,
}: AdminSummaryCardProps) {
  const content = (
    <>
      <div className={cn("flex items-center gap-1.5", adminTypography.panelTitle)}>
        {Icon ? <Icon className={cn("h-4 w-4", accentClass[tone])} /> : null}
        <span>{title}</span>
      </div>
      <div className={cn(compact ? "mt-1" : "mt-2", compact ? adminTypography.kpiValueCompact : adminTypography.kpiValue)}>
        {value}
      </div>
      {description ? (
        <p
          className={cn(
            "mt-1 text-foreground/75",
            adminTypography.meta,
            compact && "line-clamp-1",
          )}
        >
          {description}
        </p>
      ) : null}
      {actionLabel ? (
        <span
          className={cn(
            compact ? "mt-1" : "mt-3",
            "block",
            adminTypography.actionLabel,
            href || onAction ? accentClass[tone] : "text-foreground/75",
          )}
        >
          {actionLabel}
        </span>
      ) : null}
    </>
  );
  const interactive = Boolean(href || onAction);
  const styles = cn(
    "block w-full rounded-lg border text-left",
    interactive &&
      "cursor-pointer transition-colors hover:border-foreground/20 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    compact ? "p-3" : "p-4",
    toneClass[tone],
    active && "ring-2 ring-ring/60",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={styles}>
        {content}
      </Link>
    );
  }

  if (onAction) {
    return (
      <button type="button" className={styles} onClick={onAction}>
        {content}
      </button>
    );
  }

  return <article className={styles}>{content}</article>;
}
