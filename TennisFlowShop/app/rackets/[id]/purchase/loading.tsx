import SiteContainer from "@/components/layout/SiteContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SiteContainer variant="wide" className="py-8 min-h-[70svh]">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-28 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-6 w-28" />
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-4 w-full" />
            ))}
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </SiteContainer>
  );
}
