export type OrderItem = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  mountingFee?: number;
  quantity: number;
  selectedGauge?: string | null;
  selectedColor?: string | null;
  selectedColorLabel?: string | null;
  selectedColorHex?: string | null;
  selectedColorImage?: string | null;
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
    shippingMethod?: "delivery" | "quick" | "visit";
    estimatedDate?: string;
    withStringService?: boolean;
    invoice?: {
      courier?: string | null;
      trackingNumber?: string | null;
    };
  };

  date: string; // ISO 8601 날짜 문자열

  status: "대기중" | "처리중" | "완료" | "취소" | "환불";

  paymentStatus: "결제완료" | "결제대기" | "결제실패" | "결제취소" | string;

  paymentProvider?: string | null;
  paymentTid?: string | null;
  paymentInfo?: {
    provider?: string | null;
    tid?: string | null;
    status?: string | null;
    niceSync?: { pgStatus?: string | null; lastSyncedAt?: string | null } | null;
  } | null;

  type: "상품" | "서비스" | "클래스";

  total: number;

  items: OrderItem[];

  // 장착 서비스 신청용 요약 문자열 (예: '듀로플렉스 125 외 1종')
  stringSummary?: string;
  meta?: {
    selectedGauge?: string | null;
    selectedColor?: string | null;
    selectedColorLabel?: string | null;
    selectedColorHex?: string | null;
    selectedColorImage?: string | null;
    gaugeStockDeductedAt?: string | Date | null;
    gaugeStockRestoredAt?: string | Date | null;
    gaugeStockRestoreReason?: string | null;
    colorStockDeductedAt?: string | Date | null;
    colorStockRestoredAt?: string | Date | null;
    colorStockRestoreReason?: string | null;
  };

  stockRestore?: {
    gaugeStockRestoredAt?: string | Date | null;
    gaugeStockRestoreReason?: string | null;
    colorStockRestoredAt?: string | Date | null;
    colorStockRestoreReason?: string | null;
  };

  cancelStatus?: "requested" | "approved" | "rejected";
  refundAccountReady?: boolean;
  refundBankLabel?: string | null;
};

export type OrderWithType = Order & {
  __type: "order" | "stringing_application" | "rental_order";
  linkedOrderId?: string | null;
  hasStringingApplication?: boolean;
  isStringServiceApplied?: boolean;
  linkedStringingApplicationId?: string;
  linkedStringingApplication?: {
    id: string;
    status?: string;
    cancelStatus?: "requested" | "approved" | "rejected";
    stringSummary?: string;
    items?: Order["items"];
    shippingInfo?: Order["shippingInfo"];
    total?: number;
  };
};

export interface ApiResponse {
  items: OrderWithType[]; // 현재 페이지 항목
  total: number; // 전체 레코드 수
}
