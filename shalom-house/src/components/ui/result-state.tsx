import type { ReactNode } from "react";

export type ResultStateProps = {
  status?: "error" | "info" | "warning" | "success";
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

const statusStyles = {
  error: "border-danger/30 bg-danger-soft text-danger",
  info: "border-primary/30 bg-primary-soft text-primary",
  warning: "border-warning/30 bg-warning-soft text-warning",
  success: "border-success/30 bg-success-soft text-success",
};

const statusLabels = {
  error: "오류",
  info: "안내",
  warning: "주의",
  success: "완료",
};

export function ResultState({
  status = "info",
  title,
  description,
  actions,
  children,
  className,
}: ResultStateProps) {
  const semanticRole = status === "error" ? "alert" : "status";

  return (
    <section
      aria-atomic="true"
      className={`w-full border-y border-border bg-surface-subtle ${className ?? ""}`}
      role={semanticRole}
    >
      <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
        <div className="max-w-content">
          <p
            className={`inline-flex min-h-11 items-center rounded-control border px-4 text-small font-bold ${statusStyles[status]}`}
          >
            {statusLabels[status]}
          </p>
          <h1 className="mt-3 text-safe-wrap text-title font-bold text-foreground">{title}</h1>
          {description ? (
            <div className="mt-6 text-safe-wrap text-body text-muted-foreground">{description}</div>
          ) : null}
          {actions ? (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap [&_a]:min-h-11 [&_button]:min-h-11">
              {actions}
            </div>
          ) : null}
          {children ? <div className="mt-6">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
