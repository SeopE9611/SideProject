import OutboxDetailClient from '@/app/admin/notifications/outbox/[id]/_components/OutboxDetailClient';
import AccessDenied from '@/components/system/AccessDenied';
import { getCurrentUser } from '@/lib/hooks/get-current-user';

export default async function OutboxDetailPage(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }

  return <OutboxDetailClient id={id} />;
}
