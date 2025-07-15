import { ObjectId } from 'mongodb';

// 주문 객체의 타입 정의

type OrderHistoryItem = {
  status: string;
  date: string; // ISO 문자열
  description: string;
};

type ShippingInfo = {
  name: string;
  phone: string;
  address: string;
  addressDetail?: string;
  postalCode: string;
  depositor: string;
  deliveryRequest?: string;
  shippingMethod?: 'courier' | 'quick' | 'visit';
  estimatedDate?: string;
};

export type DBOrder = {
  items: any; // 장바구니에 담긴 상품 목록
  shippingInfo: ShippingInfo; // 배송지 정보 (주소, 우편번호 등)
  totalPrice: number; // 총 결제 금액
  shippingFee: number; // 배송비
  createdAt: Date; // 주문 시각
  userId?: string | ObjectId; // 회원일 경우 사용자 ID (세션에서 가져옴)
  invoice?: {
    trackingNumber?: string;
  };
  guestInfo?: {
    // 비회원일 경우 입력한 정보
    name: string;
    phone: string;
    email: string;
  } | null;
  paymentInfo?: {
    method: string;
    bank?: 'shinhan' | 'kookmin' | 'woori';
  };
  status: string;
  userSnapshot?: {
    name: string;
    email: string;
  };
  isStringServiceApplied?: boolean;
};
