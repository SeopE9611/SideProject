import StringingApplicationDetailClient from '@/app/features/stringing-applications/components/StringingApplicationDetailClient';
import ApplicationDetail from '@/app/mypage/applications/_components/ApplicationDetail';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

interface Props {
  params: { id: string };
}
export default async function ApplicationDetailPage({ params }: Props) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const host = (await headers()).get('host');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}`;
  return <StringingApplicationDetailClient id={params.id} baseUrl={baseUrl} />;
}
