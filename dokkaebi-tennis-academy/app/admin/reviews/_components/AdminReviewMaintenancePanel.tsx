'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import { Wrench, Loader2, Database, ListChecks, RefreshCw, ShieldCheck, Lock } from 'lucide-react';

type Action = 'createIndexes' | 'dedup' | 'rebuildSummary' | 'all';

export default function AdminReviewMaintenancePanel() {
  const [loading, setLoading] = useState<Action | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  async function run(action: Action) {
    setLoading(action);
    setLastResult(null);
    try {
      const res = await fetch('/api/admin/reviews/maintenance', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (res.status === 403) return showErrorToast('관리자만 실행할 수 있습니다.');
      if (res.status === 423) return showErrorToast('다른 유지보수 작업이 실행 중입니다.');

      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || '실행 실패');

      setLastResult(json.result);
      setLastRunAt(new Date().toLocaleString('ko-KR'));
      showSuccessToast('완료되었습니다.');
    } catch (e: any) {
      showErrorToast(e?.message || '실행 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  }

  const disabled = loading !== null;

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          리뷰 유지보수
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => run('createIndexes')} disabled={disabled} variant="outline">
            {loading === 'createIndexes' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            인덱스 보장
          </Button>
          <Button size="sm" onClick={() => run('dedup')} disabled={disabled} variant="outline">
            {loading === 'dedup' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListChecks className="mr-2 h-4 w-4" />}
            중복 리뷰 정리
          </Button>
          <Button size="sm" onClick={() => run('rebuildSummary')} disabled={disabled} variant="outline">
            {loading === 'rebuildSummary' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            평점 재집계
          </Button>
          <Button size="sm" onClick={() => run('all')} disabled={disabled} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700">
            {loading === 'all' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            전체 실행
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          {loading ? (
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              유지보수 실행 중… (다른 탭에서는 잠시 실행 불가)
            </div>
          ) : lastRunAt ? (
            <div>마지막 실행: {lastRunAt}</div>
          ) : (
            <div>아직 실행 내역이 없습니다.</div>
          )}
        </div>

        {lastResult && <pre className="mt-2 whitespace-pre-wrap rounded-md bg-slate-50 dark:bg-slate-900/60 p-3 text-xs">{JSON.stringify(lastResult, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}
