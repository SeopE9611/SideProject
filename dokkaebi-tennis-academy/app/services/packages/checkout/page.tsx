import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import PackageCheckoutClient from '@/app/services/packages/checkout/PackageCheckoutClient';
import LoginGate from '@/app/services/packages/checkout/LoginGate';

export default async function Page({ searchParams }: { searchParams?: { package?: string } }) {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;

  if (!payload?.sub) {
    const next = '/services/packages/checkout' + (searchParams?.package ? `?package=${searchParams.package}` : '');
    return <LoginGate next={next} />;
  }

  // 로그인 통과 ->  클라 컴포넌트에 사용자 기본정보 전달
  return (
    <PackageCheckoutClient
      initialUser={{
        id: payload.sub,
        email: (payload as any)?.email ?? '',
        name: (payload as any)?.name ?? '',
      }}
      initialQuery={searchParams}
    />
  );
}
