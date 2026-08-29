import type { Metadata } from "next";
import Link from "next/link";

import { SectionPageHeader } from "@/components/layout/section-page-header";
import { lifeFixture } from "@/content/fixtures/life.fixture";

export const metadata: Metadata = {
  title: "프로그램",
};

export default function ProgramsPage() {
  const hasOfficialPrograms =
    (lifeFixture.contentStatus as "fixture" | "official") === "official";

  return (
    <>
      <SectionPageHeader
        sectionHref="/life"
        eyebrow="생활·프로그램"
        title="프로그램"
        description="확인된 프로그램을 분류와 목적 중심으로 안내하기 위한 페이지입니다."
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "생활·프로그램", href: "/life" },
          { label: "프로그램" },
        ]}
        notice="운영이 확인된 프로그램은 목적과 활동 내용을 확인한 뒤 안내합니다."
      />
      <section className="mx-auto max-w-site px-page py-12 sm:px-page-wide">
        {hasOfficialPrograms ? (
          <ul className="grid gap-x-10 border-t border-foreground lg:grid-cols-2">
            {lifeFixture.programs.map((program) => (
              <li key={program.id} className="border-b border-border py-6">
                <p className="text-small font-bold text-accent">
                  {program.category}
                </p>
                <h2 className="text-safe-wrap mt-2 text-heading font-bold">
                  {program.title}
                </h2>
                <p className="text-safe-wrap mt-3 text-muted-foreground">
                  {program.description}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-y border-border py-6">
            <p className="text-small font-bold text-accent">안내 준비 중</p>
            <h2 className="text-safe-wrap mt-2 text-heading font-bold">
              프로그램 안내를 준비하고 있습니다.
            </h2>
            <p className="text-safe-wrap mt-3 text-muted-foreground">
              운영이 확인된 프로그램은 목적과 활동 내용을 확인한 뒤 안내합니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-5">
              <Link className="font-bold text-primary underline" href="/life">
                생활이야기
              </Link>
              <Link
                className="font-bold text-primary underline"
                href="/news/activities"
              >
                활동소식
              </Link>
              <Link
                className="font-bold text-primary underline"
                href="/support/contact"
              >
                문의하기
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
