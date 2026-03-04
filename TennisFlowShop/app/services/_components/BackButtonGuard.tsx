'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BackButtonGuard() {
  const router = useRouter();

  useEffect(() => {
    // checkout success와 동일하게 현재 URL을 한 번 더 쌓아
    // 뒤로가기(popstate) 시 홈으로 강제 이동 정책을 유지한다.
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
