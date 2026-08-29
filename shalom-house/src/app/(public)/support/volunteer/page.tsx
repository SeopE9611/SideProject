import type { Metadata } from "next";

import { SectionPageHeader } from "@/components/layout/section-page-header";
import { siteConfig } from "@/config/site";
import { supportFixture } from "@/content/fixtures/support.fixture";

export const metadata: Metadata = {
  title: "자원봉사",
};

export default function VolunteerPage() {
  return (
    <>
      <SectionPageHeader
        sectionHref="/support"
        eyebrow="함께하기"
        title="자원봉사"
        description="참여 가능 여부부터 방문 전 준비까지 확인하는 절차입니다."
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "함께하기", href: "/support" },
          { label: "자원봉사" },
        ]}
        notice="현재 모집 일정과 온라인 신청은 제공하지 않습니다. 참여 가능 여부와 절차는 대표 전화로 확인해 주세요."
      />
      <section className="mx-auto max-w-site px-page py-12 sm:px-page-wide">
        <h2 className="text-heading font-bold">문의 절차</h2>
        <ol className="mt-5 list-decimal space-y-4 border-y border-border py-6 pl-6">
          {supportFixture.volunteerSteps.map((step) => (
            <li className="text-safe-wrap" key={step}>
              {step}
            </li>
          ))}
        </ol>
        <h2 className="mt-10 text-heading font-bold">개인정보 안내</h2>
        <p className="text-safe-wrap mt-3 text-muted-foreground">
          이 홈페이지에서는 자원봉사 신청을 위한 개인정보를 입력받지 않습니다.
        </p>
        <a
          className="mt-5 inline-flex font-bold text-primary underline"
          href={`tel:${siteConfig.phone}`}
        >
          대표 전화 {siteConfig.phone}
        </a>
      </section>
    </>
  );
}
