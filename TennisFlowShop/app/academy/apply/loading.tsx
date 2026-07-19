import SiteContainer from "@/components/layout/SiteContainer";
import { Skeleton } from "@/components/ui/skeleton";

export default function AcademyApplyLoading() {
  return (
    <main className="min-h-screen bg-background" aria-busy="true" aria-live="polite">
      <span className="sr-only">아카데미 신청 화면을 불러오는 중입니다.</span>
      <header className="bg-brand-highlight-muted/30 py-6 bp-sm:py-8">
        <SiteContainer>
          <div className="rounded-hero border border-border/80 bg-card p-5 shadow-soft bp-sm:p-6 bp-md:p-8">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-10 w-48" />
            <Skeleton className="mt-4 h-5 w-full max-w-2xl" />
            <Skeleton className="mt-6 h-11 w-full bp-sm:w-44" />
          </div>
        </SiteContainer>
      </header>
      <SiteContainer className="py-8 md:py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <Panel lines={3} />
          <div className="rounded-panel border border-border/80 bg-card shadow-soft">
            <div className="border-b border-border bg-brand-highlight-muted/45 p-5">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-7 w-2/3" />
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-control border border-border p-3">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="mt-2 h-4 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Panel fields={3} />
          <Panel fields={5} />
          <div className="rounded-panel border border-border/80 bg-card p-5 shadow-soft sm:p-6">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="mt-2 h-4 w-full max-w-xl" />
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Skeleton className="h-11 w-full sm:w-40" />
              <Skeleton className="h-11 w-full sm:w-36" />
            </div>
          </div>
        </div>
      </SiteContainer>
    </main>
  );
}

function Panel({ lines, fields }: { lines?: number; fields?: number }) {
  return (
    <div className="rounded-panel border border-border/80 bg-card shadow-soft">
      <div className="bg-brand-highlight-muted/45 p-5">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      <div className="space-y-4 p-5 sm:p-6">
        {lines ? (
          Array.from({ length: lines }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-full last:w-4/5" />
          ))
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {Array.from({ length: fields ?? 2 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full rounded-control" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
