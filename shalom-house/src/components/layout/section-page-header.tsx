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

export function SectionPageHeader({ sectionHref, title, description, breadcrumbs, notice }: SectionPageHeaderProps) {
  return (
    <header className="section-rail">
      <nav aria-label="breadcrumb" className="rail-breadcrumb">
        <ol>
          {breadcrumbs.map((item, index) => (
            <li key={`${item.label}-${index}`}>
              {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
            </li>
          ))}
        </ol>
      </nav>
      <h1 className="text-safe-wrap">{title}</h1>
      <p className="rail-description text-safe-wrap">{description}</p>
      <SectionLocalNavigation sectionHref={sectionHref} />
      {notice ? <p className="rail-notice text-safe-wrap">{notice}</p> : null}
    </header>
  );
}
