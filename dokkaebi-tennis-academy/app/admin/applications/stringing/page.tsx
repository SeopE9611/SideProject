import StringingApplicationsClient from '@/app/admin/applications/_components/StringingApplicationsClient';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { redirect } from 'next/navigation';

export default async function AdminStringingApplicationsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    redirect('/login');
  }

  return <StringingApplicationsClient />;
}
