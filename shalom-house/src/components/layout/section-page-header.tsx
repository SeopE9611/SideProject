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
  title,
  description,
  breadcrumbs,
  notice,
  compact = false,
}: SectionPageHeaderProps) {
  const isLanding = breadcrumbs.length === 2 && sectionHref !== "/news";
  return (
    <header
      className={`section-heading ${isLanding ? "section-heading-landing" : ""} ${compact ? "section-heading-compact" : ""}`}
    >
      <div className="mx-auto max-w-site px-page sm:px-page-wide">
        <nav aria-label="breadcrumb" className="section-breadcrumb">
          <ol className="flex flex-wrap gap-x-2 gap-y-1">
            {breadcrumbs.map((item, index) => (
              <li key={`${item.label}-${index}`} className="text-safe-wrap flex items-center gap-2">
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
        <div className="section-heading-copy">
          <h1 className="text-safe-wrap">{title}</h1>
          <p className="text-safe-wrap">{description}</p>
        </div>
        {notice ? <p className="text-safe-wrap mb-6 border-l-2 border-accent pl-4 text-small">{notice}</p> : null}
      </div>
      <SectionLocalNavigation sectionHref={sectionHref} />
    </header>
  );
}
