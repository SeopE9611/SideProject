import type { Metadata } from "next";
import Link from "next/link";

import { SectionPageHeader } from "@/components/layout/section-page-header";
import { aboutFixture } from "@/content/fixtures/about.fixture";

export const metadata: Metadata = {
  title: "생활공간",
};

export default function SpacesPage() {
  const hasOfficialSpaces =
    (aboutFixture.contentStatus as "fixture" | "official") === "official";

  return (
    <>
      <SectionPageHeader
        sectionHref="/about"
        eyebrow="시설소개"
        title="생활공간"
        description="승인된 설명과 사진으로 생활공간을 안내하기 위한 페이지입니다."
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "시설소개", href: "/about" },
          { label: "생활공간" },
        ]}
        notice="공간 정보는 설명과 사진의 공개 승인을 마친 범위에서 안내합니다."
      />
      <section className="mx-auto max-w-site px-page py-12 sm:px-page-wide">
        {hasOfficialSpaces ? (
          <ul className="divide-y divide-border border-y">
            {aboutFixture.spaces.map((space) => (
              <li
                className="grid gap-3 py-6 md:grid-cols-[1fr_2fr]"
                key={space.id}
              >
                <h2 className="text-safe-wrap font-bold">{space.title}</h2>
                <p className="text-safe-wrap text-muted-foreground">
                  {space.description}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-y border-border py-6">
            <p className="text-small font-bold text-accent">안내 준비 중</p>
            <h2 className="text-safe-wrap mt-2 text-heading font-bold">
              생활공간 안내를 준비하고 있습니다.
            </h2>
            <p className="text-safe-wrap mt-3 text-muted-foreground">
              승인된 공간 설명과 사진이 준비되면 이 페이지에서 안내합니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-5">
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
          </div>
        )}
      </section>
    </>
  );
}
