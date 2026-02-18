'use client';

import { useState } from 'react';
import { adminMutator } from '@/lib/admin/adminFetcher';
import { runAdminActionWithToast } from '@/lib/admin/adminActionHelpers';

export default function CleanupCreatedButton({ hours = 2 }: { hours?: number }) {
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const result = await runAdminActionWithToast<{ deleted?: number; hours?: number }>({
        action: () => adminMutator(`/api/admin/rentals/cleanup-created?hours=${hours}`, { method: 'POST' }),
        fallbackErrorMessage: '데이터 정리 실패',
      });
      if (!result) return;

      alert(`데이터 정리 완료: ${result.deleted ?? 0}건 삭제 (기준: ${result.hours ?? hours}시간 경과)`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={run} disabled={loading} className="px-3 py-2 rounded bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50" title="created 상태로 오래 남은 대여 신청을 삭제합니다.">
      {loading ? '정리 중…' : '데이터 정리'}
    </button>
  );
}
