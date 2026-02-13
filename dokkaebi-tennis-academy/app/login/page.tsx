import { Suspense } from 'react';
import LoginPageClient from '@/app/login/_components/LoginPageClient';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { redirect } from 'next/navigation';
import LoginPageSkeleton from '@/components/system/LoginPageSkeleton';

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: Promise<SearchParams>;
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
    const sp = (await Promise.resolve(searchParams ?? {})) as SearchParams;
    const rNext = sp.next;
    const rRedirectTo = sp.redirectTo;
    const next = Array.isArray(rNext) ? rNext[0] : rNext;
    const redirectTo = Array.isArray(rRedirectTo) ? rRedirectTo[0] : rRedirectTo;
    redirect(safeRedirectTarget(next ?? redirectTo));
  }
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginPageClient />
    </Suspense>
  );
}
