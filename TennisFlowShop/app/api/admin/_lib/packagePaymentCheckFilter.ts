import type { Document, Filter } from "mongodb";

import { EXCLUDE_OFFLINE_PACKAGE_ORDERS_FILTER } from "@/app/api/admin/offline/_lib/packageOrderOffline";

export const PACKAGE_PAYMENT_PENDING_VALUES = [
  "pending",
  "unpaid",
  "ready",
  "bank_pending",
  "결제대기",
  "대기중",
  "입금확인",
  "활성화대기",
];

export const PACKAGE_TERMINAL_STATUS_VALUES = [
  "취소",
  "취소완료",
  "환불완료",
  "배송완료",
  "구매확정",
  "completed",
  "cancelled",
  "canceled",
  "refunded",
  "refund_completed",
  "delivered",
  "purchase_confirmed",
  "returned",
  "반납완료",
  "교체완료",
];

export const PACKAGE_PAYMENT_CANCELLED_VALUES = [
  "결제취소",
  "취소",
  "환불",
  "환불완료",
  "refunded",
  "cancelled",
  "canceled",
];

export const PACKAGE_PAYMENT_CHECK_STATUS_VALUES = [
  "주문접수",
  "결제대기",
  "입금확인",
  "활성화대기",
  "pending",
  "ready",
  "bank_pending",
];

export function createPackagePaymentCheckFilter(): Filter<Document> {
  return {
    $and: [
      EXCLUDE_OFFLINE_PACKAGE_ORDERS_FILTER,
      {
        $or: [
          { paymentStatus: { $in: PACKAGE_PAYMENT_PENDING_VALUES } },
          { "paymentInfo.status": { $in: PACKAGE_PAYMENT_PENDING_VALUES } },
          { status: { $in: PACKAGE_PAYMENT_CHECK_STATUS_VALUES } },
        ],
      },
      { status: { $nin: PACKAGE_TERMINAL_STATUS_VALUES } },
      { paymentStatus: { $nin: PACKAGE_PAYMENT_CANCELLED_VALUES } },
    ],
  };
}
