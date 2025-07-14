import StringingApplicationsClient from '@/app/admin/applications/_components/StringingApplicationsClient';
import AccessDenied from '@/components/system/AccessDenied';
import { getCurrentUser } from '@/lib/hooks/get-current-user';

export default async function AdminStringingApplicationsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }

  return <StringingApplicationsClient />;
}
