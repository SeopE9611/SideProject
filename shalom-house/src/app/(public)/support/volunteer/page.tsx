import { createPublicPageMetadata } from "@/features/seo/metadata";

export const metadata = createPublicPageMetadata("/support/volunteer");

import Link from "next/link";

import { SectionPageHeader } from "@/components/layout/section-page-header";
import { getPublicContactInformation } from "@/features/site-content/site-content.repository";
import { createTelephoneHref } from "@/features/site-content/site-content.types";
import { supportFixture } from "@/content/fixtures/support.fixture";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function VolunteerPage() {
  const contact = await getPublicContactInformation();
  return (
    <>
      <SectionPageHeader
        sectionHref="/support"
        eyebrow="함께하기"
        title="자원봉사"
        description="참여 가능 여부부터 방문 전 준비까지 확인하는 절차입니다."
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "함께하기", href: "/support" }, { label: "자원봉사" }]}
        notice="온라인 문의를 접수할 수 있으며 실제 참여 가능 일정과 활동 범위는 담당자 확인 후 확정됩니다."
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
          온라인 문의에서는 참여 확인에 필요한 최소 연락처만 입력해 주세요.
        </p>
        <a className="mt-5 inline-flex font-bold text-primary underline" href={createTelephoneHref(contact.phone)}>
          대표 전화 {contact.phone}
        </a>
        <Link className="ml-5 mt-5 inline-flex font-bold text-primary underline" href="/support/contact?kind=volunteer">
          자원봉사 문의 접수
        </Link>
      </section>
    </>
  );
}
