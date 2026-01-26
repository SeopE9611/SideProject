import { Suspense } from 'react';
import LoginPageClient from '@/app/login/_components/LoginPageClient';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { redirect } from 'next/navigation';

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function safeRedirectTarget(raw?: string) {
  if (!raw) return '/';
  // 외부 URL 오픈리다이렉트 방지: 반드시 내부 경로만 허용
  if (!raw.startsWith('/')) return '/';
  // /login으로 다시 보내는 루프 방지
  if (raw.startsWith('/login')) return '/';
  return raw;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (user?.id) {
    const r = searchParams?.redirectTo;
    const redirectTo = Array.isArray(r) ? r[0] : r;
    redirect(safeRedirectTarget(redirectTo));
  }
  return (
    <Suspense fallback={null}>
      <LoginPageClient />
    </Suspense>
  );
}
