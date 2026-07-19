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
        variant === "feature" && "bg-brand-highlight-muted/35",
        className,
      )}
    >
      <div
        className={cn(
          "w-full max-w-md overflow-hidden rounded-panel border border-border bg-card shadow-soft",
          panelClassName,
        )}
      >
        <header
          className={cn(
            "border-b border-border px-4 py-6 text-center sm:px-8 sm:py-8",
            variant === "feature" && "bg-brand-highlight-muted/45",
          )}
        >
          <h1
            id={titleId}
            className="font-brand-heading text-ui-section-title font-semibold tracking-[-0.015em] text-foreground"
          >
            {title}
          </h1>
          {description && (
            <div className="mx-auto mt-2 max-w-lg break-keep text-ui-body-sm leading-relaxed text-muted-foreground">
              {description}
            </div>
          )}
        </header>
        <div className="p-4 sm:p-6">{children}</div>
        {footer && (
          <footer className="border-t border-border px-4 py-5 text-center text-ui-body-sm text-muted-foreground sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </section>
  );
}
