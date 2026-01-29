import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { redirect } from 'next/navigation';
import MyPageClient from '@/app/mypage/MypageClient';

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: SearchParams;
};

export default async function MyPagePage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    // 탭(tab) 등 쿼리스트링을 보존한 채 로그인으로 보내기
    // (로그인 성공 후 /login?redirectTo=... 값을 사용해 원래 경로로 복귀)
    const sp = searchParams ?? {};
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (typeof v === 'string') qs.set(k, v);
      else if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
    }
    const target = `/mypage${qs.toString() ? `?${qs.toString()}` : ''}`;
    redirect(`/login?redirectTo=${encodeURIComponent(target)}`);
  }

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
