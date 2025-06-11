'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store'; // zustand 상태 훅 (accessToken 저장 용도)

// 컴포넌트 props 타입 정의
interface ClientProviderProps {
  accessToken: string | null; // 서버에서 전달받은 accessToken
  children: React.ReactNode; // 하위에 렌더링될 모든 UI
}

// 서버에서 받은 accessToken을 zustand 상태로 주입하는 컴포넌트
export function ClientProvider({ accessToken, children }: ClientProviderProps) {
  // zustand에서 상태 변경 함수 추출
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const clearAccessToken = useAuthStore((state) => state.clearAccessToken);

  // 컴포넌트가 처음 렌더링될 때 accessToken이 있다면 상태에 주입
  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken); //zustand 전역 상태에 accessToken 저장
    } else {
      clearAccessToken(); //  accessToken이 없는 경우 상태도 초기화
    }
  }, [accessToken, setAccessToken]); // 의존성 명시

  // children 요소 그대로 렌더링
  return <>{children}</>;
}
