import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";

export interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  socialProviders?: Array<"kakao" | "naver">;
  image?: string | null;
}

interface AuthState {
  user: User | null;
  authChecked: boolean;
  setUser: (user: User | null) => void;
  setAuthChecked: (checked: boolean) => void;
  logout: () => void;
}

const createAuthStore = () =>
  createStore<AuthState>((set) => ({
    user: null,
    authChecked: false,
    setUser: (user) => set({ user }),
    setAuthChecked: (checked) => set({ authChecked: checked }),
    logout: () => set({ user: null }),
  }));

const store = createAuthStore();

export const useAuthStore = () => {
  return useStore(store);
};
