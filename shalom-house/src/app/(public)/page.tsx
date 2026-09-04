import Image from "next/image";
import Link from "next/link";

import { HomeHero } from "@/components/home/home-hero";
import { isVisualFixtureEnabled, visualHomeImage } from "@/content/fixtures/visual.fixture";
import { siteConfig } from "@/config/site";
import { findPublicGalleryItems } from "@/features/gallery/gallery.repository";
import { getNewsRepository } from "@/features/news/news.repository";
import { getNewsCategoryLabel } from "@/features/news/news.types";
import { createPublicPageMetadata } from "@/features/seo/metadata";
import { getPublicContactInformation } from "@/features/site-content/site-content.repository";
import { createTelephoneHref } from "@/features/site-content/site-content.types";

export const metadata = createPublicPageMetadata("/");
export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC",
});
const quickLinks = [
  {
    label: "공지사항",
    description: "새로운 공지와 이용 안내",
    href: "/news/notices",
  },
  {
    label: "생활·프로그램",
    description: "생활 기록과 프로그램 안내",
    href: "/life",
  },
  {
    label: "함께하기",
    description: "참여 방법과 절차",
    href: "/support",
  },
  {
    label: "찾아오시는 길",
    description: "위치와 방문 문의",
    href: "/about/directions",
  },
];

export default async function Home() {
  const [contact, [newsResult, galleryResult]] = await Promise.all([
    getPublicContactInformation(),
    Promise.allSettled([getNewsRepository().listPublished({ limit: 5 }), findPublicGalleryItems()]),
  ]);
  const isPreview = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  const newsPosts =
    newsResult.status === "fulfilled" ? newsResult.value.filter((post) => isPreview || !post.isDemo) : [];
  const galleryItems = galleryResult.status === "fulfilled" ? galleryResult.value.slice(0, 4) : [];
  const leadPhoto = galleryItems[0];
  const visualFixtureEnabled = isVisualFixtureEnabled();
  const heroImage = visualFixtureEnabled
    ? visualHomeImage
    : leadPhoto
      ? {
          src: `/api/gallery/${leadPhoto.slug}/media`,
          alt: leadPhoto.altText,
          width: leadPhoto.width,
          height: leadPhoto.height,
          caption: leadPhoto.title,
          href: `/life/gallery/${leadPhoto.slug}`,
        }
      : undefined;
  const visibleGalleryItems = visualFixtureEnabled ? galleryItems.slice(0, 3) : galleryItems.slice(1, 4);
  const featuredGalleryItem = visibleGalleryItems[0];
  const compactGalleryItems = visibleGalleryItems.slice(1);
  const leadNewsPost = newsPosts[0];
  const remainingNewsPosts = newsPosts.slice(1);
  if (newsResult.status === "rejected") console.error("홈 최근 소식 조회 실패");
  if (galleryResult.status === "rejected") console.error("홈 활동사진 조회 실패");

  return (
    <div className="bg-surface">
      <HomeHero
        siteName={siteConfig.name}
        description="지체 및 지적 장애인이 함께 생활하는 장애인거주시설입니다."
        image={heroImage}
      />
      <nav aria-label="자주 찾는 안내" className="border-b border-border bg-surface">
        <ul className="mx-auto grid max-w-site grid-cols-2 px-page sm:px-page-wide lg:grid-cols-4">
          {quickLinks.map((item, index) => (
            <li key={item.href} className="border-border even:border-l lg:border-l lg:first:border-l-0">
              <Link
                className="group flex min-h-24 items-start gap-3 px-3 py-4 transition-colors duration-[var(--motion-duration-fast)] hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus-ring sm:px-6 lg:min-h-32 lg:py-7"
                href={item.href}
              >
                <span className="pt-1 text-xs font-bold tabular-nums text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-safe-wrap block text-base font-bold group-hover:text-accent sm:text-xl">
                    {item.label}
                  </span>
                  <span className="text-safe-wrap mt-1 hidden text-small text-muted-foreground sm:block">
                    {item.description}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="pt-0.5 text-lg text-primary transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto grid max-w-site items-start gap-10 px-page py-12 sm:px-page-wide sm:py-16 lg:grid-cols-12 lg:gap-12">
        <section aria-labelledby="news-heading" className="min-w-0 lg:col-span-8">
          <div className="flex flex-wrap items-end justify-between gap-x-5 border-b-2 border-primary pb-5">
            <div>
              <p className="text-small font-bold text-accent">최근 안내</p>
              <h2
                id="news-heading"
                className="mt-2 text-[1.875rem] font-extrabold tracking-[-0.025em] sm:text-[2.25rem]"
              >
                샬롬의 집 소식
              </h2>
            </div>
            <Link className="institution-link text-small" href="/news">
              전체 소식 <span aria-hidden="true">→</span>
            </Link>
          </div>
          {newsPosts.some((post) => post.isDemo) ? (
            <p className="py-2 text-xs text-muted-foreground">미리보기 · 아래 예시 소식은 레이아웃 검증용입니다.</p>
          ) : null}
          {leadNewsPost ? (
            <div className="border-b border-border">
              <article className="grid gap-4 py-7 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-6 sm:py-8">
                <div>
                  <p className="text-small font-bold text-accent">{getNewsCategoryLabel(leadNewsPost.category)}</p>
                  <time
                    className="mt-2 block text-small tabular-nums text-muted-foreground"
                    dateTime={leadNewsPost.publishedAt}
                  >
                    {dateFormatter.format(new Date(leadNewsPost.publishedAt))}
                  </time>
                </div>
                <div className="min-w-0">
                  <h3 className="text-safe-wrap text-[1.45rem] font-bold leading-snug tracking-[-0.02em] sm:text-[1.75rem]">
                    <Link
                      className="text-safe-wrap hover:text-primary hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                      href={"/news/" + leadNewsPost.slug}
                    >
                      {leadNewsPost.title}
                    </Link>
                  </h3>
                  {leadNewsPost.summary && leadNewsPost.summary !== leadNewsPost.title ? (
                    <p className="text-safe-wrap mt-3 max-w-2xl text-small leading-7 text-muted-foreground">
                      {leadNewsPost.summary}
                    </p>
                  ) : null}
                </div>
              </article>
              {remainingNewsPosts.length > 0 ? (
                <ul className="divide-y divide-border border-t border-border">
                  {remainingNewsPosts.map((post) => (
                    <li
                      key={post.id}
                      className="grid gap-2 py-4 sm:grid-cols-[7rem_minmax(0,1fr)_7.5rem] sm:items-baseline sm:gap-6"
                    >
                      <span className="text-small font-semibold text-muted-foreground">
                        {getNewsCategoryLabel(post.category)}
                      </span>
                      <h3 className="min-w-0 font-semibold leading-relaxed">
                        <Link
                          className="text-safe-wrap underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                          href={"/news/" + post.slug}
                        >
                          {post.title}
                        </Link>
                      </h3>
                      <time
                        className="text-small tabular-nums text-muted-foreground sm:text-right"
                        dateTime={post.publishedAt}
                      >
                        {dateFormatter.format(new Date(post.publishedAt))}
                      </time>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <div className="border-b border-border py-7">
              <p className="font-medium">
                {newsResult.status === "rejected" ? "소식을 불러오지 못했습니다." : "아직 등록된 소식이 없습니다."}
              </p>
              <p className="mt-2 text-small text-muted-foreground">
                {newsResult.status === "rejected"
                  ? "잠시 후 소식 목록에서 다시 확인해 주세요."
                  : "새로운 공지와 활동 소식은 이곳에서 안내합니다."}
              </p>
              <Link className="institution-link mt-2 text-small" href="/news">
                소식 목록 보기
              </Link>
            </div>
          )}
        </section>

        <aside
          aria-labelledby="visit-summary-heading"
          className="min-w-0 border-t-4 border-accent bg-paper p-7 sm:p-9 lg:col-span-4"
        >
          <p className="text-small font-bold text-accent">방문 전 확인</p>
          <h2
            id="visit-summary-heading"
            className="text-safe-wrap mt-2 text-[1.75rem] font-extrabold tracking-[-0.025em]"
          >
            위치와 문의 방법
          </h2>
          <address className="text-safe-wrap mt-6 text-body leading-8 font-semibold not-italic">
            {contact.address}
          </address>
          <div className="mt-6 border-t border-paper-strong pt-5">
            <p className="text-small text-muted-foreground">대표 전화</p>
            <a
              className="institution-link mt-1 text-[1.65rem] font-bold tabular-nums"
              href={createTelephoneHref(contact.phone)}
            >
              {contact.phone}
            </a>
          </div>
          <Link
            className="mt-6 inline-flex min-h-12 items-center justify-between gap-6 border border-primary px-5 font-bold text-primary hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
            href="/about/directions"
          >
            찾아오시는 길 <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </div>

      {featuredGalleryItem ? (
        <section aria-labelledby="gallery-heading" className="border-y border-border bg-surface-subtle py-12 sm:py-16">
          <div className="mx-auto max-w-site px-page sm:px-page-wide">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-small font-bold text-accent">생활 기록</p>
                <h2
                  id="gallery-heading"
                  className="mt-2 text-[1.875rem] font-extrabold tracking-[-0.025em] sm:text-[2.25rem]"
                >
                  사진으로 보는 활동
                </h2>
              </div>
              <Link className="institution-link text-small" href="/life/gallery">
                활동사진 전체보기
              </Link>
            </div>
            <div
              className={`mt-7 grid gap-8 ${compactGalleryItems.length > 0 ? "lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)] lg:gap-10" : "max-w-4xl"}`}
            >
              <article className="min-w-0">
                <Link
                  className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
                  href={"/life/gallery/" + featuredGalleryItem.slug}
                >
                  <div className="overflow-hidden bg-surface">
                    <Image
                      className="aspect-[16/10] w-full object-cover transition-transform duration-[var(--motion-duration-standard)] ease-standard group-hover:scale-[1.015]"
                      src={"/api/gallery/" + featuredGalleryItem.slug + "/media"}
                      alt={featuredGalleryItem.altText}
                      width={featuredGalleryItem.width}
                      height={featuredGalleryItem.height}
                      sizes="(max-width: 1023px) 100vw, 58vw"
                      unoptimized
                    />
                  </div>
                  <p className="mt-4 text-small font-semibold text-accent">
                    {featuredGalleryItem.category} ·{" "}
                    <time dateTime={featuredGalleryItem.activityDate}>
                      {dateFormatter.format(new Date(featuredGalleryItem.activityDate))}
                    </time>
                  </p>
                  <h3 className="text-safe-wrap mt-2 text-[1.4rem] font-bold leading-snug group-hover:text-primary group-hover:underline sm:text-[1.65rem]">
                    {featuredGalleryItem.title}
                  </h3>
                </Link>
              </article>
              {compactGalleryItems.length > 0 ? (
                <ul className="divide-y divide-border border-y border-border">
                  {compactGalleryItems.map((item) => (
                    <li key={item.slug} className="min-w-0 py-5 first:pt-0 lg:first:pt-5">
                      <Link
                        className="group grid grid-cols-[7.5rem_minmax(0,1fr)] gap-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring sm:grid-cols-[10rem_minmax(0,1fr)]"
                        href={"/life/gallery/" + item.slug}
                      >
                        <div className="overflow-hidden bg-surface">
                          <Image
                            className="aspect-[4/3] h-full w-full object-cover transition-transform duration-[var(--motion-duration-standard)] ease-standard group-hover:scale-[1.02]"
                            src={"/api/gallery/" + item.slug + "/media"}
                            alt={item.altText}
                            width={item.width}
                            height={item.height}
                            sizes="(max-width: 639px) 7.5rem, (max-width: 1023px) 10rem, 14vw"
                            unoptimized
                          />
                        </div>
                        <div className="min-w-0 py-1">
                          <p className="text-small font-semibold text-accent">
                            {item.category} ·{" "}
                            <time dateTime={item.activityDate}>
                              {dateFormatter.format(new Date(item.activityDate))}
                            </time>
                          </p>
                          <h3 className="text-safe-wrap mt-2 text-lg font-bold leading-snug group-hover:text-primary group-hover:underline">
                            {item.title}
                          </h3>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </section>
      ) : galleryResult.status === "rejected" ? (
        <p className="mx-auto max-w-site px-page pb-8 text-small text-muted-foreground sm:px-page-wide">
          활동사진을 불러오지 못했습니다.{" "}
          <Link className="institution-link" href="/life/gallery">
            활동사진 목록에서 다시 확인
          </Link>
        </p>
      ) : null}
      <section aria-labelledby="participation-heading" className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-site gap-8 px-page py-12 sm:px-page-wide sm:py-14 lg:grid-cols-[1.1fr_1.9fr] lg:items-start lg:gap-14">
          <div>
            <p className="text-small font-bold text-sun-soft">참여와 공개</p>
            <h2
              id="participation-heading"
              className="text-safe-wrap mt-2 text-[1.875rem] font-extrabold tracking-[-0.025em] sm:text-[2.25rem]"
            >
              함께하는 방법을 확인하세요
            </h2>
            <p className="text-safe-wrap mt-4 max-w-md text-small leading-7 text-primary-foreground/72">
              참여 절차와 공개 자료를 각각의 안내에서 정확하게 확인할 수 있습니다.
            </p>
          </div>
          <ul className="divide-y divide-primary-foreground/20 border-y border-primary-foreground/20 lg:grid lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {[
              { href: "/support/donation", title: "후원하기", description: "후원 방법과 영수증 문의" },
              { href: "/support/volunteer", title: "자원봉사", description: "참여 절차와 문의 안내" },
              { href: "/transparency", title: "자료공개", description: "운영 자료의 유형과 기간 확인" },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  className="group flex min-h-32 items-start justify-between gap-5 px-2 py-6 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-surface lg:min-h-44 lg:px-7"
                  href={item.href}
                >
                  <span>
                    <span className="block text-xl font-bold group-hover:underline">{item.title}</span>
                    <span className="text-safe-wrap mt-3 block text-small leading-7 text-primary-foreground/68">
                      {item.description}
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-xl transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
