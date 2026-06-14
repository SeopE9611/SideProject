import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthShellProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function AuthShell({
  title,
  description,
  children,
  footer,
  className,
}: AuthShellProps) {
  return (
    <main
      className={cn(
        "flex min-h-[calc(100vh-8rem)] items-center justify-center bg-background px-4 py-8 sm:px-6",
        className,
      )}
    >
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-sm sm:p-8">
        <header className="mb-6 space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <div className="text-sm text-muted-foreground">{description}</div>
          )}
        </header>
        {children}
        {footer && (
          <footer className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
            {footer}
          </footer>
        )}
      </section>
    </main>
  );
}
