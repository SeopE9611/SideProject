import AdminPageShell from "@/components/admin/AdminPageShell";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <AdminPageShell variant="wide" className="space-y-6">
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="space-y-3 rounded-2xl border border-border/70 p-5">
            <Skeleton className="h-6 w-32" />
            {Array.from({ length: 4 }).map((__, row) => <Skeleton key={row} className="h-14 w-full rounded-xl" />)}
          </div>
        ))}
      </div>
    </AdminPageShell>
  );
}
