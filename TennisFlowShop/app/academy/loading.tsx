import SiteContainer from "@/components/layout/SiteContainer";
import { Skeleton } from "@/components/ui/skeleton";

export default function AcademyLoading() {
  return (
    <main className="min-h-screen bg-background" aria-busy="true" aria-live="polite">
      <span className="sr-only">아카데미 정보를 불러오는 중입니다.</span>
      <header className="bg-brand-highlight-muted/30 py-6 bp-sm:py-8">
        <SiteContainer>
          <div className="rounded-hero border border-border/80 bg-card p-5 shadow-soft bp-sm:p-6 bp-md:p-8">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-4 h-10 w-64 max-w-full" />
            <Skeleton className="mt-4 h-5 w-full max-w-2xl" />
            <Skeleton className="mt-2 h-5 w-4/5 max-w-xl" />
            <div className="mt-6 flex flex-col gap-2 bp-sm:flex-row">
              <Skeleton className="h-11 w-full bp-sm:w-44" />
              <Skeleton className="h-11 w-full bp-sm:w-28" />
            </div>
          </div>
        </SiteContainer>
      </header>

      <SiteContainer className="space-y-12 py-10 md:space-y-16 md:py-14">
        <section className="space-y-6">
          <LoadingHeader />
          <div className="grid gap-4 bp-lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-panel border border-border/80 bg-card p-5 shadow-soft sm:p-6">
                <Skeleton className="h-11 w-11 rounded-control" />
                <Skeleton className="mt-4 h-6 w-28" />
                <Skeleton className="mt-2 h-4 w-full" />
                <div className="mt-5 space-y-4 border-t border-border pt-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="space-y-6">
          <LoadingHeader />
          <div className="grid overflow-hidden rounded-panel border border-border/80 bg-card shadow-soft bp-lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="flex gap-4 border-b border-border p-5 last:border-b-0 bp-lg:border-b-0 bp-lg:p-6">
                <Skeleton className="h-12 w-12 shrink-0 rounded-control" />
                <div className="min-w-0 flex-1 space-y-3"><Skeleton className="h-5 w-36" /><Skeleton className="h-4 w-32" /></div>
                <Skeleton className="hidden h-11 w-24 bp-sm:block" />
              </div>
            ))}
          </div>
        </section>
        <section className="space-y-6">
          <LoadingHeader />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => <ClassCardSkeleton key={index} />)}
          </div>
        </section>
      </SiteContainer>
    </main>
  );
}

function LoadingHeader() {
  return <div className="space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-64 max-w-full" /><Skeleton className="h-5 w-full max-w-2xl" /></div>;
}

function ClassCardSkeleton() {
  return (
    <div className="rounded-panel border border-border/80 bg-card p-5 shadow-soft sm:p-6">
      <div className="flex gap-2"><Skeleton className="h-6 w-16 rounded-full" /><Skeleton className="h-6 w-16 rounded-full" /></div>
      <Skeleton className="mt-4 h-7 w-3/4" /><Skeleton className="mt-4 h-4 w-full" />
      <div className="mt-4 space-y-3 border-y border-border py-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
      <Skeleton className="mt-6 h-10 w-full" />
    </div>
  );
}
