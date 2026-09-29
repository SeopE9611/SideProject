import { Skeleton } from "@/components/ui/skeleton";

type Props = { mode?: "login" | "register" | "single" };

export default function LoginPageSkeleton({ mode = "login" }: Props) {
  const isRegister = mode === "register";

  return (
    <div
      className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-brand-highlight-muted/35 px-4 py-6 sm:px-6 sm:py-8"
      data-cy="login-loading-skeleton"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="sr-only">인증 화면을 불러오는 중입니다.</p>
      <div
        className={`w-full rounded-panel border border-border bg-card shadow-soft ${isRegister ? "max-w-2xl" : "max-w-md"}`}
      >
        <div className="border-b border-border bg-brand-highlight-muted/45 px-4 py-6 text-center sm:px-8 sm:py-8">
          <Skeleton className="mx-auto h-14 w-14 rounded-control" />
          <Skeleton className="mx-auto mt-3 h-7 w-40" />
          <Skeleton className="mx-auto mt-2 h-4 w-64 max-w-full" />
        </div>
        <div className="p-4 sm:p-6">
          {mode !== "single" ? (
            <>
              <Skeleton className="mb-5 h-13 w-full rounded-control" />
              {isRegister ? (
                <div className="space-y-4">
                  <Skeleton className="mx-auto h-7 w-24" />
                  <Skeleton className="h-28 w-full rounded-control" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-52 w-full rounded-panel" />
                  <Skeleton className="h-40 w-full rounded-panel" />
                  <Skeleton className="h-12 w-full rounded-control" />
                </div>
              ) : (
                <div className="space-y-4">
                  <Skeleton className="mx-auto h-7 w-20" />
                  <Skeleton className="h-28 w-full rounded-control" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-12 w-full rounded-control" />
                  <Skeleton className="h-12 w-full rounded-control" />
                  <Skeleton className="h-12 w-full rounded-control" />
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-12 w-full rounded-control" />
              <Skeleton className="h-12 w-full rounded-control" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
