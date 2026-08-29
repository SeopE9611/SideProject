import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/layout/page-hero";
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
    <article className="bg-surface">
      <PageHero
        eyebrow={post.isDemo ? "소식 · 개발용 예시" : "샬롬의 집 소식"}
        title={post.title}
        description={post.summary}
        asideTitle="게시 정보"
        items={[
          {
            label: "분류",
            value: getNewsCategoryLabel(post.category),
          },
          {
            label: "게시일",
            value: publishedDateFormatter.format(new Date(post.publishedAt)),
          },
          {
            label: "상태",
            value: post.isDemo ? "공식 소식이 아닌 개발용 예시" : "공개 게시물",
          },
        ]}
        primaryAction={{ label: "소식 목록으로", href: "/news" }}
      />

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
              className="inline-flex min-h-12 items-center justify-center bg-primary px-6 py-3 text-base font-bold text-primary-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
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
