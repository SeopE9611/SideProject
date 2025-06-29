export type OrderItem = {
  name: string;
  quantity: number;
  price: number;
};

export type Order = {
  id: string;

  // 기존 customer는 프론트 전용 표시용으로 유지 가능
  customer: {
    name: string;
    email: string;
    phone: string;
  };

  // 주문 당시 회원 정보 snapshot
  userSnapshot?: {
    name: string;
    email: string;
  };

  userId?: string;

  shippingInfo?: {
    shippingMethod?: 'delivery' | 'quick' | 'visit';
    estimatedDate?: string;
    withStringService?: boolean;
    invoice?: {
      courier?: string | null;
      trackingNumber?: string | null;
    };
  };

  date: string; // ISO 8601 날짜 문자열

  status: '대기중' | '처리중' | '완료' | '취소' | '환불';

  paymentStatus: '결제완료' | '결제대기' | '결제실패';

  type: '상품' | '서비스' | '클래스';

  total: number;

  items: OrderItem[];
};

export type OrderWithType = Order & {
  __type: 'order' | 'stringing_application';
};

export interface ApiResponse {
  items: OrderWithType[]; // 현재 페이지 항목
  total: number; // 전체 레코드 수
}
