import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SectionPageHeader } from "@/components/layout/section-page-header";
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
  return createDynamicPublicMetadata({ path: `/life/programs/${slug}`, title: program.title, description: program.summary,
    type: "article", publishedTime: program.publishedAt, modifiedTime: program.updatedAt, section: program.category, image: program.coverImage ? { url: program.coverImage.src, alt: program.coverImage.altText, width: program.coverImage.width, height: program.coverImage.height } : null });
}
export default async function ProgramDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program) notFound();
  const modified = program.updatedAt !== program.publishedAt;
  return (
    <>
      <JsonLd id="program-article-json-ld" data={{ "@context": "https://schema.org", "@type": "Article", headline: program.title, description: program.summary, url: createAbsolutePublicUrl(`/life/programs/${slug}`), mainEntityOfPage: createAbsolutePublicUrl(`/life/programs/${slug}`), datePublished: program.publishedAt, dateModified: program.updatedAt, inLanguage: "ko-KR", articleSection: program.category, publisher: { "@id": `${getSiteOrigin()}/#organization` }, ...(program.coverImage ? { image: program.coverImage.src } : {}) }} />
      <JsonLd id="program-breadcrumb-json-ld" data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [["홈", "/"], ["생활·프로그램", "/life"], ["프로그램", "/life/programs"], [program.title, `/life/programs/${slug}`]].map(([name, path], index) => ({ "@type": "ListItem", position: index + 1, name, item: createAbsolutePublicUrl(path) })) }} />
      <SectionPageHeader
        sectionHref="/life"
        eyebrow="생활·프로그램"
        title={program.title}
        description={program.summary}
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "생활·프로그램", href: "/life" },
          { label: "프로그램", href: "/life/programs" },
          { label: program.title },
        ]}
      />
      <article className="mx-auto max-w-site px-page py-12 sm:px-page-wide">
        <section aria-labelledby="program-information">
          <h2 id="program-information" className="text-heading font-bold">
            프로그램 기본 정보
          </h2>
          <dl className="mt-5 grid border-t border-foreground sm:grid-cols-2">
            {[
              ["분류", program.category],
              ...(program.operationStatusLabel ? [["운영 상태", program.operationStatusLabel]] : []),
              ["게시일", formatter.format(new Date(program.publishedAt))],
              ...(modified ? [["수정일", formatter.format(new Date(program.updatedAt))]] : []),
            ].map(([label, value]) => (
              <div key={label} className="border-b border-border py-4">
                <dt className="text-small font-bold">{label}</dt>
                <dd className="text-safe-wrap mt-1">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        {program.coverImage ? <img src={program.coverImage.src} alt={program.coverImage.altText} width={program.coverImage.width} height={program.coverImage.height} className="mt-10 h-auto w-full rounded-card" /> : null}
        <section className="mt-10" aria-labelledby="program-purpose">
          <h2 id="program-purpose" className="text-heading font-bold">
            목적
          </h2>
          <p className="text-safe-wrap mt-4">{program.purpose}</p>
        </section>
        <section className="mt-10" aria-labelledby="program-body">
          <h2 id="program-body" className="text-heading font-bold">
            활동 내용
          </h2>
          <div className="mt-4 space-y-4">
            {program.body.map((paragraph, index) => (
              <p className="text-safe-wrap" key={index}>
                {paragraph}
              </p>
            ))}
          </div>
        </section>
        <section className="mt-10" aria-labelledby="program-attachment"><h2 id="program-attachment" className="text-heading font-bold">첨부파일</h2>
          {program.attachment ? <div className="mt-4"><p className="font-semibold">{program.attachment.label}</p><p className="mt-1 text-small text-muted-foreground">{program.attachment.originalFileName} · {program.attachment.byteSize >= 1024 * 1024 ? `${(program.attachment.byteSize / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(program.attachment.byteSize / 1024)} KB`}</p><a href={program.attachment.href} download className="mt-3 inline-flex min-h-11 items-center font-bold text-primary underline">PDF 내려받기</a></div> : <p className="mt-4">첨부파일이 없습니다.</p>}
        </section>
        <Link
          href="/life/programs"
          className="mt-10 inline-flex min-h-11 items-center font-bold text-primary underline focus-visible:outline-2"
        >
          프로그램 목록으로 이동
        </Link>
      </article>
    </>
  );
}
