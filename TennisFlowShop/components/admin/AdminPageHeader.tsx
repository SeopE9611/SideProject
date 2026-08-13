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
  default: "mb-4 border-border/70 bg-card/80 p-4 shadow-sm",
  compact: "mb-3 border-border/60 bg-card/60 px-4 py-3",
  detail: "mb-4 border-border bg-card px-5 py-4",
  form: "mb-4 border-border/70 bg-card/70 px-5 py-3.5",
} as const;

const iconStyles = {
  default: "h-9 w-9 rounded-lg",
  compact: "h-8 w-8 rounded-md",
  detail: "h-10 w-10 rounded-lg",
  form: "h-9 w-9 rounded-lg",
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
        "flex flex-row items-start justify-between gap-3 rounded-xl border",
        headerStyles[variant],
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <div
            className={cn(
              "flex shrink-0 items-center justify-center border border-primary/20 bg-primary/10 text-primary dark:bg-primary/20",
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
              {scope ? (
                <span className="rounded-md border border-border/70 bg-muted/40 px-2 py-1">
                  {scope}
                </span>
              ) : null}
              {helperText ? <span>{helperText}</span> : null}
            </div>
          )}
        </div>
      </div>

      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
