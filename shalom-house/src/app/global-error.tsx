"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[app/global-error.tsx] 처리되지 않은 최상위 오류:", error);
    }
  }, [error]);

  return (
    <html lang="ko">
      <head>
        <title>서비스 오류 | 샬롬의 집</title>
        <style>{`
          :root {
            --color-background: #ffffff;
            --color-surface: #ffffff;
            --color-surface-subtle: #f4f5f0;
            --color-foreground: #252e28;
            --color-muted-foreground: #657066;
            --color-border: #dfe3d9;
            --color-border-strong: #838d81;
            --color-primary: #244b3c;
            --color-primary-hover: #193b2e;
            --color-primary-foreground: #ffffff;
            --color-danger: #a23b3b;
            --color-danger-soft: #fbecec;
            --color-focus-ring: #496b42;
          }
          * { box-sizing: border-box; }
          body { margin: 0; min-height: 100vh; background: var(--color-background); color: var(--color-foreground); font-family: system-ui, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; line-height: 1.6; }
          main { display: flex; min-height: 100vh; align-items: center; }
          .result { width: 100%; border-block: 1px solid var(--color-border); background: var(--color-surface-subtle); }
          .content { width: min(100% - 2.5rem, 82rem); margin-inline: auto; padding-block: 5rem; }
          .copy { max-width: 48rem; }
          .label { display: inline-flex; min-height: 2.75rem; align-items: center; margin: 0; border: 1px solid var(--color-danger); border-radius: .5rem; background: var(--color-danger-soft); padding: .5rem 1rem; color: var(--color-danger); font-size: .9375rem; font-weight: 700; }
          h1 { margin: .75rem 0 0; font-size: clamp(1.75rem, 5vw, 2rem); line-height: 1.25; letter-spacing: -.025em; overflow-wrap: break-word; word-break: keep-all; }
          .description { margin: 1.5rem 0 0; color: var(--color-muted-foreground); font-size: 1.0625rem; overflow-wrap: break-word; word-break: keep-all; }
          .actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 2rem; }
          button { min-height: 2.75rem; border-radius: .5rem; padding: .5rem 1.5rem; font: inherit; font-weight: 600; cursor: pointer; }
          .retry { border: 1px solid var(--color-primary); background: var(--color-primary); color: var(--color-primary-foreground); }
          .retry:hover { background: var(--color-primary-hover); }
          .home { border: 1px solid var(--color-border-strong); background: var(--color-surface); color: var(--color-foreground); }
          button:focus-visible, summary:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 4px; }
          details { margin-top: 1.5rem; border: 1px solid var(--color-border); border-radius: .5rem; background: var(--color-surface); padding: 1rem; font-size: .9375rem; }
          summary { min-height: 2.75rem; padding-block: .5rem; cursor: pointer; font-weight: 600; }
          details p { overflow-wrap: anywhere; font-family: ui-monospace, monospace; }
          @media (max-width: 39rem) { .actions { flex-direction: column; } .actions button { width: 100%; } }
        `}</style>
      </head>
      <body>
        <main>
          <section aria-atomic="true" className="result" role="alert">
            <div className="content">
              <div className="copy">
                <p className="label">오류</p>
                <h1>서비스를 표시하는 중 문제가 발생했습니다</h1>
                <p className="description">
                  잠시 후 다시 시도해 주세요. 문제가 계속되면 홈으로 이동해 다시 시작해 주세요.
                </p>
                <div className="actions">
                  <button className="retry" onClick={reset} type="button">
                    다시 시도
                  </button>
                  <button className="home" onClick={() => window.location.assign("/")} type="button">
                    홈으로 이동
                  </button>
                </div>
                {process.env.NODE_ENV === "development" ? (
                  <details>
                    <summary>개발 환경 오류 정보</summary>
                    <p>{error.message}</p>
                  </details>
                ) : null}
              </div>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
