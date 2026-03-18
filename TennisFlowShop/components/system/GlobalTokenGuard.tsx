"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/app/store/authStore";
import { bootstrapOnce } from "@/lib/auth/bootstrap";

// 부트스트랩은 탭당 딱 한 번만 실행
export default function GlobalTokenGuard() {
  const { user, setUser, setAuthChecked } = useAuthStore();
  // 최신 user 스냅샷을 들고 있어 실패 경로에서 덮어쓰는 걸 막음
  const latestUser = useRef(user);
  useEffect(() => {
    latestUser.current = user;
  }, [user]);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;

    // AuthHydrator가 먼저 setUser를 반영할 기회를 준 뒤 부트스트랩 여부를 결정
    const timer = window.setTimeout(() => {
      if (started.current) return;
      started.current = true;

      // 서버(AuthHydrator)에서 이미 주입됐다면 인증 확인 완료로 확정
      if (latestUser.current) {
        setAuthChecked(true);
        return;
      }

      void bootstrapOnce(setUser, () => latestUser.current as any).finally(
        () => {
          setAuthChecked(true);
        },
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [setAuthChecked, setUser, user]);

  return null;
}
