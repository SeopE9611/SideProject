"use client";

import { useEffect } from "react";
import Link from "next/link";

import { ResultState } from "@/components/ui/result-state";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[app/error.tsx] 처리되지 않은 오류:", error);
    }
  }, [error]);

  return (
    <main className="flex min-h-screen items-center bg-background text-foreground">
      <ResultState
        status="error"
        title="페이지를 불러오는 중 문제가 발생했습니다"
        description={
          <p>
            일시적인 오류일 수 있습니다. 다시 시도하거나 홈으로 이동해 필요한 정보를 다시 확인해 주세요.
          </p>
        }
        actions={
          <>
            <button
              className="inline-flex items-center justify-center rounded-control bg-primary px-6 py-2 font-semibold text-primary-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
              onClick={reset}
              type="button"
            >
              다시 시도
            </button>
            <Link
              className="inline-flex items-center justify-center rounded-control border border-border-strong bg-surface px-6 py-2 font-semibold text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
              href="/"
            >
              홈으로 이동
            </Link>
          </>
        }
      >
        {process.env.NODE_ENV === "development" ? (
          <details className="rounded-control border border-border bg-surface p-4 text-small text-foreground">
            <summary className="min-h-11 cursor-pointer py-2 font-semibold">개발 환경 오류 정보</summary>
            <p className="mt-2 break-words font-mono">{error.message}</p>
          </details>
        ) : null}
      </ResultState>
    </main>
  );
}
