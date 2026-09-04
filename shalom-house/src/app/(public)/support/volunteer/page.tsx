import Link from "next/link";

import { SectionPageHeader } from "@/components/layout/section-page-header";
import { createPublicPageMetadata } from "@/features/seo/metadata";
import { getPublicContactInformation } from "@/features/site-content/site-content.repository";
import { createTelephoneHref } from "@/features/site-content/site-content.types";

export const metadata = createPublicPageMetadata("/support/volunteer");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const steps = [
  { title: "문의 남기기", description: "온라인 문의에서 자원봉사 문의를 선택하거나 대표 전화로 연락해 주세요." },
  { title: "일정과 활동 확인", description: "참여 가능 여부, 일정과 활동 범위는 담당자 확인이 필요합니다." },
  { title: "방문 준비", description: "방문 전 준비사항과 찾아오는 길을 확인해 주세요." },
];

export default async function VolunteerPage() {
  const contact = await getPublicContactInformation();
  return (
    <div className="bg-surface">
      <SectionPageHeader
        compact
        sectionHref="/support"
        eyebrow="함께하기"
        title="자원봉사"
        description="참여 문의부터 일정 확인과 방문 준비까지 안내합니다."
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "함께하기", href: "/support" }, { label: "자원봉사" }]}
      />
      <div className="mx-auto grid max-w-site items-start gap-9 px-page py-9 sm:px-page-wide sm:py-12 lg:grid-cols-12 lg:gap-12">
        <section aria-labelledby="volunteer-steps-heading" className="min-w-0 lg:col-span-8">
          <p className="text-small font-bold text-accent">확인 순서</p>
          <h2 id="volunteer-steps-heading" className="mt-2 text-[1.75rem] font-bold tracking-[-0.025em]">
            참여 문의 순서
          </h2>
          <p className="text-safe-wrap mt-5 border-l-4 border-accent bg-surface-subtle px-5 py-4 text-small leading-7">
            문의 접수 후 실제 참여 가능 일정과 활동 범위는 담당자 확인을 거쳐 확정됩니다.
          </p>
          <ol className="mt-6 border-t-2 border-foreground">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 border-b border-border py-6 sm:grid-cols-[4.5rem_minmax(0,1fr)]"
              >
                <span className="text-title font-bold text-accent" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-safe-wrap mt-2 text-small leading-7 text-muted-foreground">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link className="institution-link mt-5" href="/about/directions">
            찾아오시는 길 <span aria-hidden="true">→</span>
          </Link>
        </section>
        <aside
          aria-labelledby="volunteer-contact-heading"
          className="min-w-0 border-t-4 border-accent bg-accent-soft p-6 sm:p-8 lg:col-span-4"
        >
          <p className="text-small font-bold text-accent">참여 문의</p>
          <h2 id="volunteer-contact-heading" className="mt-2 text-heading font-bold">
            자원봉사 문의
          </h2>
          <p className="text-safe-wrap mt-3 text-small leading-7 text-muted-foreground">
            희망 일정과 문의할 활동을 가능한 범위에서 남겨 주세요.
          </p>
          <Link
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-control bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
            href="/support/contact?kind=volunteer#inquiry-form"
          >
            자원봉사 문의 접수
          </Link>
          <dl className="mt-6 border-t border-border pt-4">
            <dt className="text-small text-muted-foreground">대표 전화</dt>
            <dd>
              <a className="institution-link text-heading" href={createTelephoneHref(contact.phone)}>
                {contact.phone}
              </a>
            </dd>
          </dl>
          <p className="text-safe-wrap mt-3 text-small leading-7 text-muted-foreground">
            온라인 문의에는 필요한 연락처만 입력해 주세요.
          </p>
        </aside>
      </div>
    </div>
  );
}
