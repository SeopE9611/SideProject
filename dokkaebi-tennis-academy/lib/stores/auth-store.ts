import { create } from 'zustand';

// 상태 타입 정의
interface AuthState {
  accessToken: string | null; // 현재 로그인한 사용자의 Access Token
  setAccessToken: (token: string) => void; // Access Token을 저장하는 함수
  clearAccessToken: () => void; // Access Token을 초기화하는 함수 (로그아웃 등)
}

// Zustand 상태 생성
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null, // 초기값은 null (로그인 전)

  // setAccessToken: 토큰을 받아 상태에 저장
  setAccessToken: (token: string) => set({ accessToken: token }),

  // clearAccessToken: 토큰을 제거 (로그아웃 시)
  clearAccessToken: () => set({ accessToken: null }),
}));
