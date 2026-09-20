import Link from "next/link";
import type { ReactNode } from "react";

export function AdminDetailHeader({
  backHref,
  backLabel,
  eyebrow,
  title,
  actions,
}: {
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <header>
      <Link
        href={backHref}
        className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        ← {backLabel}
      </Link>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-small font-semibold text-primary">{eyebrow}</p>
          <h1 className="mt-1 break-words text-title font-bold">{title}</h1>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
      </div>
    </header>
  );
}
