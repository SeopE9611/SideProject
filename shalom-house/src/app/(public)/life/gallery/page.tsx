import Link from "next/link";
import { GalleryCollection } from "@/components/gallery/gallery-collection";
import { SectionPageHeader } from "@/components/layout/section-page-header";
import { findPublicGalleryItems } from "@/features/gallery/gallery.repository";
import { createPublicPageMetadata } from "@/features/seo/metadata";
import { getPublicContactInformation } from "@/features/site-content/site-content.repository";
import { formatPublicDate } from "@/lib/format-public-date";

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
    <div className="section-layout">
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
        {items && items.length > 0 ? (
          <GalleryCollection
            items={items.map((item) => ({
              ...item,
              dateLabel: formatPublicDate(item.activityDate),
            }))}
          />
        ) : (
          <div className="gallery-list-toolbar border-b border-border pb-3">
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
        )}
        {items === null ? (
          <div className="border-b border-border py-6" role="status">
            <h3 className="font-semibold">활동사진을 불러오지 못했습니다.</h3>
            <p className="mt-2 text-small text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Intentional document reload to retry a transient server fetch failure. */}
            <a className="institution-link mt-3" href="/life/gallery">
              다시 불러오기
            </a>
          </div>
        ) : items.length > 0 ? null : (
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
