import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

const transparencyDocumentAreas = [
  {
    title: "운영 보고",
    description:
      "공개 가능한 운영 내용을 확인하고 승인된 최종 자료만 안내합니다.",
  },
  {
    title: "후원금 관련 공개자료",
    description:
      "개인정보와 내부 정보가 제거되고 공개가 승인된 자료만 안내합니다.",
  },
  {
    title: "예산·결산 공개자료",
    description:
      "공개 범위와 최종 승인 여부를 확인한 자료만 안내합니다.",
  },
  {
    title: "기타 공시자료",
    description: "공개 필요성과 제공 형식을 검토한 자료만 안내합니다.",
  },
] as const;

const transparencyPublicationPrinciples = [
  {
    title: "승인된 최종본",
    description: "담당자 확인과 공개 승인을 마친 최종 자료만 게시합니다.",
  },
  {
    title: "개인정보와 내부 정보 검수",
    description:
      "개인정보와 공개가 제한된 내부 정보가 제거됐는지 확인합니다.",
  },
  {
    title: "이해하기 쉬운 자료 제공",
    description:
      "문서 제목과 기준 기간을 명확히 표시하고 읽을 수 있는 형식을 우선 검토합니다.",
  },
] as const;

const transparencyRelatedDescriptions: Partial<
  Record<(typeof siteConfig.mainNavigation)[number]["href"], string>
> = {
  "/support": "후원과 자원봉사 안내 준비 내용과 공개 원칙을 확인합니다.",
  "/news": "공개가 승인된 공지사항과 활동 소식을 확인합니다.",
} satisfies Partial<
  Record<(typeof siteConfig.mainNavigation)[number]["href"], string>
>;

export const metadata: Metadata = {
  title: "투명한 운영",
  description:
    "샬롬의 집의 운영 투명성 자료 공개 범위와 자료 게시 원칙을 확인합니다.",
};

export default function TransparencyPage() {
  return (
    <>
      <section className="border-b border-border bg-surface-subtle">
        <div className="mx-auto grid w-full max-w-site items-center gap-10 px-page py-16 sm:px-page-wide sm:py-20 lg:min-h-[32rem] lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <div>
            <p className="inline-flex rounded-full border border-border bg-surface px-4 py-2 text-small font-semibold text-primary">
              투명한 운영
            </p>
            <h1 className="mt-6 max-w-3xl text-display font-bold text-foreground sm:text-display-lg">
              공개 가능한 운영 자료를 준비하고 있습니다
            </h1>
            <div className="mt-6 max-w-2xl space-y-3 text-body text-muted-foreground">
              <p>
                {siteConfig.name}의 운영 자료는 공개 승인과 개인정보·내부정보
                검수를 마친 최종본만 안내합니다.
              </p>
              <p>
                현재는 앞으로 제공할 자료 범위와 게시 원칙을 확인할 수
                있습니다.
              </p>
            </div>
          </div>

          <aside
            aria-labelledby="transparency-areas-heading"
            className="rounded-card border border-border bg-surface p-6 shadow-card sm:p-8"
          >
            <p className="text-small font-bold text-primary">자료 안내 범위</p>
            <h2
              id="transparency-areas-heading"
              className="mt-2 text-heading font-bold text-foreground"
            >
              확인 후 제공할 운영 자료
            </h2>
            <ul className="mt-6 space-y-4">
              {transparencyDocumentAreas.map((area) => (
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
        aria-labelledby="transparency-list-heading"
        className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide"
      >
        <p className="text-small font-bold text-primary">공개 자료</p>
        <h2
          id="transparency-list-heading"
          className="mt-2 text-title font-bold text-foreground"
        >
          운영 투명성 자료
        </h2>
        <p className="mt-4 max-w-2xl text-body text-muted-foreground">
          공개 승인과 개인정보 검수를 마친 최종 자료를 이곳에서 안내할
          예정입니다.
        </p>

        <div
          aria-labelledby="transparency-empty-heading"
          className="mt-10 rounded-card border border-border-strong bg-surface px-6 py-12 text-center shadow-card sm:px-10 sm:py-16"
        >
          <p className="text-small font-bold text-primary">자료 준비 중</p>
          <h3
            id="transparency-empty-heading"
            className="mt-2 text-heading font-bold text-foreground"
          >
            현재 공개된 운영 자료가 없습니다
          </h3>
          <p className="mx-auto mt-4 max-w-2xl text-body text-muted-foreground">
            담당자 확인과 공개 승인을 마친 최종 자료가 준비되면 이 페이지에서
            확인할 수 있습니다.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-control border border-primary bg-primary px-5 py-3 text-base font-bold text-primary-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:border-primary-hover hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              href="/support"
            >
              후원과 봉사 안내
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-control border border-border-strong bg-surface px-5 py-3 text-base font-bold text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:border-primary hover:bg-primary-soft hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              href="/news"
            >
              샬롬 소식 보기
            </Link>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="transparency-principles-heading"
        className="border-y border-border bg-primary-soft"
      >
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
          <p className="text-small font-bold text-primary">자료 게시 원칙</p>
          <h2
            id="transparency-principles-heading"
            className="mt-2 max-w-3xl text-title font-bold text-foreground"
          >
            확인된 최종 자료만 공개합니다
          </h2>
          <p className="mt-4 max-w-3xl text-body text-muted-foreground">
            자료의 정확성, 공개 승인, 개인정보와 내부 정보 포함 여부, 접근
            가능한 제공 형식을 함께 확인합니다.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {transparencyPublicationPrinciples.map((principle) => (
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
        aria-labelledby="transparency-related-heading"
        className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide"
      >
        <p className="text-small font-bold text-primary">관련 정보</p>
        <h2
          id="transparency-related-heading"
          className="mt-2 text-title font-bold text-foreground"
        >
          참여 안내와 소식을 함께 확인하세요
        </h2>
        <p className="mt-4 max-w-2xl text-body text-muted-foreground">
          후원과 자원봉사 안내 준비 내용 및 공개가 승인된 소식을 각 페이지에서
          확인할 수 있습니다.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {siteConfig.mainNavigation.map((item) => {
            const description =
              transparencyRelatedDescriptions[item.href];

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
