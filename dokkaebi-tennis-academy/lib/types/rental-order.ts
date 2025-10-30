// 대여 주문 도메인(기간, 보증금/수수료, 상태추적)
export type RentalStatus =
  | 'pending' // 생성됨(미결제)
  | 'paid' // 결제완료(출고 전)
  | 'shipped' // 출고/배송 중
  | 'in_use' // 수령/사용 중(기간 카운트)
  | 'returned' // 반납 완료
  | 'late' // 연체
  | 'lost' // 분실 처리
  | 'damaged' // 파손 처리
  | 'closed'; // 정산 종료

export type RentalOrder = {
  id: string;
  userId?: string; // 비회원 대여 지원 시 undefined 가능
  guestInfo?: { name: string; email?: string; phone?: string };

  racketId: string; // used_rackets._id
  period: 7 | 15 | 30; // 대여 기간
  deposit: number; // 보증금(결제 시 선결제)
  fee: number; // 기간별 수수료
  status: RentalStatus;

  shipping?: any; // 최소형(후속 작업에서 스키마 분리)
  createdAt: string;
  dueDate?: string; // 반납 예정일(배송완료 기준으로 후처리 권장)
  returnedAt?: string;

  penalties?: {
    lateFee?: number;
    damageFee?: number;
    note?: string;
  };

  creditIssued?: { amount: number; expiresAt: string }; // 구매 크레딧(반납 이후)
};
