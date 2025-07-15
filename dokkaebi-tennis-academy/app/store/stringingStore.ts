import { create } from 'zustand';

interface StringingState {
  selectedApplicationId: string | null;
  setSelectedApplicationId: (id: string | null) => void;
}

export const useStringingStore = create<StringingState>((set) => ({
  selectedApplicationId: null,
  setSelectedApplicationId: (id) => set({ selectedApplicationId: id }),
}));
