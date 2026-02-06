'use client';

import useAxiosInstance from './useAxiosInstance';
import { User } from '../app/store/authStore';
import { showErrorToast } from '@/lib/toast';

export async function getMyInfo(opts?: { quiet?: boolean }): Promise<{ user: User | null }> {
  const axiosInstance = useAxiosInstance();
  const headers = opts?.quiet ? { 'x-suppress-auth-expired': '1' } : undefined;
  try {
    const res = await axiosInstance.get<User & { isDeleted?: boolean }>('/api/users/me', { headers });
    const user = res.data;

    if (user.isDeleted) {
      showErrorToast('탈퇴 처리된 계정입니다.\n재가입을 원하시면 고객센터로 문의해주세요.');
      return { user: null };
    }
    return { user };
  } catch (err: any) {
    // 404 에러일 때만 안내 메시지
    if (!opts?.quiet && err.response?.status === 404) {
      showErrorToast('회원 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
    }
    return { user: null };
  }
}
