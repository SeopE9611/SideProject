import ShippingFormClient from '@/app/services/applications/[id]/shipping/ShippingFormClient';
import type { Metadata } from 'next';

// (선택) SEO 메타
export const metadata: Metadata = {
  title: '운송장 입력 | 도깨비 테니스',
  description: '자가발송 신청을 위한 운송장 정보를 입력합니다.',
};

// 캐시 방지(운송장 갱신 직후 새로고침 시 즉시 반영되도록)
export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  return <ShippingFormClient applicationId={p.id} />;
}
