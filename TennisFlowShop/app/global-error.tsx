"use client";

import { useEffect } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResultState } from "@/components/public";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error.tsx] caught error:", error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <html lang="ko">
      <body className="m-0 min-h-screen bg-background text-foreground">
        <main className="flex min-h-screen items-center justify-center p-3 bp-sm:p-6 bp-md:p-16">
          <ResultState
            status="error"
            icon={<AlertTriangle className="h-6 w-6" aria-hidden="true" />}
            title="서비스에 오류가 발생했어요"
            description="잠시 후 다시 시도해주세요. 문제가 계속되면 관리자에게 알려주세요."
            actions={
              <>
                <Button type="button" onClick={reset} wrap="responsive">
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  다시 시도
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => (window.location.href = "/")}
                  wrap="responsive"
                >
                  <Home className="h-4 w-4" aria-hidden="true" />
                  홈으로 이동
                </Button>
              </>
            }
          >
            {isDev && (
              <pre className="max-h-48 overflow-auto rounded-control border border-border/70 bg-muted/20 p-3 text-ui-label text-foreground">
                {String(error?.message ?? error)}
              </pre>
            )}

            <div className="mt-4">
              <Badge variant="warning" className="px-2.5 py-1 text-ui-caption font-medium">
                일시적인 오류일 수 있습니다
              </Badge>
            </div>
          </ResultState>
        </main>
      </body>
    </html>
  );
}
