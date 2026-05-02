import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminPageHeaderProps = {
  title: string;
  description: string;
  icon?: ComponentType<{ className?: string }>;
  scope?: string;
  helperText?: string;
  actions?: ReactNode;
  className?: string;
};

export default function AdminPageHeader({
  title,
  description,
  icon: Icon,
  scope,
  helperText,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary dark:bg-primary/20">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}

        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-normal text-foreground lg:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-foreground/75">{description}</p>

          {(scope || helperText) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-foreground/70">
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

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
