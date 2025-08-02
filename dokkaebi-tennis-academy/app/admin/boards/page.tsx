import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';
import BoardsPageClient from '@/app/admin/boards/BoardsClient';

export default async function BoardsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }

  return <BoardsPageClient />;
}
