import MessagesClient from '@/app/message/MessagesClient';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { redirect } from 'next/navigation';

export default async function MessagesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return <MessagesClient user={user} />;
}
