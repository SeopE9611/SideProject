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
  const needsDetailedSync = useRef(false);

  useEffect(() => {
    if (started.current) return;

    // AuthHydrator가 먼저 setUser를 반영할 기회를 준 뒤 부트스트랩 여부를 결정
    const timer = window.setTimeout(() => {
      if (started.current) return;
      started.current = true;

      // layout에서 주입된 initialUser는 access token payload 기반의 "최소 사용자"일 수 있다.
      // 이 경우 name/email/role 같은 기본값만 있고, users/me에서 내려주는 최신/상세 정보와 다를 수 있으므로
      // "user가 있다"는 이유만으로 동기화를 건너뛰면 안 된다.
      const hasHydratedUser = Boolean(latestUser.current);
      const hasDetailedUserShape =
        hasHydratedUser &&
        Array.isArray((latestUser.current as any)?.socialProviders);
      needsDetailedSync.current = Boolean(hasHydratedUser && !hasDetailedUserShape);

      // 상세 동기화가 이미 끝난 사용자라면 기존처럼 즉시 인증확인 완료 처리
      if (hasHydratedUser && !needsDetailedSync.current) {
        setAuthChecked(true);
        return;
      }

      // 최소 사용자(토큰 payload)만 있는 경우에는 1회 강제 부트스트랩을 수행해서
      // /api/users/me 기준 사용자 상태(이름/연동상태/정지/탈퇴 반영 등)를 맞춘다.
      void bootstrapOnce(
        setUser,
        () => latestUser.current as any,
        { force: needsDetailedSync.current },
      ).finally(
        () => {
          setAuthChecked(true);
        },
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [setAuthChecked, setUser, user]);

  return null;
}
