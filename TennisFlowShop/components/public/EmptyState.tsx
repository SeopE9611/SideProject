import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <section
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/30 px-5 py-10 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 text-muted-foreground" aria-hidden="true">
          {icon}
        </div>
      )}
      <h2 className="text-ui-card-title-lg font-ui-medium text-foreground">{title}</h2>
      {description && (
        <div className="mt-2 max-w-md text-ui-body-sm text-muted-foreground">{description}</div>
      )}
      {action && <div className="mt-5">{action}</div>}
    </section>
  );
}
