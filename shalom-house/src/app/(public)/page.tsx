import type { Metadata } from "next";
import Link from "next/link";

import { FixtureMediaPlaceholder } from "@/components/home/fixture-media-placeholder";
import { HomeHero } from "@/components/home/home-hero";
import { siteConfig } from "@/config/site";
import { homeFixture } from "@/content/fixtures/home.fixture";
import { getNewsRepository } from "@/features/news/news.repository";
import {
  getNewsCategoryLabel,
  type PublicNewsPostSummary,
} from "@/features/news/news.types";

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};
export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

async function getHomeNewsPosts(): Promise<readonly PublicNewsPostSummary[]> {
  try {
    const posts = await getNewsRepository().listPublished({ limit: 6 });
    const official = posts.filter((post) => !post.isDemo);

    return (official.length > 0
      ? official
      : posts.filter((post) => post.isDemo)
    ).slice(0, 3);
  } catch (error) {
    console.error("홈 최근 소식을 불러오지 못했습니다.", error);
    return [];
  }
}

const sectionLink =
  "inline-flex min-h-11 items-center font-bold text-primary underline decoration-border-strong underline-offset-4 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

export default async function Home() {
  const newsPosts = await getHomeNewsPosts();
  const showsFixtureNews = newsPosts.some((post) => post.isDemo);

  return (
    <>
      <HomeHero
        siteName={siteConfig.name}
        facilityType="장애인거주시설"
        description={siteConfig.description}
        media={homeFixture.heroMedia}
      />
      <aside className="border-b border-border bg-surface-subtle">
        <p className="text-safe-wrap mx-auto max-w-site px-page py-4 text-small text-muted-foreground sm:px-page-wide">
          현재 일부 이미지와 문구는 화면 구성 검증용 예시이며 공식 시설 콘텐츠가
          아닙니다.
        </p>
      </aside>

      <nav aria-labelledby="quick-heading" className="border-b border-border bg-surface">
        <div className="mx-auto max-w-site px-page py-10 sm:px-page-wide sm:py-12">
          <h2 id="quick-heading" className="text-heading font-bold">
            자주 찾는 업무
          </h2>
          <ul className="mt-5 grid divide-y divide-border border-y border-border sm:grid-cols-2 sm:divide-x lg:grid-cols-3">
            {homeFixture.quickLinks.map((item) => (
              <li key={item.href}>
                <Link
                  className="group block px-4 py-5 hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus-ring"
                  href={item.href}
                >
                  <strong className="text-safe-wrap block">{item.label}</strong>
                  <span className="text-safe-wrap mt-2 block text-body text-muted-foreground lg:text-base">
                    {item.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <section aria-labelledby="news-heading" className="bg-surface py-10 sm:py-14">
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-small font-bold text-accent">최근 소식</p>
              <h2 id="news-heading" className="mt-2 text-title font-bold">
                공지와 활동 소식
              </h2>
            </div>
            <Link className={sectionLink} href="/news">
              전체 소식 보기
            </Link>
          </div>
          {showsFixtureNews ? (
            <p className="mt-6 border-l-4 border-primary bg-primary-soft px-4 py-3 text-small">
              개발용 예시 게시물이며 공식 시설 소식이 아닙니다.
            </p>
          ) : null}
          {newsPosts.length ? (
            <ul className="mt-7 border-t-2 border-foreground">
              {newsPosts.map((post) => (
                <li key={post.id} className="border-b border-border">
                  <article className="grid gap-3 py-6 md:grid-cols-[7rem_minmax(0,1fr)_9rem]">
                    <p className="text-small font-bold text-primary">
                      {getNewsCategoryLabel(post.category)}
                    </p>
                    <div>
                      <h3 className="text-heading font-bold">
                        <Link
                          className="text-safe-wrap underline decoration-border-strong underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                          href={`/news/${post.slug}`}
                        >
                          {post.title}
                        </Link>
                      </h3>
                      <p className="text-safe-wrap mt-2 text-body text-muted-foreground">
                        {post.summary}
                      </p>
                    </div>
                    <time
                      className="text-small text-muted-foreground md:text-right"
                      dateTime={post.publishedAt}
                    >
                      {dateFormatter.format(new Date(post.publishedAt))}
                    </time>
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 border-y border-border bg-surface py-5">
              <p className="text-small font-bold text-accent">게시 준비 중</p>
              <h3 className="mt-2 font-bold">홈페이지 소식을 준비하고 있습니다.</h3>
              <p className="text-safe-wrap mt-2 text-muted-foreground">
                새 게시물이 공개되면 이 영역에서 확인할 수 있습니다.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                <Link className={sectionLink} href="/news">
                  소식 페이지 보기
                </Link>
                <a
                  className={sectionLink}
                  href={siteConfig.instagram}
                  target="_blank"
                  rel="noreferrer"
                >
                  인스타그램 보기(새 창)
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      <section
        aria-labelledby="support-heading"
        className="border-y border-border bg-surface-subtle py-10 sm:py-14"
      >
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <h2 id="support-heading" className="text-title font-bold">
            생활·지원 영역
          </h2>
          <ul className="mt-6 border-y border-border md:grid md:grid-cols-2">
            {homeFixture.supportAreas.map((item, index) => (
              <li
                key={item.id}
                className={`border-border ${index > 0 ? "border-t" : ""} ${
                  index === 1 ? "md:border-t-0" : ""
                } ${index % 2 === 1 ? "md:border-l" : ""}`}
              >
                <Link
                  className="block h-full px-2 py-6 hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus-ring sm:px-5"
                  href={item.href}
                >
                  <span className="text-small font-bold text-accent">{item.label}</span>
                  <h3 className="text-safe-wrap mt-2 text-heading font-bold">
                    {item.title}
                  </h3>
                  <p className="text-safe-wrap mt-3 text-body text-muted-foreground">
                    {item.description}
                  </p>
                  <span className="mt-4 block text-small font-bold text-primary underline underline-offset-4">
                    자세히 보기
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="stories-heading" className="bg-surface py-11 sm:py-16">
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="stories-heading" className="text-title font-bold">
              생활 기록
            </h2>
            <Link className={sectionLink} href="/life">
              생활이야기 보기
            </Link>
          </div>
          <ul className="mt-7 grid gap-8 lg:grid-cols-3">
            {homeFixture.stories.map((story) => (
              <li key={story.id}>
                <article>
                  {story.media?.kind === "placeholder" ? (
                    <FixtureMediaPlaceholder
                      label={story.media.label}
                      description={story.media.description}
                      compact
                    />
                  ) : null}
                  <div className={story.media ? "pt-5" : "border-t-4 border-primary pt-7"}>
                    <p className="text-small text-muted-foreground">
                      <span className="font-bold text-primary">{story.category}</span>
                      {` · ${story.dateLabel}`}
                    </p>
                    <h3 className="text-safe-wrap mt-3 text-heading font-bold">
                      <Link
                        className="underline decoration-border-strong underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                        href={story.href}
                      >
                        {story.title}
                      </Link>
                    </h3>
                    <p className="text-safe-wrap mt-3 text-body text-muted-foreground">
                      {story.description}
                    </p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="documents-heading"
        className="border-y border-border bg-surface-subtle py-12"
      >
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="documents-heading" className="text-title font-bold">
              자료공개
            </h2>
            <Link className={sectionLink} href="/transparency">
              자료공개 전체 보기
            </Link>
          </div>
          <ul className="mt-6 divide-y divide-border border-y border-border bg-surface">
            {homeFixture.documents.map((doc) => (
              <li key={doc.id}>
                <Link
                  className="grid min-h-24 gap-2 px-5 py-5 hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus-ring md:grid-cols-[minmax(0,1fr)_10rem_9rem_10rem] md:items-center"
                  href={doc.href}
                >
                  <strong className="text-safe-wrap">{doc.title}</strong>
                  <span className="text-small text-muted-foreground">{doc.period}</span>
                  <span className="text-small text-muted-foreground">{doc.format}</span>
                  <span className="text-small font-bold text-primary">
                    {doc.statusLabel}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="contact-heading" className="bg-surface py-12 sm:py-14">
        <div className="mx-auto grid max-w-site gap-7 border-l-4 border-primary px-page sm:px-page-wide lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-small font-bold text-accent">위치와 연락</p>
            <h2 id="contact-heading" className="mt-2 text-title font-bold">
              샬롬의 집 연락처
            </h2>
            <address className="mt-5 space-y-2 not-italic">
              <p className="text-safe-wrap">
                <strong>주소</strong> {siteConfig.address}
              </p>
              <p>
                <strong>대표 전화</strong> {siteConfig.phone}
              </p>
            </address>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              className="inline-flex min-h-12 items-center justify-center bg-primary px-5 py-3 font-bold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
              href={`tel:${siteConfig.phone}`}
            >
              전화 연결
            </a>
            <Link
              className="inline-flex min-h-12 items-center justify-center border border-border-strong px-5 py-3 font-bold hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              href="/about/directions"
            >
              찾아오시는 길
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
