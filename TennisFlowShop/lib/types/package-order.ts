import type { ObjectId } from "mongodb";

export type PackageOrderPaymentStatus =
  | "결제대기"
  | "결제완료"
  | "결제취소"
  | "환불"
  | string;
export type PackageOrderStatus =
  | "주문접수"
  | "결제대기"
  | "결제완료"
  | "취소"
  | "환불"
  | string;

export interface PackageOrder {
  _id: ObjectId;
  userId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  status: PackageOrderStatus;
  paymentStatus: PackageOrderPaymentStatus;
  totalPrice: number;
  packageInfo: {
    id: string;
    title: string;
    sessions: number;
    price: number;
    validityPeriod: number;
  };
  serviceInfo: {
    depositor: string | null;
    serviceRequest?: any;
    serviceMethod?: any;
    address?: any;
    addressDetail?: any;
    postalCode?: any;
    name?: string;
    phone?: string;
    email?: string;
  };
  paymentInfo: {
    provider?: "manual_bank_transfer" | "tosspayments" | "nicepay";
    method?: string;
    bank?: string | null;
    depositor?: string | null;
    paymentKey?: string;
    tid?: string;
    approvedAt?: Date;
    rawSummary?: {
      orderId?: string;
      totalAmount?: number;
      card?: { issuerCode?: string; acquirerCode?: string; issuerName?: string; acquirerName?: string; cardName?: string };
      easyPay?: { provider?: string; amount?: number };
    };
  };
  history: Array<{
    status: string;
    date: Date;
    description: string;
  }>;
  userSnapshot: { name: string; email: string };
}
