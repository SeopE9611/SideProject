/** 수거 방식: 자가 발송 / 기사 방문 수거 / 매장 방문 */
export type CollectionMethod = 'self_ship' | 'courier_pickup' | 'visit';

/** 기사 방문 수거 시 추가 정보 */
export interface ShippingPickup {
  /** YYYY-MM-DD 형식 권장 */
  date: string;
  /** 예: "10:00~13:00" */
  time: string;
  /** 비고(공동현관 비번 등) */
  note?: string;
}

/**
 * 스트링 교체 신청서에서 사용하는 배송/수거 정보
 * - 주문(order) 쪽 ShippingInfo와 "개념은 유사"하지만,
 *   신청서 특화 필드(collectionMethod/pickup)가 포함됨.
 * - 주문 ShippingInfo와 섞지 않기 위해 별도의 타입으로 유지.
 */
export interface StringingShippingInfo {
  name: string;
  phone: string;
  email?: string;

  address: string;
  addressDetail?: string;
  postalCode?: string;

  /** 입금자/은행은 패키지 미사용 & 무통장일 때만 의미 있음 */
  depositor?: string | null;
  bank?: string | null;

  /** 배송/문 앞 보관 등 요청사항 */
  deliveryRequest?: string;

  /** 수거 방식 및 기사 방문 수거 정보 */
  collectionMethod?: CollectionMethod;
  pickup?: ShippingPickup;
}

/** 신청서 라켓/스트링 항목(예시: 현재 구조에 맞게 맞춰 사용) */
export interface StringItem {
  productId: string; // 스트링 상품 id
  name: string; // 스냅샷
  mountingFee?: number;
  quantity: number;
}

/** 신청서 상태 */
export type ApplicationStatus = 'draft' | 'submitted' | 'reviewing' | 'accepted' | 'in_progress' | 'completed' | 'canceled';

/** 신청서 기본 스키마(서버 DB용; 필요 필드만 예시) */
export interface StringingApplication {
  _id: string;
  userId: string | null; // 게스트 가능
  orderId?: string | null; // 주문 연동 시
  createdAt: string; // ISO
  updatedAt: string; // ISO

  // 고객 입력값
  racketType?: string;
  preferredDate?: string; // YYYY-MM-DD
  preferredTime?: string; // "10:00" 등
  requirements?: string;

  shippingInfo: StringingShippingInfo;

  // 품목/요금(현재 프로젝트 로직에 맞춰 서버에서 계산/저장)
  stringItems: StringItem[];
  totalPrice?: number; // 공임 합계 등(표시용·서버계산)

  // 패키지 사용
  usedPackage?: {
    passId?: string;
    consumed?: boolean;
  };

  // 현재 신청 상태
  status: ApplicationStatus;

  // 신청 취소 요청 정보 (주문 cancelRequest 와 동일한 개념)
  cancelRequest?: {
    /** none: 취소 요청 없음 */
    status: 'none' | 'requested' | 'approved' | 'rejected';
    /** 사유 코드 (예: 'change_mind', 'wrong_info' 등 필요 시 확장) */
    reasonCode?: string;
    /** 사용자가 직접 입력한 상세 사유 */
    reasonText?: string;
    /** 취소 요청 시각 (ISO 문자열) */
    requestedAt?: string;
    /** 관리자 승인/거절 처리 시각 (ISO 문자열) */
    handledAt?: string;
  };

  // 이력
  history?: Array<{
    status: string;
    date: string; // ISO
    description: string;
  }>;
}
