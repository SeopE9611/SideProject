import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

const participationGuides = [
  {
    label: "후원 문의",
    title: "후원 방법을 확인하기 전",
    description:
      "후원 방식과 공식 정보를 안전하게 확인할 수 있도록 문의할 내용을 먼저 정리해 주세요.",
    steps: [
      {
        title: "궁금한 후원 방식 정리",
        description:
          "정기 후원, 일시 후원, 물품 후원 중 어떤 방식이 가능한지 궁금한 항목을 정리합니다.",
      },
      {
        title: "시설 대표 전화로 문의",
        description:
          "통화가 연결되면 후원 문의임을 먼저 알리고 공식 안내가 가능한 내용을 확인합니다.",
      },
      {
        title: "공식 정보 재확인",
        description:
          "계좌, 예금주, 사용 목적 등은 담당자가 확인한 안내와 일치하는지 확인한 뒤 진행합니다.",
      },
    ],
  },
  {
    label: "자원봉사 문의",
    title: "참여 가능 여부를 확인하기 전",
    description:
      "서로의 일정과 활동 조건을 확인할 수 있도록 가능한 시간과 관심 활동을 미리 정리해 주세요.",
    steps: [
      {
        title: "가능한 일정 정리",
        description:
          "참여할 수 있는 요일과 시간대, 관심 있는 활동을 간단히 정리합니다.",
      },
      {
        title: "시설 대표 전화로 문의",
        description:
          "통화가 연결되면 자원봉사 문의임을 먼저 알리고 담당자 안내를 요청합니다.",
      },
      {
        title: "일정과 준비 사항 확인",
        description:
          "활동 가능 여부, 일정과 준비 사항은 담당자와 협의한 내용을 기준으로 확정합니다.",
      },
    ],
  },
] as const;

const relatedDescriptions: Partial<
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
    "샬롬의 집 후원과 자원봉사 문의 전 확인할 내용과 시설 대표 전화를 안내합니다.",
};

export default function SupportPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-page py-10 sm:px-page-wide sm:py-14">
      <nav aria-label="현재 위치" className="text-small text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              홈
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="font-bold text-foreground">
            후원과 봉사
          </li>
        </ol>
      </nav>

      <header className="mt-8 border-b border-border pb-10 sm:pb-12">
        <p className="text-small font-bold text-primary">함께 만드는 일상</p>
        <h1 className="mt-3 text-display font-bold text-foreground sm:text-display-lg">
          후원과 봉사로 함께해 주세요
        </h1>
        <p className="mt-5 max-w-content text-body text-muted-foreground">
          보내 주시는 관심은 거주인의 편안한 일상과 다양한 활동을 이어 가는
          힘이 됩니다. 이 페이지에서는 개인정보를 입력하거나 전송하지
          않으며, 문의에 필요한 내용을 정리한 뒤 시설 대표 전화로 확인할 수
          있습니다.
        </p>
      </header>

      <section
        aria-labelledby="participation-heading"
        className="py-section sm:py-section-wide"
      >
        <p className="text-small font-bold text-primary">문의 전 확인</p>
        <h2 id="participation-heading" className="mt-2 text-title font-bold">
          필요한 내용을 순서대로 확인해 주세요
        </h2>
        <p className="mt-4 max-w-content text-body text-muted-foreground">
          후원과 자원봉사는 서로 다른 흐름으로 안내합니다. 실제 참여 방법과
          일정은 담당자와 확인한 내용을 기준으로 합니다.
        </p>

        <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-8">
          {participationGuides.map((guide) => (
            <article
              key={guide.label}
              className="border-t border-border-strong pt-6"
            >
              <p className="text-small font-bold text-primary">{guide.label}</p>
              <h3 className="mt-2 text-heading font-bold text-foreground">
                {guide.title}
              </h3>
              <p className="mt-3 text-body text-muted-foreground">
                {guide.description}
              </p>

              <ol className="mt-6 divide-y divide-border border-y border-border">
                {guide.steps.map((step, index) => (
                  <li
                    key={step.title}
                    className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 py-5"
                  >
                    <span
                      aria-hidden="true"
                      className="text-small font-bold text-primary"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="font-bold text-foreground">{step.title}</p>
                      <p className="mt-2 text-small text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="contact-heading"
        className="border-t border-border py-section sm:py-section-wide"
      >
        <p className="text-small font-bold text-primary">연락 안내</p>
        <h2 id="contact-heading" className="mt-2 text-title font-bold">
          시설 대표 전화로 문의해 주세요
        </h2>
        <p className="mt-4 max-w-content text-body text-muted-foreground">
          아래 번호는 후원·자원봉사 전용 접수 번호가 아닌 시설 대표
          전화입니다. 통화가 연결되면 문의 목적을 먼저 말씀해 주세요.
        </p>
        <p className="mt-6">
          <a
            href={`tel:${siteConfig.phone}`}
            className="inline-flex min-h-11 items-center text-heading font-bold text-primary underline decoration-2 underline-offset-4 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
          >
            {siteConfig.phone}에 전화하기
          </a>
        </p>

        <aside
          aria-labelledby="safe-support-heading"
          className="mt-8 border-l-4 border-primary bg-primary-soft px-5 py-4 sm:px-6"
        >
          <h3 id="safe-support-heading" className="font-bold text-foreground">
            후원 정보는 한 번 더 확인해 주세요
          </h3>
          <p className="mt-2 text-small text-muted-foreground">
            계좌와 예금주 등 후원 정보는 담당자가 확인한 공식 안내와
            일치하는지 확인한 뒤 이용해 주세요.
          </p>
        </aside>
      </section>

      <section
        aria-labelledby="related-heading"
        className="border-t border-border py-section sm:py-section-wide"
      >
        <p className="text-small font-bold text-primary">관련 정보</p>
        <h2 id="related-heading" className="mt-2 text-title font-bold">
          소식과 공개 자료를 함께 확인하세요
        </h2>
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {siteConfig.mainNavigation.map((item) => {
            const description = relatedDescriptions[item.href];

            if (!description) {
              return null;
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex min-h-24 items-center justify-between gap-6 py-5 text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
                >
                  <span>
                    <span className="block font-bold underline decoration-1 underline-offset-4 group-hover:text-primary">
                      {item.label}
                    </span>
                    <span className="mt-2 block text-small text-muted-foreground">
                      {description}
                    </span>
                  </span>
                  <span aria-hidden="true" className="font-bold text-primary">
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
