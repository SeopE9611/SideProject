import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getNewsRepository } from "@/features/news/news.repository";
import { getNewsCategoryLabel } from "@/features/news/news.types";

export const dynamic = "force-dynamic";

type NewsPostPageProps = {
  params: Promise<{ slug: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

async function getPost(params: NewsPostPageProps["params"]) {
  const { slug } = await params;
  return getNewsRepository().findPublishedBySlug(slug);
}

export async function generateMetadata({ params }: NewsPostPageProps): Promise<Metadata> {
  const post = await getPost(params);
  if (!post) notFound();

  return { title: post.title, description: post.summary };
}

export default async function NewsPostPage({ params }: NewsPostPageProps) {
  const post = await getPost(params);
  if (!post) notFound();

  const related = (await getNewsRepository().listPublished({ limit: 3 }))
    .filter((item) => item.slug !== post.slug)
    .slice(0, 2);
  const publishedLabel = dateFormatter.format(new Date(post.publishedAt));
  const updatedLabel = dateFormatter.format(new Date(post.updatedAt));
  const showUpdated = post.updatedAt !== post.publishedAt;

  return (
    <div className="bg-surface">
      <article>
        <header className="border-b border-border">
          <div className="mx-auto max-w-content px-page py-10 sm:px-page-wide sm:py-14">
            <nav aria-label="breadcrumb">
              <Link
                className="inline-flex min-h-11 items-center text-small font-bold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                href="/news"
              >
                소식 목록으로
              </Link>
            </nav>
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-small">
              <span className="font-bold text-primary">{getNewsCategoryLabel(post.category)}</span>
              {post.isDemo ? <span className="text-muted-foreground">개발용 예시</span> : null}
            </div>
            <h1 className="text-safe-wrap mt-4 text-balance text-title font-bold sm:text-display">{post.title}</h1>
            <p className="text-safe-wrap mt-5 text-pretty text-body text-muted-foreground">{post.summary}</p>
            <dl className="mt-6 flex flex-wrap gap-x-7 gap-y-2 text-small text-muted-foreground">
              <div className="flex gap-2">
                <dt className="font-bold text-foreground">게시일</dt>
                <dd>
                  <time dateTime={post.publishedAt}>{publishedLabel}</time>
                </dd>
              </div>
              {showUpdated ? (
                <div className="flex gap-2">
                  <dt className="font-bold text-foreground">수정일</dt>
                  <dd>
                    <time dateTime={post.updatedAt}>{updatedLabel}</time>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </header>
        <div className="mx-auto max-w-content px-page py-10 sm:px-page-wide sm:py-14">
          {post.isDemo ? (
            <aside className="mb-8 border-l-4 border-primary bg-primary-soft px-5 py-4 text-small">
              <strong>개발용 예시 콘텐츠이며 공식 시설 소식이 아닙니다.</strong>
            </aside>
          ) : null}
          <section aria-label="소식 본문" className="border-b border-border pb-12">
            <div className="space-y-6">
              {post.body.map((paragraph, index) => (
                <p key={`${post.id}-${index}`} className="text-safe-wrap text-pretty text-body text-foreground">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
          <section aria-labelledby="attachments-heading" className="border-b border-border py-8">
            <h2 id="attachments-heading" className="text-heading font-bold">
              첨부파일
            </h2>
            <p className="mt-3 text-body text-muted-foreground">첨부파일이 없습니다.</p>
          </section>
          <Link
            className="mt-8 inline-flex min-h-12 items-center border border-border-strong px-5 py-3 font-bold text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            href="/news"
          >
            소식 목록으로
          </Link>
        </div>
      </article>
      {related.length > 0 ? (
        <section aria-labelledby="related-heading" className="border-t border-border bg-surface-subtle">
          <div className="mx-auto max-w-content px-page py-10 sm:px-page-wide">
            <h2 id="related-heading" className="text-heading font-bold">
              관련 소식
            </h2>
            <ul className="mt-5 divide-y divide-border border-y border-border">
              {related.map((item) => (
                <li key={item.id}>
                  <Link
                    className="text-safe-wrap flex min-h-14 items-center py-3 font-bold underline decoration-border-strong underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                    href={`/news/${item.slug}`}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
