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
        sectionHref="/about"
        eyebrow="시설소개"
        title="인사말"
        description="운영 책임자의 확인을 거친 공식 메시지를 안내하는 페이지입니다."
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "시설소개", href: "/about" },
          { label: "인사말" },
        ]}
        notice="공식 인사말은 운영 책임자의 확인과 공개 승인을 마친 뒤 게시합니다."
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
        <div className="mt-8 flex flex-wrap gap-5">
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
