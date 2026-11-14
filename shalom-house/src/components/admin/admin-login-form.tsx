"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

export function AdminLoginForm({ error }: { error?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    function resetSubmission() {
      submittingRef.current = false;
      setIsSubmitting(false);
      setShowPassword(false);
    }

    window.addEventListener("pageshow", resetSubmission);
    return () => window.removeEventListener("pageshow", resetSubmission);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (submittingRef.current) {
      event.preventDefault();
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
  }

  return (
    <>
      <form
        method="post"
        action="/api/admin/auth/login"
        onSubmit={handleSubmit}
        aria-busy={isSubmitting}
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
          <div className="relative mt-2">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              required
              maxLength={128}
              autoComplete="current-password"
              className="min-h-12 w-full rounded-control border border-border-strong bg-surface py-3 pr-14 pl-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            />
            <button
              type="button"
              aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((current) => !current)}
              className="absolute top-1/2 right-1 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-control text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
                {showPassword ? <path d="m3 3 18 18" /> : null}
              </svg>
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-primary px-5 py-3 font-bold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-wait"
        >
          {isSubmitting ? (
            <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 animate-spin motion-reduce:animate-none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.3" />
              <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : null}
          {isSubmitting ? "로그인 중…" : "로그인"}
        </button>
      </form>
      <span role="status" className="sr-only">{isSubmitting ? "로그인 중…" : ""}</span>
    </>
  );
}
