"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SiteContainer from "@/components/layout/SiteContainer";

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
    <div className="min-h-[60vh] bg-background">
      <SiteContainer className="py-10 bp-md:py-16">
        <div className="mx-auto max-w-2xl">
          <Card variant="feature" className="overflow-hidden rounded-panel">
            <div className="h-1.5 w-full bg-destructive" />

            <CardContent className="p-6 bp-md:p-8">
              <div className="mb-6 grid h-14 w-14 place-content-center rounded-control border border-destructive/30 bg-destructive/10 text-destructive">
                <AlertTriangle className="h-7 w-7" aria-hidden="true" />
              </div>

              <h1 className="mb-2 text-ui-page-title font-semibold tracking-normal bp-sm:text-ui-page-title-lg">
                <span className="text-destructive">문제</span>가 발생했어요
              </h1>
              <p className="text-muted-foreground">
                페이지를 불러오는 중 오류가 발생했습니다. 아래 버튼으로 다시 시도해보세요.
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

            <CardFooter className="px-6 pb-6 bp-md:px-8 bp-md:pb-8">
              <div className="grid w-full gap-3 bp-sm:flex bp-sm:flex-wrap">
                <Button onClick={() => reset()} wrap="responsive">
                  <RefreshCw className="h-4 w-4" />
                  다시 시도
                </Button>
                <Button asChild variant="outline" wrap="responsive">
                  <Link href="/">
                    <Home className="h-4 w-4" />
                    홈으로 이동
                  </Link>
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </SiteContainer>
    </div>
  );
}
