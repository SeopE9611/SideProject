import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ResultStateProps = {
  status?: "success" | "error" | "info" | "warning";
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

const statusStyles = {
  success: "border-success/30 bg-success/10 text-success",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-info/30 bg-info/10 text-info",
  warning: "border-warning/30 bg-warning/10 text-warning",
};

const statusLabels = {
  success: "성공",
  error: "오류",
  info: "안내",
  warning: "주의",
};

export function ResultState({
  status = "info",
  title,
  description,
  actions,
  children,
  icon,
  className,
}: ResultStateProps) {
  return (
    <section
      className={cn(
        "mx-auto flex max-w-2xl flex-col items-center px-4 py-12 text-center sm:py-16",
        className,
      )}
    >
      <div
        className={cn(
          "mb-5 flex size-12 items-center justify-center rounded-full border text-ui-caption font-ui-medium",
          statusStyles[status],
        )}
        aria-hidden="true"
      >
        {icon ?? statusLabels[status]}
      </div>
      <h1 className="text-ui-page-title font-ui-bold tracking-normal text-foreground sm:text-ui-page-title-lg">
        {title}
      </h1>
      {description && (
        <div className="mt-3 max-w-xl text-ui-body-sm text-muted-foreground sm:text-ui-body">
          {description}
        </div>
      )}
      {children && <div className="mt-6 w-full text-left">{children}</div>}
      {actions && (
        <div className="mt-6 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
          {actions}
        </div>
      )}
    </section>
  );
}
