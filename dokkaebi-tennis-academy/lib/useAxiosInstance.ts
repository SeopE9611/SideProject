'use client';
import axios from 'axios';
import { emitAuthExpired, emitAuthForbidden } from '@/lib/authEvents';

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

let refreshPromise: Promise<void> | null = null;

instance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const cfg = error?.config || {};

    // 401이어도 전역 만료 이벤트를 쏘지 않게 설정
    const suppressed = cfg?.headers?.['x-suppress-auth-expired'] === '1' || (cfg as any)?.__suppressAuthExpired === true;

    if (status === 401 && suppressed) {
      // quiet 요청: 전역 만료 이벤트/토큰 재발급 로직 진입 금지
      return Promise.reject(error);
    }

    const { config, response } = error || {};
    if (!response) return Promise.reject(error);

    // 403: 권한 없음 -> 즉시 알림
    if (response.status === 403) {
      emitAuthForbidden();
      return Promise.reject(error);
    }

    // 401: 만료 흐름
    if (response.status === 401) {
      // (quiet) 억제 플래그: 전역 만료 로직에 진입하지 않음
      const suppressed = (config?.headers && config.headers['x-suppress-auth-expired'] === '1') || (config as any)?.__suppressAuthExpired === true;
      if (suppressed) {
        return Promise.reject(error);
      }
      // 이미 한 번 재시도한 요청인데도 401이면 완전 만료로 간주
      if ((config as any)?._retry) {
        emitAuthExpired();
        return Promise.reject(error);
      }

      (config as any)._retry = true;

      // 중복 refresh 방지
      if (!refreshPromise) {
        refreshPromise = fetch('/api/refresh', { method: 'POST', credentials: 'include' })
          .then((r) => {
            if (!r.ok) throw new Error('refresh failed');
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      try {
        await refreshPromise; // 자동 갱신 시도
        return instance(config); // 원 요청 재시도
      } catch {
        emitAuthExpired(); // 갱신 실패 → 만료 알림
        return Promise.reject(error);
      }
    }

    // 그 외
    return Promise.reject(error);
  }
);

export default function useAxiosInstance() {
  return instance;
}
