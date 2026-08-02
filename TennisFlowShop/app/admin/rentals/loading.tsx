import AdminPageShell from "@/components/admin/AdminPageShell";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <AdminPageShell variant="wide" className="space-y-5">
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid grid-cols-5 gap-3 rounded-2xl border border-border/70 p-5">
        {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-10 rounded-lg" />)}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border/70">
        <div className="min-w-[1000px] space-y-3 p-4">
          <div className="grid grid-cols-5 gap-4"><Skeleton className="col-span-5 h-10" /></div>
          {Array.from({ length: 6 }).map((_, row) => (
            <div key={row} className="grid grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((__, col) => <Skeleton key={col} className="h-16" />)}
            </div>
          ))}
        </div>
      </div>
    </AdminPageShell>
  );
}
