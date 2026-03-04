'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BackButtonGuard() {
  const router = useRouter();

  useEffect(() => {
    const onPopState = () => {
      // 뒤로가기 클릭 시 홈으로 보냄
      router.replace('/');
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [router]);

  return null;
}
