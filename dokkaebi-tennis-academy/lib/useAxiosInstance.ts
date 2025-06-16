'use client';

import axios from 'axios';
import { useAuthStore } from '@/lib/stores/auth-store';

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

instance.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken;
    // 1) 토큰이 잘 들어오는지 확인
    console.log('[Axios] interceptor got token:', accessToken);

    // 2) 없으면 예외 던지기 (Promise.reject 대신)
    if (!accessToken) {
      throw new Error('No access token');
    }

    // 3) 헤더에 꼭 붙인다
    if (config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
      console.log('[Axios] setting Authorization header:', config.headers.Authorization);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default function useAxiosInstance() {
  return instance;
}

// 응답 인터셉터 추가
instance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    // accessToken이 만료되어 401 응답인 경우만 처리
    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // refresh API 호출
        const res = await fetch('/api/auth/refresh', { method: 'POST' });

        if (res.ok) {
          const data = await res.json();
          const newAccessToken = data.accessToken;

          //  Zustand 상태 업데이트
          useAuthStore.getState().setAccessToken(newAccessToken);

          //  원래 요청에 새 accessToken 반영해서 재시도
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return instance(originalRequest);
        } else {
          // refresh 실패 시 로그아웃
          useAuthStore.getState().logout();
          console.error('[Axios] RefreshToken 만료 또는 실패');
          return Promise.reject(err);
        }
      } catch (refreshError) {
        useAuthStore.getState().logout();
        console.error('[Axios] 세션 갱신 중 오류 발생');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(err);
  }
);
