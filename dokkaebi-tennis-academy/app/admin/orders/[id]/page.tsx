// app/admin/orders/[id]/page.tsx
// ─────────────────────────────────────────────────────────────────────────
// 기존의 fetch 로직을 모두 지우고, 최소한의 server-side props 역할만 남깁니다.
import { headers } from 'next/headers';
import OrderDetailClient from '@/app/admin/orders/_components/OrderDetailClient';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 호스트 정보만 서버에서 가져와서 (필요한 경우)
  const host = (await headers()).get('host');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}`;

  // (선택) 여기서 추가적인 메타 정보만 가져와 넘겨줄 수도 있습니다.
  // 예: 취소 불가 여부, 초기 상태 등.
  // 하지만 최소한을 위해 그냥 orderId만 넘깁니다.

  return <OrderDetailClient orderId={id} />;
}
