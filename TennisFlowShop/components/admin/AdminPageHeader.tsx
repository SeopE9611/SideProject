import type { ComponentType, ReactNode } from "react";

import { adminTypography } from "@/components/admin/admin-typography";
import { cn } from "@/lib/utils";

type AdminPageHeaderProps = {
  title: string;
  description: string;
  icon?: ComponentType<{ className?: string }>;
  scope?: string;
  helperText?: string;
  actions?: ReactNode;
  className?: string;
  variant?: "default" | "compact" | "detail" | "form";
};

const headerStyles = {
  default: "mb-4 px-1 py-1",
  compact: "mb-3 px-1 py-0.5",
  detail: "mb-4 rounded-xl border border-border bg-card px-5 py-4",
  form: "mb-4 rounded-xl border border-border/70 bg-card/70 px-5 py-3.5",
} as const;

const iconStyles = {
  default: "h-9 w-9 text-primary",
  compact: "h-8 w-8 text-primary",
  detail: "h-10 w-10 rounded-lg border border-primary/20 bg-primary/10 text-primary dark:bg-primary/20",
  form: "h-9 w-9 rounded-lg border border-primary/20 bg-primary/10 text-primary dark:bg-primary/20",
} as const;

export default function AdminPageHeader({
  title,
  description,
  icon: Icon,
  scope,
  helperText,
  actions,
  className,
  variant = "default",
}: AdminPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3",
        headerStyles[variant],
        className,
      )}
    >
      <div className="flex min-w-[min(100%,32rem)] flex-1 items-start gap-3">
        {Icon ? (
          <div
            className={cn(
              "flex shrink-0 items-center justify-center",
              iconStyles[variant],
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        ) : null}

        <div className="min-w-0">
          <h1 className={adminTypography.pageTitle}>{title}</h1>
          <p className={cn("mt-1 text-foreground/75", adminTypography.body)}>{description}</p>

          {(scope || helperText) && (
            <div
              className={cn("mt-1.5 flex flex-wrap items-center gap-1.5", adminTypography.caption)}
            >
              {scope ? <span className="break-words">{scope}</span> : null}
              {scope && helperText ? <span aria-hidden="true">·</span> : null}
              {helperText ? <span>{helperText}</span> : null}
            </div>
          )}
        </div>
      </div>

      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
