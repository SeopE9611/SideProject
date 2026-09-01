import type { Metadata } from "next";
import Link from "next/link";

import { HomeHero } from "@/components/home/home-hero";
import { siteConfig } from "@/config/site";
import { homeFixture } from "@/content/fixtures/home.fixture";
import { getNewsRepository } from "@/features/news/news.repository";
import { getNewsCategoryLabel, type PublicNewsPostSummary } from "@/features/news/news.types";

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
    return posts.filter((post) => !post.isDemo).slice(0, 3);
  } catch (error) {
    console.error("홈 최근 소식을 불러오지 못했습니다.", error);
    return [];
  }
}

const sectionLink =
  "inline-flex min-h-11 items-center font-bold text-primary underline decoration-border-strong underline-offset-4 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

export default async function Home() {
  const newsPosts = await getHomeNewsPosts();
  return (
    <>
      <HomeHero
        siteName={siteConfig.name}
        facilityType="장애인거주시설"
        description={siteConfig.description}
        media={homeFixture.heroMedia}
      />
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

          {newsPosts.length ? (
            <ul className="mt-7 border-t-2 border-foreground">
              {newsPosts.map((post) => (
                <li key={post.id} className="border-b border-border">
                  <article className="grid gap-3 py-6 md:grid-cols-[7rem_minmax(0,1fr)_9rem]">
                    <p className="text-small font-bold text-primary">{getNewsCategoryLabel(post.category)}</p>
                    <div>
                      <h3 className="text-heading font-bold">
                        <Link
                          className="text-safe-wrap underline decoration-border-strong underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                          href={`/news/${post.slug}`}
                        >
                          {post.title}
                        </Link>
                      </h3>
                      <p className="text-safe-wrap mt-2 text-body text-muted-foreground">{post.summary}</p>
                    </div>
                    <time className="text-small text-muted-foreground md:text-right" dateTime={post.publishedAt}>
                      {dateFormatter.format(new Date(post.publishedAt))}
                    </time>
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 border-y border-border bg-surface py-5">
              <p className="text-small font-bold text-accent">게시 준비 중</p>
              <h3 className="mt-2 font-bold">새로운 소식을 준비하고 있습니다.</h3>
              <p className="text-safe-wrap mt-2 text-muted-foreground">
                공개된 공지사항과 활동소식이 등록되면 이곳에서 안내합니다.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                <Link className={sectionLink} href="/news">
                  소식 페이지 보기
                </Link>
                <a className={sectionLink} href={siteConfig.instagram} target="_blank" rel="noreferrer">
                  인스타그램 보기(새 창)
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      <section
        aria-labelledby="life-program-heading"
        className="border-y border-border bg-surface-subtle py-10 sm:py-14"
      >
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <h2 id="life-program-heading" className="text-title font-bold">
            생활과 프로그램
          </h2>
          <p className="text-safe-wrap mt-3 text-body text-muted-foreground">
            일상생활과 프로그램, 공개 승인된 활동 기록을 확인할 수 있습니다.
          </p>
          <ul className="mt-6 grid border-t-4 border-foreground md:grid-cols-3">
            {[
              {
                title: "생활이야기",
                description: "샬롬의 집에서 이어지는 생활과 활동을 살펴봅니다.",
                href: "/life",
              },
              {
                title: "프로그램",
                description: "확인된 프로그램이 등록되면 분류와 목적을 안내합니다.",
                href: "/life/programs",
              },
              {
                title: "활동사진",
                description: "공개 동의와 승인을 마친 활동사진을 확인합니다.",
                href: "/life/gallery",
              },
            ].map((item) => (
              <li key={item.href} className="border-b border-border md:px-5 first:md:pl-0 last:md:pr-0">
                <div className="py-6">
                  <h3 className="text-heading font-bold">
                    <Link className={sectionLink} href={item.href}>
                      {item.title}
                    </Link>
                  </h3>
                  <p className="text-safe-wrap mt-3 text-body text-muted-foreground">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="participation-heading" className="bg-surface py-10 sm:py-12">
        <div className="mx-auto grid max-w-site gap-6 px-page sm:px-page-wide md:grid-cols-2 md:items-start">
          <div>
            <h2 id="participation-heading" className="text-title font-bold">
              함께할 수 있는 방법
            </h2>
            <p className="text-safe-wrap mt-3 text-body text-muted-foreground">
              후원과 자원봉사 참여 전 최신 절차를 확인해 주세요.
            </p>
            <p className="text-safe-wrap mt-3">
              <strong>대표 전화</strong> {siteConfig.phone}
            </p>
          </div>
          <ul className="border-y border-border">
            {[
              { label: "후원하기", href: "/support/donation" },
              { label: "자원봉사", href: "/support/volunteer" },
              { label: "문의하기", href: "/support/contact" },
            ].map((item) => (
              <li key={item.href} className="border-b border-border last:border-b-0">
                <Link className={`${sectionLink} w-full py-2`} href={item.href}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="documents-heading" className="border-y border-border bg-surface-subtle py-10 sm:py-12">
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <h2 id="documents-heading" className="text-title font-bold">
            자료공개
          </h2>
          <p className="text-safe-wrap mt-3 text-body text-muted-foreground">확인을 마친 운영 자료를 안내합니다.</p>
          <div className="mt-6 border-y border-border bg-surface py-5">
            <h3 className="font-bold">현재 공개된 자료가 없습니다.</h3>
            <p className="text-safe-wrap mt-2 text-muted-foreground">
              자료가 게시되면 자료공개 페이지에서 확인할 수 있습니다.
            </p>
            <Link className={`${sectionLink} mt-3`} href="/transparency">
              자료공개 보기
            </Link>
          </div>
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
