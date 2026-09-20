import Link from "next/link";
import type { ReactNode } from "react";

type AdminFormPageHeaderProps = {
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  description?: ReactNode;
};

export function AdminFormPageHeader({
  backHref,
  backLabel,
  eyebrow,
  title,
  description,
}: AdminFormPageHeaderProps) {
  return (
    <header>
      <Link
        href={backHref}
        className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        ← {backLabel}
      </Link>
      <div className="mt-4 min-w-0">
        <p className="text-small font-semibold text-primary">{eyebrow}</p>
        <h1 className="mt-1 break-words text-title font-bold">{title}</h1>
        {description ? (
          <div className="mt-3 max-w-3xl text-safe-wrap text-body text-muted-foreground">{description}</div>
        ) : null}
      </div>
    </header>
  );
}
