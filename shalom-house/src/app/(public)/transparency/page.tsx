import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/layout/page-hero";

type TransparencyDocument = {
  title: string;
  category: string;
  period: string;
  publishedAt: string;
  publishedLabel: string;
  fileType: string;
  href: string;
};

const transparencyDocuments: ReadonlyArray<TransparencyDocument> = [];

const disclosureCategories = [
  {
    number: "01",
    title: "운영 보고",
    description: "시설 운영과 주요 사업을 이해할 수 있는 자료",
  },
  {
    number: "02",
    title: "예산·결산",
    description: "기준 기간과 승인 여부가 확인된 회계 자료",
  },
  {
    number: "03",
    title: "후원금",
    description: "후원금 사용과 관련해 공개가 가능한 자료",
  },
  {
    number: "04",
    title: "기타 공시",
    description: "관련 기준에 따라 공개가 필요한 안내 자료",
  },
] as const;

const publicationPrinciples = [
  {
    number: "01",
    title: "확인된 최종본",
    description: "담당자 확인과 공개 승인을 마친 자료를 게시합니다.",
  },
  {
    number: "02",
    title: "개인정보 보호",
    description: "개인정보와 공개가 제한된 내부 정보를 먼저 검수합니다.",
  },
  {
    number: "03",
    title: "읽기 쉬운 형식",
    description: "자료명, 기준 기간, 파일 형식을 분명하게 표시합니다.",
  },
] as const;

const relatedLinks = [
  {
    number: "01",
    title: "함께하기",
    description: "후원과 자원봉사 참여 방법을 확인합니다.",
    href: "/support",
  },
  {
    number: "02",
    title: "소식",
    description: "최근 공지사항과 활동 소식을 확인합니다.",
    href: "/news",
  },
] as const;

export const metadata: Metadata = {
  title: "정보공개",
  description:
    "샬롬의 집의 운영 보고, 예산·결산, 후원금 관련 공개 자료를 확인합니다.",
};

export default function TransparencyPage() {
  return (
    <>
      <PageHero
        eyebrow="정보공개"
        title="운영 자료를 찾기 쉬운 기준으로 공개합니다"
        description="운영 보고, 예산·결산, 후원금 관련 자료를 분류와 기준 기간에 맞춰 안내합니다. 담당자 확인과 개인정보 검토를 마친 최종 자료만 게시합니다."
        asideTitle="자료 안내 현황"
        items={[
          {
            label: "공개 범위",
            value: "운영 보고 · 예산과 결산 · 후원금 · 기타 공시",
          },
          {
            label: "표시 정보",
            value: "자료명 · 기준 기간 · 게시일 · 파일 형식",
          },
          {
            label: "현재 자료",
            value: `${transparencyDocuments.length}건`,
          },
        ]}
        primaryAction={{ label: "공개 자료 확인하기", href: "#public-documents" }}
        secondaryAction={{ label: "함께하기 안내", href: "/support" }}
      />

      <section
        id="public-documents"
        aria-labelledby="documents-heading"
        className="scroll-mt-28 bg-surface py-20 sm:py-24"
      >
        <div className="mx-auto w-full max-w-site px-page sm:px-page-wide">
          <div className="grid gap-7 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <div>
              <p className="text-small font-bold text-accent">공개 자료</p>
              <h2
                id="documents-heading"
                className="text-safe-wrap mt-3 max-w-3xl text-balance text-display font-bold text-foreground sm:text-display-lg"
              >
                필요한 운영 자료를 확인하세요
              </h2>
            </div>
            <p className="text-safe-wrap max-w-xl text-pretty text-body text-muted-foreground lg:justify-self-end">
              공개가 확정된 자료는 분류, 기준 기간, 게시일, 파일 형식을 함께
              표시합니다.
            </p>
          </div>

          {transparencyDocuments.length > 0 ? (
            <ul className="mt-12 overflow-hidden rounded-panel border border-border bg-surface shadow-card">
              {transparencyDocuments.map((document) => (
                <li
                  key={document.href}
                  className="border-b border-border last:border-b-0"
                >
                  <a
                    className="group grid min-h-11 gap-5 p-6 text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-home-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-8"
                    href={document.href}
                  >
                    <span className="min-w-0">
                      <span className="text-safe-wrap block text-small font-bold text-accent">
                        {document.category}
                      </span>
                      <span className="text-safe-wrap mt-2 block text-heading font-bold">
                        {document.title}
                      </span>
                      <span className="text-safe-wrap mt-3 block text-small text-muted-foreground">
                        {document.period} · 게시일{" "}
                        <time dateTime={document.publishedAt}>
                          {document.publishedLabel}
                        </time>
                      </span>
                    </span>
                    <span className="inline-flex min-h-11 items-center gap-3 font-bold text-primary">
                      {document.fileType} 파일
                      <span aria-hidden="true">↓</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-12 border-l-4 border-accent bg-home-cream p-7 shadow-card sm:p-10">
              <p className="text-small font-bold text-accent">
                등록된 자료 0건
              </p>
              <h3 className="text-safe-wrap mt-3 text-balance text-title font-bold text-foreground">
                현재 공개된 운영 자료가 없습니다
              </h3>
              <p className="text-safe-wrap mt-4 max-w-2xl text-pretty text-body text-muted-foreground">
                확인을 마친 자료가 게시되면 이 목록에서 바로 안내합니다.
              </p>
            </div>
          )}
        </div>
      </section>

      <section
        aria-labelledby="categories-heading"
        className="bg-home-cream py-20 sm:py-24"
      >
        <div className="mx-auto w-full max-w-site px-page sm:px-page-wide">
          <p className="text-small font-bold text-accent">자료 분류</p>
          <h2
            id="categories-heading"
            className="text-safe-wrap mt-3 max-w-3xl text-balance text-display font-bold text-foreground sm:text-display-lg"
          >
            다음과 같은 자료를 안내합니다
          </h2>

          <div className="mt-12 grid border-t-2 border-foreground sm:grid-cols-2 lg:grid-cols-4">
            {disclosureCategories.map((category) => (
              <article
                key={category.number}
                className="flex min-h-60 flex-col justify-between border-b border-border-strong py-7 text-foreground sm:px-7 sm:py-9 lg:border-r lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
              >
                <p className="text-small font-bold text-accent">
                  {category.number}
                </p>
                <div>
                  <h3 className="text-safe-wrap text-balance text-heading font-bold">
                    {category.title}
                  </h3>
                  <p className="text-safe-wrap mt-3 text-pretty text-small">
                    {category.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="principles-heading"
        className="bg-surface py-20 sm:py-24"
      >
        <div className="mx-auto grid w-full max-w-site overflow-hidden rounded-panel bg-home-ink text-hero-on-dark lg:grid-cols-[0.85fr_1.15fr]">
          <div className="p-7 sm:p-10 lg:p-12">
            <p className="text-small font-bold text-home-sun">게시 원칙</p>
            <h2
              id="principles-heading"
              className="text-safe-wrap mt-4 max-w-xl text-balance text-display font-bold sm:text-display-lg"
            >
              확인하기 쉬운 자료를 제공합니다
            </h2>
            <p className="text-safe-wrap mt-5 max-w-xl text-pretty text-body text-hero-muted">
              정확성과 개인정보 보호를 확인한 최종 자료만 공개합니다.
            </p>
          </div>

          <ol className="grid gap-px bg-hero-on-dark/15 sm:grid-cols-3 lg:grid-cols-1">
            {publicationPrinciples.map((principle) => (
              <li
                key={principle.number}
                className="grid gap-4 bg-home-ink p-7 sm:p-8 lg:grid-cols-[3rem_minmax(0,1fr)]"
              >
                <span className="text-small font-bold text-home-sun">
                  {principle.number}
                </span>
                <div>
                  <h3 className="text-safe-wrap text-heading font-bold">
                    {principle.title}
                  </h3>
                  <p className="text-safe-wrap mt-2 text-pretty text-small text-hero-muted">
                    {principle.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <nav
        aria-labelledby="related-heading"
        className="bg-home-cream py-20 sm:py-24"
      >
        <div className="mx-auto w-full max-w-site px-page sm:px-page-wide">
          <p className="text-small font-bold text-primary">관련 정보</p>
          <h2
            id="related-heading"
            className="text-safe-wrap mt-3 text-balance text-display font-bold text-foreground sm:text-display-lg"
          >
            참여 안내와 최근 소식을 확인하세요
          </h2>
          <ul className="mt-10 grid overflow-hidden rounded-panel border border-border bg-surface shadow-card sm:grid-cols-2 sm:divide-x sm:divide-border">
            {relatedLinks.map((link) => (
              <li key={link.href}>
                <Link
                  className="group flex min-h-52 flex-col justify-between gap-8 p-7 text-home-ink transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:p-8"
                  href={link.href}
                >
                  <span className="text-small font-bold text-primary">
                    {link.number}
                  </span>
                  <span>
                    <span className="text-safe-wrap block text-title font-bold">
                      {link.title}
                    </span>
                    <span className="text-safe-wrap mt-2 block text-body text-muted-foreground group-hover:text-home-ink">
                      {link.description}
                    </span>
                  </span>
                  <span aria-hidden="true" className="self-end font-bold">
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
