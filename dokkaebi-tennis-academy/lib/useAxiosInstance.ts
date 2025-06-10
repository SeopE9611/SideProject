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
