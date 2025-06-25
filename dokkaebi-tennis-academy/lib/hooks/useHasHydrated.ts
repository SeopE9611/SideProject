import { useState, useEffect } from 'react';
// 클라이언트에서 hydration(브라우저 초기 렌더링)이 완료됐는지 여부를 감지
// SSR에서 발생할 수 있는 렌더링 불일치 문제 방지용
export function useHasHydrated() {
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    setHasHydrated(true);
  }, []);
  return hasHydrated;
}
