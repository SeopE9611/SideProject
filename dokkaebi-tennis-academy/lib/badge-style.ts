import { Order } from '@/lib/types/order';
import type { QnaCategory } from '@/lib/types/board';

// 전역 배지 토큰 (크기/정렬/테두리 옵션)
export const badgeSizeSm = 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md';
export const badgeBase = 'inline-flex items-center gap-1 font-normal';
export const badgeBaseOutlined = `${badgeBase} border`;

// 사용자 역할/상태 배지 전역 토큰
export const userRoleColors = {
  admin: 'bg-purple-500/10 text-purple-600 dark:text-purple-300',
  user: 'bg-gray-500/10 text-gray-700 dark:text-gray-300',
} as const;

export const userStatusColors = {
  active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  deleted: 'bg-red-500/10 text-red-600 dark:text-red-300',
} as const;

export function getUserStatusBadge(isDeleted: boolean) {
  return {
    label: isDeleted ? '삭제됨' : '활성',
    color: isDeleted ? userStatusColors.deleted : userStatusColors.active,
  };
}

export const orderStatusColors: Record<string, string> = {
  대기중: 'bg-yellow-500/10 text-yellow-500',
  처리중: 'bg-blue-500/10 text-blue-500',
  결제완료: 'bg-green-500/10 text-green-500',
  배송중: 'bg-blue-500/10 text-blue-500',
  배송완료: 'bg-green-500/10 text-green-500',
  취소: 'bg-red-500/10 text-red-500',
  환불: 'bg-purple-500/10 text-purple-500',
};

export const paymentStatusColors: Record<string, string> = {
  결제완료: 'bg-green-500/10 text-green-500',
  결제대기: 'bg-yellow-500/10 text-yellow-500',
  결제실패: 'bg-red-500/10 text-red-500',
  결제취소: 'bg-red-500/10 text-red-500',
  환불: 'bg-purple-500/10 text-purple-500',
};

export const orderTypeColors: Record<string, string> = {
  상품: 'bg-blue-500/10 text-blue-500',
  서비스: 'bg-purple-500/10 text-purple-500',
  클래스: 'bg-orange-500/10 text-orange-500',
};

export const shippingStatusColors: Record<string, string> = {
  등록됨: 'bg-green-500/10 text-green-500',
  미등록: 'bg-red-500/10 text-red-500',
  방문수령: 'bg-blue-500/10 text-blue-500',
  퀵배송: 'bg-purple-500/10 text-purple-500',
  미입력: 'bg-red-500/10 text-red-500',
};

export function getShippingBadge(order: Order) {
  const code = order.shippingInfo?.shippingMethod; // 'delivery' | 'quick' | 'visit'
  const tn = order.shippingInfo?.invoice?.trackingNumber?.trim() ?? '';

  let label: keyof typeof shippingStatusColors = '미입력';
  if (code === 'delivery') label = tn ? '등록됨' : '미등록';
  else if (code === 'quick') label = '퀵배송';
  else if (code === 'visit') label = '방문수령';

  return { label, color: shippingStatusColors[label]! };
}
export const applicationStatusColors = {
  접수완료: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200',
  '검토 중': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  '작업 중': 'bg-blue-500/10 text-blue-500',
  교체완료: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  취소: 'bg-red-500/10 text-red-500',
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
} as const;

/** ---------------------- QnA 배지 (카테고리/답변 상태) ---------------------- */
// 라벨(한글) 기준 컬러 토큰 – 기존 전역 정책과 톤을 맞춰 /10 투명도 + text-*-500 사용
export const qnaCategoryColors: Record<QnaCategory, string> = {
  상품문의: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  '주문/결제': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  배송: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  '환불/교환': 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  서비스: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  아카데미: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
  회원: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-800',
  일반문의: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-700',
};

/** 안전 헬퍼: 잘못된 값이 와도 기본 회색으로 */
export function getQnaCategoryColor(label?: QnaCategory | string | null) {
  if (!label) return qnaCategoryColors['일반문의'];
  return (qnaCategoryColors as Record<string, string>)[label] ?? qnaCategoryColors['일반문의'];
}

/** 답변 상태 배지 색상 */
export function getAnswerStatusColor(answered: boolean) {
  return answered ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
}

/** ---------------------- Notice / Review 전용 배지 ---------------------- */
// 공지 상단 고정 배지(고정)
export const noticePinColor = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';

// 리뷰 타입 배지
export type ReviewType = 'product' | 'service' | 'etc';
export const reviewTypeColors: Record<ReviewType, string> = {
  product: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  service: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  etc: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-800',
};
export function getReviewTypeColor(t?: string | null) {
  const key = t === 'product' || t === 'service' ? (t as ReviewType) : 'etc';
  return reviewTypeColors[key];
}

/** ---------------------- Notice 카테고리 & 첨부 배지 ---------------------- */
export const noticeCategoryColors: Record<string, string> = {
  일반: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-700',
  이벤트: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  아카데미: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  점검: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  긴급: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
};

export function getNoticeCategoryColor(label?: string | null) {
  if (!label) return noticeCategoryColors['일반'];
  return noticeCategoryColors[label] ?? noticeCategoryColors['일반'];
}

/** 첨부(이미지/파일) 배지 색 */
export const attachImageColor = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800';
export const attachFileColor = 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-800';
