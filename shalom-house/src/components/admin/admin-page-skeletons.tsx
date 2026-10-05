import { Skeleton } from "@/components/ui/skeleton";

type AdminListPageSkeletonProps = {
  columns?: number;
  filterFields?: number;
  headerActions?: number;
  rows?: number;
  summaryItems?: number;
};

export function AdminListPageSkeleton({
  columns = 6,
  filterFields = 3,
  headerActions = 1,
  rows = 6,
  summaryItems = 0,
}: AdminListPageSkeletonProps) {
  const columnsClassName = columns === 7 ? "xl:grid-cols-7" : "xl:grid-cols-6";

  return (
    <div className="admin-list-layout" aria-busy="true">
      <p className="sr-only" role="status">관리자 목록을 불러오는 중입니다.</p>
      <header className="admin-page-heading flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" aria-hidden="true">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-44 max-w-full" />
          <Skeleton className="h-5 w-[32rem] max-w-full" />
          <Skeleton className="h-4 w-[38rem] max-w-full" />
        </div>
        <div className="flex gap-3">
          {Array.from({ length: headerActions }).map((_, index) => <Skeleton key={index} className="h-11 w-32" />)}
        </div>
      </header>

      {summaryItems > 0 ? (
        <section className="admin-section" aria-hidden="true">
          <Skeleton className="h-6 w-28" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: summaryItems }).map((_, index) => (
              <div key={index} className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-7 w-14" /></div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="admin-filter" aria-hidden="true">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-2 h-4 w-36" />
        <div className="mt-4 flex flex-col gap-4 max-lg:grid max-lg:grid-cols-2 max-sm:grid-cols-1">
          {Array.from({ length: filterFields }).map((_, index) => (
            <div key={index} className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-11 w-full" /></div>
          ))}
          <div className="flex gap-2 max-lg:col-span-2 max-sm:col-span-1"><Skeleton className="h-11 w-24" /><Skeleton className="h-11 w-24" /></div>
        </div>
      </section>

      <section aria-hidden="true">
        <div className="hidden gap-4 border-y border-border bg-surface-subtle px-4 py-3 xl:grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((_, index) => <Skeleton key={index} className="h-4 w-16 bg-surface" />)}
        </div>
        <div className="divide-y divide-border border-b border-border">
          {Array.from({ length: rows }).map((_, row) => (
            <div key={row} className={`grid gap-3 px-4 py-4 md:grid-cols-2 xl:gap-4 ${columnsClassName}`}>
              <div className="space-y-2 md:col-span-2 xl:col-span-1"><Skeleton className="h-5 w-4/5" /><Skeleton className="h-4 w-2/3" /></div>
              {Array.from({ length: columns - 1 }).map((_, cell) => <Skeleton key={cell} className="h-4 w-3/4" />)}
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-center gap-4"><Skeleton className="h-11 w-20" /><Skeleton className="h-6 w-16" /><Skeleton className="h-11 w-20" /></div>
      </section>
    </div>
  );
}

export function AdminDetailPageSkeleton() {
  return (
    <div className="admin-detail-layout" aria-busy="true">
      <p className="sr-only" role="status">관리자 상세 내용을 불러오는 중입니다.</p>
      <header className="admin-record-heading border-b border-border pb-6" aria-hidden="true">
        <Skeleton className="h-8 w-64 max-w-full" /><Skeleton className="mt-3 h-4 w-80 max-w-full" />
      </header>
      <aside className="admin-summary space-y-3" aria-hidden="true"><Skeleton className="h-5 w-24" /><Skeleton className="h-7 w-32" /><Skeleton className="h-4 w-full" /></aside>
      <div className="space-y-6" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <section key={index} className="admin-section space-y-4"><Skeleton className="h-6 w-36" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-2/3" /></section>
        ))}
      </div>
    </div>
  );
}

export function AdminFormPageSkeleton() {
  return (
    <div className="admin-editor-layout" aria-busy="true">
      <p className="sr-only" role="status">관리자 입력 화면을 불러오는 중입니다.</p>
      <header className="border-b border-border pb-6" aria-hidden="true"><Skeleton className="h-8 w-60 max-w-full" /><Skeleton className="mt-3 h-4 w-96 max-w-full" /></header>
      <section className="space-y-6" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => <div key={index} className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className={index === 3 ? "h-28 w-full" : "h-11 w-full"} /></div>)}
        <div className="flex gap-3"><Skeleton className="h-11 w-28" /><Skeleton className="h-11 w-24" /></div>
      </section>
    </div>
  );
}
