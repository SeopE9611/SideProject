import Image from "next/image";
import Link from "next/link";

import { SectionPageHeader } from "@/components/layout/section-page-header";
import { findPublicGalleryItems, type PublicGallerySummary } from "@/features/gallery/gallery.repository";
import { getNewsRepository } from "@/features/news/news.repository";
import { getProgramRepository } from "@/features/programs/program.repository";
import { createPublicPageMetadata } from "@/features/seo/metadata";

export const metadata = createPublicPageMetadata("/life");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

function GalleryStory({
  item,
  featured,
  single,
}: {
  item: PublicGallerySummary;
  featured?: boolean;
  single?: boolean;
}) {
  return (
    <article
      className={`grid items-start ${featured ? (single ? "gap-6 md:grid-cols-2 md:gap-9" : "gap-4") : "grid-cols-[6rem_minmax(0,1fr)] gap-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5"}`}
    >
      <Image
        className={`w-full bg-surface-subtle object-cover ${featured ? "aspect-[3/2]" : "aspect-[4/3]"}`}
        src={"/api/gallery/" + item.slug + "/media"}
        alt={item.altText}
        width={item.width}
        height={item.height}
        unoptimized
        loading={featured ? "eager" : "lazy"}
        fetchPriority={featured ? "high" : "auto"}
      />
      <div className="min-w-0">
        <p className="text-safe-wrap text-small text-muted-foreground">
          {item.category} ·{" "}
          <time dateTime={item.activityDate}>{dateFormatter.format(new Date(item.activityDate))}</time>
        </p>
        <h3 className={`mt-2 font-bold tracking-tight ${featured ? "text-xl sm:text-2xl" : "text-lg"}`}>
          <Link
            className="text-safe-wrap underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            href={"/life/gallery/" + item.slug}
          >
            {item.title}
          </Link>
        </h3>
        {featured ? (
          <p className="text-safe-wrap mt-3 text-small leading-7 text-muted-foreground">{item.description}</p>
        ) : null}
      </div>
    </article>
  );
}

export default async function LifePage() {
  const [galleryResult, newsResult, programResult] = await Promise.allSettled([
    findPublicGalleryItems(),
    getNewsRepository().searchPublished({ category: "activity", page: 1, pageSize: 3 }),
    getProgramRepository().listPublished({ limit: 3 }),
  ]);
  const galleries = galleryResult.status === "fulfilled" ? galleryResult.value.slice(0, 4) : [];
  const isPreview = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  const posts =
    newsResult.status === "fulfilled" ? newsResult.value.items.filter((post) => isPreview || !post.isDemo) : [];
  const programs = programResult.status === "fulfilled" ? programResult.value : [];
  if (galleryResult.status === "rejected") console.error("생활이야기 활동사진 조회 실패");
  if (newsResult.status === "rejected") console.error("생활이야기 활동소식 조회 실패");
  if (programResult.status === "rejected") console.error("생활이야기 프로그램 조회 실패");

  return (
    <div className="bg-surface">
      <SectionPageHeader
        compact
        sectionHref="/life"
        eyebrow="생활·프로그램"
        title="생활이야기"
        description="샬롬의 집의 활동 소식과 사진 기록을 모아 전합니다."
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "생활·프로그램" }]}
      />
      <div className="mx-auto max-w-site px-page py-8 sm:px-page-wide sm:py-10">
        {galleries.length > 0 ? (
          <section aria-labelledby="life-gallery-heading">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
              <h2 id="life-gallery-heading" className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">
                사진으로 보는 활동
              </h2>
              <Link className="institution-link text-small" href="/life/gallery">
                활동사진 전체보기
              </Link>
            </div>
            <div
              className={`mt-5 grid items-start gap-7 ${galleries.length > 1 ? "md:grid-cols-[1.05fr_1fr] md:gap-9" : ""}`}
            >
              <GalleryStory item={galleries[0]} featured single={galleries.length === 1} />
              {galleries.length > 1 ? (
                <ul className="divide-y divide-border border-y border-border">
                  {galleries.slice(1).map((item) => (
                    <li key={item.slug} className="min-w-0 py-5 first:pt-0 md:first:pt-5">
                      <GalleryStory item={item} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ) : galleryResult.status === "rejected" ? (
          <p className="text-safe-wrap border-b border-border pb-4 text-small" role="status">
            활동사진을 불러오지 못했습니다.{" "}
            <Link className="institution-link" href="/life/gallery">
              활동사진 목록에서 다시 확인
            </Link>
          </p>
        ) : null}

        <div
          className={`grid items-start gap-8 lg:grid-cols-12 lg:gap-12 ${galleries.length > 0 ? "mt-10 border-t border-border pt-10 sm:mt-12 sm:pt-12" : ""}`}
        >
          <section id="life-scenes" aria-labelledby="life-news-heading" className="min-w-0 lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-primary pb-4">
              <h2 id="life-news-heading" className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">
                최근 활동 소식
              </h2>
              <Link className="institution-link text-small" href="/news/activities">
                활동소식 전체보기
              </Link>
            </div>
            {posts.some((post) => post.isDemo) ? (
              <p className="border-b border-border py-3 text-small text-muted-foreground">
                미리보기 · 아래 예시 소식은 레이아웃 검증용입니다.
              </p>
            ) : null}
            {posts.length > 0 ? (
              <ul className="divide-y divide-border border-b border-border">
                {posts.map((post) => (
                  <li key={post.id} className="py-5">
                    <time className="text-small text-muted-foreground" dateTime={post.publishedAt}>
                      {dateFormatter.format(new Date(post.publishedAt))}
                    </time>
                    <h3 className="mt-2 text-lg font-bold tracking-tight sm:text-xl">
                      <Link
                        className="text-safe-wrap underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                        href={"/news/" + post.slug}
                      >
                        {post.title}
                      </Link>
                    </h3>
                    {post.summary.trim() && post.summary.trim() !== post.title.trim() ? (
                      <p className="text-safe-wrap mt-2 text-small leading-7 text-muted-foreground">{post.summary}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border-b border-border py-6">
                <p className="font-medium">
                  {newsResult.status === "rejected"
                    ? "활동 소식을 불러오지 못했습니다."
                    : "아직 등록된 활동 소식이 없습니다."}
                </p>
                <p className="text-safe-wrap mt-2 text-small text-muted-foreground">
                  {newsResult.status === "rejected"
                    ? "잠시 후 활동소식 목록에서 다시 확인해 주세요."
                    : "새로운 활동 기록은 이곳에서 안내합니다."}
                </p>
                <Link className="institution-link mt-2 text-small" href="/news/activities">
                  활동소식 목록 보기
                </Link>
              </div>
            )}
          </section>
          <aside aria-label="프로그램과 관련 안내" className="min-w-0 bg-accent-soft p-6 sm:p-7 lg:col-span-4">
            <section aria-labelledby="life-program-heading">
              <h2 id="life-program-heading" className="text-heading font-bold">
                프로그램
              </h2>
              {programs.length > 0 ? (
                <ul className="mt-4 divide-y divide-accent/20">
                  {programs.map((program) => (
                    <li key={program.id} className="py-4">
                      <p className="text-small font-semibold text-accent">{program.category}</p>
                      <h3>
                        <Link
                          className="institution-link text-safe-wrap py-2 text-lg"
                          href={"/life/programs/" + program.slug}
                        >
                          {program.title}
                        </Link>
                      </h3>
                      <p className="text-safe-wrap text-small leading-7 text-muted-foreground">{program.purpose}</p>
                      {program.operationStatusLabel ? (
                        <p className="text-safe-wrap mt-2 text-small">운영 상태 · {program.operationStatusLabel}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-safe-wrap mt-3 text-small leading-7 text-muted-foreground">
                  {programResult.status === "rejected"
                    ? "프로그램을 불러오지 못했습니다. 목록에서 다시 확인해 주세요."
                    : "아직 등록된 프로그램 안내가 없습니다."}
                </p>
              )}
              <Link className="institution-link mt-3" href="/life/programs">
                프로그램 안내 <span aria-hidden="true">→</span>
              </Link>
            </section>
            <nav aria-label="생활 관련 안내" className="mt-6 border-t border-accent/20 pt-5">
              <ul className="space-y-2">
                <li>
                  <Link className="institution-link" href="/life/gallery">
                    활동사진 전체보기
                  </Link>
                </li>
                <li>
                  <Link className="institution-link" href="/about/spaces">
                    생활공간 안내
                  </Link>
                </li>
                <li>
                  <Link className="institution-link" href="/support/contact">
                    문의하기
                  </Link>
                </li>
              </ul>
            </nav>
          </aside>
        </div>
      </div>
    </div>
  );
}
