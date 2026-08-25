import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getNewsRepository } from "@/features/news/news.repository";
import { getNewsCategoryLabel } from "@/features/news/news.types";

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
    <article>
      <header className="border-b border-border bg-surface-subtle">
        <div className="mx-auto w-full max-w-content px-page py-12 sm:px-page-wide sm:py-16">
          <p className="text-small font-bold text-primary">샬롬 소식</p>
          <p className="mt-5 text-small font-bold text-muted-foreground">
            {getNewsCategoryLabel(post.category)}
          </p>
          {post.isDemo ? (
            <aside className="mt-5 border-y border-border-strong bg-primary-soft px-5 py-4 text-body text-foreground">
              개발용 예시 콘텐츠이며 공식 시설 소식이 아닙니다.
            </aside>
          ) : null}
          <h1 className="mt-5 text-display font-bold text-foreground sm:text-display-lg">
            {post.title}
          </h1>
          <time
            dateTime={post.publishedAt}
            className="mt-6 block text-small text-muted-foreground"
          >
            {publishedDateFormatter.format(new Date(post.publishedAt))}
          </time>
        </div>
      </header>

      <section
        aria-label="소식 본문"
        className="mx-auto w-full max-w-content px-page py-section sm:px-page-wide sm:py-section-wide"
      >
        <p className="border-b border-border pb-8 text-heading font-bold text-foreground">
          {post.summary}
        </p>
        <div className="mt-8 space-y-6 text-body text-foreground">
          {post.body.map((paragraph, index) => (
            <p key={`${post.id}-${index}`}>{paragraph}</p>
          ))}
        </div>
      </section>

      <footer className="border-t border-border bg-surface">
        <nav
          aria-label="샬롬 소식 목록"
          className="mx-auto w-full max-w-content px-page py-8 sm:px-page-wide"
        >
          <Link
            href="/news"
            className="inline-flex min-h-11 items-center gap-2 py-2 font-bold text-primary underline underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
          >
            <span aria-hidden="true">←</span>
            샬롬 소식 목록으로 돌아가기
          </Link>
        </nav>
      </footer>
    </article>
  );
}
