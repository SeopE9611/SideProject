import ApplicationsClient from '@/app/mypage/applications/_components/ApplicationsClient';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { redirect } from 'next/navigation';

export default async function ApplicationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return <ApplicationsClient />;
}
