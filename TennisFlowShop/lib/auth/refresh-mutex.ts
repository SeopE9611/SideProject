// 같은 탭에서 동시에 여러 곳이 호출해도 /api/refresh 는 1번만 보내도록 병합
let inflight: Promise<Response> | null = null;

export function refreshOnce() {
  if (!inflight) {
    inflight = fetch('/api/refresh', {
      method: 'POST',
      credentials: 'include',
    }).finally(() => {
      inflight = null;
    });
  }
  return inflight;
}
