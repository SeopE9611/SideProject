'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app/error.tsx] caught error:', error);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-[60vh] bg-gradient-to-br from-slate-50 via-muted to-card dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <Card className="relative overflow-hidden border-0 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] backdrop-blur-sm bg-card/90 dark:bg-card">
            <div className="h-1.5 w-full bg-gradient-to-r from-background via-muted to-card" />

            <CardContent className="p-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-background to-card text-white grid place-content-center shadow-lg mb-6">
                <AlertTriangle className="h-7 w-7" />
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
                <span className="text-destructive dark:text-destructive">문제</span>가 발생했어요
              </h1>
              <p className="text-muted-foreground dark:text-muted-foreground">페이지를 불러오는 중 오류가 발생했습니다. 아래 버튼으로 다시 시도해보세요.</p>

              {isDev && <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-muted dark:bg-card p-4 text-xs text-foreground ring-1 ring-ring dark:ring-ring">{String(error?.message ?? error)}</pre>}

              <div className="mt-4">
                <Badge className="bg-destructive/10 text-destructive dark:text-destructive ring-1 ring-inset ring-ring">일시적인 오류일 수 있습니다</Badge>
              </div>
            </CardContent>

            <CardFooter className="px-8 pb-8">
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => reset()} className="bg-gradient-to-r from-background to-card hover:from-background hover:to-card text-white">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  다시 시도
                </Button>
                <Button asChild variant="outline" className="border-border dark:border-border bg-transparent">
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    홈으로 이동
                  </Link>
                </Button>
              </div>
            </CardFooter>

            <div className="pointer-events-none absolute -top-24 -right-24 h-44 w-44 rounded-full bg-destructive/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-warning/10 blur-3xl" />
          </Card>
        </div>
      </div>
    </div>
  );
}
