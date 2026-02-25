import type { ObjectId } from 'mongodb';

export interface PackageOrder {
  _id: ObjectId;
  userId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  paymentStatus: string;
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
