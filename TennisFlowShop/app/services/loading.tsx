import SiteContainer from "@/components/layout/SiteContainer";
import { Skeleton } from "@/components/ui/skeleton";

export default function ServicesLoading() {
  return (
    <div className="min-h-[70svh] bg-background py-7 bp-sm:py-9" aria-hidden>
      <SiteContainer className="space-y-8">
        <section className="grid gap-5 bp-lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-4 rounded-2xl border border-border bg-muted/30 p-5 bp-sm:p-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full max-w-xl" />
            <Skeleton className="h-5 w-full max-w-2xl" />
            <Skeleton className="h-5 w-4/5 max-w-xl" />
            <div className="grid gap-2 bp-sm:flex">
              <Skeleton className="h-10 w-full bp-sm:w-40" />
              <Skeleton className="h-10 w-full bp-sm:w-40" />
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-5 bp-sm:p-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <Skeleton className="h-8 w-64 max-w-full" />
          <div className="grid gap-4 bp-sm:grid-cols-2 bp-lg:grid-cols-12">
            <Skeleton className="h-60 bp-sm:col-span-2 bp-lg:col-span-6" />
            <Skeleton className="h-60 bp-lg:col-span-3" />
            <Skeleton className="h-60 bp-lg:col-span-3" />
          </div>
        </section>

        <section className="space-y-5">
          <Skeleton className="h-8 w-72 max-w-full" />
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="grid bp-sm:grid-cols-2 bp-lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-2 border-b border-border p-4 bp-sm:border-r">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="m-4 h-8 w-[85%]" />
          </div>
        </section>

        <section className="grid gap-6 bp-lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full max-w-sm" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full bp-sm:w-44" />
          </div>
          <div className="rounded-2xl border border-border">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="grid gap-2 border-b border-border p-4 last:border-b-0 bp-sm:grid-cols-4">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-muted/40 p-5 bp-sm:p-6">
          <Skeleton className="mb-5 h-8 w-48" />
          <div className="grid gap-4 bp-sm:grid-cols-2 bp-lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-3 border-t border-border pt-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border p-5 bp-sm:p-6">
          <Skeleton className="h-7 w-full max-w-sm" />
          <Skeleton className="mt-2 h-5 w-full max-w-xl" />
          <div className="mt-4 grid gap-2 bp-sm:flex">
            <Skeleton className="h-10 w-full bp-sm:w-40" />
            <Skeleton className="h-10 w-full bp-sm:w-36" />
          </div>
        </section>
      </SiteContainer>
    </div>
  );
}
