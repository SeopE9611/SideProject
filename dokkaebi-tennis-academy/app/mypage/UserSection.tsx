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
    <div className="border-0 p-6 rounded-2xl shadow-xl bg-gradient-to-r from-background to-card dark:from-background dark:to-card backdrop-blur-sm">
      <div className="flex items-center gap-4 mb-4">
        <div className="bg-gradient-to-r from-background to-card dark:from-background dark:to-card rounded-2xl p-3 shadow-lg">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">{user?.name ?? '이름 없음'}님, 반갑습니다!</p>
          <div className="flex items-center gap-2 mt-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{user?.email ?? '이메일 없음'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
