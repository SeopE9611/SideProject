import type { Metadata } from 'next';
import OutboxDetailClient from '@/app/admin/notifications/outbox/[id]/_components/OutboxDetailClient';

export const metadata: Metadata = {
  title: '알림 상세 | 관리자',
  description: '알림 발송 상세 상태와 payload/raw 데이터를 확인합니다.',
};

export default async function OutboxDetailPage(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;


  return <OutboxDetailClient id={id} />;
}
