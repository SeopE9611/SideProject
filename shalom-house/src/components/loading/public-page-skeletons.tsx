import { Skeleton } from "@/components/ui/skeleton";

function PublicHeaderSkeleton() {
  return (
    <header className="section-rail" aria-hidden="true">
      <Skeleton className="h-4 w-36" /><Skeleton className="mt-6 h-10 w-52 max-w-full" /><Skeleton className="mt-4 h-5 w-[34rem] max-w-full" />
      <div className="mt-7 flex gap-3"><Skeleton className="h-11 w-24" /><Skeleton className="h-11 w-28" /><Skeleton className="h-11 w-24" /></div>
    </header>
  );
}

export function NewsListPageSkeleton({ showCategoryFilter = true }: { showCategoryFilter?: boolean }) {
  return (
    <div className="section-layout" aria-busy="true">
      <p className="sr-only" role="status">소식 목록을 불러오는 중입니다.</p><PublicHeaderSkeleton />
      <div className="mx-auto max-w-site px-page py-8 sm:px-page-wide sm:py-12" aria-hidden="true">
        <div className={`filter-toolbar grid items-end gap-4 p-5 sm:px-7 sm:py-6 ${showCategoryFilter ? "grid-cols-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto]" : "grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto]"}`}>
          <div className={showCategoryFilter ? "col-span-2 space-y-2 sm:col-span-1" : "space-y-2"}><Skeleton className="h-4 w-16" /><Skeleton className="h-13 w-full" /></div>
          {showCategoryFilter ? <div className="space-y-2"><Skeleton className="h-4 w-12" /><Skeleton className="h-13 w-full" /></div> : null}<Skeleton className="h-13 w-24" />
        </div>
        <section className="mt-8 sm:mt-10"><div className="border-b border-border-strong pb-5"><Skeleton className="h-8 w-36" /></div>
          <div className="divide-y divide-border border-b border-border">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="grid gap-4 py-7 md:grid-cols-[7rem_minmax(0,1fr)_9rem]"><Skeleton className="h-5 w-20" /><div className="space-y-3"><Skeleton className="h-6 w-4/5" /><Skeleton className="h-4 w-full" /></div><Skeleton className="h-4 w-24 md:justify-self-end" /></div>)}</div>
        </section>
      </div>
    </div>
  );
}

export function GalleryPageSkeleton() {
  return (
    <div className="section-layout" aria-busy="true"><p className="sr-only" role="status">활동사진을 불러오는 중입니다.</p><PublicHeaderSkeleton />
      <section className="mx-auto max-w-site px-page py-7 sm:px-page-wide sm:py-9" aria-hidden="true">
        <div className="gallery-list-toolbar border-b border-border pb-3"><Skeleton className="h-7 w-36" /><Skeleton className="h-5 w-28" /></div>
        <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index}><Skeleton className="aspect-[4/3] w-full rounded-panel" /><div className="mt-4 space-y-3"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-6 w-5/6" /><Skeleton className="h-4 w-full" /></div></div>)}</div>
      </section>
    </div>
  );
}

export function TransparencyPageSkeleton() {
  return (
    <div className="section-layout" aria-busy="true"><p className="sr-only" role="status">자료 목록을 불러오는 중입니다.</p><PublicHeaderSkeleton />
      <div className="mx-auto max-w-site px-page py-9 sm:px-page-wide sm:py-12" aria-hidden="true">
        <div className="filter-toolbar grid grid-cols-2 items-end gap-4 p-5 sm:p-6 lg:grid-cols-[14rem_18rem_max-content] lg:justify-start">{Array.from({ length: 2 }).map((_, index) => <div key={index} className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-12 w-full" /></div>)}<Skeleton className="col-span-2 h-12 w-full lg:col-span-1 lg:w-28" /></div>
        <section className="mt-9"><div className="border-b border-border-strong pb-4"><Skeleton className="h-4 w-20" /><Skeleton className="mt-2 h-7 w-36" /></div>
          <div className="border-b border-border">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="grid gap-4 border-b border-border py-6 last:border-b-0 lg:grid-cols-[7rem_minmax(0,1fr)_13rem]"><Skeleton className="h-4 w-20" /><div className="space-y-3"><Skeleton className="h-6 w-4/5" /><Skeleton className="h-4 w-full" /><div className="grid grid-cols-3 gap-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></div><div className="space-y-3 lg:border-l lg:border-border lg:pl-6"><Skeleton className="h-4 w-24" /><Skeleton className="h-11 w-28" /></div></div>)}</div>
        </section><Skeleton className="mt-8 h-20 w-full rounded-none" />
      </div>
    </div>
  );
}

export function PublicDetailPageSkeleton() {
  return <div className="reading-layout" aria-busy="true"><p className="sr-only" role="status">상세 내용을 불러오는 중입니다.</p><article className="py-10" aria-hidden="true"><Skeleton className="h-4 w-32" /><Skeleton className="mt-5 h-10 w-4/5" /><Skeleton className="mt-4 h-5 w-48" /><div className="mt-10 space-y-4"><Skeleton className="aspect-[4/3] w-full max-w-3xl rounded-panel" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-3/4" /></div></article></div>;
}
