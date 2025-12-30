import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';
import AdminDashboardClient from './_components/AdminDashboardClient';

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return <AccessDenied />;

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        <AdminDashboardClient />
      </div>
    </div>
  );
}
