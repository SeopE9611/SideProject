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
  className,
}: AdminSummaryCardProps) {
  const content = (
    <>
      <div className={cn("flex items-center gap-1.5", adminTypography.panelTitle)}>
        {Icon ? <Icon className={cn("h-4 w-4", accentClass[tone])} /> : null}
        <span>{title}</span>
      </div>
      <div className={cn("mt-2", adminTypography.kpiValue)}>{value}</div>
      {description ? (
        <p className={cn("mt-1 text-foreground/75", adminTypography.meta)}>{description}</p>
      ) : null}
      {actionLabel ? (
        <span className={cn("mt-3 block", adminTypography.actionLabel, accentClass[tone])}>
          {actionLabel}
        </span>
      ) : null}
    </>
  );
  const styles = cn(
    "block w-full rounded-2xl border p-4 text-left shadow-sm transition-[border-color,box-shadow] hover:shadow-md",
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
