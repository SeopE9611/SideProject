import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

export interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image?: string | null;
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

let store: ReturnType<typeof createAuthStore> | undefined;

const createAuthStore = () =>
  createStore<AuthState>((set) => ({
    user: null,
    setUser: (user) => set({ user }),
    logout: () => set({ user: null }),
  }));

export const useAuthStore = () => {
  if (!store) {
    store = createAuthStore();
  }
  return useStore(store);
};
