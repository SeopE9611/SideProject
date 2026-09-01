import { createPublicPageMetadata } from "@/features/seo/metadata";

export const metadata = createPublicPageMetadata("/life/programs");

import Link from "next/link";
import { SectionPageHeader } from "@/components/layout/section-page-header";
import { getProgramRepository } from "@/features/programs/program.repository";
export default async function ProgramsPage() {
  let programs: Awaited<ReturnType<ReturnType<typeof getProgramRepository>["listPublished"]>> = [];
  try {
    programs = await getProgramRepository().listPublished({ limit: 100 });
  } catch (error) {
    console.error("공개 프로그램 목록 조회에 실패했습니다.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
  return (
    <>
      <SectionPageHeader
        sectionHref="/life"
        eyebrow="생활·프로그램"
        title="프로그램"
        description="확인된 프로그램을 분류와 목적 중심으로 안내합니다."
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "생활·프로그램", href: "/life" }, { label: "프로그램" }]}
        notice="운영이 확인된 프로그램은 목적과 활동 내용을 확인한 뒤 안내합니다."
      />
      <section className="mx-auto max-w-site px-page py-12 sm:px-page-wide">
        {programs.length ? (
          <ul className="grid gap-x-10 border-t border-foreground lg:grid-cols-2">
            {programs.map((program) => (
              <li key={program.id} className="border-b border-border py-6">
                {program.coverImage ? <img src={program.coverImage.src} alt={program.coverImage.altText} width={program.coverImage.width} height={program.coverImage.height} className="mb-5 aspect-video h-auto w-full rounded-card object-cover" /> : null}
                <p className="text-safe-wrap text-small font-bold text-accent">{program.category}</p>
                <h2 className="text-safe-wrap mt-2 text-heading font-bold">
                  <Link
                    className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                    href={`/life/programs/${program.slug}`}
                  >
                    {program.title}
                  </Link>
                </h2>
                <p className="text-safe-wrap mt-3 text-muted-foreground">{program.summary}</p>
                <p className="text-safe-wrap mt-3">
                  <strong>목적</strong> {program.purpose}
                </p>
                {program.attachment ? <p className="mt-3 text-small font-semibold">PDF 첨부</p> : null}
                {program.operationStatusLabel ? (
                  <p className="text-safe-wrap mt-3 text-small">
                    <strong>운영 상태</strong> {program.operationStatusLabel}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-y border-border py-6">
            <p className="text-small font-bold text-accent">안내 준비 중</p>
            <h2 className="text-safe-wrap mt-2 text-heading font-bold">프로그램 안내를 준비하고 있습니다.</h2>
            <p className="text-safe-wrap mt-3 text-muted-foreground">
              운영이 확인된 프로그램은 목적과 활동 내용을 확인한 뒤 안내합니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-5">
              <Link className="font-bold text-primary underline focus-visible:outline-2" href="/life">
                생활이야기
              </Link>
              <Link className="font-bold text-primary underline focus-visible:outline-2" href="/news/activities">
                활동소식
              </Link>
              <Link className="font-bold text-primary underline focus-visible:outline-2" href="/support/contact">
                문의하기
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
