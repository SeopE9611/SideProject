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
    <header className="article-intro">
      <div className="article-index">
        <Link className="institution-link" href={backHref}>
          ← {backLabel}
        </Link>
        <p className="article-category">{category}</p>
        <dl>
          {metadata.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.dateTime ? <time dateTime={item.dateTime}>{item.value}</time> : item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="article-title">
        <h1 className="text-safe-wrap">{title}</h1>
        {summary?.trim() && summary.trim() !== title.trim() ? <p className="text-safe-wrap">{summary}</p> : null}
        {isDemo ? <p className="article-demo">개발용 예시 콘텐츠이며 공식 시설 소식이 아닙니다.</p> : null}
      </div>
    </header>
  );
}
