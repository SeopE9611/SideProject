import { refreshOnce } from "@/lib/auth/refresh-mutex";
import type { User } from "@/app/store/authStore";

// 같은 탭에서 동시 부트스트랩을 1회로 병합
let bootInflight: Promise<void> | null = null;

// getUser를 받아서 "이미 user가 세팅돼 있으면 null 덮어쓰기 방지"
export function bootstrapOnce(
  setUser: (u: User | null) => void,
  getUser: () => User | null,
  options?: { force?: boolean },
) {
  if (bootInflight) return bootInflight;
  // 기본 동작은 기존과 동일: 이미 user가 있으면 네트워크 호출 없이 즉시 종료
  // 단, layout에서 토큰 payload만으로 만든 최소 사용자(부분 정보)는
  // /api/users/me 기준 상세 동기화가 1회 필요하므로 force 옵션을 허용한다.
  if (getUser() && !options?.force) return Promise.resolve();

  bootInflight = (async () => {
    try {
      // 1) me 시도
      let res = await fetch("/api/users/me", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const me = await res.json();
        setUser(me ?? null);
        return;
      }

      // 2) 401/403 → refresh 후 me 재시도
      if (res.status === 401 || res.status === 403) {
        const r = await refreshOnce();
        if (r.ok) {
          res = await fetch("/api/users/me", {
            credentials: "include",
            cache: "no-store",
          });
          if (res.ok) {
            const me = await res.json();
            setUser(me ?? null);
            return;
          }
        }
      }

      // 3) 실패 처리
      // - 일반 bootstrap(force 아님): 기존 보수 정책 유지
      //   -> 이미 user가 있으면 UI 흔들림 방지를 위해 즉시 null로 덮어쓰지 않는다.
      // - 강제 bootstrap(force): layout 토큰 payload 기반 "최소 사용자"를
      //   /api/users/me로 "상세 사용자 검증"하는 단계이므로,
      //   여기서 최종 실패하면 해당 최소 사용자는 신뢰할 수 없는 임시값이다.
      //   따라서 stale 로그인 UI를 막기 위해 반드시 null로 정리한다.
      if (options?.force) {
        setUser(null);
      } else if (!getUser()) {
        setUser(null);
      }
    } finally {
      bootInflight = null;
    }
  })();

  return bootInflight;
}
