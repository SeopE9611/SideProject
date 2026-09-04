import Link from "next/link";

type ContentDetailHeaderProps = {
  title: string;
  summary?: string;
  category: string;
  backHref: string;
  backLabel: string;
  metadata: readonly { label: string; value: string; dateTime?: string }[];
  isDemo?: boolean;
};

export function ContentDetailHeader({
  title,
  summary,
  category,
  backHref,
  backLabel,
  metadata,
  isDemo,
}: ContentDetailHeaderProps) {
  return (
    <header className="border-t-4 border-accent border-b border-b-border pt-6 pb-6">
      <nav aria-label="목록 탐색">
        <Link className="institution-link text-small" href={backHref}>
          <span aria-hidden="true">←</span> {backLabel}
        </Link>
      </nav>
      <p className="text-safe-wrap mt-4 text-small font-bold text-accent">{category}</p>
      <h1 className="text-safe-wrap mt-2 text-heading font-bold leading-snug sm:text-title">{title}</h1>
      {summary?.trim() && summary.trim() !== title.trim() ? (
        <p className="text-safe-wrap mt-3 max-w-content text-body leading-7 text-muted-foreground">{summary}</p>
      ) : null}
      <dl className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-small">
        {metadata.map((item) => (
          <div key={item.label} className="min-w-0 border-l border-border pl-3">
            <dt className="text-muted-foreground">{item.label}</dt>
            <dd className="text-safe-wrap mt-1 font-medium">
              {item.dateTime ? <time dateTime={item.dateTime}>{item.value}</time> : item.value}
            </dd>
          </div>
        ))}
      </dl>
      {isDemo ? (
        <p className="mt-5 border-l-4 border-accent bg-surface-subtle px-4 py-3 text-small text-muted-foreground">
          개발용 예시 콘텐츠이며 공식 시설 소식이 아닙니다.
        </p>
      ) : null}
    </header>
  );
}
