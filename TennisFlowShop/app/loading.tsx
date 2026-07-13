import SiteContainer from "@/components/layout/SiteContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="min-h-[70svh] bg-background py-8 bp-sm:py-10">
      <SiteContainer variant="wide" className="space-y-6">
        <section className="rounded-hero border border-border/80 bg-card p-5 bp-sm:p-6 bp-md:p-8">
          <Skeleton className="h-5 w-40 rounded-control" />
          <Skeleton className="mt-4 h-10 w-full max-w-2xl rounded-control bp-sm:h-12" />
          <Skeleton className="mt-3 h-4 w-full max-w-2xl rounded-control" />
          <Skeleton className="mt-2 h-4 w-3/4 max-w-xl rounded-control" />
          <div className="mt-6 flex flex-col gap-2 bp-sm:flex-row">
            <Skeleton className="h-10 w-full rounded-control bp-sm:w-32" />
            <Skeleton className="h-10 w-full rounded-control bp-sm:w-32" />
          </div>
        </section>

        <div className="grid gap-4 bp-md:grid-cols-2 bp-lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="rounded-panel border-border/80 shadow-none">
              <CardHeader className="space-y-3">
                <Skeleton className="h-5 w-32 rounded-control" />
                <Skeleton className="h-4 w-24 rounded-control" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full rounded-control" />
                <Skeleton className="h-4 w-5/6 rounded-control" />
                <Skeleton className="h-4 w-2/3 rounded-control" />
              </CardContent>
            </Card>
          ))}
        </div>
      </SiteContainer>
    </div>
  );
}
