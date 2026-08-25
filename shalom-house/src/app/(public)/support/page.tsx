import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

type NavigationHref = (typeof siteConfig.mainNavigation)[number]["href"];

const supportParticipationFlows = [
  {
    label: "후원",
    title: "공식 후원 안내를 확인하고 있습니다",
    description:
      "후원 방법과 관련 안내 문구는 공식 담당자의 확인을 거쳐 공개합니다.",
    guidance: [
      "공식 후원 방법과 필요한 안내 사항",
      "후원 참여 절차와 준비 사항",
      "후원 문의 경로와 담당 범위",
    ],
  },
  {
    label: "자원봉사",
    title: "참여 신청 방식을 확인하고 있습니다",
    description: "신청 과정과 필요한 정보 범위를 협의한 뒤 공개합니다.",
    guidance: [
      "신청 방식과 참여 전 확인 사항",
      "자원봉사 참여 절차와 준비 사항",
      "자원봉사 문의 경로와 담당 범위",
    ],
  },
] as const;

const supportInformationPrinciples = [
  {
    title: "공식 정보 확인",
    description:
      "후원 방법과 문의 정보는 공식 담당자가 확인한 내용만 공개합니다.",
  },
  {
    title: "최소한의 정보",
    description:
      "자원봉사 신청 과정에서 필요한 개인정보는 목적에 필요한 범위로 제한합니다.",
  },
  {
    title: "동의와 공개 범위",
    description:
      "후원자와 자원봉사자의 이름, 활동 사진과 후기는 별도 공개 동의를 확인합니다.",
  },
] as const;

const supportRelatedLinks = [
  { href: "/news", description: "공개가 승인된 공지사항과 활동 소식" },
  {
    href: "/transparency",
    description: "공개가 승인된 운영 및 후원 관련 자료",
  },
] satisfies ReadonlyArray<{ href: NavigationHref; description: string }>;

function getNavigationLabel(href: NavigationHref) {
  const navigationItem = siteConfig.mainNavigation.find(
    (item) => item.href === href,
  );

  if (!navigationItem) {
    throw new Error(`등록되지 않은 홈페이지 경로입니다: ${href}`);
  }

  return navigationItem.label;
}

export const metadata: Metadata = {
  title: "후원과 봉사",
  description:
    "샬롬의 집의 후원과 자원봉사 안내 준비 내용과 참여 정보 공개 원칙을 확인합니다.",
};

export default function SupportPage() {
  return (
    <>
      <section className="border-b border-border bg-primary-soft">
        <div className="mx-auto w-full max-w-site px-page py-16 sm:px-page-wide sm:py-20">
          <div className="max-w-content">
            <p className="text-small font-bold text-primary">후원과 봉사</p>
            <h1 className="mt-5 text-display font-bold text-foreground sm:text-display-lg">
              후원과 자원봉사 참여 안내를 준비하고 있습니다
            </h1>
            <div className="mt-6 space-y-3 text-body text-muted-foreground">
              <p>
                {siteConfig.name}의 후원과 자원봉사 방법은 공식 담당자 확인을
                거쳐 안내합니다.
              </p>
              <p>
                현재는 두 참여 방식의 준비 상태와 공개 원칙, 시설 대표
                연락처를 확인할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="support-participation-heading"
        className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide"
      >
        <p className="text-small font-bold text-primary">참여 안내</p>
        <h2
          id="support-participation-heading"
          className="mt-2 max-w-content text-title font-bold text-foreground"
        >
          후원과 자원봉사를 구분해 안내합니다
        </h2>
        <p className="mt-4 max-w-content text-body text-muted-foreground">
          실제 방법과 절차는 아직 확정되지 않았으며, 아래 내용은 현재 준비
          상태와 확인 후 제공할 정보입니다.
        </p>

        <div className="mt-10 grid border-y border-border md:grid-cols-2">
          {supportParticipationFlows.map((flow, index) => (
            <section
              key={flow.label}
              aria-labelledby={`support-flow-${index}`}
              className="border-b border-border py-8 last:border-b-0 md:border-b-0 md:even:border-l md:even:pl-10 md:odd:pr-10"
            >
              <p className="text-small font-bold text-primary">
                안내 준비 중 · {flow.label}
              </p>
              <h3
                id={`support-flow-${index}`}
                className="mt-2 text-heading font-bold text-foreground"
              >
                {flow.title}
              </h3>
              <p className="mt-4 text-body text-muted-foreground">
                {flow.description}
              </p>
              <p className="mt-7 font-bold text-foreground">
                확인 후 안내할 내용
              </p>
              <ul className="mt-3 space-y-2 text-body text-muted-foreground">
                {flow.guidance.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden="true">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <aside
        aria-labelledby="support-contact-heading"
        className="border-y border-border bg-surface-subtle"
      >
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
          <p className="text-small font-bold text-primary">
            현재 공개된 연락처
          </p>
          <h2
            id="support-contact-heading"
            className="mt-2 text-title font-bold text-foreground"
          >
            시설 대표 전화 안내
          </h2>
          <p className="mt-4 max-w-content text-body text-muted-foreground">
            후원과 자원봉사 전용 문의 경로는 담당자 확인 후 안내합니다. 아래
            번호는 현재 홈페이지에 공개된 시설 대표 전화입니다.
          </p>
          <address className="mt-7 not-italic">
            <p className="text-small font-bold text-foreground">
              시설 대표 전화
            </p>
            <a
              className="mt-1 inline-flex min-h-11 items-center break-all text-body font-bold text-primary underline underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              href={`tel:${siteConfig.phone}`}
            >
              {siteConfig.phone}
            </a>
          </address>
        </div>
      </aside>

      <section
        aria-labelledby="support-principles-heading"
        className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide lg:grid lg:grid-cols-2 lg:gap-16"
      >
        <div>
          <p className="text-small font-bold text-primary">참여 정보 원칙</p>
          <h2
            id="support-principles-heading"
            className="mt-2 text-title font-bold text-foreground"
          >
            확인과 동의를 바탕으로 안내합니다
          </h2>
          <p className="mt-4 max-w-content text-body text-muted-foreground">
            후원과 자원봉사 정보는 공식 확인, 개인정보 최소화, 공개 동의
            원칙에 따라 안내합니다.
          </p>
        </div>
        <ul className="mt-10 border-b border-border lg:mt-0">
          {supportInformationPrinciples.map((principle) => (
            <li key={principle.title} className="border-t border-border py-6">
              <h3 className="text-heading font-bold text-foreground">
                {principle.title}
              </h3>
              <p className="mt-3 text-body text-muted-foreground">
                {principle.description}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="support-related-heading"
        className="border-t border-border bg-surface"
      >
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
          <p className="text-small font-bold text-primary">관련 정보</p>
          <h2
            id="support-related-heading"
            className="mt-2 text-title font-bold text-foreground"
          >
            소식과 공개 자료를 함께 확인하세요
          </h2>
          <p className="mt-4 max-w-content text-body text-muted-foreground">
            공개가 승인된 소식과 운영 자료는 각 페이지에서 확인할 수
            있습니다.
          </p>
          <ul className="mt-8 max-w-content divide-y divide-border border-y border-border">
            {supportRelatedLinks.map((link) => (
              <li key={link.href}>
                <Link
                  className="group flex min-h-11 items-center justify-between gap-5 py-5 text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                  href={link.href}
                >
                  <span className="min-w-0">
                    <span className="block font-bold">
                      {getNavigationLabel(link.href)}
                    </span>
                    <span className="mt-1 block text-small text-muted-foreground group-hover:text-primary">
                      {link.description}
                    </span>
                  </span>
                  <span aria-hidden="true" className="shrink-0 font-bold">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
