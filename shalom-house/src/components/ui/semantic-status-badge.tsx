import type { ReactNode } from "react";

export type SemanticStatusTone = "neutral" | "info" | "success" | "warning" | "danger";

type SemanticStatusBadgeProps = {
  tone: SemanticStatusTone;
  children: ReactNode;
  className?: string;
};

const toneStyles = {
  neutral: "border-border bg-surface-subtle text-foreground",
  info: "border-primary/30 bg-primary-soft text-primary",
  success: "border-success/30 bg-success-soft text-success",
  warning: "border-warning/30 bg-warning-soft text-warning",
  danger: "border-danger/30 bg-danger-soft text-danger",
} satisfies Record<SemanticStatusTone, string>;

export function SemanticStatusBadge({ tone, children, className }: SemanticStatusBadgeProps) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-control border px-2 py-1 text-small font-semibold ${toneStyles[tone]} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
