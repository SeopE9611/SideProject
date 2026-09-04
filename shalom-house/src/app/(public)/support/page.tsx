import Link from "next/link";

import { SectionPageHeader } from "@/components/layout/section-page-header";
import { createPublicPageMetadata } from "@/features/seo/metadata";
import { getPublicContactInformation } from "@/features/site-content/site-content.repository";
import { createTelephoneHref } from "@/features/site-content/site-content.types";

export const metadata = createPublicPageMetadata("/support");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const participation = [
  {
    title: "후원",
    description: "후원 방법과 안내 절차를 확인하거나 후원 관련 문의를 접수합니다.",
    href: "/support/donation",
    inquiry: "/support/contact?kind=donation#inquiry-form",
    inquiryLabel: "후원 문의 접수",
  },
  {
    title: "자원봉사",
    description: "참여 가능 일정과 활동 범위를 문의하고 방문 전 준비사항을 확인합니다.",
    href: "/support/volunteer",
    inquiry: "/support/contact?kind=volunteer#inquiry-form",
    inquiryLabel: "자원봉사 문의 접수",
  },
];

export default async function SupportPage() {
  const contact = await getPublicContactInformation();
  return (
    <div className="bg-surface">
      <SectionPageHeader
        compact
        sectionHref="/support"
        eyebrow="함께하기"
        title="함께하기"
        description="후원·자원봉사 안내와 목적에 맞는 문의 경로를 찾아보세요."
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "함께하기" }]}
      />
      <div className="mx-auto max-w-site px-page py-9 sm:px-page-wide sm:py-12">
        <section aria-labelledby="participation-heading">
          <div className="max-w-3xl">
            <p className="text-small font-bold text-accent">참여 유형</p>
            <h2
              id="participation-heading"
              className="text-safe-wrap mt-2 text-[1.625rem] font-bold tracking-[-0.025em] sm:text-[1.75rem]"
            >
              필요한 안내를 먼저 선택해 주세요
            </h2>
          </div>
          <ul className="mt-6 grid border-y border-border lg:grid-cols-2">
            {participation.map((item, index) => (
              <li
                key={item.href}
                className="border-b border-border px-1 py-7 last:border-b-0 sm:p-8 lg:border-r lg:border-b-0 lg:last:border-r-0"
              >
                <p className="text-small font-bold text-accent">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 text-title font-bold">{item.title}</h3>
                <p className="text-safe-wrap mt-3 max-w-xl text-body text-muted-foreground">{item.description}</p>
                <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
                  <Link
                    className="inline-flex min-h-12 items-center justify-center rounded-control bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
                    href={item.href}
                  >
                    {item.title} 안내 보기
                  </Link>
                  <Link className="institution-link" href={item.inquiry}>
                    {item.inquiryLabel} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-12 lg:gap-12">
          <section aria-labelledby="support-other-heading" className="min-w-0 lg:col-span-7">
            <h2 id="support-other-heading" className="text-heading font-bold">
              목적별 문의
            </h2>
            <ul className="mt-4 border-t-2 border-foreground">
              <li className="grid gap-2 border-b border-border py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
                <div>
                  <h3 className="font-semibold">후원금 영수증·내역</h3>
                  <p className="text-safe-wrap mt-1 text-small text-muted-foreground">
                    영수증과 후원 내역에 관한 문의를 접수합니다.
                  </p>
                </div>
                <Link className="institution-link" href="/support/contact?kind=donation_receipt#inquiry-form">
                  문의 접수 <span aria-hidden="true">→</span>
                </Link>
              </li>
              <li className="grid gap-2 border-b border-border py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
                <div>
                  <h3 className="font-semibold">일반·방문 문의</h3>
                  <p className="text-safe-wrap mt-1 text-small text-muted-foreground">
                    시설과 방문에 관한 질문을 남길 수 있습니다.
                  </p>
                </div>
                <Link className="institution-link" href="/support/contact">
                  문의 접수 <span aria-hidden="true">→</span>
                </Link>
              </li>
            </ul>
          </section>
          <aside
            aria-labelledby="support-contact-heading"
            className="min-w-0 border-t-4 border-accent bg-accent-soft p-6 sm:p-8 lg:col-span-5"
          >
            <p className="text-small font-bold text-accent">대표 문의</p>
            <h2 id="support-contact-heading" className="mt-2 text-heading font-bold">
              전화로 확인하세요
            </h2>
            <a className="institution-link mt-3 text-title" href={createTelephoneHref(contact.phone)}>
              {contact.phone}
            </a>
            <p className="text-safe-wrap mt-2 text-small leading-7 text-muted-foreground">
              문의 목적을 말씀해 주시면 필요한 안내를 확인할 수 있습니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 border-t border-accent/20 pt-4">
              <Link className="institution-link" href="/about/directions">
                찾아오시는 길 <span aria-hidden="true">→</span>
              </Link>
              <Link className="institution-link" href="/transparency">
                자료공개 보기
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
