import Link from "next/link";
import type { ReactNode } from "react";
import type { ContentNeighbors } from "@/features/content/public-content-neighbors";
import { formatPublicDate } from "@/lib/format-public-date";

const row = "grid min-h-12 min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-1 px-2 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center";
const focus = "rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

export function ContentNeighborNavigation({ neighbors, hrefForSlug, backHref, backLabel, children }: {
  neighbors: ContentNeighbors;
  hrefForSlug: (slug: string) => string;
  backHref: string;
  backLabel: string;
  children?: ReactNode;
}) {
  const rows = [
    { label: "다음 글", neighbor: neighbors.next },
    { label: "이전 글", neighbor: neighbors.previous },
  ];
  return (
    <nav aria-label="이전 글과 다음 글" className="mt-7 min-w-0">
      <ul className="divide-y divide-border border-y border-border">
        {rows.map(({ label, neighbor }) => (
          <li key={label}>
            {neighbor.status === "found" ? (
              <Link href={hrefForSlug(neighbor.item.slug)} prefetch={false}
                className={`${row} ${focus} underline-offset-4 hover:text-primary hover:underline`}>
                <span className="whitespace-nowrap text-small font-semibold">{label}</span>
                <span className="text-safe-wrap min-w-0 font-medium">{neighbor.item.title}</span>
                <time dateTime={neighbor.item.publishedAt} className="col-start-2 text-small text-muted-foreground sm:col-start-3">
                  {formatPublicDate(neighbor.item.publishedAt)}
                </time>
              </Link>
            ) : (
              <div className={row}>
                <span className="whitespace-nowrap text-small font-semibold">{label}</span>
                <span className="text-safe-wrap text-small text-muted-foreground">
                  {neighbor.status === "missing" ? "이동할 글이 없습니다" : "이동할 글을 확인하지 못했습니다"}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap justify-between gap-x-6 gap-y-2">
        <Link className={`institution-link inline-flex min-h-11 items-center gap-1 ${focus}`} href={backHref}>
          <span aria-hidden="true">←</span>{backLabel}
        </Link>
        {children}
      </div>
    </nav>
  );
}
