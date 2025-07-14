'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BackButtonGuard() {
  const router = useRouter();

  useEffect(() => {
    // 1) 현재 URL을 히스토리에 한 번 더 쌓아서 "뒤로가기" 클릭 시 popstate가 발생하도록 함
    window.history.pushState(null, '', window.location.href);

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
