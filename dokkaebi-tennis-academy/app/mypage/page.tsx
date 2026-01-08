import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { redirect } from 'next/navigation';
import MyPageClient from '@/app/mypage/MypageClient';

export default async function MyPagePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // email이 null일 수 있으니 안전 문자열로 보정
  const safeEmail = user.email ?? '';

  const uiUser = {
    id: user.id,
    name: user.name ?? '회원',
    email: safeEmail,
    role: user.role,
    oauthProviders: user.oauthProviders,
  };

  return <MyPageClient user={uiUser} />;
}
