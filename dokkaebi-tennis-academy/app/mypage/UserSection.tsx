'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail } from 'lucide-react';

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
    <div className="border-0 p-6 rounded-2xl shadow-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 backdrop-blur-sm">
      <div className="flex items-center gap-4 mb-4">
        <div className="bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900 dark:to-green-900 rounded-2xl p-3 shadow-lg">
          <User className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{user?.name ?? '이름 없음'}님, 반갑습니다!</p>
          <div className="flex items-center gap-2 mt-2">
            <Mail className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <p className="text-sm text-slate-600 dark:text-slate-400">{user?.email ?? '이메일 없음'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
