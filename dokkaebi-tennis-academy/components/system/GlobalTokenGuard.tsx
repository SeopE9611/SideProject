'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/app/store/authStore';

// 부트스트랩은 탭당 딱 한 번만 실행
export default function GlobalTokenGuard() {
  const { user, setUser } = useAuthStore();
  // 최신 user 스냅샷을 들고 있어 실패 경로에서 덮어쓰는 걸 막음
  const latestUser = useRef(user);
  useEffect(() => {
    latestUser.current = user;
  }, [user]);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // 서버(AuthHydrator)에서 이미 주입됐다면 아무것도 안 함
    if (user) return;

    let alive = true;

    (async () => {
      try {
        // 1차: me 조회
        let res = await fetch('/api/users/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!alive) return;

        if (res.ok) {
          const me = await res.json();
          setUser(me ?? null);
          return;
        }

        //  401/403일 때만 refresh 시도
        if (res.status === 401 || res.status === 403) {
          const r = await fetch('/api/refresh', {
            method: 'POST',
            credentials: 'include',
          });

          if (r.ok) {
            res = await fetch('/api/users/me', {
              credentials: 'include',
              cache: 'no-store',
            });
            if (!alive) return;

            if (res.ok) {
              const me = await res.json();
              setUser(me ?? null);
              return;
            }
          }
        }

        // 이미 다른 경로에서 user가 채워졌다면 덮어쓰지 않음
        if (!latestUser.current) setUser(null);
      } catch {
        // 네트워크 오류는 조용히 무시
      }
    })();

    return () => {
      alive = false;
    };
    // 의도적으로 빈 배열: 마운트 때 한 번만
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
