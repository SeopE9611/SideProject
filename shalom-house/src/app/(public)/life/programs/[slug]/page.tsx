import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import Image from "next/image";
import { ContentDetailHeader } from "@/components/layout/content-detail-header";
import { ContentAttachment } from "@/components/layout/content-attachment";
import { getProgramRepository } from "@/features/programs/program.repository";
import { JsonLd } from "@/features/seo/json-ld";
import { createDynamicPublicMetadata } from "@/features/seo/metadata";
import { createAbsolutePublicUrl, getSiteOrigin } from "@/features/seo/site-url";
const formatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});
const getProgram = cache((slug: string) => getProgramRepository().findPublishedBySlug(slug));
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program) notFound();
  return createDynamicPublicMetadata({
    path: `/life/programs/${slug}`,
    title: program.title,
    description: program.summary,
    type: "article",
    publishedTime: program.publishedAt,
    modifiedTime: program.updatedAt,
    section: program.category,
    image: program.coverImage
      ? {
          url: program.coverImage.src,
          alt: program.coverImage.altText,
          width: program.coverImage.width,
          height: program.coverImage.height,
        }
      : null,
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ProgramDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program) notFound();
  const metadata = [
    ...(program.operationStatusLabel ? [{ label: "운영 상태", value: program.operationStatusLabel }] : []),
    { label: "게시일", value: formatter.format(new Date(program.publishedAt)), dateTime: program.publishedAt },
    ...(program.updatedAt !== program.publishedAt
      ? [{ label: "수정일", value: formatter.format(new Date(program.updatedAt)), dateTime: program.updatedAt }]
      : []),
  ];
  return (
    <div className="bg-surface">
      <JsonLd
        id="program-article-json-ld"
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: program.title,
          description: program.summary,
          url: createAbsolutePublicUrl(`/life/programs/${slug}`),
          mainEntityOfPage: createAbsolutePublicUrl(`/life/programs/${slug}`),
          datePublished: program.publishedAt,
          dateModified: program.updatedAt,
          inLanguage: "ko-KR",
          articleSection: program.category,
          publisher: { "@id": `${getSiteOrigin()}/#organization` },
          ...(program.coverImage ? { image: createAbsolutePublicUrl(program.coverImage.src) } : {}),
        }}
      />
      <JsonLd
        id="program-breadcrumb-json-ld"
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            ["홈", "/"],
            ["생활·프로그램", "/life"],
            ["프로그램", "/life/programs"],
            [program.title, `/life/programs/${slug}`],
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
          title={program.title}
          summary={program.summary}
          category={program.category}
          backHref="/life/programs"
          backLabel="프로그램 목록으로"
          metadata={metadata}
        />
        <div className="max-w-content">
          {program.coverImage ? (
            <Image
              src={program.coverImage.src}
              alt={program.coverImage.altText}
              width={program.coverImage.width}
              height={program.coverImage.height}
              className="mt-6 h-auto w-full rounded-control"
              unoptimized
            />
          ) : null}
          <section className="mt-7" aria-labelledby="program-purpose">
            <h2 id="program-purpose" className="text-heading font-bold">
              목적
            </h2>
            <p className="text-safe-wrap mt-3 whitespace-pre-wrap text-body leading-8">{program.purpose}</p>
          </section>
          <section className="my-7" aria-labelledby="program-body">
            <h2 id="program-body" className="text-heading font-bold">
              활동 내용
            </h2>
            <div className="mt-4 space-y-5">
              {program.body.map((paragraph, index) => (
                <p className="text-safe-wrap whitespace-pre-wrap text-body leading-8" key={index}>
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
          <ContentAttachment headingId="program-attachment" attachment={program.attachment} />
          <div className="mt-5 flex flex-wrap justify-between gap-x-6 gap-y-2">
            <Link className="institution-link" href="/life/programs">
              <span aria-hidden="true">←</span> 프로그램 목록으로
            </Link>
            <Link className="institution-link text-small" href="/support/contact">
              프로그램 문의하기
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
