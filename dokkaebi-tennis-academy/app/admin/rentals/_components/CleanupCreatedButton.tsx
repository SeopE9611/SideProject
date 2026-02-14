'use client';

import { useState } from 'react';

export default function CleanupCreatedButton({ hours = 2 }: { hours?: number }) {
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/rentals/cleanup-created?hours=${hours}`, { method: 'POST' });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || '데이터 정리 실패');
      alert(`데이터 정리 완료: ${json.deleted}건 삭제 (기준: ${json.hours}시간 경과)`);
    } catch (e: any) {
      alert(e.message || '서버 오류');
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
