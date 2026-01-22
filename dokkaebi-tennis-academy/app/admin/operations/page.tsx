import OperationsClient from '@/app/admin/operations/_components/OperationsClient';
import AccessDenied from '@/components/system/AccessDenied';
import { getCurrentUser } from '@/lib/hooks/get-current-user';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }
  return <OperationsClient />;
}
