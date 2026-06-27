import type { ComponentType, ReactNode } from "react";

import { adminTypography } from "@/components/admin/admin-typography";
import { cn } from "@/lib/utils";

type AdminStatusCardProps = {
  title: string;
  value: ReactNode;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  tone?: "neutral" | "primary" | "warning" | "danger" | "success";
  density?: "default" | "compact";
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
  density = "default",
  className,
}: AdminStatusCardProps) {
  const isCompact = density === "compact";

  return (
    <article
      className={cn(
        "rounded-xl border shadow-none",
        isCompact ? "min-h-16 p-3" : "min-h-24 p-4",
        toneClass[tone],
        className,
      )}
    >
      <div className={cn("flex items-center gap-2", isCompact ? "mb-1" : "mb-2")}>
        {Icon ? <Icon className={cn("h-4 w-4", iconClass[tone])} /> : null}
        <span className={adminTypography.panelTitleCompact}>{title}</span>
      </div>
      <div className={isCompact ? adminTypography.kpiValueCompact : adminTypography.bodyStrong}>
        {value}
      </div>
      {description ? (
        <p className={cn("mt-1 line-clamp-1 text-foreground/75", adminTypography.caption)}>
          {description}
        </p>
      ) : null}
    </article>
  );
}
