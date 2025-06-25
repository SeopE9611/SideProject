'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export default function UserSection({ user }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  if (!user || loading) return null;

  return (
    <div className="border p-4 rounded-lg shadow-sm bg-white">
      <p className="text-lg font-bold">{user?.name ?? '이름 없음'}님, 반갑습니다!</p>
      <p className="text-sm text-gray-500 mt-2">이메일: {user?.email ?? '이메일 없음'}</p>
    </div>
  );
}
