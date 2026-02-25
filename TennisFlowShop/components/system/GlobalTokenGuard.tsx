'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/app/store/authStore';
import { bootstrapOnce } from '@/lib/auth/bootstrap';

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

    bootstrapOnce(setUser, () => latestUser.current as any);
    // 의도적으로 빈 배열: 마운트 때 한 번만
  }, []);

  return null;
}
