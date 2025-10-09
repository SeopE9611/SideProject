'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
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

  const [lockStatus, setLockStatus] = useState<LockStatus>({ locked: false });
  const pollTimer = useRef<number | null>(null);

  async function fetchLockStatus(silent = false) {
    try {
      const res = await fetch('/api/admin/reviews/maintenance', {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('상태 조회 실패');
      const json = await res.json();
      const status: LockStatus = {
        locked: !!json?.locked,
        lockedUntil: json?.lockedUntil,
        lockedBy: json?.lockedBy ?? null,
      };
      setLockStatus(status);
      if (!silent && status.locked) {
        // 잠금 중 안내(중복 노이즈 방지)
        // no-op
      }
      return status;
    } catch {
      // GET 미구현인 환경에서도 패널이 동작하도록 조용히 무시
      return { locked: false } as LockStatus;
    }
  }

  // 실행 중에는 1.5s 간격으로 잠금 해제 감시
  useEffect(() => {
    if (loading) {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
      pollTimer.current = window.setInterval(() => fetchLockStatus(true), 1500);
    } else if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
    };
  }, [loading]);

  useEffect(() => {
    fetchLockStatus(true);
  }, []);

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

      if (res.status === 403) {
        showErrorToast('관리자만 실행할 수 있습니다.');
        return;
      }
      if (res.status === 423) {
        setLockStatus({ locked: true });
        showErrorToast('다른 유지보수 작업이 실행 중입니다.');
        return;
      }

      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || '실행 실패');

      setLastResult(json.result);
      setLastRunAt(new Date().toLocaleString('ko-KR'));
      showSuccessToast('완료되었습니다.');
    } catch (e: any) {
      showErrorToast(e?.message || '실행 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
      // 실행이 끝났으니 최신 잠금 상태 반영
      fetchLockStatus(true);
    }
  }

  async function forceUnlock() {
    try {
      const res = await fetch('/api/admin/reviews/maintenance', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        // DELETE 미구현인 경우도 대비
        throw new Error('강제 해제 실패(서버 미구현 또는 권한 없음)');
      }
      setLockStatus({ locked: false });
      showSuccessToast('잠금을 해제했습니다.');
    } catch (e: any) {
      showErrorToast(e?.message || '강제 해제 중 오류');
    }
  }

  const disabled = loading !== null;

  return (
    <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-800/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Wrench className="h-5 w-5" />
          리뷰 유지보수
        </CardTitle>
        <CardContent>
          <span className="font-bold text-slate-800 dark:text-slate-200">개발자 전용입니다 — 관리자는 해당 기능을 개발자 동의 없이 클릭하지마세요!!! </span>
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
          <Button size="sm" onClick={() => run('all')} disabled={disabled} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700">
            {loading === 'all' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            전체 실행
          </Button>
        </div>

        {/* 잠금 상태 / 강제 해제 */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {loading ? (
            <div className="inline-flex items-center gap-2 text-slate-600">
              <Lock className="h-4 w-4" />
              유지보수 실행 중… (다른 탭에서는 잠시 실행 불가)
            </div>
          ) : lockStatus.locked ? (
            <>
              <div className="inline-flex items-center gap-2 text-amber-700">
                <Lock className="h-4 w-4" />
                다른 유지보수 작업이 실행 중입니다.
                {lockStatus.lockedUntil && <span className="text-amber-800/80">해제 예정: {new Date(lockStatus.lockedUntil).toLocaleString('ko-KR')}</span>}
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
            <Button size="sm" variant="ghost" onClick={() => fetchLockStatus()} className="h-7 px-2 text-xs">
              새로고침
            </Button>
          )}
        </div>

        {/* 기능 설명 */}
        <div className="rounded-md bg-slate-50 dark:bg-slate-900/50 p-3 text-[13px] text-slate-700 dark:text-slate-200 space-y-2">
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
        {lastResult && <pre className="mt-2 whitespace-pre-wrap rounded-md bg-slate-50 dark:bg-slate-900/60 p-3 text-xs">{JSON.stringify(lastResult, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}
