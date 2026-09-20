import type { ReactNode } from "react";

type AdminFormGuidanceProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
};

export function AdminFormGuidance({ title, description, children }: AdminFormGuidanceProps) {
  return (
    <aside className="max-w-4xl rounded-card border border-border-strong bg-surface p-5">
      <h2 className="text-heading font-bold">{title}</h2>
      {description ? <div className="mt-2 text-small text-muted-foreground">{description}</div> : null}
      <div className="mt-4 text-small leading-relaxed">{children}</div>
    </aside>
  );
}
