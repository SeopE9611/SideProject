import { createPublicPageMetadata } from "@/features/seo/metadata";

export const metadata = createPublicPageMetadata("/life/gallery");

import Link from "next/link";
import { SectionPageHeader } from "@/components/layout/section-page-header";
import { siteConfig } from "@/config/site";
import { findPublicGalleryItems } from "@/features/gallery/gallery.repository";


const date = (v: string) => v.replace(/-/g, ".");

export default async function GalleryPage() {
  const items = await findPublicGalleryItems();

  return (
    <>
      <SectionPageHeader
        sectionHref="/life"
        eyebrow="생활·프로그램"
        title="활동사진"
        description="사진별 공개 동의와 승인을 확인한 활동 기록입니다."
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "생활·프로그램", href: "/life" }, { label: "활동사진" }]}
        notice="활동사진은 사진별 공개 동의와 게시 승인을 마친 범위에서 안내합니다."
      />
      <section className="mx-auto max-w-site px-page py-12 sm:px-page-wide">
        {items.length ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li key={item.slug} className="min-w-0 border-t-4 border-primary py-5">
                <div className="aspect-[4/3] overflow-hidden rounded-card bg-muted">
                  <img
                    src={`/api/gallery/${item.slug}/media`}
                    alt={item.altText}
                    width={item.width}
                    height={item.height}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="mt-4 text-small font-bold text-accent">{item.category}</p>
                <h2 className="text-safe-wrap mt-2 font-bold">
                  <Link className="underline" href={`/life/gallery/${item.slug}`}>
                    {item.title}
                  </Link>
                </h2>
                <p className="mt-2 text-small">{date(item.activityDate)}</p>
                <p className="text-safe-wrap mt-2 line-clamp-3 text-muted-foreground">{item.description}</p>
                <Link
                  className="mt-4 inline-flex min-h-11 items-center font-bold text-primary underline"
                  href={`/life/gallery/${item.slug}`}
                >
                  상세 보기
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-y border-border py-6">
            <p className="text-small font-bold text-accent">사진 준비 중</p>
            <h2 className="text-safe-wrap mt-2 text-heading font-bold">공개 승인된 활동사진이 아직 없습니다.</h2>
            <p className="text-safe-wrap mt-3 text-muted-foreground">
              사진별 공개 동의와 게시 승인을 마친 자료가 준비되면 안내합니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-5">
              <Link className="font-bold text-primary underline" href="/news/activities">
                활동소식
              </Link>
              <a
                className="font-bold text-primary underline"
                href={siteConfig.instagram}
                target="_blank"
                rel="noreferrer"
              >
                인스타그램 보기(새 창)
              </a>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
