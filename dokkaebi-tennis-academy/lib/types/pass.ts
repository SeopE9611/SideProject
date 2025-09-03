import type { ObjectId } from 'mongodb';

export type ServicePassStatus = 'active' | 'expired' | 'suspended';

export interface ServicePass {
  _id: ObjectId;
  userId: ObjectId;
  orderId: ObjectId; // 어떤 주문으로 발급되었는지
  orderItemId: string; // 주문의 items[index].id 등 식별자
  packageSize: number; // 10 | 30 | 50 | 100
  usedCount: number; // 사용된 횟수
  remainingCount: number; // 남은 횟수
  status: ServicePassStatus; // active/expired/suspended
  purchasedAt: Date; // 결제 완료 시각
  expiresAt: Date; // purchasedAt + 365d
  redemptions: Array<{
    applicationId: ObjectId; // 차감된 신청서 ID
    usedAt: Date;
    reverted?: boolean; // 복원(환원) 여부
  }>;
  meta?: {
    planId?: string; // '10-sessions' 등 UI 플랜 ID
    planTitle?: string; // '스타터 패키지' 등
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ServicePassConsumption {
  _id: ObjectId;
  passId: ObjectId;
  applicationId: ObjectId;
  usedAt: Date;
  reverted?: boolean;
  createdAt: Date;
}
