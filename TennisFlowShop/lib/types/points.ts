import type { ObjectId } from 'mongodb';

export type PointTransactionType = 'admin_adjust' | 'review_reward_product' | 'review_reward_service' | 'order_reward' | 'signup_bonus' | 'spend_on_order' | 'reversal' | 'hold_on_order' | 'release_hold';

export type PointTransactionStatus = 'confirmed' | 'held' | 'canceled';

export type PointTransaction = {
  _id: ObjectId;
  userId: ObjectId;
  amount: number;
  type: PointTransactionType;
  status: PointTransactionStatus;
  /**
   * 멱등(중복 방지)용 키.
   * - 리뷰 적립: review:<reviewId>
   * - 주문 적립: order:<orderId>
   * - 가입 보너스: signup
   * 등 "1회만" 보장해야 하는 이벤트에서 사용
   */
  refKey?: string;
  ref?: {
    orderId?: ObjectId;
    reviewId?: ObjectId;
    adminId?: ObjectId;
  };
  reason?: string;
  createdAt: Date;
};

export type PointTransactionListItem = {
  id: string;
  amount: number;
  type: PointTransactionType;
  status: PointTransactionStatus;
  reason: string | null;
  createdAt: string; // ISO string
  refKey: string | null;
  adminId: string | null;
};
