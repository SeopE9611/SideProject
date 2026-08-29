import type { Metadata } from "next";
import Link from "next/link";

import { HomeHero } from "@/components/home/home-hero";
import { siteConfig } from "@/config/site";
import { getNewsRepository } from "@/features/news/news.repository";
import { getNewsCategoryLabel } from "@/features/news/news.types";
import type { PublicNewsPostSummary } from "@/features/news/news.types";

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

export const dynamic = "force-dynamic";

const quickLinks = [
  {
    label: "시설 안내",
    description: "시설의 기본 정보와 찾아오시는 길",
    href: "/about",
  },
  {
    label: "생활 이야기",
    description: "샬롬의 집에서 이어지는 일상과 활동",
    href: "/life",
  },
  {
    label: "함께하기",
    description: "후원과 자원봉사 참여 전 확인 사항",
    href: "/support",
  },
  {
    label: "정보공개",
    description: "운영과 후원 관련 공개 자료",
    href: "/transparency",
  },
] as const;

const dailyStories = [
  {
    label: "식탁",
    title: "함께 준비하고 나누는 한 끼",
    description:
      "식사를 준비하고 한 식탁에 둘러앉는 평범한 시간이 하루의 리듬을 만듭니다.",
  },
  {
    label: "외부 활동",
    title: "집 밖에서 만나는 사람과 장소",
    description:
      "나들이와 지역 활동을 통해 새로운 경험을 나누고 생활의 범위를 넓혀 갑니다.",
  },
  {
    label: "생활 공간",
    title: "매일 머무는 곳을 더 편안하게",
    description:
      "생활 공간을 안전하고 편안하게 살피며 필요한 변화를 이어 갑니다.",
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

export default async function Home() {
  const newsPosts = await getHomeNewsPosts();

  return (
    <>
      <HomeHero />

      <nav
        aria-labelledby="home-quick-links-heading"
        className="border-b border-border bg-surface"
      >
        <div className="mx-auto w-full max-w-site px-page sm:px-page-wide">
          <h2 id="home-quick-links-heading" className="sr-only">
            자주 찾는 안내
          </h2>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map((item, index) => (
              <li
                key={item.href}
                className={`${index > 0 ? "border-t border-border sm:border-t-0" : ""} ${index % 2 === 1 ? "sm:border-l" : ""} ${index > 0 ? "lg:border-l" : ""}`}
              >
                <Link
                  className="group flex min-h-36 flex-col justify-between gap-6 px-5 py-7 text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-focus-ring sm:px-6"
                  href={item.href}
                >
                  <span className="text-safe-wrap text-lg font-bold">
                    {item.label}
                  </span>
                  <span className="flex items-end justify-between gap-4">
                    <span className="text-safe-wrap text-small text-muted-foreground">
                      {item.description}
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-xl font-bold text-primary transition-transform duration-[var(--motion-duration-fast)] ease-standard group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <section
        aria-labelledby="home-life-heading"
        className="bg-surface py-20 sm:py-28"
      >
        <div className="mx-auto w-full max-w-site px-page sm:px-page-wide">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div className="lg:sticky lg:top-40 lg:self-start">
              <p className="text-small font-bold tracking-[0.08em] text-accent">
                샬롬의 일상
              </p>
              <h2
                id="home-life-heading"
                className="text-safe-wrap mt-4 max-w-2xl text-balance text-display font-bold text-foreground sm:text-display-lg"
              >
                같이 먹고, 걷고, 쉬는 하루
              </h2>
              <p className="text-safe-wrap mt-6 max-w-xl text-pretty text-body text-muted-foreground">
                특별한 행사가 아니어도 괜찮습니다. 함께 보내는 평범한 시간이
                샬롬의 집의 가장 중요한 이야기가 됩니다.
              </p>
              <Link
                className="mt-7 inline-flex min-h-11 items-center gap-2 text-base font-bold text-primary underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                href="/life"
              >
                생활이야기 전체 보기
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            <ol className="border-t-2 border-foreground">
              {dailyStories.map((story, index) => (
                <li
                  key={story.label}
                  className="grid gap-5 border-b border-border-strong py-8 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-7 sm:py-10"
                >
                  <span className="text-small font-bold text-accent">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <article>
                    <p className="text-small font-bold text-primary">
                      {story.label}
                    </p>
                    <h3 className="text-safe-wrap mt-3 text-balance text-title font-bold text-foreground">
                      {story.title}
                    </h3>
                    <p className="text-safe-wrap mt-4 max-w-2xl text-pretty text-body text-muted-foreground">
                      {story.description}
                    </p>
                  </article>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="home-news-heading"
        className="border-y border-border bg-home-cream py-20 sm:py-24"
      >
        <div className="mx-auto grid w-full max-w-site gap-12 px-page sm:px-page-wide lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <div>
            <p className="text-small font-bold tracking-[0.08em] text-accent">
              최근 소식
            </p>
            <h2
              id="home-news-heading"
              className="text-safe-wrap mt-4 text-balance text-display font-bold text-foreground sm:text-display-lg"
            >
              새로운 안내와 활동 기록
            </h2>
            <Link
              className="mt-7 inline-flex min-h-11 items-center gap-2 text-base font-bold text-primary underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              href="/news"
            >
              전체 소식 보기
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {newsPosts.length > 0 ? (
            <ul className="border-t-2 border-foreground">
              {newsPosts.map((post) => (
                <li key={post.id} className="border-b border-border-strong">
                  <article className="grid gap-4 py-7 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-start sm:gap-6">
                    <p className="text-small font-bold text-primary">
                      {getNewsCategoryLabel(post.category)}
                    </p>
                    <div>
                      <h3 className="text-heading font-bold text-foreground">
                        <Link
                          className="text-safe-wrap underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                          href={`/news/${post.slug}`}
                        >
                          {post.title}
                        </Link>
                      </h3>
                      <p className="text-safe-wrap mt-2 max-w-2xl text-pretty text-body text-muted-foreground">
                        {post.summary}
                      </p>
                    </div>
                    <time
                      dateTime={post.publishedAt}
                      className="text-small text-muted-foreground sm:text-right"
                    >
                      {publishedDateFormatter.format(new Date(post.publishedAt))}
                    </time>
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <div className="border-t-2 border-foreground py-8 sm:py-10">
              <p className="text-small font-bold text-accent">공식 채널 안내</p>
              <h3 className="text-safe-wrap mt-3 text-balance text-title font-bold text-foreground">
                홈페이지의 첫 소식을 준비하고 있습니다
              </h3>
              <p className="text-safe-wrap mt-4 max-w-2xl text-pretty text-body text-muted-foreground">
                새로운 게시물이 등록되기 전까지 공식 인스타그램에서 최근
                활동을 확인할 수 있습니다.
              </p>
              <a
                className="mt-6 inline-flex min-h-11 items-center gap-2 text-base font-bold text-primary underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                href={siteConfig.instagram}
                rel="noreferrer"
                target="_blank"
              >
                공식 인스타그램 보기
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          )}
        </div>
      </section>

      <section
        aria-labelledby="home-together-heading"
        className="bg-surface py-20 sm:py-28"
      >
        <div className="mx-auto grid w-full max-w-site overflow-hidden border border-border bg-home-ink lg:grid-cols-[1fr_1fr]">
          <div className="px-7 py-12 text-hero-on-dark sm:px-12 sm:py-16 lg:px-14">
            <p className="text-small font-bold tracking-[0.08em] text-sun-soft">
              함께하기
            </p>
            <h2
              id="home-together-heading"
              className="text-safe-wrap mt-4 max-w-xl text-balance text-display font-bold sm:text-display-lg"
            >
              마음을 더하는 방법도 정확하게 안내합니다
            </h2>
            <p className="text-safe-wrap mt-5 max-w-xl text-pretty text-body text-hero-muted">
              자원봉사와 후원 절차를 확인하고, 운영과 후원 관련 공개 자료를
              함께 살펴볼 수 있습니다.
            </p>
          </div>

          <div className="grid bg-surface">
            <Link
              className="group flex min-h-40 items-center justify-between gap-6 border-b border-border px-7 py-7 text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-focus-ring sm:px-10"
              href="/support"
            >
              <span>
                <span className="text-small font-bold text-accent">
                  참여 안내
                </span>
                <span className="text-safe-wrap mt-2 block text-heading font-bold">
                  자원봉사와 후원 문의 방법
                </span>
              </span>
              <span aria-hidden="true" className="text-2xl font-bold transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
            <Link
              className="group flex min-h-40 items-center justify-between gap-6 px-7 py-7 text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-focus-ring sm:px-10"
              href="/transparency"
            >
              <span>
                <span className="text-small font-bold text-primary">
                  정보공개
                </span>
                <span className="text-safe-wrap mt-2 block text-heading font-bold">
                  운영 및 후원 공개 자료
                </span>
              </span>
              <span aria-hidden="true" className="text-2xl font-bold transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
