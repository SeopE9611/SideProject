// app/mypage/page.tsx
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import MyPageClient from '@/app/mypage/orders/_components/MypageClient';

export default async function MyPagePage() {
  const session = await getServerSession(authConfig); // 서버에서 세션 획득
  return <MyPageClient session={session} />;
}
