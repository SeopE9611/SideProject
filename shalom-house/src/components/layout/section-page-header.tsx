import Link from "next/link";

import { SectionLocalNavigation, type SectionHref } from "@/components/layout/section-local-navigation";

type SectionPageHeaderProps = {
  sectionHref: SectionHref;
  eyebrow: string;
  title: string;
  description: string;
  breadcrumbs: readonly { label: string; href?: string }[];
  notice?: string;
};

export function SectionPageHeader({
  sectionHref,
  eyebrow,
  title,
  description,
  breadcrumbs,
  notice,
}: SectionPageHeaderProps) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto max-w-site px-page py-8 sm:px-page-wide sm:py-12">
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
        <p className="mt-7 text-small font-bold text-accent">{eyebrow}</p>
        <h1 className="text-safe-wrap mt-2 text-title font-bold sm:text-[2.5rem]">{title}</h1>
        <p className="text-safe-wrap mt-3 max-w-3xl text-body text-muted-foreground">{description}</p>
        {notice ? (
          <p className="text-safe-wrap mt-5 border-l-2 border-primary bg-primary-soft px-3 py-2 text-small">{notice}</p>
        ) : null}
      </div>
      <SectionLocalNavigation sectionHref={sectionHref} />
    </header>
  );
}
