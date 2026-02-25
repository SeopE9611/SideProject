'use client';

import { useState } from 'react';
import { AdminFetchError, adminMutator, getAdminErrorMessage } from '@/lib/admin/adminFetcher';
import { RENTAL_CLEANUP_CREATED_DISABLED_MESSAGE, isRentalCleanupCreatedEnabledForClient } from '@/lib/admin/rentalCleanupCreatedFeature';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

export default function CleanupCreatedButton({ hours = 2 }: { hours?: number }) {
  const [loading, setLoading] = useState(false);
  const isFeatureEnabled = isRentalCleanupCreatedEnabledForClient();

  const run = async () => {
    // [가드 1/2] UI 단에서 비활성 플래그를 먼저 확인해 불필요한 API 호출을 차단한다.
    if (!isFeatureEnabled) {
      showErrorToast(RENTAL_CLEANUP_CREATED_DISABLED_MESSAGE);
      return;
    }

    setLoading(true);
    try {
      const result = await adminMutator<{ deleted?: number; hours?: number; message?: string }>(`/api/admin/rentals/cleanup-created?hours=${hours}`, { method: 'POST' });
      showSuccessToast(result.message ?? '데이터 정리 완료');

      alert(`데이터 정리 완료: ${result.deleted ?? 0}건 삭제 (기준: ${result.hours ?? hours}시간 경과)`);
    } catch (error) {
      // [가드 2/2] 라우트 미배포/비활성 상황에서 404가 내려오면 도메인 메시지로 치환한다.
      if (error instanceof AdminFetchError && error.status === 404) {
        showErrorToast(RENTAL_CLEANUP_CREATED_DISABLED_MESSAGE);
        return;
      }
      showErrorToast(getAdminErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={run}
        disabled={loading || !isFeatureEnabled}
        className="px-3 py-2 rounded bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50"
        title={isFeatureEnabled ? 'created 상태로 오래 남은 대여 신청을 삭제합니다.' : RENTAL_CLEANUP_CREATED_DISABLED_MESSAGE}
      >
        {loading ? '정리 중…' : '데이터 정리'}
      </button>
      {!isFeatureEnabled && (
        <span className="rounded border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          현재 비활성
        </span>
      )}
    </div>
  );
}
