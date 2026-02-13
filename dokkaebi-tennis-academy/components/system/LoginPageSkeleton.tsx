import { Skeleton } from '@/components/ui/skeleton';

export default function LoginPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10" data-cy="login-loading-skeleton">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
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
