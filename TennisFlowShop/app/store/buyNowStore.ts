import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem } from "@/app/store/cartStore";
import {
  getCheckoutIntentExpiresAt,
  isCheckoutIntentExpired,
} from "@/app/store/checkoutIntentPersistence";

export const BUY_NOW_STORAGE_KEY = "checkout.buyNow.v1";

// Buy-Now 모드에서 한 번에 결제할 상품 1개를 보관하는 스토어
type BuyNowState = {
  item: CartItem | null; // 즉시 구매할 단일 상품
  expiresAt: number | null;
  hasHydrated: boolean;
  expiredOnHydration: boolean;
  setItem: (item: CartItem) => void;
  clear: () => void; // 성공/이탈 시 초기화
  consumeHydrationExpiration: () => void;
  finishHydration: () => void;
};

export const useBuyNowStore = create<BuyNowState>()(
  persist(
    (set) => ({
      item: null,
      expiresAt: null,
      hasHydrated: false,
      expiredOnHydration: false,
      setItem: (item) =>
        set({ item, expiresAt: getCheckoutIntentExpiresAt(), expiredOnHydration: false }),
      clear: () => {
        set({ item: null, expiresAt: null, expiredOnHydration: false });
        useBuyNowStore.persist.clearStorage();
      },
      consumeHydrationExpiration: () => set({ expiredOnHydration: false }),
      finishHydration: () => set({ hasHydrated: true }),
    }),
    {
      name: BUY_NOW_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ item, expiresAt }) => ({ item, expiresAt }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<BuyNowState> | undefined;
        if (!persisted?.item) return currentState;
        if (isCheckoutIntentExpired(persisted.expiresAt)) {
          return { ...currentState, expiredOnHydration: true };
        }
        return { ...currentState, item: persisted.item, expiresAt: persisted.expiresAt ?? null };
      },
      onRehydrateStorage: () => (state) => {
        if (state?.expiredOnHydration) sessionStorage.removeItem(BUY_NOW_STORAGE_KEY);
        state?.finishHydration();
      },
    },
  ),
);
