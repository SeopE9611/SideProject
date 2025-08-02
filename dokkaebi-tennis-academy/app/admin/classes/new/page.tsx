import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';
import NewClassClient from '@/app/admin/classes/new/NewClassClient';

export default async function NewClassPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }
  return <NewClassClient />;
}
