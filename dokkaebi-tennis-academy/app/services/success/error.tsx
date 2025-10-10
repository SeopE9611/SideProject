'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // 여기서 원문 에러 확인 가능 (Vercel 함수 로그에도 남음)
    console.error('Success page error:', error);
  }, [error]);

  return (
    <div style={{ padding: 24 }}>
      <h2>처리 중 오류가 발생했어요</h2>
      <p>잠시 후 다시 시도해 주세요.</p>
      <button onClick={reset} style={{ marginTop: 12 }}>
        다시 시도
      </button>
    </div>
  );
}
