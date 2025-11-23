import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { redirect } from 'next/navigation';
import StringingApplicationDetailClient from '@/app/features/stringing-applications/components/StringingApplicationDetailClient';
import AccessDenied from '@/components/system/AccessDenied';

type StringingDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function StringingApplicationDetailPage({ params }: StringingDetailPageProps) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }

  const { id } = await params;
  const host = (await headers()).get('host');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}`;

  return <StringingApplicationDetailClient id={id} baseUrl={baseUrl} isAdmin={true} />;
}
