import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPageSkeleton() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background px-4 py-8 md:py-12"
      data-cy="login-loading-skeleton"
    >
      <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/30 p-4 md:p-5">
          <Skeleton className="mx-auto h-14 w-14 rounded-2xl" />
          <Skeleton className="mx-auto mt-3 h-6 w-40" />
          <Skeleton className="mx-auto mt-2 h-4 w-64 max-w-full" />
        </div>

        <div className="border-b border-border px-4 py-3 md:px-5">
          <Skeleton className="h-11 w-full" />
        </div>

        <div className="space-y-4 p-4 md:p-5">
          <div className="space-y-2 text-center">
            <Skeleton className="mx-auto h-7 w-24" />
            <Skeleton className="mx-auto h-4 w-56 max-w-full" />
          </div>
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-4 w-full" />
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
