import { Order } from '@/lib/types/order';

export const orderStatusColors: Record<string, string> = {
  대기중: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20',
  처리중: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
  결제완료: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
  배송중: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
  배송완료: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
  취소: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
  환불: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20',
};

export const paymentStatusColors: Record<string, string> = {
  결제완료: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
  결제대기: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20',
  결제실패: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
  결제취소: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
  환불: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20',
};

export const orderTypeColors: Record<string, string> = {
  상품: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
  서비스: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20',
  클래스: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20',
};

export const shippingStatusColors: Record<string, string> = {
  등록됨: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
  미등록: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
  방문수령: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
  퀵배송: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20',
  미입력: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
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
  '접수 완료': 'bg-blue-100 text-blue-800',
  '검토 중': 'bg-yellow-100 text-yellow-800',
  완료: 'bg-green-100 text-green-800',
  default: 'bg-gray-100 text-gray-800',
} as const;
