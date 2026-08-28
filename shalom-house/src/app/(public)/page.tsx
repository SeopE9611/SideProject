import type { Metadata } from "next";
import Link from "next/link";

import {
  HomeHero,
  type HomeHeroNewsItem,
} from "@/components/home/home-hero";
import { siteConfig } from "@/config/site";
import { getNewsRepository } from "@/features/news/news.repository";
import { getNewsCategoryLabel } from "@/features/news/news.types";
import type { PublicNewsPostSummary } from "@/features/news/news.types";

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

export const dynamic = "force-dynamic";

const activityStories = [
  {
    number: "01",
    category: "자원봉사",
    title: "평일 점심 식사 지원",
    description:
      "평일 점심 식사 준비를 함께할 자원봉사자를 모집해 활동했습니다.",
  },
  {
    number: "02",
    category: "외부 활동",
    title: "나들이 지원",
    description:
      "외부 활동과 지역사회 경험을 지원하는 나들이 사업을 진행했습니다.",
  },
  {
    number: "03",
    category: "생활 공간",
    title: "공간복지 드림하우스",
    description:
      "생활 공간을 안전하고 편안하게 가꾸는 공간복지 사업을 진행했습니다.",
  },
] as const;

const publishedDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

async function getHomeNewsPosts(): Promise<readonly PublicNewsPostSummary[]> {
  try {
    const posts = await getNewsRepository().listPublished({ limit: 6 });
    return posts.filter((post) => !post.isDemo).slice(0, 3);
  } catch (error) {
    console.error("홈 최근 소식을 불러오지 못했습니다.", error);
    return [];
  }
}

function toHeroNewsItems(
  posts: readonly PublicNewsPostSummary[],
): readonly HomeHeroNewsItem[] {
  return posts.map((post) => ({
    id: post.id,
    categoryLabel: getNewsCategoryLabel(post.category),
    publishedAtLabel: publishedDateFormatter.format(new Date(post.publishedAt)),
    title: post.title,
    summary: post.summary,
    href: `/news/${post.slug}`,
  }));
}

export default async function Home() {
  const newsPosts = await getHomeNewsPosts();
  const heroNewsItems = toHeroNewsItems(newsPosts);

  return (
    <>
      <HomeHero newsItems={heroNewsItems} />

      <section
        aria-labelledby="home-life-heading"
        className="border-b border-border bg-surface"
      >
        <div className="mx-auto grid w-full max-w-site gap-10 px-page py-16 sm:px-page-wide sm:py-20 lg:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <p className="text-small font-bold text-accent">주요 활동</p>
            <h2
              id="home-life-heading"
              className="mt-4 text-title font-bold text-foreground sm:text-display"
            >
              함께 이어 가는 일상
            </h2>
            <p className="mt-6 max-w-content text-body text-muted-foreground">
              식사 준비, 나들이, 생활 공간 개선처럼 일상에 필요한 활동을
              지역사회와 함께했습니다.
            </p>
            <div className="mt-8">
              <Link
                className="inline-flex min-h-11 items-center gap-2 text-base font-bold text-primary underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                href="/life"
              >
                생활이야기 보기
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          <ol className="border-t border-border-strong">
            {activityStories.map((activity) => (
              <li
                key={activity.number}
                className="grid gap-3 border-b border-border py-7 sm:grid-cols-[3rem_8rem_1fr] sm:items-start sm:gap-6 sm:py-8"
              >
                <p className="text-small font-bold text-accent">
                  {activity.number}
                </p>
                <p className="text-small font-bold text-muted-foreground">
                  {activity.category}
                </p>
                <div>
                  <h3 className="text-heading font-bold text-foreground">
                    {activity.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-body text-muted-foreground">
                    {activity.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {newsPosts.length > 0 ? (
        <section aria-labelledby="home-news-heading" className="bg-background">
          <div className="mx-auto w-full max-w-site px-page py-16 sm:px-page-wide sm:py-20">
            <div className="grid gap-6 border-b border-border-strong pb-7 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <p className="text-small font-bold text-primary">최근 소식</p>
                <h2
                  id="home-news-heading"
                  className="mt-3 text-title font-bold text-foreground sm:text-display"
                >
                  샬롬의 집 소식
                </h2>
              </div>
              <Link
                className="inline-flex min-h-11 items-center gap-2 justify-self-start text-base font-bold text-primary underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:justify-self-end"
                href="/news"
              >
                전체 소식 보기
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            <ul>
              {newsPosts.map((post) => (
                <li key={post.id} className="border-b border-border">
                  <article className="grid gap-3 py-7 md:grid-cols-[8rem_1fr_auto] md:items-center md:gap-8 md:py-8">
                    <p className="text-small font-bold text-primary">
                      {getNewsCategoryLabel(post.category)}
                    </p>
                    <div>
                      <h3 className="text-heading font-bold text-foreground">
                        <Link
                          className="inline-flex min-h-11 items-center gap-2 py-1 underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                          href={`/news/${post.slug}`}
                        >
                          {post.title}
                          <span aria-hidden="true">→</span>
                        </Link>
                      </h3>
                      <p className="mt-2 max-w-3xl text-body text-muted-foreground">
                        {post.summary}
                      </p>
                    </div>
                    <time
                      dateTime={post.publishedAt}
                      className="text-small text-muted-foreground md:text-right"
                    >
                      {publishedDateFormatter.format(
                        new Date(post.publishedAt),
                      )}
                    </time>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : (
        <section
          aria-labelledby="home-news-heading"
          className="border-b border-border bg-background"
        >
          <div className="mx-auto grid w-full max-w-site gap-7 px-page py-12 sm:grid-cols-[1fr_auto] sm:items-center sm:px-page-wide sm:py-14">
            <div>
              <p className="text-small font-bold text-primary">최근 소식</p>
              <h2
                id="home-news-heading"
                className="mt-3 text-title font-bold text-foreground"
              >
                새 소식은 인스타그램에서 전합니다
              </h2>
              <p className="mt-3 max-w-2xl text-body text-muted-foreground">
                샬롬의 집의 현재 활동과 이야기를 공식 계정에서 확인하세요.
              </p>
            </div>
            <a
              className="inline-flex min-h-12 items-center gap-2 justify-self-start rounded-control border border-border-strong px-5 py-3 text-base font-bold text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:border-primary hover:bg-primary-soft hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring sm:justify-self-end"
              href={siteConfig.instagram}
            >
              인스타그램에서 보기
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
      )}

      <section
        aria-labelledby="home-guide-heading"
        className="border-y border-border bg-surface"
      >
        <div className="mx-auto w-full max-w-site px-page py-16 sm:px-page-wide sm:py-20">
          <div className="max-w-content">
            <p className="text-small font-bold text-accent">이용 안내</p>
            <h2
              id="home-guide-heading"
              className="mt-3 text-title font-bold text-foreground sm:text-display"
            >
              함께하는 방법과 공개자료
            </h2>
          </div>

          <div className="mt-10 grid border-y border-border-strong lg:grid-cols-2">
            <article className="border-b border-border bg-accent-soft p-7 sm:p-9 lg:border-b-0 lg:border-r">
              <p className="text-small font-bold text-accent">함께하기</p>
              <h3 className="mt-4 text-title font-bold text-foreground">
                자원봉사와 후원 안내
              </h3>
              <p className="mt-4 max-w-xl text-body text-muted-foreground">
                공개된 참여 방법과 문의 경로를 확인할 수 있습니다.
              </p>
              <Link
                className="mt-7 inline-flex min-h-11 items-center gap-2 text-base font-bold text-accent-hover underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                href="/support"
              >
                함께하기 안내 보기
                <span aria-hidden="true">→</span>
              </Link>
            </article>

            <article className="p-7 sm:p-9">
              <p className="text-small font-bold text-primary">정보공개</p>
              <h3 className="mt-4 text-title font-bold text-foreground">
                운영 및 후원 공개자료
              </h3>
              <p className="mt-4 max-w-xl text-body text-muted-foreground">
                공개 승인을 마친 운영 관련 자료를 확인할 수 있습니다.
              </p>
              <Link
                className="mt-7 inline-flex min-h-11 items-center gap-2 text-base font-bold text-primary underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                href="/transparency"
              >
                정보공개 확인하기
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
