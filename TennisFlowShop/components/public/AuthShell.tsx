import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type AuthShellProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  panelClassName?: string;
  variant?: "standard" | "feature";
};

export function AuthShell({
  title,
  description,
  children,
  footer,
  className,
  panelClassName,
  variant = "standard",
}: AuthShellProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "flex min-h-[calc(100vh-8rem)] items-center justify-center bg-background px-4 py-6 sm:px-6 sm:py-8",
        variant === "feature" && "bg-muted/20",
        className,
      )}
    >
      <div
        className={cn(
          "w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-sm sm:p-8",
          variant === "feature" && "rounded-panel border-border/80 shadow-soft",
          panelClassName,
        )}
      >
        <header className="mb-5 space-y-2 text-center sm:mb-6">
          <h1
            id={titleId}
            className={cn(
              "text-ui-section-title font-semibold tracking-tight text-foreground",
              variant === "feature" && "font-brand-heading tracking-[-0.015em]",
            )}
          >
            {title}
          </h1>
          {description && (
            <div className="text-ui-body-sm text-muted-foreground">{description}</div>
          )}
        </header>
        {children}
        {footer && (
          <footer className="mt-6 border-t border-border pt-5 text-center text-ui-body-sm text-muted-foreground">
            {footer}
          </footer>
        )}
      </div>
    </section>
  );
}
