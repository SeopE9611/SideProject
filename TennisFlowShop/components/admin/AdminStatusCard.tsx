import type { ComponentType, ReactNode } from "react";

import { adminTypography } from "@/components/admin/admin-typography";
import { cn } from "@/lib/utils";

type AdminStatusCardProps = {
  title: string;
  value: ReactNode;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  tone?: "neutral" | "primary" | "warning" | "danger" | "success";
  className?: string;
};

const toneClass = {
  neutral: "border-border/70 bg-card",
  primary: "border-primary/25 bg-primary/5",
  warning: "border-warning/35 bg-warning/5",
  danger: "border-destructive/35 bg-destructive/5",
  success: "border-success/35 bg-success/5",
} as const;

const iconClass = {
  neutral: "text-muted-foreground",
  primary: "text-primary",
  warning: "text-warning",
  danger: "text-destructive",
  success: "text-success",
} as const;

export default function AdminStatusCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "neutral",
  className,
}: AdminStatusCardProps) {
  return (
    <article className={cn("min-h-28 rounded-xl border p-4 shadow-sm", toneClass[tone], className)}>
      <div className="mb-2 flex items-center gap-2">
        {Icon ? <Icon className={cn("h-4 w-4", iconClass[tone])} /> : null}
        <span className={adminTypography.panelTitle}>{title}</span>
      </div>
      <div className={adminTypography.bodyStrong}>{value}</div>
      {description ? (
        <p className={cn("mt-2 text-foreground/75", adminTypography.meta)}>{description}</p>
      ) : null}
    </article>
  );
}
