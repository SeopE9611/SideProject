import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import Image from "next/image";
import { ContentDetailHeader } from "@/components/layout/content-detail-header";
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
  return createDynamicPublicMetadata({
    path: `/life/gallery/${slug}`,
    title: item.title,
    description: item.description,
    type: "article",
    publishedTime: item.publishedAt,
    image: { url: `/api/gallery/${slug}/media`, alt: item.altText, width: item.width, height: item.height },
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function GalleryDetail({ params }: Props) {
  const { slug } = await params;
  const item = await getPublishedItem(slug);
  if (!item) notFound();
  const metadata = [
    { label: "활동일", value: item.activityDate.replace(/-/g, "."), dateTime: item.activityDate },
    {
      label: "게시일",
      value: new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "UTC",
      }).format(new Date(item.publishedAt)),
      dateTime: item.publishedAt,
    },
  ];
  return (
    <div className="bg-surface">
      <JsonLd
        id="gallery-image-json-ld"
        data={{
          "@context": "https://schema.org",
          "@type": "ImageObject",
          name: item.title,
          description: item.description,
          caption: item.altText,
          contentUrl: createAbsolutePublicUrl(`/api/gallery/${slug}/media`),
          url: createAbsolutePublicUrl(`/life/gallery/${slug}`),
          width: item.width,
          height: item.height,
          datePublished: item.publishedAt,
          dateCreated: item.activityDate,
          inLanguage: "ko-KR",
        }}
      />
      <JsonLd
        id="gallery-breadcrumb-json-ld"
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            ["홈", "/"],
            ["활동사진", "/life/gallery"],
            [item.title, `/life/gallery/${slug}`],
          ].map(([name, path], index) => ({
            "@type": "ListItem",
            position: index + 1,
            name,
            item: createAbsolutePublicUrl(path),
          })),
        }}
      />
      <article className="mx-auto max-w-5xl px-page py-6 sm:px-page-wide sm:py-8">
        <ContentDetailHeader
          title={item.title}
          category={item.category}
          backHref="/life/gallery"
          backLabel="활동사진 목록으로"
          metadata={metadata}
        />
        <figure className="mt-6">
          <Image
            src={"/api/gallery/" + item.slug + "/media"}
            alt={item.altText}
            width={item.width}
            height={item.height}
            loading="eager"
            fetchPriority="high"
            className="h-auto max-h-[75vh] w-full rounded-control bg-surface-subtle object-contain"
            unoptimized
          />
          <figcaption className="text-safe-wrap mt-5 max-w-content whitespace-pre-wrap text-body leading-8">
            {item.description}
          </figcaption>
        </figure>
        <div className="mt-7 flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-border pt-5">
          <Link className="institution-link" href="/life/gallery">
            <span aria-hidden="true">←</span> 활동사진 목록으로
          </Link>
          <a
            className="institution-link text-small"
            href={"/api/gallery/" + item.slug + "/media"}
            target="_blank"
            rel="noreferrer"
          >
            사진 원본 보기 <span className="text-xs">(새 창)</span>
          </a>
        </div>
      </article>
    </div>
  );
}
