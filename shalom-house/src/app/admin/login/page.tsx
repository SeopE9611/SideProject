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
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen items-center bg-surface-subtle px-page py-8 text-foreground sm:px-page-wide"
    >
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden border border-border bg-surface shadow-elevated lg:grid-cols-[0.9fr_1.1fr]">
        <section className="border-t-4 border-accent bg-primary px-7 py-9 text-primary-foreground sm:px-10 sm:py-12 lg:flex lg:flex-col lg:justify-between lg:px-12">
          <div>
            <p className="text-xs font-bold tracking-[0.12em] text-sun-soft">SHALOM HOUSE</p>
            <h1 className="mt-4 text-[2.25rem] font-extrabold tracking-[-0.035em] sm:text-[2.75rem]">운영 관리</h1>
            <p className="mt-5 max-w-sm text-body leading-8 text-primary-foreground/78">
              샬롬의 집 공식 콘텐츠와 문의, 후원 업무를 관리하는 담당자 전용 화면입니다.
            </p>
          </div>
          <p className="mt-10 border-t border-primary-foreground/20 pt-5 text-small text-primary-foreground/66">
            계정 정보는 다른 사람과 공유하지 마세요.
          </p>
        </section>

        <section className="px-7 py-9 sm:px-10 sm:py-12 lg:px-14">
          <div>
            {query.sessionRevoked === "1" ? (
              <p role="status" className="mb-5 border-l-4 border-warning bg-warning-soft px-4 py-3 font-semibold">
                관리자 로그인 세션이 해제되었습니다. 다시 로그인해 주세요.
              </p>
            ) : null}
            <p className="text-small font-bold text-accent">담당자 인증</p>
            <h2 className="mt-2 text-title font-extrabold tracking-[-0.025em]">관리자 로그인</h2>
            <p className="mt-3 text-small text-muted-foreground">등록된 관리자 이메일과 비밀번호를 입력해 주세요.</p>
          </div>

          <form
            method="post"
            action="/api/admin/auth/login"
            aria-describedby={error ? "login-error" : undefined}
            className="mt-8 space-y-6"
          >
            {error ? (
              <p
                id="login-error"
                role="alert"
                className="border-l-4 border-danger bg-danger-soft p-4 font-semibold text-danger"
              >
                {error}
              </p>
            ) : null}
            <div>
              <label htmlFor="email" className="block text-small font-bold">
                이메일 <span className="text-danger">*</span>
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
                className="mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-small font-bold">
                비밀번호 <span className="text-danger">*</span>
              </label>
              <input
                id="password"
                type="password"
                name="password"
                required
                maxLength={128}
                autoComplete="current-password"
                className="mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              />
            </div>
            <button
              type="submit"
              className="min-h-12 w-full rounded-control bg-primary px-5 py-3 font-bold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              로그인
            </button>
          </form>

          <Link
            href="/"
            className="mt-7 inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            ← 샬롬의 집 홈페이지로 돌아가기
          </Link>
        </section>
      </div>
    </main>
  );
}
