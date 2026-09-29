import type { ReactNode } from "react";

type AdminWorkflowPanelProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  tone?: "default" | "danger";
};

export function AdminWorkflowPanel({ title, description, children, tone = "default" }: AdminWorkflowPanelProps) {
  return (
    <section className={`admin-workflow ${tone === "danger" ? "admin-workflow-danger" : ""}`}>
      <h2 className="text-heading font-bold">{title}</h2>
      {description ? <div className="mt-3 text-safe-wrap text-small text-muted-foreground">{description}</div> : null}
      {children}
    </section>
  );
}
