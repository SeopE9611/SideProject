"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SiteContainer from "@/components/layout/SiteContainer";
import { ResultState } from "@/components/public";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error.tsx] caught error:", error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="bg-background">
      <SiteContainer className="flex min-h-[60vh] items-center">
        <ResultState
          status="error"
          icon={<AlertTriangle className="h-6 w-6" aria-hidden="true" />}
          title="문제가 발생했어요"
          description="페이지를 불러오는 중 오류가 발생했습니다. 아래 버튼으로 다시 시도해보세요."
          actions={
            <>
              <Button type="button" onClick={reset} wrap="responsive">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                다시 시도
              </Button>
              <Button asChild variant="outline" wrap="responsive">
                <Link href="/">
                  <Home className="h-4 w-4" aria-hidden="true" />
                  홈으로 이동
                </Link>
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
      </SiteContainer>
    </div>
  );
}
