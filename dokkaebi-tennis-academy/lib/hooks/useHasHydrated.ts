import { useState, useEffect } from 'react';

// zustand는 SSR 초기화 상태에선 accessToken이 undefined임
//이걸 감지해서 hydration이 끝난 후에만 인증 판단.
export function useHasHydrated() {
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    setHasHydrated(true);
  }, []);
  return hasHydrated;
}
