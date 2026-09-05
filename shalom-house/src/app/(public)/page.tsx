import Link from "next/link";

import { HomeActivityCarousel } from "@/components/home/home-activity-carousel";
import { HomeHero } from "@/components/home/home-hero";
import { LineIcon, type LineIconName } from "@/components/ui/line-icon";
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
const quickLinks: readonly {
  label: string;
  description: string;
  href: string;
  icon: LineIconName;
}[] = [
  {
    label: "공지사항",
    description: "새로운 공지와 이용 안내",
    href: "/news/notices",
    icon: "newspaper",
  },
  {
    label: "생활·프로그램",
    description: "생활 기록과 프로그램 안내",
    href: "/life",
    icon: "sparkles",
  },
  {
    label: "함께하기",
    description: "참여 방법과 절차",
    href: "/support",
    icon: "heart-handshake",
  },
  {
    label: "찾아오시는 길",
    description: "위치와 방문 문의",
    href: "/about/directions",
    icon: "map-pin",
  },
];

const participationLinks: readonly {
  href: string;
  title: string;
  description: string;
  icon: LineIconName;
}[] = [
  { href: "/support/donation", title: "후원 안내", description: "후원 방법과 영수증 문의", icon: "heart-handshake" },
  { href: "/support/volunteer", title: "자원봉사", description: "참여 절차와 문의 안내", icon: "sparkles" },
  { href: "/transparency", title: "자료공개", description: "운영 자료의 유형과 기간 확인", icon: "file-text" },
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
      <nav aria-label="자주 찾는 안내" className="mx-auto max-w-site px-page sm:px-page-wide">
        <ul className="grid grid-cols-2 overflow-hidden border-b border-border bg-surface lg:grid-cols-4">
          {quickLinks.map((item) => (
            <li key={item.href} className="border-border even:border-l lg:border-l lg:first:border-l-0">
              <Link
                className="group flex min-h-28 flex-col items-start gap-3 px-4 py-5 transition-colors duration-[var(--motion-duration-fast)] hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-focus-ring sm:flex-row sm:gap-4 sm:px-6 lg:min-h-32 lg:py-6"
                href={item.href}
              >
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent transition-colors group-hover:bg-surface">
                  <LineIcon name={item.icon} size={21} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-safe-wrap block text-[1.05rem] font-bold group-hover:text-accent sm:text-xl">
                    {item.label}
                  </span>
                  <span className="text-safe-wrap mt-1 hidden text-small leading-6 text-muted-foreground sm:block">
                    {item.description}
                  </span>
                </span>
                <LineIcon
                  className="mt-1 hidden shrink-0 text-primary transition-transform group-hover:translate-x-1 sm:block"
                  name="arrow-right"
                  size={18}
                />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto grid max-w-site items-start gap-10 px-page py-14 sm:px-page-wide sm:py-18 lg:grid-cols-12 lg:gap-14">
        <section aria-labelledby="news-heading" className="min-w-0 lg:col-span-8">
          <div className="flex flex-wrap items-end justify-between gap-x-5 border-b-2 border-primary pb-5">
            <div className="flex items-start gap-4">
              <span className="mt-1 inline-flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary">
                <LineIcon name="newspaper" size={22} />
              </span>
              <div>
                <h2 id="news-heading" className="mt-1 text-[1.75rem] font-extrabold tracking-[-0.025em] sm:text-[2rem]">
                  샬롬의 집 소식
                </h2>
              </div>
            </div>
            <Link className="institution-link text-small" href="/news">
              전체 소식 <LineIcon name="arrow-right" size={18} />
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
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-surface text-accent">
            <LineIcon name="map-pin" />
          </span>
          <p className="mt-5 text-small font-bold text-accent">방문 전 확인</p>
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
              className="institution-link mt-1 gap-3 whitespace-nowrap text-xl font-bold tabular-nums sm:text-[1.65rem]"
              href={createTelephoneHref(contact.phone)}
            >
              <LineIcon name="phone" size={21} />
              {contact.phone}
            </a>
          </div>
          <Link
            className="mt-6 inline-flex min-h-12 items-center justify-between gap-6 border border-primary px-5 font-bold text-primary hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
            href="/about/directions"
          >
            찾아오시는 길 <LineIcon name="arrow-right" size={18} />
          </Link>
        </aside>
      </div>

      {visibleGalleryItems.length > 0 ? (
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
                활동사진 전체보기 <LineIcon name="arrow-right" size={18} />
              </Link>
            </div>
            <div className="mt-7">
              <HomeActivityCarousel
                key={visibleGalleryItems.map((item) => item.slug).join(",")}
                items={visibleGalleryItems.map((item) => ({
                  slug: item.slug,
                  title: item.title,
                  category: item.category,
                  altText: item.altText,
                  activityDate: item.activityDate,
                  dateLabel: dateFormatter.format(new Date(item.activityDate)),
                }))}
              />
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
      <section aria-labelledby="participation-heading" className="border-b border-border bg-paper">
        <div className="mx-auto grid max-w-site gap-8 px-page py-12 sm:px-page-wide sm:py-14 lg:grid-cols-[1.1fr_1.9fr] lg:items-start lg:gap-14">
          <div>
            <h2
              id="participation-heading"
              className="text-safe-wrap text-[1.875rem] font-extrabold tracking-[-0.025em] text-primary sm:text-[2.25rem]"
            >
              참여 안내와 자료공개
            </h2>
            <p className="text-safe-wrap mt-4 max-w-md text-small leading-7 text-muted-foreground">
              참여 절차와 공개 자료를 각각의 안내에서 정확하게 확인할 수 있습니다.
            </p>
          </div>
          <ul className="divide-y divide-paper-strong border-y border-paper-strong lg:grid lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {participationLinks.map((item) => (
              <li key={item.href}>
                <Link
                  className="group relative flex min-h-32 items-start gap-4 px-2 py-6 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus-ring lg:min-h-44 lg:flex-col lg:px-6"
                  href={item.href}
                >
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-accent">
                    <LineIcon name={item.icon} size={21} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xl font-bold text-primary group-hover:underline">{item.title}</span>
                    <span className="text-safe-wrap mt-2 block text-small leading-7 text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  <LineIcon
                    className="mt-1 shrink-0 text-primary transition-transform group-hover:translate-x-1 lg:absolute lg:top-8 lg:right-6"
                    name="arrow-right"
                    size={19}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
