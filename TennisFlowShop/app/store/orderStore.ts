import { create } from 'zustand';

interface OrderState {
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  selectedOrderId: null,
  setSelectedOrderId: (id) => set({ selectedOrderId: id }),
}));
