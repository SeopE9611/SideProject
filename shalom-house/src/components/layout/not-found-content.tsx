import Link from "next/link";

import { siteConfig } from "@/config/site";

export function NotFoundContent() {
  return (
    <section
      aria-labelledby="not-found-heading"
      className="w-full border-y border-border bg-surface-subtle"
    >
      <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
        <div className="max-w-content">
          <p className="text-small font-bold text-primary">오류 404</p>
          <h1
            id="not-found-heading"
            className="mt-3 text-title font-bold text-foreground"
          >
            페이지를 찾을 수 없습니다
          </h1>
          <p className="mt-6 text-body text-muted-foreground">
            요청하신 주소의 페이지가 없거나 이동되었습니다.{" "}
            {siteConfig.name} 홈으로 돌아가 주요 정보를 다시 확인해 주세요.
          </p>
          <Link
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-6 py-2 font-semibold text-primary-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
            href="/"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </section>
  );
}
