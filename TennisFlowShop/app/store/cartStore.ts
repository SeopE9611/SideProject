import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/*
 * Zustand 기반 전역 장바구니 상태관리 store
 * - items: 장바구니에 담긴 상품 목록
 * - addItem: 상품 추가 or 수량 증가
 * - removeItem: 상품 제거
 * - updateQuantity: 상품 수량 수정
 * - clearCart: 전체 초기화
 */

// 타입 정의
// 장바구니에 담긴 각각의 상품 정보를 나타내는 타입
export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string; // 이미지는 선택적 속성
  stock?: number; // 재고 정보
  kind?: 'product' | 'racket'; // 아이템 종류 (기본: product)
};

// 타입 정의
// 주스탄드로 생성할 스토어의 전체 구조를 정의한 타입
// 배열 상태 items + 4개의 조작 함수 (추가, 제거, 수량수정, 전체삭제)
interface CartState {
  items: CartItem[]; // 장바구니에 담긴 상품 목록
  addItem: (item: CartItem) => { success: boolean; message?: string };
  removeItem: (id: string) => void; // 장바구니에서 상품 제거
  updateQuantity: (id: string, quantity: number) => void; // 장바구니 상품 수량 수정
  clearCart: () => void; // 장바구니 전체 삭제
}

// --- 재고(가용 수량) 해석/클램프 유틸 ---
const getMaxStock = (stock?: number) => (typeof stock === 'number' && Number.isFinite(stock) ? stock : Number.POSITIVE_INFINITY);

const clampQuantity = (qty: number, maxStock: number) => {
  const next = Math.max(0, qty);
  if (!Number.isFinite(maxStock)) return Math.max(1, next);
  if (maxStock <= 0) return 0;
  return Math.min(Math.max(1, next), maxStock);
};

// 실제 스토어 생성
// create<CartState>(...)는 주스탄드에서 제공하는 함수로, CartState 타입을 기반으로 상태를 만듬
// set은 상태를 업데이트 할 수 있게 해주는 내부 함수
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const exists = get().items.find((i) => i.id === item.id);
        // 동일 상품을 중복으로 담는 건 현재 정책상 막고 있음
        if (exists) {
          return { success: false, message: '이미 장바구니에 담긴 상품입니다.' };
        }

        // 재고(가용 수량) 상한 적용
        const maxStock = getMaxStock(item.stock);
        const nextQty = clampQuantity(item.quantity, maxStock);

        if (nextQty === 0) {
          return { success: false, message: '현재 재고가 없어 장바구니에 담을 수 없습니다.' };
        }

        const safeItem = { ...item, quantity: nextQty };

        set((state) => ({
          items: [...state.items, safeItem],
        }));
        return { success: true };
      },

      // 특정 상품을 장바구니에서 제거
      // id가 일치하지 않는 상품만 남기고 나머지는 제거 (즉 해당 상품 삭제)
      removeItem: (
        id: string // 장바구니 상품 제거 (id를 인자로 받음)
      ) =>
        set((state) => ({
          // 상태를 업데이트
          items: state.items.filter((i) => i.id !== id), // id가 일치하지 않는 상품만 남김
        })),

      // 수량 변경 (ex: +/- 버튼 클릭시)
      // 해당 상품의 수량을 새 값으로 바꿔줌
      updateQuantity: (
        id: string,
        quantity: number // 장바구니 상품 수량 수정 (id와 수량을 인자로 받음)
      ) =>
        set((state) => ({
          // 상태를 업데이트
          items: state.items
            .map((i) => {
              if (i.id !== id) return i;

              const maxStock = getMaxStock(i.stock);
              const nextQty = clampQuantity(quantity, maxStock);

              return { ...i, quantity: nextQty };
            })
            .filter((i) => i.quantity > 0), // 0이 된 경우(재고 0 등) 방어적으로 제거
        })),

      // 장바구니 비우기 버튼을 누르면 호출
      // items 배열을 빈 배열로 초기화
      clearCart: () => set({ items: [] }), // 장바구니 전체 삭제 (빈 배열로 초기화)
    }),
    {
      name: 'cart-storage', // localStorage key 이름
    }
  )
);
