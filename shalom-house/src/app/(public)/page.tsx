import type { Metadata } from "next";
import Link from "next/link";

import { HomeHeroSlider } from "@/components/home/home-hero-slider";
import { siteConfig } from "@/config/site";
import { getNewsRepository } from "@/features/news/news.repository";
import { getNewsCategoryLabel } from "@/features/news/news.types";
import type { PublicNewsPostSummary } from "@/features/news/news.types";

export const metadata: Metadata = {
  title: "함께 살아가는 따뜻한 보금자리",
  description:
    "30년 넘게 서울 강서구에서 지체 및 지적 장애인과 함께 일상을 이어 온 샬롬의 집을 소개합니다.",
};

export const dynamic = "force-dynamic";

const activityStories = [
  {
    number: "01",
    title: "평일 점심 식사 도움",
    description:
      "식사를 준비하고 나누는 평범한 시간이 이웃과 만나는 따뜻한 연결이 됩니다.",
  },
  {
    number: "02",
    title: "나들이 지원",
    description:
      "익숙한 공간을 벗어나 계절과 지역사회를 경험하는 하루를 함께해 왔습니다.",
  },
  {
    number: "03",
    title: "공간복지 드림하우스",
    description:
      "생활 공간을 더 안전하고 편안하게 가꾸는 공간복지 지원을 이어 왔습니다.",
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
      <HomeHeroSlider />

      <section aria-labelledby="home-identity-heading" className="bg-background">
        <div className="mx-auto grid w-full max-w-site gap-12 px-page py-section sm:px-page-wide sm:py-section-wide lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <p className="text-small font-bold text-primary">샬롬의 집은</p>
            <h2
              id="home-identity-heading"
              className="mt-4 text-display font-bold text-foreground sm:text-display-lg"
            >
              시설보다 먼저,
              <span className="block text-primary">함께 사는 집입니다</span>
            </h2>
          </div>

          <div className="lg:pt-3">
            <p className="max-w-content text-xl font-semibold leading-9 text-foreground sm:text-2xl sm:leading-10">
              서로 다른 몸과 마음의 속도를 존중하며, 일상의 기쁨과 어려움을
              곁에서 함께 나눕니다.
            </p>
            <p className="mt-6 max-w-content text-body text-muted-foreground">
              샬롬의 집은 30년이 넘는 시간 동안 지역사회 안에서 지체 및 지적
              장애인의 보금자리를 지켜 왔습니다. 특별한 순간만이 아니라 매일의
              식사와 대화, 외출과 휴식이 안전하게 이어지도록 함께합니다.
            </p>
            <Link
              className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full border border-primary bg-primary px-6 py-3 text-base font-bold text-primary-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
              href="/about"
            >
              샬롬 소개 자세히 보기
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <dl className="grid border-y border-border-strong sm:grid-cols-3 lg:col-span-2">
            <div className="border-b border-border py-6 sm:border-b-0 sm:border-r sm:px-6 sm:first:pl-0">
              <dt className="text-small font-bold text-muted-foreground">
                함께해 온 시간
              </dt>
              <dd className="mt-2 text-title font-bold text-primary">30년+</dd>
            </div>
            <div className="border-b border-border py-6 sm:border-b-0 sm:border-r sm:px-6">
              <dt className="text-small font-bold text-muted-foreground">
                자리한 곳
              </dt>
              <dd className="mt-2 text-title font-bold text-primary">
                서울 강서구
              </dd>
            </div>
            <div className="py-6 sm:pl-6">
              <dt className="text-small font-bold text-muted-foreground">
                가장 중요한 가치
              </dt>
              <dd className="mt-2 text-title font-bold text-primary">
                존중과 일상
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section
        aria-labelledby="home-life-heading"
        className="border-y border-border bg-surface"
      >
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end lg:gap-16">
            <div>
              <p className="text-small font-bold text-accent">
                함께해 온 활동 사례
              </p>
              <h2
                id="home-life-heading"
                className="mt-4 text-display font-bold text-foreground sm:text-display-lg"
              >
                일상을 더 넓게 만드는 세 가지 장면
              </h2>
            </div>
            <p className="max-w-content text-body text-muted-foreground lg:justify-self-end">
              누군가의 일방적인 도움보다, 함께 경험하고 관계를 이어 가는 시간을
              중요하게 생각합니다. 아래 내용은 샬롬의 집이 지역사회와 함께해 온
              활동 사례입니다.
            </p>
          </div>

          <ol className="mt-12 grid border-t border-border-strong lg:grid-cols-3">
            {activityStories.map((activity) => (
              <li
                key={activity.number}
                className="border-b border-border py-8 lg:border-b-0 lg:border-r lg:px-8 lg:py-10 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
              >
                <p className="text-small font-bold text-accent">
                  {activity.number}
                </p>
                <h3 className="mt-5 text-heading font-bold text-foreground">
                  {activity.title}
                </h3>
                <p className="mt-4 text-body text-muted-foreground">
                  {activity.description}
                </p>
              </li>
            ))}
          </ol>

          <Link
            className="mt-10 inline-flex min-h-12 items-center gap-2 text-base font-bold text-primary underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            href="/life"
          >
            생활과 활동 더 알아보기
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section aria-labelledby="home-news-heading" className="bg-primary-soft">
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
          <div className="flex flex-col gap-6 border-b border-border-strong pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-small font-bold text-primary">
                소식과 이야기
              </p>
              <h2
                id="home-news-heading"
                className="mt-3 text-display font-bold text-foreground sm:text-display-lg"
              >
                샬롬의 집의 오늘
              </h2>
            </div>
            <Link
              className="inline-flex min-h-11 items-center gap-2 self-start text-base font-bold text-primary underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:self-auto"
              href="/news"
            >
              전체 소식 보기
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {newsPosts.length > 0 ? (
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
          ) : (
            <div className="grid gap-6 py-10 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-small font-bold text-primary">
                  새 소식을 준비하고 있습니다
                </p>
                <p className="mt-3 max-w-2xl text-body text-muted-foreground">
                  사실관계와 공개 범위 검토를 마친 소식이 등록되면 이곳에서
                  가장 먼저 안내합니다.
                </p>
              </div>
              <Link
                className="inline-flex min-h-12 items-center gap-2 justify-self-start rounded-full border border-primary px-6 py-3 text-base font-bold text-primary transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
                href="/news"
              >
                소식 페이지 보기
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="home-together-heading" className="bg-background">
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
          <div className="overflow-hidden rounded-panel bg-hero-night text-hero-on-dark shadow-elevated">
            <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
              <div className="p-7 sm:p-10 lg:p-14">
                <p className="text-small font-bold text-sun-soft">
                  지역사회와 함께
                </p>
                <h2
                  id="home-together-heading"
                  className="mt-4 text-display font-bold text-hero-on-dark sm:text-display-lg"
                >
                  관심이 일상으로 이어지는 방법
                </h2>
                <p className="mt-6 max-w-content text-body text-hero-muted">
                  평일 점심 식사 도움부터 나들이와 공간 지원까지, 샬롬의 집과
                  함께하는 방법을 확인해 보세요. 현재 가능한 절차와 문의 경로를
                  정확하게 안내합니다.
                </p>
                <Link
                  className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-hero-on-dark bg-hero-on-dark px-6 py-3 text-base font-bold text-hero-night transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-sun-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hero-on-dark"
                  href="/support"
                >
                  후원과 자원봉사 알아보기
                  <span aria-hidden="true">→</span>
                </Link>
              </div>

              <div className="border-t border-hero-on-dark/25 bg-hero-on-dark/50 p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-14">
                <p className="text-small font-bold text-sun-soft">
                  투명한 운영
                </p>
                <h3 className="mt-4 text-title font-bold text-hero-on-dark">
                  신뢰는 공개에서 시작합니다
                </h3>
                <p className="mt-5 text-body text-hero-muted">
                  공개 승인을 마친 운영 및 후원 관련 자료를 누구나 찾기 쉽게
                  안내합니다.
                </p>
                <Link
                  className="mt-8 inline-flex min-h-11 items-center gap-2 text-base font-bold text-hero-on-dark underline decoration-hero-on-dark/70 underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-sun-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-on-dark"
                  href="/transparency"
                >
                  운영 공개 확인하기
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <h2 className="sr-only">기본 연락 안내</h2>
        <div className="mx-auto grid w-full max-w-site gap-7 px-page py-10 sm:grid-cols-[1fr_auto] sm:items-center sm:px-page-wide">
          <div>
            <p className="text-small font-bold text-primary">샬롬의 집 위치</p>
            <p className="mt-2 break-words text-body font-semibold text-foreground">
              {siteConfig.address}
            </p>
          </div>
          <a
            className="inline-flex min-h-12 items-center gap-3 justify-self-start rounded-full border border-border-strong px-6 py-3 text-base font-bold text-primary transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:border-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring sm:justify-self-end"
            href={`tel:${siteConfig.phone}`}
          >
            대표 전화 {siteConfig.phone}
          </a>
        </div>
      </section>
    </>
  );
}
