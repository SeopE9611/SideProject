import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPageSkeleton() {
  return (
    <div
      className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[0.9fr_1.1fr]"
      data-cy="login-loading-skeleton"
    >
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <Skeleton className="h-14 w-14 rounded-2xl" />
        <Skeleton className="mt-6 h-8 w-4/5" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-3/4" />
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>

        <div className="mt-6 space-y-4">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
