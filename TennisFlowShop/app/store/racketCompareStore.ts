import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * 라켓 비교(최대 4개) 전역 스토어
 * - Finder 카드에서 담기/해제
 * - 하단 트레이 표시
 * - /rackets/compare 페이지에서 테이블 비교
 *
 * 주의: API 의존 없이 "스냅샷"을 저장한다(= Finder 응답에 이미 포함된 spec/price 등을 저장)
 */

export type CompareRacketSpec = {
  headSize?: number | null;
  weight?: number | null;
  balance?: number | null;
  lengthIn?: number | null;
  swingWeight?: number | null;
  stiffnessRa?: number | null;
  pattern?: string | null;
  // 그립 사이즈는 비교 표/빠른 보기/상세 페이지 어디서든 재사용되므로
  // 스냅샷에 함께 저장해둔다.
  gripSize?: string | null;
};

export type CompareRacketItem = {
  id: string;
  brand: string;
  model: string;
  year?: number | null;
  price?: number | null;
  image?: string | null; // 대표 이미지 1장만 저장(트레이/테이블 헤더용)
  condition?: string | null;
  spec?: CompareRacketSpec | null;
};

type ToggleResult =
  | { ok: true; action: 'added' | 'removed' }
  | { ok: false; action: 'rejected'; message: string };

interface RacketCompareState {
  items: CompareRacketItem[];

  // 조회 유틸
  isSelected: (id: string) => boolean;

  // 조작
  add: (item: CompareRacketItem) => { ok: boolean; message?: string };
  remove: (id: string) => void;
  clear: () => void;

  // 담기/해제 토글(카드 버튼에서 사용)
  toggle: (item: CompareRacketItem) => ToggleResult;
}

const MAX_COMPARE = 4;

export const useRacketCompareStore = create<RacketCompareState>()(
  persist(
    (set, get) => ({
      items: [],

      isSelected: (id) => get().items.some((i) => i.id === id),

      add: (item) => {
        const items = get().items;

        // 이미 담김이면 성공 처리(중복 방지)
        if (items.some((i) => i.id === item.id)) return { ok: true };

        // 최대 4개 제한
        if (items.length >= MAX_COMPARE) {
          return { ok: false, message: `라켓 비교는 최대 ${MAX_COMPARE}개까지 담을 수 있습니다.` };
        }

        set({ items: [...items, item] });
        return { ok: true };
      },

      remove: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),

      clear: () => set({ items: [] }),

      toggle: (item) => {
        const items = get().items;

        // 이미 담겨있으면 제거
        if (items.some((i) => i.id === item.id)) {
          set({ items: items.filter((i) => i.id !== item.id) });
          return { ok: true, action: 'removed' };
        }

        // 없으면 추가 시도(최대 4개 제한)
        if (items.length >= MAX_COMPARE) {
          return { ok: false, action: 'rejected', message: `라켓 비교는 최대 ${MAX_COMPARE}개까지 담을 수 있습니다.` };
        }

        set({ items: [...items, item] });
        return { ok: true, action: 'added' };
      },
    }),
    {
      name: 'racket-compare-storage', // localStorage key
       // 비교 목록은 탭 세션 단위로 유지(탭/브라우저 닫으면 자동 초기화)
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
