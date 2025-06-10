'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, User } from '@/lib/stores/auth-store';
import { getMyInfo } from '@/lib/auth.client';

export default function UserSection() {
  const router = useRouter();
  const token = useAuthStore((state) => state.accessToken);
  const logout = useAuthStore((state) => state.logout);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 토큰 없으면 로그인 페이지로
    if (!token) {
      router.push('/login');
      return;
    }

    // 토큰 있을 때만 유저 정보 로드
    getMyInfo()
      .then(({ user }) => setUser(user))
      .catch(() => {
        // 유효하지 않으면 스토어 클리어 후 로그인으로
        logout();
        router.push('/login');
      })
      .finally(() => setLoading(false));
  }, [token, router, logout]);

  if (!user) return null;

  return (
    <div className="border p-4 rounded-lg shadow-sm bg-white">
      <p className="text-lg font-bold">{user?.name ?? '이름 없음'}님, 반갑습니다!</p>
      <p className="text-sm text-gray-500 mt-2">이메일: {user?.email ?? '이메일 없음'}</p>
    </div>
  );
}
