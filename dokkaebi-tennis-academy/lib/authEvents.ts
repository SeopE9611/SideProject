export const AUTH_EVENTS = {
  expired: 'auth:expired',
  forbidden: 'auth:forbidden',
} as const;

// 401 만료(갱신 실패) 알림
export function emitAuthExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_EVENTS.expired));
  }
}
export function onAuthExpired(handler: () => void) {
  const fn = () => handler();
  window.addEventListener(AUTH_EVENTS.expired, fn);
  return () => window.removeEventListener(AUTH_EVENTS.expired, fn);
}

// 403 권한 없음 알림
export function emitAuthForbidden() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_EVENTS.forbidden));
  }
}
export function onAuthForbidden(handler: () => void) {
  const fn = () => handler();
  window.addEventListener(AUTH_EVENTS.forbidden, fn);
  return () => window.removeEventListener(AUTH_EVENTS.forbidden, fn);
}
