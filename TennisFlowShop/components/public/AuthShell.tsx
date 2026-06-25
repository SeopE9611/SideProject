import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type AuthShellProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  panelClassName?: string;
};

export function AuthShell({
  title,
  description,
  children,
  footer,
  className,
  panelClassName,
}: AuthShellProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "flex min-h-[calc(100vh-8rem)] items-center justify-center bg-background px-4 py-8 sm:px-6",
        className,
      )}
    >
      <div
        className={cn(
          "w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-sm sm:p-8",
          panelClassName,
        )}
      >
        <header className="mb-6 space-y-2 text-center">
          <h1
            id={titleId}
            className="text-ui-section-title font-semibold tracking-tight text-foreground"
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
