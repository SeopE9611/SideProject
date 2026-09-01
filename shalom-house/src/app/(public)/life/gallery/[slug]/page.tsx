import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SectionPageHeader } from "@/components/layout/section-page-header";
import { findPublicGalleryBySlug } from "@/features/gallery/gallery.repository";
import { JsonLd } from "@/features/seo/json-ld";
import { createDynamicPublicMetadata } from "@/features/seo/metadata";
import { createAbsolutePublicUrl } from "@/features/seo/site-url";

type Props = {
  params: Promise<{ slug: string }>;
};

const getPublishedItem = cache((slug: string) => findPublicGalleryBySlug(slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublishedItem(slug);
  if (!item) notFound();
  return createDynamicPublicMetadata({ path: `/life/gallery/${slug}`, title: item.title, description: item.description, type: "article", publishedTime: item.publishedAt, image: { url: `/api/gallery/${slug}/media`, alt: item.altText, width: item.width, height: item.height } });
}

export default async function GalleryDetail({ params }: Props) {
  const { slug } = await params;
  const item = await getPublishedItem(slug);

  if (!item) notFound();

  return (
    <>
      <JsonLd id="gallery-image-json-ld" data={{ "@context": "https://schema.org", "@type": "ImageObject", name: item.title, description: item.description, caption: item.altText, contentUrl: createAbsolutePublicUrl(`/api/gallery/${slug}/media`), url: createAbsolutePublicUrl(`/life/gallery/${slug}`), width: item.width, height: item.height, datePublished: item.publishedAt, dateCreated: item.activityDate, inLanguage: "ko-KR" }} />
      <JsonLd id="gallery-breadcrumb-json-ld" data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [["홈", "/"], ["활동사진", "/life/gallery"], [item.title, `/life/gallery/${slug}`]].map(([name, path], index) => ({ "@type": "ListItem", position: index + 1, name, item: createAbsolutePublicUrl(path) })) }} />
      <SectionPageHeader
        sectionHref="/life"
        eyebrow="생활·프로그램"
        title={item.title}
        description={item.description}
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "활동사진", href: "/life/gallery" }, { label: item.title }]}
      />
      <article className="mx-auto max-w-site px-page py-12 sm:px-page-wide">
        <h2 className="text-heading font-bold">활동사진</h2>
        <div className="mt-5 flex max-h-[70vh] justify-center overflow-hidden rounded-card bg-muted">
          <img
            src={`/api/gallery/${item.slug}/media`}
            alt={item.altText}
            width={item.width}
            height={item.height}
            className="h-auto max-h-[70vh] max-w-full object-contain"
          />
        </div>
        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="font-bold">분류</dt>
            <dd>{item.category}</dd>
          </div>
          <div>
            <dt className="font-bold">활동일</dt>
            <dd>{item.activityDate.replace(/-/g, ".")}</dd>
          </div>
        </dl>
        <section className="mt-8">
          <h2 className="text-heading font-bold">설명</h2>
          <p className="text-safe-wrap mt-3 whitespace-pre-wrap">{item.description}</p>
        </section>
        <Link href="/life/gallery" className="mt-10 inline-flex min-h-11 items-center font-bold text-primary underline">
          활동사진 목록으로 돌아가기
        </Link>
      </article>
    </>
  );
}
