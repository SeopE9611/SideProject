import type { ReactNode } from "react";

type AdminWorkflowPanelProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  tone?: "default" | "danger";
};

export function AdminWorkflowPanel({
  title,
  description,
  children,
  tone = "default",
}: AdminWorkflowPanelProps) {
  return (
    <section
      className={`rounded-card border bg-surface p-5 ${tone === "danger" ? "border-danger" : "border-border-strong"}`}
    >
      <h2 className="text-heading font-bold">{title}</h2>
      {description ? (
        <div className="mt-3 text-safe-wrap text-small text-muted-foreground">{description}</div>
      ) : null}
      {children}
    </section>
  );
}
