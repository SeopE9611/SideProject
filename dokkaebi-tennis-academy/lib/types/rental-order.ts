// 대여 도메인 상태
// pending → paid → out → returned (종결) / canceled(종결)
export type RentalStatus =
  | 'pending' // 대기중(신청 완료, 결제 전)
  | 'paid' // 결제완료(출고 전)
  | 'out' // 출고/대여중
  | 'returned' // 반납 완료
  | 'canceled'; // 취소(종결)

// 대여 취소 요청 상태 타입
export type RentalCancelRequestStatus = 'requested' | 'approved' | 'rejected';

// 대여 취소 요청 객체 타입
export type RentalCancelRequest = {
  status: RentalCancelRequestStatus;
  reasonCode: string; // ex) '단순 변심', '일정 변경' 등
  reasonText?: string; // 기타 상세 사유
  requestedAt: string; // ISO 문자열
  processedAt?: string; // 승인/거절 시각
  processedByAdminId?: string; // 처리한 관리자 ID (선택)
};

export type RentalStringing = {
  requested: boolean;
  stringId: string; // ObjectId 문자열
  name: string;
  price: number;
  /**
   *  상품별 장착비(교체비)
   * - 신상품/정책 변경으로 mountingFee가 바뀌더라도,
   *   주문 당시 기준 금액을 스냅샷으로 보존하기 위해 저장.
   */
  mountingFee?: number;
  image?: string | null;
  requestedAt?: string;
};

export type RentalOrder = {
  id: string;
  userId?: string; // 비회원 대여 지원 시 undefined 가능
  guestInfo?: { name: string; email?: string; phone?: string };

  /**
   * 스트링 교체 서비스 신청서(stringing_applications)와의 연결 키
   * - 구매(order) 플로우의 stringingApplicationId와 동일한 역할
   * - 1단계에서는 타입만 추가(실제 저장/연결은 다음 단계에서 /api/rentals POST에 반영)
   */
  stringingApplicationId?: string;

  racketId: string; // used_rackets._id
  days: 7 | 15 | 30; // 기간: UI·API에서 실사용하는 7/15/30일 단위
  status: RentalStatus;

  // 금액: 보증금/수수료/스트링/교체비/총액
  amount: {
    fee: number; // 기간별 대여 수수료
    deposit: number; // 보증금(선결제)
    /**
     *  스트링 상품 가격 (스트링 교체 신청 시에만 존재)
     * - 과거 데이터/일부 플로우에서는 없을 수 있어 optional로 처리
     */
    stringPrice?: number;
    /**
     * 교체 서비스비(장착비) (스트링 교체 신청 시에만 존재)
     */
    stringingFee?: number;
    total: number; // deposit + fee + (stringPrice ?? 0) + (stringingFee ?? 0)
  };

  shipping?: any; // 최소형(후속 작업에서 스키마 분리)
  createdAt: string;
  dueDate?: string; // 반납 예정일(배송완료 기준으로 후처리 권장)
  outAt?: string; // 출고 일시
  dueAt?: string; // 반납 예정일
  returnedAt?: string; // 반납 완료 일시
  canceledAt?: string; // 취소 일시

  penalties?: {
    lateFee?: number; // 연체료
    damageFee?: number; // 파손 비용
    note?: string; // 비고
  };

  // 보증금 환급 시점
  depositRefundedAt?: string;

  // 반납 이후 크레딧
  creditIssued?: { amount: number; expiresAt: string };

  // 취소 요청 정보
  cancelRequest?: RentalCancelRequest;

  // 스트링 교체 요청
  stringing?: RentalStringing | null;
};
