import OutboxDetailClient from '@/app/admin/notifications/outbox/[id]/_components/OutboxDetailClient';

export default async function OutboxDetailPage(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;


  return <OutboxDetailClient id={id} />;
}
