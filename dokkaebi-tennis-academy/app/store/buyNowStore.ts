import { create } from 'zustand';
import type { CartItem } from '@/app/store/cartStore';

// Buy-Now 모드에서 한 번에 결제할 상품 1개를 보관하는 스토어
type BuyNowState = {
  item: CartItem | null; // 즉시 구매할 단일 상품
  setItem: (item: CartItem) => void;
  clear: () => void; // 성공/이탈 시 초기화
};

export const useBuyNowStore = create<BuyNowState>((set) => ({
  item: null,
  setItem: (item) => set({ item }),
  clear: () => set({ item: null }),
}));
