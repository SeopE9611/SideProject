import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/layout/page-hero";
import { siteConfig } from "@/config/site";
import { getNewsRepository } from "@/features/news/news.repository";
import {
  getNewsCategoryLabel,
  type PublicNewsPostSummary,
} from "@/features/news/news.types";

const newsCategories = [
  {
    title: "공지사항",
    description: "시설에서 전하는 중요한 안내를 확인합니다.",
  },
  {
    title: "활동 소식",
    description: "함께한 일상과 활동의 장면을 전합니다.",
  },
] as const;

const publicationPrinciples = [
  {
    number: "01",
    title: "내용을 확인합니다",
    description: "게시 전 안내 내용과 운영 사실을 담당자가 확인합니다.",
  },
  {
    number: "02",
    title: "개인정보를 살핍니다",
    description: "이름과 얼굴 등 개인을 알아볼 수 있는 정보를 검토합니다.",
  },
  {
    number: "03",
    title: "쉽게 읽도록 씁니다",
    description: "제목과 본문을 쉬운 한국어와 명확한 구조로 작성합니다.",
  },
] as const;

export const metadata: Metadata = {
  title: "소식",
  description: "샬롬의 집의 공지사항과 활동 소식을 확인합니다.",
};

export const dynamic = "force-dynamic";

const publishedDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

function NewsPostCard({
  post,
  featured = false,
}: {
  post: PublicNewsPostSummary;
  featured?: boolean;
}) {
  return (
    <article
      className={`overflow-hidden rounded-panel border border-border bg-surface shadow-card ${
        featured ? "lg:grid lg:grid-cols-[0.75fr_1.25fr]" : ""
      }`}
    >
      <div className="flex min-h-36 flex-col justify-between border-b border-border bg-surface-subtle p-7 text-foreground sm:p-8 lg:border-b-0 lg:border-r">
        <p className="text-small font-bold text-primary">
          {getNewsCategoryLabel(post.category)}
        </p>
        <time
          dateTime={post.publishedAt}
          className="mt-8 text-small text-muted-foreground"
        >
          {publishedDateFormatter.format(new Date(post.publishedAt))}
        </time>
      </div>

      <div className="flex flex-col p-7 sm:p-8">
        {post.isDemo ? (
          <p className="mb-4 w-fit rounded-full bg-primary-soft px-3 py-1 text-small font-bold text-primary">
            개발용 예시
          </p>
        ) : null}
        <h3
          className={`text-safe-wrap text-balance font-bold text-foreground ${
            featured ? "text-display" : "text-title"
          }`}
        >
          <Link
            className="rounded-control transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
            href={`/news/${post.slug}`}
          >
            {post.title}
          </Link>
        </h3>
        <p className="text-safe-wrap mt-4 text-pretty text-body text-muted-foreground">
          {post.summary}
        </p>
        <Link
          aria-label={`${post.title} 자세히 보기`}
          className="mt-7 inline-flex min-h-11 w-fit items-center gap-2 py-2 text-base font-bold text-primary underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          href={`/news/${post.slug}`}
        >
          자세히 보기
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

export default async function NewsPage() {
  const newsRepository = getNewsRepository();
  const posts = await newsRepository.listPublished({ limit: 20 });
  const hasDemoPosts = posts.some((post) => post.isDemo);
  const [featuredPost, ...remainingPosts] = posts;

  return (
    <>
      <PageHero
        eyebrow="소식"
        title="중요한 안내와 활동 소식을 정확하게 전합니다"
        description="공지사항과 생활 속 활동 이야기를 제목, 분류, 게시일 순서로 확인할 수 있습니다. 공개 전 사실관계와 개인정보를 검토한 내용만 게시합니다."
        asideTitle="소식 구성"
        items={newsCategories.map((category) => ({
          label: category.title,
          value: category.description,
        }))}
        primaryAction={{ label: "최근 소식 확인하기", href: "#news-list" }}
        secondaryAction={{
          label: "인스타그램 소식 보기",
          href: siteConfig.instagram,
          external: true,
        }}
      />

      <section
        id="news-list"
        aria-labelledby="news-list-heading"
        className="scroll-mt-28 bg-surface py-20 sm:py-24"
      >
        <div className="mx-auto w-full max-w-site px-page sm:px-page-wide">
          <div className="grid gap-7 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <div>
              <p className="text-small font-bold text-accent">최근 소식</p>
              <h2
                id="news-list-heading"
                className="text-safe-wrap mt-3 max-w-3xl text-balance text-display font-bold text-foreground sm:text-display-lg"
              >
                새로운 이야기를 확인하세요
              </h2>
            </div>
            <p className="text-safe-wrap max-w-xl text-pretty text-body text-muted-foreground lg:justify-self-end">
              중요한 안내와 최근 활동을 제목, 분류, 게시일 순서로 쉽게 확인할
              수 있습니다.
            </p>
          </div>

          {posts.length === 0 ? (
            <div
              aria-labelledby="news-empty-heading"
              className="mt-12 grid overflow-hidden rounded-panel border border-border bg-home-cream shadow-card lg:grid-cols-[1.1fr_0.9fr]"
            >
              <div className="flex min-h-80 flex-col justify-between p-7 sm:p-10 lg:p-12">
                <div>
                  <p className="text-small font-bold text-accent">
                    게시물 준비 중
                  </p>
                  <h3
                    id="news-empty-heading"
                    className="text-safe-wrap mt-4 max-w-2xl text-balance text-display font-bold text-foreground"
                  >
                    첫 소식을 준비하고 있습니다
                  </h3>
                  <p className="text-safe-wrap mt-5 max-w-xl text-pretty text-body text-muted-foreground">
                    새로운 게시물이 등록되기 전까지 생활이야기와 공식
                    인스타그램에서 샬롬의 집의 일상을 확인할 수 있습니다.
                  </p>
                </div>

                <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
                  <Link
                    className="inline-flex min-h-12 items-center justify-center rounded-control bg-home-ink px-6 py-3 text-base font-bold text-hero-on-dark transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
                    href="/life"
                  >
                    생활이야기 보기
                  </Link>
                  <a
                    className="inline-flex min-h-12 items-center gap-2 px-3 py-3 text-base font-bold text-primary underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                    href={siteConfig.instagram}
                    rel="noreferrer"
                    target="_blank"
                  >
                    인스타그램 보기
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>

            <div className="flex min-h-64 items-end border-t border-border bg-home-ink p-7 text-hero-on-dark sm:p-10 lg:min-h-full lg:border-l lg:border-t-0">
              <p className="text-safe-wrap max-w-sm text-balance text-title font-bold">
                확인된 소식부터 차분히 채워 가겠습니다.
              </p>
            </div>
            </div>
          ) : (
            <div className="mt-12">
              {hasDemoPosts ? (
                <aside className="mb-7 rounded-card border border-border bg-primary-soft px-6 py-5">
                  <p className="text-small font-bold text-primary">
                    개발용 예시 콘텐츠
                  </p>
                  <p className="text-safe-wrap mt-2 max-w-3xl text-pretty text-body text-muted-foreground">
                    현재 게시물은 목록과 상세 화면을 확인하기 위한 예시이며 공식
                    시설 소식이 아닙니다.
                  </p>
                </aside>
              ) : null}

              {featuredPost ? (
                <NewsPostCard featured post={featuredPost} />
              ) : null}

              {remainingPosts.length > 0 ? (
                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  {remainingPosts.map((post) => (
                    <NewsPostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <section className="bg-home-cream py-20 sm:py-24">
        <div className="mx-auto grid w-full max-w-site overflow-hidden rounded-panel border border-border bg-home-ink lg:grid-cols-[0.8fr_1.2fr]">
          <div className="px-7 py-12 text-hero-on-dark sm:px-12 sm:py-16 lg:px-14">
            <p className="text-small font-bold text-home-sun">게시 원칙</p>
            <h2
              id="news-principles-heading"
              className="text-safe-wrap mt-4 max-w-xl text-balance text-display font-bold sm:text-display-lg"
            >
              정확하고 편안하게 읽을 수 있는 소식을 전합니다
            </h2>
          </div>

          <ol
            aria-labelledby="news-principles-heading"
            className="grid bg-surface"
          >
            {publicationPrinciples.map((principle) => (
              <li
                key={principle.number}
                className="grid gap-4 border-b border-border px-7 py-8 last:border-b-0 sm:grid-cols-[3rem_0.8fr_1.2fr] sm:items-start sm:gap-6 lg:px-10"
              >
                <span className="text-small font-bold text-accent">
                  {principle.number}
                </span>
                <h3 className="text-safe-wrap text-balance text-lg font-bold text-foreground">
                  {principle.title}
                </h3>
                <p className="text-safe-wrap text-pretty text-body text-muted-foreground">
                  {principle.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
