import { create } from 'zustand';

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
};

// 타입 정의
// 주스탄드로 생성할 스토어의 전체 구조를 정의한 타입
// 배열 상태 items + 4개의 조작 함수 (추가, 제거, 수량수정, 전체삭제)
type CartState = {
  items: CartItem[]; // 장바구니에 담긴 상품 목록
  addItem: (item: CartItem) => void; // 장바구니에 상품 추가 (void는 반환 값이 없음을 의미)
  removeItem: (id: string) => void; // 장바구니에서 상품 제거
  updateQuantity: (id: string, quantity: number) => void; // 장바구니 상품 수량 수정
  clearCart: () => void; // 장바구니 전체 삭제
};

// 실제 스토어 생성
// create<CartState>(...)는 주스탄드에서 제공하는 함수로, CartState 타입을 기반으로 상태를 만듬
// set은 상태를 업데이트 할 수 있게 해주는 내부 함수
export const useCartStore = create<CartState>((set) => ({
  items: [], // 초기 상태는 빈 배열로 설정

  // 장바구니에 상품을 추가할 때 호출되는 함수로
  // 이미 같은 상품이 있는 경우 quantity를 증가시키고
  // 없는 경우 새로운 상품으로 items에 추가
  addItem: (
    item: CartItem // 장바구니에 상품을 추가
  ) =>
    set((state) => {
      // 상태를 업데이트하는 함수
      const existing = state.items.find((i) => i.id === item.id); // 이미 장바구니에 있는 상품인지 확인 (find는 배열에서 조건에 맞는 첫 번째 요소를 찾음 즉 기존 상품인지 확인)
      // 기존 상품이 있다면
      if (existing) {
        return {
          // 상태를 업데이트
          items: state.items.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i)), // 수량을 증가시킴
        };
      }
      return { items: [...state.items, item] }; // 기존 상품이 없다면 새로 추가
    }),

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
      items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)), // id가 일치하는 상품의 수량을 수정
    })),

  // 장바구니 비우기 버튼을 누르면 호출
  // items 배열을 빈 배열로 초기화
  clearCart: () => set({ items: [] }), // 장바구니 전체 삭제 (빈 배열로 초기화)
}));
