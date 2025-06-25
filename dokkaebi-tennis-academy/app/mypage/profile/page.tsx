import ProfileClient from '@/app/mypage/profile/_components/ProfileClient';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { redirect } from 'next/navigation';

type Props = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return <ProfileClient user={user} />;
}
