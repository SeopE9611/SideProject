import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PriceSummaryRow = {
  id?: string;
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  emphasis?: boolean;
};

export type PriceSummaryProps = {
  rows: PriceSummaryRow[];
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function PriceSummary({ rows, title, description, footer, className }: PriceSummaryProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h3 className="text-ui-card-title font-ui-medium text-foreground">{title}</h3>}

          {description && (
            <div className="text-ui-body-sm text-muted-foreground">{description}</div>
          )}
        </div>
      )}
      <dl className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={row.id ?? index}
            className={cn(
              "flex items-start justify-between gap-4 text-ui-body-sm",
              row.emphasis &&
                "border-t border-border pt-4 text-ui-body-lg font-ui-medium text-foreground",
            )}
          >
            <dt className="min-w-0 text-muted-foreground">
              <span className={cn(row.emphasis && "text-foreground")}>{row.label}</span>
              {row.description && (
                <span className="mt-1 block text-ui-label text-muted-foreground">
                  {row.description}
                </span>
              )}
            </dt>
            <dd className="shrink-0 text-right font-ui-medium text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
      {footer && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-ui-body-sm text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}
