import ShippingFormClient from '@/app/services/applications/[id]/shipping/ShippingFormClient';
import type { Metadata } from 'next';

// (선택) SEO 메타
export const metadata: Metadata = {
  title: '운송장 입력 | 도깨비 테니스',
  description: '자가발송 신청을 위한 운송장 정보를 입력합니다.',
};

// 캐시 방지(운송장 갱신 직후 새로고침 시 즉시 반영되도록)
export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: { id: string } }) {
  // 서버에서 별도 데이터 패칭은 하지 않고,
  // 클라이언트에서 SWR로 단건 신청서를 읽어 폼 상태를 구성합니다.
  return <ShippingFormClient applicationId={params.id} />;
}
