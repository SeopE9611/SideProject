import AdminPageShell from "@/components/admin/AdminPageShell";
import { Skeleton } from "@/components/ui/skeleton";

export default function BoardsLoading() {
  return (
    <AdminPageShell variant="wide" className="space-y-5">
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}
      </div>
      <div className="space-y-4 rounded-2xl border border-border/70 p-5">
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-40 rounded-2xl" />)}
        </div>
      </div>
    </AdminPageShell>
  );
}
