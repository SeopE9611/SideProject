import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

export interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  socialProviders?: Array<'kakao' | 'naver'>;
  image?: string | null;
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

const createAuthStore = () =>
  createStore<AuthState>((set) => ({
    user: null,
    setUser: (user) => set({ user }),
    logout: () => set({ user: null }),
  }));

const store = createAuthStore();

export const useAuthStore = () => {
  return useStore(store);
};
