import { refreshOnce } from '@/lib/auth/refresh-mutex';
import type { User } from '@/app/store/authStore';

// 같은 탭에서 동시 부트스트랩을 1회로 병합
let bootInflight: Promise<void> | null = null;

// getUser를 받아서 "이미 user가 세팅돼 있으면 null 덮어쓰기 방지"
export function bootstrapOnce(setUser: (u: User | null) => void, getUser: () => User | null) {
  if (bootInflight) return bootInflight;
  // 이미 user가 있다면 네트워크 호출 없이 즉시 종료
  if (getUser()) return Promise.resolve();

  bootInflight = (async () => {
    try {
      // 1) me 시도
      let res = await fetch('/api/users/me', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const me = await res.json();
        setUser(me ?? null);
        return;
      }

      // 2) 401/403 → refresh 후 me 재시도
      if (res.status === 401 || res.status === 403) {
        const r = await refreshOnce();
        if (r.ok) {
          res = await fetch('/api/users/me', { credentials: 'include', cache: 'no-store' });
          if (res.ok) {
            const me = await res.json();
            setUser(me ?? null);
            return;
          }
        }
      }

      // 3) 실패 → 이미 user가 있지 않다면 null로 확정
      if (!getUser()) setUser(null);
    } finally {
      bootInflight = null;
    }
  })();

  return bootInflight;
}
