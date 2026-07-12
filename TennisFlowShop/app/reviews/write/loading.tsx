import SiteContainer from "@/components/layout/SiteContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background pb-28 bp-lg:pb-0">
      <SiteContainer className="py-6 bp-md:py-8">
        <div className="mx-auto max-w-6xl space-y-5">
          <Card variant="feature" className="rounded-panel"><CardContent className="space-y-4 p-5 bp-md:p-6"><Skeleton className="h-5 w-24" /><Skeleton className="h-5 w-40" /><Skeleton className="h-9 w-80 max-w-full" /><Skeleton className="h-4 w-[min(32rem,100%)]" /></CardContent></Card>
          <div className="grid grid-cols-3 gap-2 rounded-panel border border-border bg-card p-3 shadow-soft"><Skeleton className="h-12 rounded-control" /><Skeleton className="h-12 rounded-control" /><Skeleton className="h-12 rounded-control" /></div>
          <Card className="rounded-panel border-border bg-card shadow-soft"><CardContent className="space-y-4 p-4 bp-sm:p-5"><div className="flex justify-between gap-3"><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-7 w-56" /></div><Skeleton className="h-6 w-20 rounded-full" /></div><div className="rounded-panel border border-border bg-card p-3"><div className="flex flex-col gap-2 bp-lg:flex-row"><Skeleton className="h-24 flex-1 rounded-control" /><Skeleton className="h-24 flex-1 rounded-control" /></div></div></CardContent></Card>
          <div className="bp-lg:hidden"><Skeleton className="h-52 rounded-panel" /></div>
          <div className="grid gap-5 bp-lg:grid-cols-[minmax(0,1fr)_320px] bp-lg:items-start">
            <Card className="rounded-panel border-border bg-card shadow-soft"><CardContent className="space-y-7 p-4 bp-sm:p-6"><div className="space-y-3"><Skeleton className="h-6 w-20" /><Skeleton className="h-28 w-full rounded-panel" /></div><div className="space-y-3"><Skeleton className="h-6 w-24" /><Skeleton className="h-44 w-full rounded-control" /></div><div className="space-y-3"><Skeleton className="h-6 w-24" /><Skeleton className="h-36 w-full rounded-panel" /></div><div className="flex justify-end gap-2"><Skeleton className="h-11 w-28" /><Skeleton className="hidden h-11 w-28 bp-lg:block" /></div></CardContent></Card>
            <Skeleton className="hidden h-56 rounded-panel bp-lg:block" />
          </div>
        </div>
      </SiteContainer>
      <div data-bottom-sticky="1" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 bp-lg:hidden"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3"><Skeleton className="h-5 w-44" /><Skeleton className="h-11 w-24 rounded-control" /></div></div>
    </div>
  );
}
