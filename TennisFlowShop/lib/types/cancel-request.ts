import { RefundAccountInfo } from "@/lib/cancel-request/refund-account";

// 취소 요청 상태 타입
export type CancelRequestStatus =
  | "none"
  | "requested"
  | "approved"
  | "rejected";

// 공통 취소 요청 정보 타입
// - 프론트/백엔드 모두에서 재사용 가능한 최소 필드만 정의
export interface CancelRequestInfo {
  // 현재 취소 요청 상태
  status: CancelRequestStatus;

  // 선택된 사유 코드/라벨 (예: '단순 변심', '상품 정보와 다름' 등)
  reasonCode?: string;

  // 기타 상세 사유 (기타 선택 시 사용자가 직접 입력한 텍스트)
  reasonText?: string;

  // 취소 요청이 생성된 시각 (ISO 문자열)
  requestedAt?: string;

  // 관리자 승인/거절이 처리된 시각 (ISO 문자열)
  processedAt?: string;

  // 처리를 수행한 관리자 ID(문자열, ObjectId 문자열 형태)
  processedByAdminId?: string;

  /**
   * 취소 요청 시점 환불 계좌 스냅샷
   * - top-level 주문/신청 정보가 아니라
   *   "취소 요청 당시 고객이 입력한 값"을 보존하기 위해 cancelRequest 내부에 둔다.
   */
  refundAccount?: RefundAccountInfo;
}
