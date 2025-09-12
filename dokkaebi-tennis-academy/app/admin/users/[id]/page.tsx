import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';
import UserDetailClient from '@/app/features/users/components/UserDetailClient';

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me || me.role !== 'admin') return <AccessDenied />;

  const { id } = await params;
  const host = (await headers()).get('host');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}`;

  return <UserDetailClient id={id} baseUrl={baseUrl} />;
}
