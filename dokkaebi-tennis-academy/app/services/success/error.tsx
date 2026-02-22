'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // 여기서 원문 에러 확인 가능 (Vercel 함수 로그에도 남음)
    console.error('Success page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-background px-4 py-12 text-foreground">
      <Card className="w-full max-w-lg border-border bg-card text-card-foreground shadow-lg">
        <CardHeader>
          <div className="mb-4 grid h-12 w-12 place-content-center rounded-xl bg-destructive text-destructive-foreground">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">처리 중 오류가 발생했어요</CardTitle>
          <p className="text-sm text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
        </CardHeader>

        <CardContent className="pt-0">
          <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-foreground">
            문제가 지속되면 잠시 후 페이지를 새로고침해 주세요.
          </p>
        </CardContent>

        <CardFooter>
          <Button type="button" onClick={reset} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
