import ApplicationDetail from '@/app/mypage/applications/_components/ApplicationDetail';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { redirect } from 'next/navigation';

interface Props {
  params: { id: string };
}
export default async function ApplicationDetailPage({ params }: Props) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return <ApplicationDetail id={params.id} />;
}
