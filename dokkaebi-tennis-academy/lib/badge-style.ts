import { Order } from '@/lib/types/order';

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
  완료: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
} as const;
