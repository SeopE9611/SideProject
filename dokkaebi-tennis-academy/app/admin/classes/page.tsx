import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';
import ClassesPage from '@/app/admin/classes/ClassesClient';

export default async function Page() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }

  return <ClassesPage />;
}
