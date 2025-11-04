// 대여 도메인 상태
// created → paid → out → returned (종결) / canceled(종결)
export type RentalStatus =
  | 'created' // 생성됨(미결제)
  | 'paid' // 결제완료(출고 전)
  | 'out' // 출고/대여중
  | 'returned' // 반납 완료
  | 'canceled'; // 취소(종결)

export type RentalOrder = {
  id: string;
  userId?: string; // 비회원 대여 지원 시 undefined 가능
  guestInfo?: { name: string; email?: string; phone?: string };

  racketId: string; // used_rackets._id
  days: 7 | 15 | 30; // 기간: UI·API에서 실사용하는 7/15/30일 단위
  status: RentalStatus;

  // 금액: 보증금/수수료/총액
  amount: {
    fee: number; // 기간별 대여 수수료
    deposit: number; // 보증금(선결제)
    total: number; // fee + deposit
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
};
