'use client';

import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';

// SWR용 fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// 주문 상태 → 결제 상태 매핑 함수
function mapPaymentStatus(orderStatus: string): string {
  switch (orderStatus) {
    case '대기중':
      return '결제대기';
    case '결제완료':
      return '결제완료';
    case '취소':
      return '결제취소';
    case '배송중':
    case '배송완료':
      return '결제완료';
    default:
      return '결제대기';
  }
}

// 결제 상태별 배지 색상
const paymentStatusColors: Record<string, string> = {
  결제완료: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
  결제대기: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20',
  결제취소: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
  결제실패: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
};

type Props = {
  orderId: string;
  initialPaymentStatus: string;
};

export function OrderPaymentStatus({ orderId, initialPaymentStatus }: Props) {
  // 1) SWR로 주문 상태만 fetch (fallback으로 서버에서 받아온 최초 paymentStatus를 넣어 둡니다)
  const { data } = useSWR<{ status: string }>(`/api/orders/${orderId}/status`, fetcher, { fallbackData: { status: initialPaymentStatus } });

  // 2) map 함수로 “결제 상태” 계산
  const orderStatus = data?.status ?? initialPaymentStatus;
  const paymentStatus = mapPaymentStatus(orderStatus);

  // 3) Badge 렌더
  const colorClass = paymentStatusColors[paymentStatus] || paymentStatusColors['결제대기'];
  return <Badge className={colorClass}>{paymentStatus}</Badge>;
}
