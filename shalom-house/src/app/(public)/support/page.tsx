import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

const supportGuidanceAreas = [
  {
    title: "후원 안내",
    description:
      "공식 후원 방법과 필요한 안내 사항을 담당자 확인 후 제공합니다.",
  },
  {
    title: "자원봉사 안내",
    description:
      "신청 방식과 참여 전 확인할 내용을 협의한 뒤 제공합니다.",
  },
  {
    title: "참여 절차",
    description:
      "각 참여 방식이 확정되면 순서와 준비 사항을 단계별로 안내합니다.",
  },
  {
    title: "문의 방법",
    description:
      "전용 문의 경로와 담당 범위를 확인한 뒤 안내합니다.",
  },
] as const;

const supportPreparationItems = [
  {
    label: "후원",
    title: "공식 후원 안내를 확인하고 있습니다",
    description:
      "후원 방법과 관련 안내 문구는 공식 담당자의 확인을 거쳐 공개합니다.",
  },
  {
    label: "자원봉사",
    title: "참여 신청 방식을 확인하고 있습니다",
    description:
      "신청 과정과 필요한 정보 범위를 협의한 뒤 공개합니다.",
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

const supportRelatedDescriptions: Partial<
  Record<(typeof siteConfig.mainNavigation)[number]["href"], string>
> = {
  "/news": "공개가 승인된 공지사항과 활동 소식을 확인합니다.",
  "/transparency": "공개가 승인된 운영 및 후원 관련 자료를 확인합니다.",
} satisfies Partial<
  Record<(typeof siteConfig.mainNavigation)[number]["href"], string>
>;

export const metadata: Metadata = {
  title: "후원과 봉사",
  description:
    "샬롬의 집의 후원과 자원봉사 안내 준비 내용과 참여 정보 공개 원칙을 확인합니다.",
};

export default function SupportPage() {
  return (
    <>
      <section className="border-b border-border bg-primary-soft">
        <div className="mx-auto grid w-full max-w-site items-center gap-10 px-page py-16 sm:px-page-wide sm:py-20 lg:min-h-[32rem] lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <div>
            <p className="inline-flex rounded-full border border-border bg-surface px-4 py-2 text-small font-semibold text-primary">
              후원과 봉사
            </p>
            <h1 className="mt-6 max-w-3xl text-display font-bold text-foreground sm:text-display-lg">
              후원과 자원봉사 참여 안내를 준비하고 있습니다
            </h1>
            <div className="mt-6 max-w-2xl space-y-3 text-body text-muted-foreground">
              <p>
                {siteConfig.name}의 후원과 자원봉사 방법은 공식 담당자 확인을
                거쳐 안내합니다.
              </p>
              <p>
                현재는 준비 중인 안내 범위와 개인정보 보호 원칙을 확인할 수
                있습니다.
              </p>
            </div>
          </div>

          <aside
            aria-labelledby="support-guidance-heading"
            className="rounded-card border border-border bg-surface p-6 shadow-card sm:p-8"
          >
            <p className="text-small font-bold text-primary">참여 안내 범위</p>
            <h2
              id="support-guidance-heading"
              className="mt-2 text-heading font-bold text-foreground"
            >
              확인 후 제공할 정보
            </h2>
            <ul className="mt-6 space-y-4">
              {supportGuidanceAreas.map((area) => (
                <li
                  key={area.title}
                  className="rounded-control border border-border bg-surface-subtle p-4"
                >
                  <p className="font-bold text-foreground">{area.title}</p>
                  <p className="mt-1 text-small text-muted-foreground">
                    {area.description}
                  </p>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section
        aria-labelledby="support-preparation-heading"
        className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide"
      >
        <p className="text-small font-bold text-primary">참여 안내 상태</p>
        <h2
          id="support-preparation-heading"
          className="mt-2 max-w-3xl text-title font-bold text-foreground"
        >
          공식 참여 방법을 확인하고 있습니다
        </h2>
        <p className="mt-4 max-w-3xl text-body text-muted-foreground">
          후원과 자원봉사의 실제 방법과 절차는 담당자 확인을 마친 뒤 이
          페이지에 안내합니다.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {supportPreparationItems.map((item) => (
            <article
              key={item.label}
              className="rounded-card border border-border bg-surface p-6 shadow-card sm:p-8"
            >
              <p className="text-small font-bold text-primary">
                안내 준비 중 · {item.label}
              </p>
              <h3 className="mt-2 text-heading font-bold text-foreground">
                {item.title}
              </h3>
              <p className="mt-4 text-body text-muted-foreground">
                {item.description}
              </p>
            </article>
          ))}
        </div>

        <aside
          aria-labelledby="support-contact-heading"
          className="mt-6 rounded-card border border-border-strong bg-primary-soft p-6 sm:p-8"
        >
          <p className="text-small font-bold text-primary">
            현재 공개된 연락처
          </p>
          <h3
            id="support-contact-heading"
            className="mt-2 text-heading font-bold text-foreground"
          >
            시설 대표 전화
          </h3>
          <p className="mt-4 max-w-3xl text-body text-muted-foreground">
            후원과 자원봉사 전용 문의 경로는 담당자 확인 후 안내합니다. 아래
            번호는 현재 홈페이지에 공개된 시설 대표 전화입니다.
          </p>
          <address className="mt-5 not-italic">
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-control border border-primary bg-primary px-5 py-3 text-base font-bold text-primary-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:border-primary-hover hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              href={`tel:${siteConfig.phone}`}
            >
              {siteConfig.phone}
            </a>
          </address>
        </aside>
      </section>

      <section
        aria-labelledby="support-principles-heading"
        className="border-y border-border bg-surface-subtle"
      >
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
          <p className="text-small font-bold text-primary">참여 정보 원칙</p>
          <h2
            id="support-principles-heading"
            className="mt-2 max-w-3xl text-title font-bold text-foreground"
          >
            확인과 동의를 바탕으로 안내합니다
          </h2>
          <p className="mt-4 max-w-3xl text-body text-muted-foreground">
            후원과 자원봉사 정보는 공식 확인, 개인정보 최소화, 공개 동의
            원칙에 따라 안내합니다.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {supportInformationPrinciples.map((principle) => (
              <article
                key={principle.title}
                className="rounded-card border border-border bg-surface p-6"
              >
                <h3 className="text-heading font-bold text-foreground">
                  {principle.title}
                </h3>
                <p className="mt-4 text-body text-muted-foreground">
                  {principle.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="support-related-heading"
        className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide"
      >
        <p className="text-small font-bold text-primary">관련 정보</p>
        <h2
          id="support-related-heading"
          className="mt-2 text-title font-bold text-foreground"
        >
          소식과 공개 자료를 함께 확인하세요
        </h2>
        <p className="mt-4 max-w-2xl text-body text-muted-foreground">
          공개가 승인된 소식과 운영 자료는 각 페이지에서 확인할 수 있습니다.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {siteConfig.mainNavigation.map((item) => {
            const description = supportRelatedDescriptions[item.href];

            if (!description) {
              return null;
            }

            return (
              <Link
                key={item.href}
                className="group flex min-h-44 flex-col justify-between rounded-card border border-border bg-surface p-6 text-foreground transition-colors duration-[var(--motion-duration-standard)] ease-standard hover:border-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
                href={item.href}
              >
                <div>
                  <h3 className="text-heading font-bold text-foreground">
                    {item.label}
                  </h3>
                  <p className="mt-4 text-body text-muted-foreground">
                    {description}
                  </p>
                </div>
                <span className="mt-8 inline-flex items-center gap-2 text-small font-bold">
                  안내 보기
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
