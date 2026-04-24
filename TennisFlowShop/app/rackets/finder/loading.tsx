import SiteContainer from "@/components/layout/SiteContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function RacketFinderLoading() {
  return (
    <SiteContainer variant="wide" className="py-6">
      <div className="space-y-6">
        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="py-4 space-y-2">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-64 max-w-full" />
                <Skeleton className="h-4 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SiteContainer>
  );
}
