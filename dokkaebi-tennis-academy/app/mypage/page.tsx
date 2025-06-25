import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { redirect } from 'next/navigation';
import MyPageClient from '@/app/mypage/MypageClient';

export default async function MyPagePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return <MyPageClient user={user} />;
}
