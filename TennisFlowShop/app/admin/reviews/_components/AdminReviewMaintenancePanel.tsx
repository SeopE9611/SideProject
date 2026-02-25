'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import { adminFetcher, adminMutator } from '@/lib/admin/adminFetcher';
import { runAdminActionWithToast } from '@/lib/admin/adminActionHelpers';
import { Wrench, Loader2, Database, ListChecks, RefreshCw, ShieldCheck, Lock, Unlock, Info } from 'lucide-react';

type Action = 'createIndexes' | 'dedup' | 'rebuildSummary' | 'all';

type LockStatus = {
  locked: boolean;
  lockedUntil?: string;
  lockedBy?: string | null;
};

export default function AdminReviewMaintenancePanel() {
  const [loading, setLoading] = useState<Action | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  const {
    data: lockStatus = { locked: false },
    mutate: mutateLockStatus,
  } = useSWR<LockStatus>(
    '/api/admin/reviews/maintenance',
    async (url: string) => {
      const payload = await adminFetcher<{ locked?: boolean; lockedUntil?: string; lockedBy?: string | null }>(url, { method: 'GET' });
      return {
        locked: !!payload?.locked,
        lockedUntil: payload?.lockedUntil,
        lockedBy: payload?.lockedBy ?? null,
      };
    },
    {
      fallbackData: { locked: false },
      refreshInterval: loading ? 1500 : 0,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  async function run(action: Action) {
    setLoading(action);
    setLastResult(null);
    try {
      const json = await adminMutator<{ ok?: boolean; error?: string; result?: unknown }>('/api/admin/reviews/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!json?.ok) throw new Error(json?.error || '실행 실패');

      setLastResult(json.result);
      setLastRunAt(new Date().toLocaleString('ko-KR'));
      showSuccessToast('완료되었습니다.');
    } catch (e: any) {
      showErrorToast(e?.message || '실행 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
      // 실행이 끝났으니 최신 잠금 상태 반영
      mutateLockStatus();
    }
  }

  async function forceUnlock() {
    try {
      const result = await runAdminActionWithToast({
        action: () => adminMutator('/api/admin/reviews/maintenance', { method: 'DELETE' }),
        successMessage: '잠금을 해제했습니다.',
        fallbackErrorMessage: '강제 해제 중 오류',
      });
      if (result) mutateLockStatus({ locked: false }, false);
    } catch (e: any) {
      showErrorToast(e?.message || '강제 해제 중 오류');
    }
  }

  const disabled = loading !== null;

  return (
    <Card className="border-0 shadow-md bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Wrench className="h-5 w-5" />
          리뷰 유지보수
        </CardTitle>
        <CardContent>
          <span className="font-bold text-foreground">개발자 전용입니다 — 관리자는 해당 기능을 개발자 동의 없이 클릭하지마세요!!! </span>
        </CardContent>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 액션 버튼들 */}
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
          <Button size="sm" onClick={() => run('all')} disabled={disabled} variant="default">
            {loading === 'all' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            전체 실행
          </Button>
        </div>

        {/* 잠금 상태 / 강제 해제 */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {loading ? (
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <Lock className="h-4 w-4" />
              유지보수 실행 중… (다른 탭에서는 잠시 실행 불가)
            </div>
          ) : lockStatus.locked ? (
            <>
              <div className="inline-flex items-center gap-2 text-primary">
                <Lock className="h-4 w-4" />
                다른 유지보수 작업이 실행 중입니다.
                {lockStatus.lockedUntil && <span className="text-primary">해제 예정: {new Date(lockStatus.lockedUntil).toLocaleString('ko-KR')}</span>}
              </div>
              <Button size="sm" variant="outline" onClick={forceUnlock} className="h-7 px-2 text-xs">
                <Unlock className="h-3.5 w-3.5 mr-1" />
                강제 해제
              </Button>
            </>
          ) : lastRunAt ? (
            <div className="text-muted-foreground">마지막 실행: {lastRunAt}</div>
          ) : (
            <div className="text-muted-foreground">아직 실행 내역이 없습니다.</div>
          )}
          {!loading && (
            <Button size="sm" variant="ghost" onClick={() => mutateLockStatus()} className="h-7 px-2 text-xs">
              새로고침
            </Button>
          )}
        </div>

        {/* 기능 설명 */}
        <div className="rounded-md bg-card p-3 text-[13px] text-foreground space-y-2">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <span className="font-medium">인덱스 보장</span> — 리뷰 컬렉션에 필요한 인덱스를 생성/갱신합니다. (예: 활성 리뷰 고유성 및 조회 성능용 인덱스)
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <span className="font-medium">중복 리뷰 정리</span> — 동일 사용자·상품 조합에서 최신 1개만 남기고 나머지는 소프트 삭제하여 중복을 제거합니다.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <span className="font-medium">평점 재집계</span> — 각 상품의 리뷰 평점 평균과 개수를 다시 계산하여 상품 문서의 요약 필드를 갱신합니다.
            </div>
          </div>
        </div>

        {/* 결과 출력 */}
        {lastResult && <pre className="mt-2 whitespace-pre-wrap rounded-md bg-card p-3 text-xs">{JSON.stringify(lastResult, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}
