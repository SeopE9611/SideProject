"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

import SiteContainer from "@/components/layout/SiteContainer";
import { ResultState } from "@/components/public";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // 여기서 원문 에러 확인 가능 (Vercel 함수 로그에도 남음)
    console.error("Success page error:", error);
  }, [error]);

  return (
    <div className="bg-background">
      <SiteContainer className="flex min-h-[60vh] items-center">
        <ResultState
          status="error"
          icon={<AlertTriangle className="h-6 w-6" aria-hidden="true" />}
          title="처리 중 오류가 발생했어요"
          description="잠시 후 다시 시도해 주세요."
          actions={
            <Button type="button" onClick={reset} wrap="responsive">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              다시 시도
            </Button>
          }
        >
          <p className="rounded-control border border-border/70 bg-muted/20 p-3 text-ui-body-sm text-muted-foreground">
            문제가 지속되면 잠시 후 페이지를 새로고침해 주세요.
          </p>
        </ResultState>
      </SiteContainer>
    </div>
  );
}
