import type { ReactNode } from "react";

export type EmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  variant?: "panel" | "list";
  headingLevel?: 2 | 3;
  className?: string;
};

export function EmptyState({
  title,
  description,
  actions,
  variant = "panel",
  headingLevel = 3,
  className,
}: EmptyStateProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const geometry =
    variant === "panel" ? "rounded-card border border-border bg-surface p-6" : "border-b border-border py-6";

  return (
    <div className={`${geometry} text-foreground ${className ?? ""}`}>
      <Heading
        className={`text-safe-wrap ${variant === "panel" ? "text-heading font-bold" : "font-semibold"}`}
      >
        {title}
      </Heading>
      {description ? <div className="text-safe-wrap text-muted-foreground">{description}</div> : null}
      {actions ? <div>{actions}</div> : null}
    </div>
  );
}
