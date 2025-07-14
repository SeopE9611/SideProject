import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { redirect } from 'next/navigation';
import StringingApplicationDetailClient from '@/app/admin/applications/_components/StringingApplicationDetailClient';
import AccessDenied from '@/components/system/AccessDenied';

export default async function StringingApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }

  const { id } = await params;
  const host = (await headers()).get('host');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}`;

  return <StringingApplicationDetailClient id={id} baseUrl={baseUrl} />;
}
