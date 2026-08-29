import type { Metadata } from "next";
import Link from "next/link";

import { SectionPageHeader } from "@/components/layout/section-page-header";
import { siteConfig } from "@/config/site";
import { supportFixture } from "@/content/fixtures/support.fixture";

export const metadata: Metadata = {
  title: "후원하기",
};

export default function DonationPage() {
  return (
    <>
      <SectionPageHeader
        eyebrow="함께하기"
        title="후원하기"
        description="확인 가능한 후원 방식과 문의 절차를 안내합니다."
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "함께하기", href: "/support" },
          { label: "후원하기" },
        ]}
        notice="공식 계좌 정보는 준비 중이며 홈페이지에 아직 표시하지 않습니다."
      />
      <section className="mx-auto max-w-site px-page py-12 sm:px-page-wide">
        <h2 className="text-heading font-bold">후원 방식 확인 절차</h2>
        <ol className="mt-5 list-decimal space-y-4 border-y border-border py-6 pl-6">
          {supportFixture.donationSteps.map((step) => (
            <li className="text-safe-wrap" key={step}>
              {step}
            </li>
          ))}
        </ol>
        <p className="mt-8">
          대표 전화{" "}
          <a
            className="font-bold text-primary underline"
            href={`tel:${siteConfig.phone}`}
          >
            {siteConfig.phone}
          </a>
        </p>
        <Link
          className="mt-5 inline-flex font-bold text-primary underline"
          href="/transparency"
        >
          후원금 자료공개 보기
        </Link>
      </section>
    </>
  );
}
