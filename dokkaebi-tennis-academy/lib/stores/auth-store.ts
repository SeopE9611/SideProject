import { create } from 'zustand';

// 유저 정보 타입 정의
export type User = {
  id: string;
  name: string | null; // 이름은 null일 수도 있음
  email: string; // 이메일은 로그인 계정 기준
  role: string; // 'user' 또는 'admin' 등
  image?: string | null; // 프로필 이미지 (선택)
};

// Zustand 상태 인터페이스 정의
interface AuthState {
  accessToken: string | null; // JWT Access Token
  setAccessToken: (token: string) => void; // 토큰 설정 함수
  clearAccessToken: () => void; // 토큰 초기화 (로그아웃 시)

  user: User | null; // 현재 로그인한 유저 정보
  setUser: (user: User | null) => void; // 유저 정보 설정 함수

  logout: () => void; // 토큰 + 유저 상태 모두 초기화
}

// Zustand 전역 상태 생성
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null, // 초기 AccessToken: null

  setAccessToken: (token) => set({ accessToken: token }), // 토큰 저장
  clearAccessToken: () => set({ accessToken: null }), // 토큰 초기화

  user: null, // 초기 유저 정보: null
  setUser: (user) => set({ user }), // 유저 상태 업데이트

  logout: () => set({ accessToken: null, user: null }), // 전체 초기화
}));
