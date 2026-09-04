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
    description: "새로운 소식과 안내",
    href: "/news/notices",
    icon: "M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5",
  },
  {
    label: "활동사진",
    description: "사진으로 보는 활동",
    href: "/life/gallery",
    icon: "M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6 M16 8h.01",
  },
  {
    label: "후원·자원봉사",
    description: "참여 방법과 절차",
    href: "/support",
    icon: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z",
  },
  {
    label: "찾아오시는 길",
    description: "위치와 방문 문의",
    href: "/about/directions",
    icon: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
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
  const galleryItems = galleryResult.status === "fulfilled" ? galleryResult.value.slice(0, 3) : [];
  const leadPhoto = galleryItems[0];
  const heroImage = isVisualFixtureEnabled()
    ? visualHomeImage
    : leadPhoto
      ? {
          src: `/api/gallery/${leadPhoto.slug}/media`,
          alt: leadPhoto.altText,
          width: leadPhoto.width,
          height: leadPhoto.height,
          caption: `최근 활동사진 · ${leadPhoto.title}`,
          href: `/life/gallery/${leadPhoto.slug}`,
        }
      : undefined;
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
        <ul className="grid grid-cols-2 border-b border-border py-3 lg:grid-cols-4 lg:py-5">
          {quickLinks.map((item) => (
            <li key={item.href}>
              <Link
                className="group flex min-h-24 items-center gap-3 px-2 py-4 transition-colors hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:gap-4 sm:px-4"
                href={item.href}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.35"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-8 w-8 shrink-0 text-accent sm:h-9 sm:w-9"
                >
                  <path d={item.icon} />
                </svg>
                <span>
                  <span className="text-safe-wrap block text-base font-bold group-hover:text-accent sm:text-lg">
                    {item.label}
                  </span>
                  <span className="text-safe-wrap mt-1 hidden text-sm text-muted-foreground sm:block">
                    {item.description}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto grid max-w-site items-start gap-9 px-page py-10 sm:px-page-wide sm:py-14 lg:grid-cols-12 lg:gap-14">
        <section aria-labelledby="news-heading" className="min-w-0 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-x-5 border-b-2 border-primary pb-4">
            <h2 id="news-heading" className="text-[1.75rem] font-bold tracking-tight sm:text-title">
              샬롬의 집 소식
            </h2>
            <Link className="institution-link text-small" href="/news">
              전체 소식 <span aria-hidden="true">→</span>
            </Link>
          </div>
          {newsPosts.some((post) => post.isDemo) ? (
            <p className="py-2 text-xs text-muted-foreground">미리보기 · 아래 예시 소식은 레이아웃 검증용입니다.</p>
          ) : null}
          {newsPosts.length > 0 ? (
            <ul className="divide-y divide-border border-b border-border">
              {newsPosts.map((post, index) => (
                <li
                  key={post.id}
                  className={`grid min-w-0 gap-x-5 gap-y-2 ${index === 0 ? "py-5" : "py-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-baseline"}`}
                >
                  <span className={`text-sm ${index === 0 ? "font-bold text-accent" : "text-muted-foreground"}`}>
                    {getNewsCategoryLabel(post.category)}
                  </span>
                  <h3
                    className={`min-w-0 ${index === 0 ? "text-xl font-bold leading-snug sm:text-2xl" : "font-medium"}`}
                  >
                    <Link
                      className="text-safe-wrap hover:text-primary hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                      href={"/news/" + post.slug}
                    >
                      {post.title}
                    </Link>
                  </h3>
                  {index === 0 && post.summary && post.summary !== post.title ? (
                    <p className="text-safe-wrap max-w-2xl text-small leading-7 text-muted-foreground">
                      {post.summary}
                    </p>
                  ) : null}
                  <time className="text-sm tabular-nums text-muted-foreground" dateTime={post.publishedAt}>
                    {dateFormatter.format(new Date(post.publishedAt))}
                  </time>
                </li>
              ))}
            </ul>
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

        <aside aria-label="참여와 자료 안내" className="min-w-0 bg-accent-soft p-7 sm:p-8 lg:col-span-4">
          <section aria-labelledby="participation-heading">
            <p className="mb-2 text-xs font-bold tracking-wide text-accent">후원 · 자원봉사</p>
            <h2 id="participation-heading" className="text-[1.75rem] font-bold tracking-tight">
              함께하는 방법
            </h2>
            <ul className="mt-5 divide-y divide-accent/20">
              <li className="py-3">
                <h3>
                  <Link className="institution-link w-full justify-between text-xl" href="/support/donation">
                    후원하기 <span aria-hidden="true">→</span>
                  </Link>
                </h3>
                <p className="text-small text-muted-foreground">후원 방법과 영수증 문의</p>
              </li>
              <li className="py-3">
                <h3>
                  <Link className="institution-link w-full justify-between text-xl" href="/support/volunteer">
                    자원봉사 <span aria-hidden="true">→</span>
                  </Link>
                </h3>
                <p className="text-small text-muted-foreground">참여 절차와 문의 안내</p>
              </li>
            </ul>
          </section>
          <section aria-labelledby="documents-heading" className="mt-5 border-t border-accent/20 pt-5">
            <h2 id="documents-heading">
              <Link className="institution-link" href="/transparency">
                자료공개 <span aria-hidden="true">→</span>
              </Link>
            </h2>
            <p className="text-small text-muted-foreground">운영 자료를 유형과 기간별로 확인합니다.</p>
          </section>
        </aside>
      </div>

      {galleryItems.length > 0 ? (
        <section aria-labelledby="gallery-heading" className="border-y border-border bg-surface-subtle py-10 sm:py-14">
          <div className="mx-auto max-w-site px-page sm:px-page-wide">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="gallery-heading" className="text-[1.75rem] font-bold tracking-tight sm:text-title">
                사진으로 보는 활동
              </h2>
              <Link className="institution-link text-small" href="/life/gallery">
                활동사진 전체보기
              </Link>
            </div>
            <ul className="mt-5 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {galleryItems.map((item) => (
                <li key={item.slug} className="min-w-0">
                  <Image
                    className="aspect-[4/3] w-full bg-surface object-cover"
                    src={"/api/gallery/" + item.slug + "/media"}
                    alt={item.altText}
                    width={item.width}
                    height={item.height}
                    unoptimized
                  />
                  <p className="mt-3 text-small text-muted-foreground">
                    {item.category} ·{" "}
                    <time dateTime={item.activityDate}>{dateFormatter.format(new Date(item.activityDate))}</time>
                  </p>
                  <h3>
                    <Link className="institution-link text-safe-wrap" href={"/life/gallery/" + item.slug}>
                      {item.title}
                    </Link>
                  </h3>
                </li>
              ))}
            </ul>
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
      <section
        aria-labelledby="home-contact-heading"
        className="mx-auto grid max-w-site gap-7 px-page py-10 sm:px-page-wide sm:py-12 lg:grid-cols-[1fr_1fr_auto] lg:items-center"
      >
        <div>
          <h2 id="home-contact-heading" className="text-heading font-bold">
            방문과 문의
          </h2>
          <p className="text-safe-wrap mt-2 text-small text-muted-foreground">{contact.address}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">대표 전화</p>
          <a
            href={createTelephoneHref(contact.phone)}
            className="institution-link text-[1.75rem] font-bold tabular-nums"
          >
            {contact.phone}
          </a>
        </div>
        <Link
          href="/support/contact"
          className="inline-flex min-h-12 items-center justify-center gap-6 border border-primary px-6 font-semibold text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
        >
          문의 안내 <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </div>
  );
}
