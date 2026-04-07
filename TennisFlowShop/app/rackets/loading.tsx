import SiteContainer from "@/components/layout/SiteContainer";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-full bg-muted/30">
      <div className="relative overflow-hidden bg-muted/30 py-10 bp-sm:py-12 bp-md:py-24">
        <div className="absolute inset-0 bg-overlay/20" />
        <SiteContainer variant="wide" className="relative text-center">
          <Skeleton className="mx-auto h-12 w-52" />
          <Skeleton className="mx-auto mt-4 h-5 w-[520px] max-w-full" />
          <Skeleton className="mx-auto mt-6 h-10 w-64" />
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-6 bp-sm:py-8 bp-md:py-12">
        <Card className="rounded-2xl border-border/50 bg-card p-4 bp-sm:p-5">
          <div className="flex flex-wrap items-center gap-3 bp-sm:gap-4">
            <Skeleton className="h-9 w-full bp-sm:w-56" />
            <Skeleton className="h-9 w-[48%] bp-sm:w-36" />
            <Skeleton className="h-9 w-[48%] bp-sm:w-36" />
            <Skeleton className="h-9 w-28 bp-sm:ml-auto" />
          </div>
        </Card>
        <div className="mt-6 grid grid-cols-1 gap-4 bp-sm:grid-cols-2 bp-lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden rounded-xl border border-border/40 bg-background/60">
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-20" />
              </div>
            </Card>
          ))}
        </div>
      </SiteContainer>
    </div>
  );
}
