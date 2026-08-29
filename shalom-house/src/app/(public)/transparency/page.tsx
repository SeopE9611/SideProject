import type { Metadata } from "next";
import { SectionPageHeader } from "@/components/layout/section-page-header";

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

export const metadata: Metadata = {
  title: "자료공개",
  description:
    "샬롬의 집의 운영 보고, 예산·결산, 후원금 관련 공개 자료를 확인합니다.",
};

export default function TransparencyPage() {
  return (
    <>
      <SectionPageHeader
        sectionHref="/news"
        eyebrow="소식"
        title="자료공개"
        description="운영 보고, 예산·결산, 후원금 관련 자료를 분류와 기준 기간에 맞춰 안내합니다. 담당자 확인과 개인정보 검토를 마친 최종 자료만 게시합니다."
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "소식", href: "/news" },
          { label: "자료공개" },
        ]}
      />
      <section
        className="bg-surface py-12 sm:py-16"
        aria-labelledby="transparency-summary-heading"
      >
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <h2
            id="transparency-summary-heading"
            className="text-safe-wrap sr-only"
          >
            자료 현황
          </h2>
          <dl className="grid border-y border-border sm:grid-cols-3">
            {[
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
            ].map((item) => (
              <div
                key={item.label}
                className="border-b border-border py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-r-0"
              >
                <dt className="text-safe-wrap text-small font-bold text-primary">
                  {item.label}
                </dt>
                <dd className="mt-2 text-safe-wrap">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <section
        id="public-documents"
        aria-labelledby="documents-heading"
        className="bg-surface-subtle py-12 sm:py-16"
      >
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <p className="text-safe-wrap text-small font-bold text-accent">
            공개 자료
          </p>
          <h2
            id="documents-heading"
            className="text-safe-wrap mt-3 text-display font-bold"
          >
            필요한 운영 자료를 확인하세요
          </h2>
          {transparencyDocuments.length > 0 ? (
            <ul className="mt-8 border-t-2 border-foreground">
              {transparencyDocuments.map((document) => (
                <li key={document.href} className="border-b border-border py-5">
                  <a
                    className="text-safe-wrap font-bold text-primary underline"
                    href={document.href}
                  >
                    {document.title} · {document.fileType}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-8 border-y border-border py-6">
              <p className="text-safe-wrap text-small font-bold text-accent">
                등록된 자료 0건
              </p>
              <h3 className="text-safe-wrap mt-2 text-heading font-bold">
                현재 공개된 운영 자료가 없습니다.
              </h3>
              <p className="text-safe-wrap mt-3 text-muted-foreground">
                확인을 마친 자료가 게시되면 이 목록에서 안내합니다.
              </p>
            </div>
          )}
        </div>
      </section>
      <section
        aria-labelledby="categories-heading"
        className="bg-surface py-12 sm:py-16"
      >
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <p className="text-safe-wrap text-small font-bold text-accent">
            자료 분류
          </p>
          <h2
            id="categories-heading"
            className="text-safe-wrap mt-3 text-display font-bold"
          >
            다음과 같은 자료를 안내합니다
          </h2>
          <div className="mt-8 grid border-t-2 border-foreground sm:grid-cols-2 lg:grid-cols-4">
            {disclosureCategories.map((item) => (
              <article
                key={item.number}
                className="border-b border-border py-6 sm:px-5 sm:first:pl-0 sm:last:pr-0"
              >
                <p className="text-small font-bold text-accent">
                  {item.number}
                </p>
                <h3 className="text-safe-wrap mt-3 text-heading font-bold">
                  {item.title}
                </h3>
                <p className="text-safe-wrap mt-3 text-muted-foreground">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section
        aria-labelledby="principles-heading"
        className="bg-surface-subtle py-12 sm:py-16"
      >
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <p className="text-safe-wrap text-small font-bold text-primary">
            게시 원칙
          </p>
          <h2
            id="principles-heading"
            className="text-safe-wrap mt-3 text-display font-bold"
          >
            확인하기 쉬운 자료를 제공합니다
          </h2>
          <ol className="mt-8 border-t-4 border-primary">
            {publicationPrinciples.map((item) => (
              <li
                key={item.number}
                className="grid gap-3 border-b border-border py-5 sm:grid-cols-[3rem_0.8fr_1.2fr]"
              >
                <span className="text-small font-bold text-accent">
                  {item.number}
                </span>
                <h3 className="text-safe-wrap font-bold">{item.title}</h3>
                <p className="text-safe-wrap text-muted-foreground">
                  {item.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
