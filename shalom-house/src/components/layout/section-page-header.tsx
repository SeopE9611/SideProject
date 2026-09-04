import Link from "next/link";

import { SectionLocalNavigation, type SectionHref } from "@/components/layout/section-local-navigation";

type SectionPageHeaderProps = {
  sectionHref: SectionHref;
  eyebrow: string;
  title: string;
  description: string;
  breadcrumbs: readonly { label: string; href?: string }[];
  notice?: string;
  compact?: boolean;
};

export function SectionPageHeader({
  sectionHref,
  eyebrow,
  title,
  description,
  breadcrumbs,
  notice,
  compact = false,
}: SectionPageHeaderProps) {
  return (
    <header className="border-b border-border bg-surface">
      <div className={`mx-auto max-w-site px-page sm:px-page-wide ${compact ? "py-6 sm:py-7" : "py-8 sm:py-12"}`}>
        <nav aria-label="breadcrumb">
          <ol className="flex flex-wrap gap-x-3 gap-y-1 text-small">
            {breadcrumbs.map((item, index) => (
              <li key={`${item.label}-${index}`} className="text-safe-wrap flex items-center gap-3">
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                {item.href ? (
                  <Link
                    className="text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current="page">{item.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        {!compact ? <p className="mt-7 text-small font-bold text-accent">{eyebrow}</p> : null}
        <h1 className={`text-safe-wrap text-title font-bold sm:text-display ${compact ? "mt-4" : "mt-2"}`}>{title}</h1>
        <p className="text-safe-wrap mt-2 max-w-3xl text-body text-muted-foreground">{description}</p>
        {notice ? (
          <p className="text-safe-wrap mt-5 border-l-2 border-primary bg-primary-soft px-3 py-2 text-small">{notice}</p>
        ) : null}
      </div>
      <SectionLocalNavigation sectionHref={sectionHref} />
    </header>
  );
}
