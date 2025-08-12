'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/app/store/authStore';

// 부트스트랩은 딱 한 번만 실행
export default function GlobalTokenGuard() {
  const { user, setUser } = useAuthStore(); // 셀렉터 인자 없이 호출
  const started = useRef(false); // React StrictMode로 인한 2회 실행 방지

  useEffect(() => {
    if (started.current) return; // 이미 시작했으면 무시
    started.current = true;

    // 서버 레이아웃(AuthHydrator)이 이미 user를 주입했다면 아무 것도 안 함
    if (user) return;

    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/users/me', {
          credentials: 'include',
          cache: 'no-store', // 캐시 사용 금지(중복 방지)
        });
        if (!alive) return;

        if (res.ok) {
          const me = await res.json();
          setUser(me ?? null); // 로그인된 사용자
        } else if (res.status === 401) {
          setUser(null); // 비로그인
        }
      } catch {
        // 네트워크 오류는 조용히 무시 (user는 그대로)
      }
    })();

    return () => {
      alive = false; // 언마운트 시 fetch 결과 무시
    };
    // 의존성배열 - 의도적으로 빈 배열: "한 번만" 실행
  }, []);

  return null;
}
