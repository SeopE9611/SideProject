import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem } from "@/app/store/cartStore";
import {
  getCheckoutIntentExpiresAt,
  isCheckoutIntentExpired,
} from "@/app/store/checkoutIntentPersistence";

export const PDP_BUNDLE_STORAGE_KEY = "checkout.pdpBundle.v1";

// PDP에서 라켓 + 스트링 묶음으로 Checkout 보낼 때만 잠깐 쓰는 스토어
type PdpBundleState = {
  items: CartItem[]; // 라켓, 스트링 등 묶음 상품 목록
  expiresAt: number | null;
  hasHydrated: boolean;
  expiredOnHydration: boolean;
  setItems: (items: CartItem[]) => void;
  clear: () => void;
  expire: () => void;
  consumeHydrationExpiration: () => void;
  finishHydration: () => void;
  failHydration: () => void;
};

export const usePdpBundleStore = create<PdpBundleState>()(
  persist(
    (set) => ({
      items: [],
      expiresAt: null,
      hasHydrated: false,
      expiredOnHydration: false,
      setItems: (items) =>
        set({ items, expiresAt: getCheckoutIntentExpiresAt(), expiredOnHydration: false }),
      clear: () => {
        set({ items: [], expiresAt: null, expiredOnHydration: false });
        usePdpBundleStore.persist.clearStorage();
      },
      expire: () => {
        set({ items: [], expiresAt: null, expiredOnHydration: true });
        usePdpBundleStore.persist.clearStorage();
      },
      consumeHydrationExpiration: () => set({ expiredOnHydration: false }),
      finishHydration: () => set({ hasHydrated: true }),
      failHydration: () =>
        set({ items: [], expiresAt: null, expiredOnHydration: false, hasHydrated: true }),
    }),
    {
      name: PDP_BUNDLE_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ items, expiresAt }) => ({ items, expiresAt }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<PdpBundleState> | undefined;
        if (!persisted?.items?.length) return currentState;
        if (isCheckoutIntentExpired(persisted.expiresAt)) {
          return { ...currentState, expiredOnHydration: true };
        }
        return { ...currentState, items: persisted.items, expiresAt: persisted.expiresAt ?? null };
      },
      onRehydrateStorage: (initialState) => (state, error) => {
        if (error || !state) {
          try {
            sessionStorage.removeItem(PDP_BUNDLE_STORAGE_KEY);
          } finally {
            initialState.failHydration();
          }
          return;
        }
        if (state?.expiredOnHydration) sessionStorage.removeItem(PDP_BUNDLE_STORAGE_KEY);
        state.finishHydration();
      },
    },
  ),
);
