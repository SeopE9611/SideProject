import type { Metadata } from "next";
import Link from "next/link";

import { SectionPageHeader } from "@/components/layout/section-page-header";
import { lifeFixture } from "@/content/fixtures/life.fixture";

export const metadata: Metadata = {
  title: "프로그램",
};

export default function ProgramsPage() {
  return (
    <>
      <SectionPageHeader
        eyebrow="생활·프로그램"
        title="프로그램"
        description="확인된 프로그램을 분류와 목적 중심으로 안내하기 위한 페이지입니다."
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "생활·프로그램", href: "/life" },
          { label: "프로그램" },
        ]}
        notice="모든 항목은 운영 사실이 아닌 화면 검증용 예시입니다."
      />
      <section className="mx-auto max-w-site px-page py-12 sm:px-page-wide">
        <h2 className="text-heading font-bold">프로그램 분류 및 목록</h2>
        <ul className="mt-6 grid gap-x-10 border-t border-foreground lg:grid-cols-2">
          {lifeFixture.programs.map((program) => (
            <li key={program.id} className="border-b border-border py-6">
              <p className="text-small font-bold text-accent">
                {program.category}
              </p>
              <h3 className="text-safe-wrap mt-2 text-heading font-bold">
                {program.title}
              </h3>
              <dl className="mt-4 grid gap-2">
                <div>
                  <dt className="font-bold">목적</dt>
                  <dd className="text-safe-wrap text-muted-foreground">
                    {program.purpose}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold">설명</dt>
                  <dd className="text-safe-wrap text-muted-foreground">
                    {program.description}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold">상태</dt>
                  <dd>{program.operatingStatus}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
        <Link
          className="mt-8 inline-flex font-bold text-primary underline"
          href="/news/activities"
        >
          활동소식 보기
        </Link>
      </section>
    </>
  );
}
