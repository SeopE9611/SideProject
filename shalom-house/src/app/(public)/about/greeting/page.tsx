import type { Metadata } from "next";
import Link from "next/link";

import { SectionPageHeader } from "@/components/layout/section-page-header";
import { aboutFixture } from "@/content/fixtures/about.fixture";

export const metadata: Metadata = {
  title: "인사말",
};

export default function GreetingPage() {
  const greeting = aboutFixture.greeting;

  return (
    <>
      <SectionPageHeader
        eyebrow="시설소개"
        title="인사말"
        description="운영 책임자의 확인을 거친 공식 메시지를 안내하는 페이지입니다."
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "시설소개", href: "/about" },
          { label: "인사말" },
        ]}
        notice="현재 내용은 공식 인사말이 아닌 화면 구성 검증용 예시입니다."
      />
      <section className="mx-auto max-w-site px-page py-12 sm:px-page-wide">
        <p className="font-bold text-accent">{greeting.statusLabel}</p>
        <h2 className="text-safe-wrap mt-3 text-heading font-bold">
          {greeting.title}
        </h2>
        {greeting.paragraphs.map((paragraph) => (
          <p
            key={paragraph}
            className="text-safe-wrap mt-4 max-w-3xl text-body text-muted-foreground"
          >
            {paragraph}
          </p>
        ))}
        <h2 className="mt-10 text-heading font-bold">공식 콘텐츠 확인 항목</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6">
          <li>작성 주체와 최종 승인 상태</li>
          <li>게시 시점과 수정 책임</li>
        </ul>
        <div className="mt-10 flex flex-wrap gap-5">
          <Link className="font-bold text-primary underline" href="/about">
            시설개요
          </Link>
          <Link
            className="font-bold text-primary underline"
            href="/about/directions"
          >
            찾아오시는 길
          </Link>
        </div>
      </section>
    </>
  );
}
