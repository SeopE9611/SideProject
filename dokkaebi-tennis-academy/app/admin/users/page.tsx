import { redirect } from 'next/navigation';
import UsersClient from './_components/UsersClient';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';

export default async function AdminUsersPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }

  return <UsersClient />;
}
