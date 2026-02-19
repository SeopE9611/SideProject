'use client';

import { useEffect } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app/global-error.tsx] caught error:', error);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="ko">
      <body className="m-0 flex min-h-screen items-center justify-center bg-background p-4 text-foreground bp-sm:p-8 bp-md:p-16">
        <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          <div className="h-1.5 w-full bg-destructive" />

          <div className="p-8">
            <div className="mb-6 grid h-14 w-14 place-content-center rounded-2xl bg-destructive text-destructive-foreground">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <h1 className="mb-2 text-3xl font-extrabold tracking-tight">
              <span className="text-destructive">서비스</span>에 오류가 발생했어요
            </h1>
            <p className="leading-relaxed text-muted-foreground">잠시 후 다시 시도해주세요. 문제가 계속되면 관리자에게 알려주세요.</p>

            {isDev && (
              <pre className="mt-4 max-h-48 overflow-auto rounded-xl border border-border bg-muted p-4 text-xs text-foreground">
                {String(error?.message ?? error)}
              </pre>
            )}

            <div className="mt-4">
              <span className="inline-block rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">일시적인 오류일 수 있습니다</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 px-8 pb-8">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4" />
              다시 시도
            </button>
            <button
              type="button"
              onClick={() => (window.location.href = '/')}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Home className="h-4 w-4" />
              홈으로 이동
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
