"use client";

import { useEffect } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

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
      <body className="m-0 flex min-h-screen items-center justify-center bg-background p-3 text-foreground bp-sm:p-6 bp-md:p-16">
        <Card variant="feature" className="w-full max-w-2xl overflow-hidden rounded-panel">
          <div className="h-1.5 w-full bg-destructive" />

          <CardContent className="p-6 bp-sm:p-8">
            <div className="mb-6 grid h-14 w-14 place-content-center rounded-control border border-destructive/30 bg-destructive/10 text-destructive">
              <AlertTriangle className="h-7 w-7" aria-hidden="true" />
            </div>

            <h1 className="mb-2 text-ui-page-title font-semibold tracking-normal">
              <span className="text-destructive">서비스</span>에 오류가 발생했어요
            </h1>
            <p className="leading-relaxed text-muted-foreground">
              잠시 후 다시 시도해주세요. 문제가 계속되면 관리자에게 알려주세요.
            </p>

            {isDev && (
              <pre className="mt-4 max-h-48 overflow-auto rounded-xl border border-border bg-muted p-4 text-ui-label text-foreground">
                {String(error?.message ?? error)}
              </pre>
            )}

            <div className="mt-4">
              <Badge variant="warning" className="px-2.5 py-1 text-ui-caption font-medium">
                일시적인 오류일 수 있습니다
              </Badge>
            </div>
          </CardContent>

          <CardFooter className="px-6 pb-6 bp-sm:px-8 bp-sm:pb-8">
            <div className="grid w-full gap-3 bp-sm:flex bp-sm:flex-wrap">
              <Button type="button" onClick={() => reset()} wrap="responsive">
                <RefreshCw className="h-4 w-4" />
                다시 시도
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => (window.location.href = "/")}
                wrap="responsive"
              >
                <Home className="h-4 w-4" />
                홈으로 이동
              </Button>
            </div>
          </CardFooter>
        </Card>
      </body>
    </html>
  );
}
