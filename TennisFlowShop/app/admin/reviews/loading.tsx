import AdminPageShell from "@/components/admin/AdminPageShell";
import { adminSurface } from "@/components/admin/admin-typography";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const REVIEW_LOADING_GRID =
  "min-w-[1080px] grid-cols-[44px_minmax(120px,1fr)_minmax(260px,2.4fr)_minmax(100px,0.9fr)_minmax(110px,1fr)_minmax(96px,0.8fr)_minmax(112px,0.9fr)_144px]";

export default function ReviewsLoading() {
  return (
    <AdminPageShell variant="wide" className="space-y-5">
      <div
        aria-busy="true"
        aria-label="후기 관리 화면을 불러오는 중"
        className="space-y-5"
      >
        <span className="sr-only">후기 관리 화면을 불러오는 중입니다.</span>

        <div
          aria-hidden="true"
          className="flex items-start justify-between gap-3 px-1 py-0.5"
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-7 w-36" />
              <Skeleton className="h-4 w-[36rem] max-w-full" />
              <Skeleton className="h-3 w-[48rem] max-w-full" />
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="inline-grid h-10 w-72 grid-cols-2 items-center rounded-md bg-muted p-1"
        >
          <div className="flex h-8 items-center justify-center rounded-sm bg-card shadow-sm">
            <Skeleton className="h-3 w-10" />
          </div>
          <div className="flex h-8 items-center justify-center rounded-sm">
            <Skeleton className="h-3 w-14" />
          </div>
        </div>

        <div aria-hidden="true" className="space-y-5">
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className={adminSurface.kpiCard}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-7 w-14" />
                    </div>
                    <Skeleton className="h-9 w-9 rounded-md" />
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className={cn(adminSurface.kpiCard, "col-span-2 min-h-0")}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-5 rounded-sm" />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {[
                    "w-32",
                    "w-40",
                    "w-36",
                    "w-28",
                    "w-40",
                  ].map((width, index) => (
                    <Skeleton key={index} className={cn("h-3", width)} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="sticky top-20 z-20 -mt-2 mb-2 rounded-lg border border-border bg-background px-3 py-2.5 supports-[backdrop-filter]:bg-card/95">
            <div className="flex items-end justify-between gap-3">
              <div className="grid min-w-0 flex-1 grid-cols-[minmax(260px,2fr)_minmax(140px,1fr)_minmax(200px,1.4fr)] items-end gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="min-w-0 space-y-1.5">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-9 w-full rounded-md" />
                  </div>
                ))}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Skeleton className="h-9 w-28 rounded-md" />
                <Skeleton className="h-9 w-20 rounded-md" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
                <Skeleton className="h-4 w-4 rounded-sm" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
                <Skeleton className="h-4 w-4 rounded-sm" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 border-t border-border/50 pt-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>

          <div className={adminSurface.tableCard}>
            <div className="max-h-[70vh] overflow-x-auto overflow-y-auto">
              <div
                className={cn(
                  "sticky top-0 z-[1] grid items-center gap-x-3 border-b border-border bg-muted/40",
                  REVIEW_LOADING_GRID,
                )}
              >
                {[
                  ["flex justify-center px-0 py-3", "w-4"],
                  ["flex justify-start px-3 py-3", "w-16"],
                  ["flex justify-start px-3 py-3", "w-20"],
                  ["flex justify-center px-3 py-3", "w-20"],
                  ["flex justify-end px-3 py-3", "w-16"],
                  ["flex justify-center px-3 py-3", "w-16"],
                  ["flex justify-center px-3 py-3", "w-20"],
                  ["flex justify-end px-3 py-3", "w-12"],
                ].map(([cellClassName, width], index) => (
                  <div key={index} className={cellClassName}>
                    <Skeleton className={cn("h-3", width)} />
                  </div>
                ))}
              </div>
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "grid items-center gap-x-3 gap-y-2 border-b border-border px-3 py-3 last:border-b-0",
                    REVIEW_LOADING_GRID,
                  )}
                >
                  <div className="flex justify-center"><Skeleton className="h-4 w-4 rounded-sm" /></div>
                  <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /></div>
                  <div className="space-y-2"><Skeleton className="h-4 w-full max-w-[320px]" /><Skeleton className="h-3 w-[70%] max-w-[220px]" /></div>
                  <div className="flex justify-center"><Skeleton className="h-4 w-20" /></div>
                  <div className="flex flex-col items-end space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-14" /></div>
                  <div className="flex justify-center"><Skeleton className="h-6 w-20 rounded-full" /></div>
                  <div className="flex flex-col items-center space-y-2"><Skeleton className="h-6 w-20 rounded-full" /><Skeleton className="h-5 w-10 rounded-full" /></div>
                  <div className="flex justify-end gap-2"><Skeleton className="h-8 w-20 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /></div>
                </div>
              ))}
            </div>
            <div className="h-12 border-t border-border/30" />
          </div>
        </div>
      </div>
    </AdminPageShell>
  );
}
