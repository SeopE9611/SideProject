'use client';

import useAxiosInstance from './useAxiosInstance';
import { useAuthStore, User } from '../app/store/authStore';
import { showErrorToast } from '@/lib/toast';

export async function getMyInfo(): Promise<{ user: User | null }> {
  const axios = useAxiosInstance();

  try {
    const res = await axios.get<User & { isDeleted?: boolean }>('/api/users/me'); // ✅ Authorization 제거
    const user = res.data;

    if (user.isDeleted) {
      showErrorToast('탈퇴 처리된 계정입니다.\n재가입을 원하시면 고객센터로 문의해주세요.');
      useAuthStore().logout();
      return { user: null };
    }
    return { user };
  } catch (err: any) {
    // 404 에러일 때만 안내 메시지
    if (err.response?.status === 404) {
      showErrorToast('회원 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
    }
    return { user: null };
  }
}
