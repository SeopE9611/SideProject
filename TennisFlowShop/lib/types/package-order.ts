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
    status?: string | null;
    bank?: string | null;
    depositor?: string | null;
    paymentKey?: string;
    tid?: string;
    cardDisplayName?: string | null;
    cardCompany?: string | null;
    cardLabel?: string | null;
    niceCard?: {
      displayName?: string | null;
      cardName?: string | null;
      issuerName?: string | null;
      issuerCode?: string | null;
      acquirerName?: string | null;
      acquirerCode?: string | null;
      cardCode?: string | null;
    } | null;
    niceSync?: {
      lastSyncedAt?: string | null;
      source?: string | null;
      pgStatus?: string | null;
      resultCode?: string | null;
      resultMsg?: string | null;
      canceledAt?: string | null;
      cancelAmount?: number;
    } | null;
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
  meta?: {
    source?: string;
    channel?: string;
    offlineCustomerId?: ObjectId | string;
    linkedUserId?: ObjectId | string;
    paymentMethod?: string;
    paidAt?: Date | string;
    requiresOfflineIssueReconcile?: boolean;
    offlineIssueStatus?: "issue_failed" | string;
    offlineIssueError?: string | null;
    offlineIssueFailedAt?: Date | null;
    reconcileStatus?: "open" | "resolved" | "ignored";
    reconcileNote?: string | null;
    reconciledAt?: Date | null;
    reconciledBy?: ObjectId | string | null;
    [key: string]: unknown;
  };
}
