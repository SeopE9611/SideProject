import { create } from 'zustand';

//유저 정보 타입 정의
interface User {
  id: string;
  name: string | null; // 이름은 null일 수도 있음
  email: string; // 이메일은 로그인 계정 기준
  role: string; // 'user' 또는 'admin' 등
  image?: string | null; // 프로필 이미지 (선택)
  // 필요한 경우 여기에서 추가 필드 확장 가능
}

// 상태 관리할 항목 정의
interface AuthState {
  user: User | null; // 로그인된 유저 정보 (없으면 null)
  setUser: (user: User | null) => void; // 유저 상태 설정 함수
  logout: () => void; // 로그아웃 (유저 정보 제거)
}

//  Zustand 스토어 생성
export const useAuthStore = create<AuthState>((set) => ({
  // 초기값: 로그인된 유저 없음
  user: null,

  // 로그인 후 유저 정보 저장할 때 사용
  setUser: (user) => set({ user }),

  // 로그아웃 시 유저 상태 초기화
  logout: () => set({ user: null }),
}));
