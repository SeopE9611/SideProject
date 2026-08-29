import type { Metadata } from "next";
import Link from "next/link";

import { SectionPageHeader } from "@/components/layout/section-page-header";
import { lifeFixture } from "@/content/fixtures/life.fixture";

export const metadata: Metadata = {
  title: "활동사진",
};

export default function GalleryPage() {
  return (
    <>
      <SectionPageHeader
        eyebrow="생활·프로그램"
        title="활동사진"
        description="사진별 공개 동의와 승인을 확인한 활동 기록을 위한 페이지입니다."
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "생활·프로그램", href: "/life" },
          { label: "활동사진" },
        ]}
        notice="현재 실제 이미지는 없으며 중립적인 상태 표시만 제공합니다."
      />
      <section className="mx-auto max-w-site px-page py-12 sm:px-page-wide">
        <h2 className="text-heading font-bold">활동사진 준비 목록</h2>
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {lifeFixture.gallery.map((galleryItem) => (
            <li key={galleryItem.id} className="border border-border">
              <div className="flex min-h-40 flex-col justify-center bg-surface-subtle p-5">
                <strong>{galleryItem.media.label}</strong>
                <span className="text-safe-wrap mt-2 text-small">
                  {galleryItem.media.description}
                </span>
              </div>
              <div className="p-5">
                <p className="text-small text-accent">
                  {galleryItem.category} · {galleryItem.dateLabel}
                </p>
                <h3 className="text-safe-wrap mt-2 font-bold">
                  {galleryItem.title}
                </h3>
                <p className="text-safe-wrap mt-2 text-muted-foreground">
                  {galleryItem.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-8 font-bold">
          표시할 승인 이미지가 아직 없습니다.
        </p>
        <Link
          className="mt-5 inline-flex font-bold text-primary underline"
          href="/news/activities"
        >
          활동소식 보기
        </Link>
      </section>
    </>
  );
}
