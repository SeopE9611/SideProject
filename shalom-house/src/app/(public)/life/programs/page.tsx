import Image from "next/image";
import Link from "next/link";

import { SectionPageHeader } from "@/components/layout/section-page-header";
import { getProgramRepository } from "@/features/programs/program.repository";
import { createPublicPageMetadata } from "@/features/seo/metadata";

export const metadata = createPublicPageMetadata("/life/programs");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const programs = await getProgramRepository()
    .listPublished({ limit: 100 })
    .catch(() => {
      console.error("공개 프로그램 목록 조회 실패");
      return null;
    });
  return (
    <div className="bg-surface">
      <SectionPageHeader
        compact
        sectionHref="/life"
        eyebrow="생활·프로그램"
        title="프로그램"
        description="프로그램의 목적, 활동 내용과 운영 상태를 확인합니다."
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "생활·프로그램", href: "/life" }, { label: "프로그램" }]}
      />
      <section
        aria-labelledby="program-list-heading"
        className="mx-auto max-w-site px-page py-8 sm:px-page-wide sm:py-10"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-primary pb-4">
          <h2 id="program-list-heading" className="text-heading font-bold">
            프로그램 안내
          </h2>
          <Link className="institution-link text-small" href="/support/contact">
            프로그램 문의하기
          </Link>
        </div>
        {programs === null ? (
          <div className="border-b border-border py-6" role="status">
            <h3 className="font-semibold">프로그램을 불러오지 못했습니다.</h3>
            <p className="mt-2 text-small text-muted-foreground">잠시 후 다시 시도하거나 문의해 주세요.</p>
            <a className="institution-link mt-3" href="/life/programs">
              다시 불러오기
            </a>
          </div>
        ) : programs.length > 0 ? (
          <ul className="divide-y divide-border border-b border-border">
            {programs.map((program) => (
              <li key={program.id} className="min-w-0 py-7 sm:py-9">
                <article
                  className={`grid items-start gap-6 md:gap-10 ${program.coverImage ? "md:grid-cols-[minmax(0,1fr)_16rem] lg:grid-cols-[minmax(0,1fr)_20rem]" : ""}`}
                >
                  <div className="min-w-0 max-w-3xl">
                    <p className="text-small font-bold text-accent">{program.category}</p>
                    <h3 className="mt-3 text-xl leading-relaxed font-bold tracking-tight sm:text-2xl">
                      <Link
                        className="text-safe-wrap underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                        href={"/life/programs/" + program.slug}
                      >
                        {program.title}
                      </Link>
                    </h3>
                    <p className="text-safe-wrap mt-3 text-body text-muted-foreground">{program.summary}</p>
                    <dl className="mt-5 space-y-3 border-l-2 border-border pl-4 text-small leading-7">
                      <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
                        <dt className="font-semibold">목적</dt>
                        <dd className="text-safe-wrap">{program.purpose}</dd>
                      </div>
                      {program.operationStatusLabel ? (
                        <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
                          <dt className="font-semibold">운영 상태</dt>
                          <dd className="text-safe-wrap">{program.operationStatusLabel}</dd>
                        </div>
                      ) : null}
                    </dl>
                    {program.attachment ? <p className="mt-3 text-small text-muted-foreground">PDF 첨부</p> : null}
                  </div>
                  {program.coverImage ? (
                    <Image
                      src={program.coverImage.src}
                      alt={program.coverImage.altText}
                      width={program.coverImage.width}
                      height={program.coverImage.height}
                      className="aspect-[4/3] w-full max-w-sm bg-surface-subtle object-cover"
                      unoptimized
                    />
                  ) : null}
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-b border-border py-6">
            <h3 className="font-semibold">아직 등록된 프로그램 안내가 없습니다.</h3>
            <p className="text-safe-wrap mt-2 text-small text-muted-foreground">
              활동 기록은 생활이야기와 활동소식에서 확인할 수 있습니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              <Link className="institution-link" href="/life">
                생활이야기
              </Link>
              <Link className="institution-link" href="/news/activities">
                활동소식
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
