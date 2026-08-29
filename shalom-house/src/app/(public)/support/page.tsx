import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/layout/page-hero";
import { siteConfig } from "@/config/site";

const participationGuides = [
  {
    number: "01",
    label: "후원",
    title: "생활을 이어 가는 마음",
    description:
      "가능한 후원 방식과 공식 정보를 담당자에게 확인한 뒤 참여할 수 있습니다.",
    steps: [
      {
        title: "후원 방식 생각하기",
        description:
          "정기 후원, 일시 후원, 물품 후원 중 궁금한 방식을 정리합니다.",
      },
      {
        title: "대표 전화로 문의하기",
        description:
          "통화가 연결되면 후원 문의임을 먼저 알리고 담당자 안내를 받습니다.",
      },
      {
        title: "공식 정보 확인하기",
        description:
          "계좌와 예금주 등은 담당자가 안내한 내용과 일치하는지 확인합니다.",
      },
    ],
  },
  {
    number: "02",
    label: "자원봉사",
    title: "시간과 경험을 나누는 일",
    description:
      "가능한 일정과 관심 활동을 정리한 뒤 담당자와 참여 조건을 확인할 수 있습니다.",
    steps: [
      {
        title: "가능한 일정 정리하기",
        description:
          "참여할 수 있는 요일과 시간대, 관심 있는 활동을 정리합니다.",
      },
      {
        title: "대표 전화로 문의하기",
        description:
          "통화가 연결되면 자원봉사 문의임을 알리고 담당자 안내를 받습니다.",
      },
      {
        title: "준비 사항 확인하기",
        description:
          "활동 가능 여부와 일정, 준비 사항을 담당자와 협의해 확정합니다.",
      },
    ],
  },
] as const;

const relatedLinks = [
  {
    number: "01",
    label: "소식",
    description: "최근 공지사항과 활동 소식을 확인합니다.",
    href: "/news",
  },
  {
    number: "02",
    label: "정보공개",
    description: "공개된 운영 및 후원 관련 자료를 확인합니다.",
    href: "/transparency",
  },
] as const;

export const metadata: Metadata = {
  title: "함께하기",
  description:
    "샬롬의 집 후원과 자원봉사 문의 방법, 시설 대표 전화를 안내합니다.",
};

export default function SupportPage() {
  return (
    <>
      <PageHero
        eyebrow="함께하기"
        title="후원과 자원봉사 참여 방법을 안내합니다"
        description="참여를 서두르게 하거나 감정에 기대지 않습니다. 가능한 방식과 준비 사항을 살펴본 뒤 대표 전화로 담당자에게 정확한 절차를 확인해 주세요."
        asideTitle="참여 전 확인"
        items={[
          { label: "후원", value: "정기·일시·물품 후원 방식 문의" },
          { label: "자원봉사", value: "가능한 일정과 관심 활동 협의" },
          { label: "문의", value: `대표 전화 ${siteConfig.phone}` },
        ]}
        primaryAction={{
          label: "대표 전화로 문의하기",
          href: `tel:${siteConfig.phone}`,
        }}
        secondaryAction={{ label: "정보공개 보기", href: "/transparency" }}
      />

      <section
        aria-labelledby="participation-heading"
        className="bg-surface py-20 sm:py-24"
      >
        <div className="mx-auto w-full max-w-site px-page sm:px-page-wide">
          <div className="grid gap-7 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <div>
              <p className="text-small font-bold text-accent">
                참여 전 확인
              </p>
              <h2
                id="participation-heading"
                className="text-safe-wrap mt-3 max-w-3xl text-balance text-display font-bold text-foreground sm:text-display-lg"
              >
                문의 전에 세 가지만 준비해 주세요
              </h2>
            </div>
            <p className="text-safe-wrap max-w-xl text-pretty text-body text-muted-foreground lg:justify-self-end">
              이 페이지에서는 개인정보를 입력하거나 전송하지 않습니다. 참여
              방법과 일정은 담당자와 통화해 확인합니다.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {participationGuides.map((guide) => (
              <article
                key={guide.number}
                className="border-t-4 border-primary bg-surface shadow-card"
              >
                <div className="border-b border-border p-7 text-foreground sm:p-8">
                  <p className="text-small font-bold">
                    {guide.number} {guide.label}
                  </p>
                  <h3 className="text-safe-wrap mt-4 text-balance text-title font-bold">
                    {guide.title}
                  </h3>
                  <p className="text-safe-wrap mt-3 max-w-xl text-pretty text-body text-muted-foreground">
                    {guide.description}
                  </p>
                </div>

                <ol className="px-7 py-3 sm:px-8">
                  {guide.steps.map((step, index) => (
                    <li
                      key={step.title}
                      className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4 border-b border-border py-6 last:border-b-0"
                    >
                      <span
                        aria-hidden="true"
                        className="text-small font-bold text-accent"
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <p className="text-safe-wrap font-bold text-foreground">
                          {step.title}
                        </p>
                        <p className="text-safe-wrap mt-2 text-pretty text-small text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="contact-heading"
        className="bg-home-cream py-20 sm:py-24"
      >
        <div className="mx-auto grid w-full max-w-site overflow-hidden rounded-panel border border-border bg-home-ink lg:grid-cols-[1fr_0.8fr]">
          <div className="px-7 py-12 text-hero-on-dark sm:px-12 sm:py-16 lg:px-14">
            <p className="text-small font-bold text-home-sun">연락 안내</p>
            <h2
              id="contact-heading"
              className="text-safe-wrap mt-4 max-w-2xl text-balance text-display font-bold sm:text-display-lg"
            >
              대표 전화로 참여 방법을 확인하세요
            </h2>
            <p className="text-safe-wrap mt-5 max-w-xl text-pretty text-body text-hero-muted">
              통화가 연결되면 후원 또는 자원봉사 문의임을 먼저 말씀해 주세요.
            </p>
          </div>

          <div className="flex flex-col justify-between gap-8 border-t border-border bg-surface-subtle p-7 text-foreground sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
            <div>
              <p className="text-small font-bold">시설 대표 전화</p>
              <a
                href={`tel:${siteConfig.phone}`}
                className="text-safe-wrap mt-4 inline-block text-balance text-[clamp(2.1rem,4vw,3.5rem)] font-bold leading-tight tracking-[-0.04em] text-primary underline decoration-border-strong underline-offset-8 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
              >
                {siteConfig.phone}
              </a>
            </div>
            <div className="border-l-4 border-accent bg-surface p-5">
              <p className="text-safe-wrap font-bold">
                후원 정보는 한 번 더 확인해 주세요
              </p>
              <p className="text-safe-wrap mt-2 text-pretty text-small">
                계좌와 예금주 등은 담당자가 안내한 공식 정보와 일치하는지
                확인한 뒤 이용해 주세요.
              </p>
            </div>
          </div>
        </div>
      </section>

      <nav
        aria-labelledby="support-related-heading"
        className="bg-surface py-20 sm:py-24"
      >
        <div className="mx-auto w-full max-w-site px-page sm:px-page-wide">
          <p className="text-small font-bold text-primary">관련 정보</p>
          <h2
            id="support-related-heading"
            className="text-safe-wrap mt-3 text-balance text-display font-bold text-foreground sm:text-display-lg"
          >
            소식과 공개 자료를 함께 확인하세요
          </h2>

          <ul className="mt-10 grid overflow-hidden rounded-card border border-border bg-surface shadow-card sm:grid-cols-2">
            {relatedLinks.map((item, index) => (
              <li
                key={item.href}
                className={
                  index === 1
                    ? "border-t border-border sm:border-l sm:border-t-0"
                    : ""
                }
              >
                <Link
                  className="group flex min-h-48 flex-col justify-between gap-6 p-7 text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-focus-ring sm:p-8"
                  href={item.href}
                >
                  <span className="text-small font-bold text-primary">
                    {item.number}
                  </span>
                  <span>
                    <span className="text-safe-wrap block text-title font-bold">
                      {item.label}
                    </span>
                    <span className="text-safe-wrap mt-2 block text-body text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="self-end text-xl font-bold transition-transform duration-[var(--motion-duration-fast)] ease-standard group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
}
