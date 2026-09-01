import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "관리자 로그인",
  robots: { index: false, follow: false },
};

const errorMessages: Record<string, string> = {
  credentials: "이메일 또는 비밀번호를 확인해 주세요.",
  "rate-limit": "로그인 시도가 많습니다. 잠시 후 다시 시도해 주세요.",
  unavailable: "관리자 로그인을 현재 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[]; sessionRevoked?: string | string[] }>;
}) {
  const query = await searchParams;
  const errorValue = query.error;
  const error = typeof errorValue === "string" ? errorMessages[errorValue] : undefined;

  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center px-page py-12 text-foreground">
      <div className="mx-auto w-full max-w-md rounded-card border border-border bg-surface p-6 sm:p-8">
        <div>
          {query.sessionRevoked === "1" ? <p role="status">관리자 로그인 세션이 해제되었습니다. 다시 로그인해 주세요.</p> : null}
          <p className="text-small font-semibold text-primary">샬롬의 집 콘텐츠 관리</p>
          <h1 className="mt-2 text-title font-bold">관리자 로그인</h1>
          <p className="mt-3 text-body text-muted-foreground">
            샬롬의 집 공식 콘텐츠를 관리하는 담당자 전용 화면입니다.
          </p>
        </div>

        <form
          method="post"
          action="/api/admin/auth/login"
          aria-describedby={error ? "login-error" : undefined}
          className="mt-8 space-y-5"
        >
          {error ? (
            <p
              id="login-error"
              role="alert"
              className="rounded-control bg-danger-soft p-3 text-small font-medium text-danger"
            >
              {error}
            </p>
          ) : null}
          <div>
            <label htmlFor="email" className="block text-small font-semibold">
              이메일
            </label>
            <input
              id="email"
              type="email"
              name="email"
              required
              maxLength={254}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              className="mt-2 min-h-11 w-full rounded-control border border-border-strong bg-surface px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-small font-semibold">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              name="password"
              required
              maxLength={128}
              autoComplete="current-password"
              className="mt-2 min-h-11 w-full rounded-control border border-border-strong bg-surface px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            />
          </div>
          <button
            type="submit"
            className="min-h-11 w-full rounded-control bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            로그인
          </button>
        </form>

        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          샬롬의 집 홈페이지로 돌아가기
        </Link>
      </div>
    </main>
  );
}
