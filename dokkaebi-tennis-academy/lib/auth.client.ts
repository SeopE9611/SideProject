'use client';

import useAxiosInstance from './useAxiosInstance';
import { useAuthStore, User } from './stores/auth-store';

export async function getMyInfo(): Promise<{ user: User }> {
  const axios = useAxiosInstance();
  // 수동으로 헤더 붙여 보기 (인터셉터 대신)
  const token = useAuthStore.getState().accessToken;
  const res = await axios.get<User>('/api/users/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { user: res.data };
}
