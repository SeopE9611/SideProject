import Image from "next/image";
import Link from "next/link";
import { SectionPageHeader } from "@/components/layout/section-page-header";
import { findPublicGalleryItems } from "@/features/gallery/gallery.repository";
import { createPublicPageMetadata } from "@/features/seo/metadata";
import { getPublicContactInformation } from "@/features/site-content/site-content.repository";

export const metadata = createPublicPageMetadata("/life/gallery");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const [items, contact] = await Promise.all([
    findPublicGalleryItems().catch(() => {
      console.error("활동사진 목록 조회 실패");
      return null;
    }),
    getPublicContactInformation(),
  ]);
  return (
    <div className="bg-surface">
      <SectionPageHeader
        compact
        sectionHref="/life"
        eyebrow="생활·프로그램"
        title="활동사진"
        description="활동의 날짜와 이야기를 사진으로 전합니다."
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "생활·프로그램", href: "/life" }, { label: "활동사진" }]}
      />
      <section
        aria-labelledby="gallery-list-heading"
        className="mx-auto max-w-site px-page py-7 sm:px-page-wide sm:py-9"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-foreground pb-3">
          <h2 id="gallery-list-heading" className="text-heading font-bold">
            활동 기록{" "}
            {items !== null ? (
              <span className="text-base font-medium text-muted-foreground">{items.length}건</span>
            ) : null}
          </h2>
          <Link className="institution-link text-small" href="/news/activities">
            활동소식 보기
          </Link>
        </div>
        {items === null ? (
          <div className="border-b border-border py-6" role="status">
            <h3 className="font-semibold">활동사진을 불러오지 못했습니다.</h3>
            <p className="mt-2 text-small text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
            <a className="institution-link mt-3" href="/life/gallery">
              다시 불러오기
            </a>
          </div>
        ) : items.length > 0 ? (
          <ul className="mt-6 grid gap-x-7 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <li key={item.slug} className="min-w-0">
                <Image
                  src={"/api/gallery/" + item.slug + "/media"}
                  alt={item.altText}
                  width={item.width}
                  height={item.height}
                  loading={index < 3 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  className="aspect-[4/3] w-full rounded-control bg-surface-subtle object-cover"
                  unoptimized
                />
                <p className="text-safe-wrap mt-3 text-small text-muted-foreground">
                  {item.category} · <time dateTime={item.activityDate}>{item.activityDate.replace(/-/g, ".")}</time>
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  <Link
                    className="text-safe-wrap underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                    href={"/life/gallery/" + item.slug}
                  >
                    {item.title}
                  </Link>
                </h3>
                <p className="text-safe-wrap mt-2 text-small leading-7 text-muted-foreground">{item.description}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-b border-border py-6">
            <h3 className="text-safe-wrap font-semibold">아직 등록된 활동사진이 없습니다.</h3>
            <p className="text-safe-wrap mt-2 text-small text-muted-foreground">
              새로운 사진 기록은 이곳에서 안내합니다. 글로 전하는 활동은 활동소식에서 확인할 수 있습니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              <Link className="institution-link" href="/news/activities">
                활동소식
              </Link>
              {contact.showInstagram && contact.instagramUrl ? (
                <a className="institution-link" href={contact.instagramUrl} target="_blank" rel="noreferrer">
                  공식 인스타그램 <span className="text-xs">(새 창)</span>
                </a>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
