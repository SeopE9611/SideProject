import AdminPageShell from "@/components/admin/AdminPageShell";
import { adminSurface } from "@/components/admin/admin-typography";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const SETTLEMENT_GRID_TEMPLATE =
  "44px 100px 220px 190px 180px 130px 150px";

export default function AdminSettlementsLoading() {
  return (
    <AdminPageShell variant="wide" className="space-y-8">
      <div
        aria-busy="true"
        aria-label="정산 관리 화면을 불러오는 중"
        className="space-y-8"
      >
        <span className="sr-only">정산 관리 화면을 불러오는 중입니다.</span>

        <div
          aria-hidden="true"
          className="flex items-start justify-between gap-3 px-1 py-1"
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-[34rem] max-w-full" />
              <Skeleton className="h-3 w-[46rem] max-w-full" />
            </div>
          </div>
          <Skeleton className="h-8 w-52 shrink-0 rounded-md" />
        </div>

        <div aria-hidden="true" className="mb-8 grid grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className={cn(adminSurface.kpiCard, "overflow-hidden")}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-9 w-28" />
                    {index > 0 ? <Skeleton className="h-3 w-20" /> : null}
                  </div>
                  <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div
          aria-hidden="true"
          className="overflow-x-auto rounded-t-2xl border-b bg-card"
        >
          <div className="flex min-w-max gap-1 px-6">
            <div className="relative flex items-center justify-center px-6 py-4">
              <Skeleton className="h-3 w-20" />
              <div className="absolute inset-x-0 bottom-0 h-1 rounded-t-full bg-primary" />
            </div>
            <div className="relative flex items-center justify-center px-6 py-4">
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>

        <div aria-hidden="true" className="space-y-6">
          <Card className={adminSurface.card}>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="w-full space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-12 w-36 rounded-xl" />
                  <Skeleton className="h-12 w-36 rounded-xl" />
                  <Skeleton className="h-12 w-32 rounded-xl" />
                  <Skeleton className="h-12 w-32 rounded-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(adminSurface.tableCard, "mx-auto max-w-6xl overflow-visible")}>
            <div className="overflow-x-auto">
              <div className="min-w-[1000px]">
                <div className="sticky top-0 z-10 border-b border-border bg-muted">
                  <div
                    className="grid gap-3 p-4"
                    style={{ gridTemplateColumns: SETTLEMENT_GRID_TEMPLATE }}
                  >
                    {[
                      ["flex justify-center", "w-4"],
                      ["flex justify-center", "w-16"],
                      ["flex justify-end", "w-20"],
                      ["flex justify-end", "w-16"],
                      ["flex justify-end", "w-20"],
                      ["flex justify-center", "w-16"],
                      ["sticky right-0 flex justify-center bg-muted", "w-12"],
                    ].map(([cellClassName, width], index) => (
                      <div key={index} className={cellClassName}>
                        <Skeleton className={cn("h-3", width)} />
                      </div>
                    ))}
                  </div>
                </div>
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="grid gap-3 border-b border-border p-4 last:border-b-0"
                    style={{ gridTemplateColumns: SETTLEMENT_GRID_TEMPLATE }}
                  >
                    <div className="flex justify-center"><Skeleton className="h-4 w-4 rounded-sm" /></div>
                    <div className="flex justify-center"><Skeleton className="h-4 w-16" /></div>
                    <div className="flex flex-col items-end space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-20" /></div>
                    <div className="flex flex-col items-end space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-3 w-16" /></div>
                    <div className="flex flex-col items-end space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-20" /></div>
                    <div className="flex justify-center"><Skeleton className="h-6 w-20 rounded-full" /></div>
                    <div className="sticky right-0 flex justify-end gap-2 bg-card"><Skeleton className="h-8 w-20 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /></div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminPageShell>
  );
}
