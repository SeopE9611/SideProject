import { ContentNeighborNavigation } from "@/components/layout/content-neighbor-navigation";
import { unavailableContentNeighbors } from "@/features/content/public-content-neighbors";
import { NewsRichBody } from "@/components/news/news-rich-body";
import type { Metadata } from "next";
import Image from "next/image";
import { ContentDetailHeader } from "@/components/layout/content-detail-header";
import { ContentAttachment } from "@/components/layout/content-attachment";
import { getPublicNewsNeighborHref, getPublicNewsNeighborScope, getPublicNewsReturnHref } from "@/features/news/news.pagination";
import { notFound } from "next/navigation";
import { cache } from "react";

import { getNewsRepository } from "@/features/news/news.repository";
import { getNewsCategoryLabel } from "@/features/news/news.types";
import { JsonLd } from "@/features/seo/json-ld";
import { createDynamicPublicMetadata } from "@/features/seo/metadata";
import { createAbsolutePublicUrl, getSiteOrigin } from "@/features/seo/site-url";
import { formatPublicDate } from "@/lib/format-public-date";

export const dynamic = "force-dynamic";

type NewsPostPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

const getPublishedItem = cache((slug: string) => getNewsRepository().findPublishedBySlug(slug));

export async function generateMetadata({ params }: NewsPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedItem(slug);
  if (!post) notFound();

  return createDynamicPublicMetadata({
    path: `/news/${slug}`,
    title: post.title,
    description: post.summary,
    type: "article",
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
    section: getNewsCategoryLabel(post.category),
    image: post.coverImage
      ? {
          url: post.coverImage.src,
          alt: post.coverImage.altText,
          width: post.coverImage.width,
          height: post.coverImage.height,
        }
      : null,
  });
}

export default async function NewsPostPage({ params, searchParams }: NewsPostPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const post = await getPublishedItem(slug);
  if (!post) notFound();
  const returnHref = getPublicNewsReturnHref(Array.isArray(query.returnTo) ? query.returnTo[0] : query.returnTo);
  const neighbors = await getNewsRepository().findPublishedNeighbors(post, getPublicNewsNeighborScope(returnHref)).catch(() => {
    console.error("소식 인접 게시물 조회 실패");
    return unavailableContentNeighbors;
  });
  const metadata = [
    { label: "게시일", value: formatPublicDate(post.publishedAt), dateTime: post.publishedAt },
    ...(post.updatedAt !== post.publishedAt
      ? [{ label: "수정일", value: formatPublicDate(post.updatedAt), dateTime: post.updatedAt }]
      : []),
  ];
  return (
    <div className="bg-surface">
      <JsonLd
        id="news-article-json-ld"
        data={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: post.title,
          description: post.summary,
          url: createAbsolutePublicUrl(`/news/${slug}`),
          mainEntityOfPage: createAbsolutePublicUrl(`/news/${slug}`),
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
          inLanguage: "ko-KR",
          articleSection: getNewsCategoryLabel(post.category),
          publisher: { "@id": `${getSiteOrigin()}/#organization` },
          ...(post.coverImage ? { image: createAbsolutePublicUrl(post.coverImage.src) } : {}),
        }}
      />
      <JsonLd
        id="news-breadcrumb-json-ld"
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            ["홈", "/"],
            ["소식·자료", "/news"],
            [post.title, `/news/${slug}`],
          ].map(([name, path], index) => ({
            "@type": "ListItem",
            position: index + 1,
            name,
            item: createAbsolutePublicUrl(path),
          })),
        }}
      />
      <article className="reading-layout">
        <ContentDetailHeader
          title={post.title}
          summary={post.summary}
          category={getNewsCategoryLabel(post.category)}
          backHref={returnHref}
          backLabel="소식 목록으로"
          metadata={metadata}
          isDemo={post.isDemo}
        />
        <div className="max-w-content">
          <section aria-label="소식 본문" className="py-7">
            {post.coverImage ? (
              <Image
                className="mb-6 h-auto w-full rounded-control"
                src={post.coverImage.src}
                alt={post.coverImage.altText}
                width={post.coverImage.width}
                height={post.coverImage.height}
                unoptimized
              />
            ) : null}
            <div className="space-y-5">
              {post.bodyDocument ? <NewsRichBody bodyDocument={post.bodyDocument} images={{ domain: "news", owner: post.slug, sizes: post.bodyImageSizes, admin: false }} /> : post.body.map((paragraph, index) => (
                <p key={index} className="text-safe-wrap whitespace-pre-wrap text-body leading-8">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
          <ContentAttachment headingId="attachments-heading" attachment={post.attachment} />
          <ContentNeighborNavigation neighbors={neighbors} backHref={returnHref} backLabel="소식 목록으로"
            hrefForSlug={(targetSlug) => getPublicNewsNeighborHref(targetSlug, returnHref)} />
        </div>
      </article>
    </div>
  );
}
