import type { ObjectId } from 'mongodb';

export type PackageOrderPaymentStatus = '결제대기' | '결제완료' | '결제취소' | '환불' | string;
export type PackageOrderStatus = '주문접수' | '결제대기' | '결제완료' | '취소' | '환불' | string;

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
  };
  paymentInfo: {
    method: string;
    bank: string | null;
    depositor: string | null;
  };
  history: Array<{
    status: string;
    date: Date;
    description: string;
  }>;
  userSnapshot: { name: string; email: string };
}
