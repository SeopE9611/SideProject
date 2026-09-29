import Link from "next/link";

type AdminListPaginationProps = {
  label: string;
  page: number;
  totalPages: number;
  previousHref: string;
  nextHref: string;
};

const linkClass = "inline-flex min-h-11 items-center rounded-control border border-border-strong px-4 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";
const disabledClass = "inline-flex min-h-11 items-center rounded-control border border-border px-4 py-2 text-muted-foreground opacity-60";

export function AdminListPagination({ label, page, totalPages, previousHref, nextHref }: AdminListPaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={label} className="flex items-center justify-center gap-4">
      {page > 1 ? <Link href={previousHref} className={linkClass}>이전</Link> : <span className={disabledClass} aria-disabled="true">이전</span>}
      <span className="font-semibold">{page} / {totalPages}</span>
      {page < totalPages ? <Link href={nextHref} className={linkClass}>다음</Link> : <span className={disabledClass} aria-disabled="true">다음</span>}
    </nav>
  );
}
