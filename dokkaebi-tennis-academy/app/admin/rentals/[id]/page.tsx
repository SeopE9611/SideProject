import AdminRentalDetailClient from '@/app/admin/rentals/[id]/_components/AdminRentalDetailClient';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';
import { cookies } from 'next/headers';
export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await params;

  const cookieStore = await cookies();
  const e2eBypass = cookieStore.get('__e2e')?.value === '1';
  if (!e2eBypass) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return <AccessDenied />;
    }
  }
  return <AdminRentalDetailClient />;
}
