import { create } from 'zustand';
import type { CartItem } from '@/app/store/cartStore';

// PDP에서 라켓 + 스트링 묶음으로 Checkout 보낼 때만 잠깐 쓰는 스토어
type PdpBundleState = {
  items: CartItem[];                 // 라켓, 스트링 등 묶음 상품 목록
  setItems: (items: CartItem[]) => void;
  clear: () => void;
};

export const usePdpBundleStore = create<PdpBundleState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  clear: () => set({ items: [] }),
}));
