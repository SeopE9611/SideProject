import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getNewsRepository } from "@/features/news/news.repository";
import {
  getNewsCategoryLabel,
  type NewsCategory,
} from "@/features/news/news.types";

export const dynamic = "force-dynamic";

type NewsPostPageProps = {
  params: Promise<{ slug: string }>;
};

const publishedDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

function getCategoryColorClassName(category: NewsCategory) {
  return category === "notice" ? "bg-home-sun" : "bg-home-sky";
}

async function getPost(params: NewsPostPageProps["params"]) {
  const { slug } = await params;
  return getNewsRepository().findPublishedBySlug(slug);
}

export async function generateMetadata({
  params,
}: NewsPostPageProps): Promise<Metadata> {
  const post = await getPost(params);

  if (!post) {
    notFound();
  }

  return {
    title: post.title,
    description: post.summary,
  };
}

export default async function NewsPostPage({ params }: NewsPostPageProps) {
  const post = await getPost(params);

  if (!post) {
    notFound();
  }

  return (
    <article className="bg-surface">
      <header className="bg-home-cream px-page pb-16 pt-7 sm:px-page-wide sm:pb-20 sm:pt-10">
        <div className="mx-auto grid w-full max-w-site overflow-hidden rounded-panel bg-home-ink shadow-elevated lg:min-h-[30rem] lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col justify-between px-7 py-12 text-hero-on-dark sm:px-12 sm:py-16 lg:px-14">
            <div>
              <p className="text-small font-bold text-home-sun">소식</p>
              <p className="mt-5 w-fit rounded-full border border-hero-on-dark/30 px-4 py-2 text-small font-bold text-hero-muted">
                {getNewsCategoryLabel(post.category)}
              </p>
              <h1 className="text-safe-wrap mt-5 max-w-4xl text-balance text-[clamp(2.5rem,4.8vw,4.1rem)] font-bold leading-[1.08] tracking-[-0.05em]">
                {post.title}
              </h1>
            </div>

            <time
              dateTime={post.publishedAt}
              className="mt-10 block text-small font-bold text-hero-muted"
            >
              {publishedDateFormatter.format(new Date(post.publishedAt))}
            </time>
          </div>

          <div
            className={`flex min-h-64 flex-col justify-between border-t border-home-ink/15 p-7 text-home-ink sm:p-10 lg:border-l lg:border-t-0 ${getCategoryColorClassName(post.category)}`}
          >
            <p className="text-small font-bold">
              {post.isDemo ? "개발용 예시" : "샬롬의 집 소식"}
            </p>
            <p
              aria-hidden="true"
              className="self-end text-[clamp(4.5rem,10vw,8rem)] font-bold leading-none tracking-[-0.08em] opacity-20"
            >
              {post.category === "notice" ? "공지" : "활동"}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-site gap-8 px-page py-20 sm:px-page-wide sm:py-24 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12">
        <section
          aria-label="소식 본문"
          className="rounded-panel border border-border bg-surface p-7 shadow-card sm:p-10 lg:p-12"
        >
          {post.isDemo ? (
            <aside className="mb-8 rounded-card border border-border bg-primary-soft px-5 py-4">
              <p className="text-safe-wrap text-pretty text-body font-bold text-primary">
                개발용 예시 콘텐츠이며 공식 시설 소식이 아닙니다.
              </p>
            </aside>
          ) : null}

          <p className="text-safe-wrap border-b border-border pb-8 text-pretty text-heading font-bold text-foreground">
            {post.summary}
          </p>

          <div className="mt-8 space-y-6">
            {post.body.map((paragraph, index) => (
              <p
                key={`${post.id}-${index}`}
                className="text-safe-wrap text-pretty text-body text-foreground"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        <aside className="h-fit rounded-panel bg-home-cream p-7 sm:p-8">
          <p className="text-small font-bold text-accent">게시 정보</p>
          <dl className="mt-5 divide-y divide-border border-y border-border">
            <div className="py-5">
              <dt className="text-small font-bold text-muted-foreground">
                분류
              </dt>
              <dd className="mt-2 text-safe-wrap text-body font-bold text-foreground">
                {getNewsCategoryLabel(post.category)}
              </dd>
            </div>
            <div className="py-5">
              <dt className="text-small font-bold text-muted-foreground">
                게시일
              </dt>
              <dd className="mt-2 text-safe-wrap text-body font-bold text-foreground">
                {publishedDateFormatter.format(new Date(post.publishedAt))}
              </dd>
            </div>
          </dl>

          <Link
            href="/news"
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-home-ink px-5 py-3 text-base font-bold text-hero-on-dark transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
          >
            <span aria-hidden="true">←</span>
            소식 목록으로
          </Link>
        </aside>
      </div>

      <nav
        aria-labelledby="news-detail-next-heading"
        className="bg-home-cream py-16 sm:py-20"
      >
        <div className="mx-auto w-full max-w-site px-page sm:px-page-wide">
          <p className="text-small font-bold text-primary">다음 안내</p>
          <h2
            id="news-detail-next-heading"
            className="text-safe-wrap mt-3 text-balance text-display font-bold text-foreground"
          >
            샬롬의 집의 일상을 더 살펴보세요
          </h2>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:gap-5">
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-control bg-home-sun px-6 py-3 text-base font-bold text-home-ink transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
              href="/life"
            >
              생활이야기 보기
            </Link>
            <Link
              className="inline-flex min-h-12 items-center gap-2 px-3 py-3 text-base font-bold text-primary underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              href="/support"
            >
              함께하는 방법
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </nav>
    </article>
  );
}
