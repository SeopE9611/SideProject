"use client";

import { useAuthStore } from "@/app/store/authStore";
import { refreshOnce } from "@/lib/auth/refresh-mutex";
import { useCallback, useRef, useState } from "react";

export function useCurrentUser(): {
  user: ReturnType<typeof useAuthStore>["user"];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const { user, authChecked, setUser, setAuthChecked } = useAuthStore();

  // 수동 새로고침(재시도)용 in-flight 병합
  const inFlight = useRef<Promise<void> | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    if (inFlight.current) return inFlight.current;

    setIsRefreshing(true);
    inFlight.current = (async () => {
      try {
        // 1) /api/users/me
        let res = await fetch("/api/users/me", {
          credentials: "include",
          cache: "no-store",
        });
        if (res.ok) {
          const me = await res.json().catch(() => null);
          setUser(me);
          return;
        }

        // 2) 401/403이면 refresh → me 재시도
        if (res.status === 401 || res.status === 403) {
          const rr = await refreshOnce();
          if (rr.ok) {
            res = await fetch("/api/users/me", {
              credentials: "include",
              cache: "no-store",
              headers: { "x-suppress-auth-expired": "1" },
            });
            if (res.ok) {
              const me2 = await res.json().catch(() => null);
              setUser(me2);
              return;
            }
          }
        }

        // 3) 모두 실패 → null 확정
        setUser(null);
      } finally {
        inFlight.current = null;
        setIsRefreshing(false);
        setAuthChecked(true);
      }
    })();

    return inFlight.current;
  }, [setAuthChecked, setUser]);

  const loading = isRefreshing || !authChecked;

  return { user, loading, refresh };
}
