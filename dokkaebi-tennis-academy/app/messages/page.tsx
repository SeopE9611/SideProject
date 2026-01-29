import MessagesClient from '@/app/messages/MessagesClient';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { redirect } from 'next/navigation';

export default async function MessagesPage() {
  const user = await getCurrentUser();

  if (!user) {
    const target = '/messages';
    redirect(`/login?redirectTo=${encodeURIComponent(target)}`);
  }

  return <MessagesClient user={user} />;
}
