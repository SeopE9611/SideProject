import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

type NavigationHref = (typeof siteConfig.mainNavigation)[number]["href"];

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

const transparencyMetadataGuidance = [
  {
    title: "자료 분류",
    description: "자료의 성격을 이해할 수 있는 분류를 표시합니다.",
  },
  {
    title: "자료명",
    description: "자료의 목적과 내용을 예측할 수 있는 제목을 표시합니다.",
  },
  {
    title: "기준 기간",
    description: "자료에 실제 적용 기간이 있을 때만 표시합니다.",
  },
  {
    title: "게시일",
    description:
      "실제 공개된 날짜를 기계 판독 가능한 형식과 함께 표시합니다.",
  },
  {
    title: "파일 정보",
    description:
      "첨부파일이 있을 때 실제 파일 형식과 용량을 표시합니다.",
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

const transparencyRelatedLinks = [
  {
    href: "/support",
    description: "후원과 자원봉사 안내 준비 내용과 공개 원칙",
  },
  {
    href: "/news",
    description: "공개가 승인된 공지사항과 활동 소식",
  },
] satisfies ReadonlyArray<{
  href: NavigationHref;
  description: string;
}>;

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
  title: "투명한 운영",
  description:
    "샬롬의 집의 운영 투명성 자료 공개 범위와 자료 게시 원칙을 확인합니다.",
};

export default function TransparencyPage() {
  return (
    <>
      <section className="border-b border-border bg-surface-subtle">
        <div className="mx-auto w-full max-w-site px-page py-12 sm:px-page-wide sm:py-16">
          <div className="max-w-content">
            <p className="text-small font-bold text-primary">투명한 운영</p>
            <h1 className="mt-5 text-display font-bold text-foreground sm:text-display-lg">
              공개 가능한 운영 자료를 준비하고 있습니다
            </h1>
            <div className="mt-6 space-y-3 text-body text-muted-foreground">
              <p>
                {siteConfig.name}의 운영 자료는 공개 승인과 개인정보·내부 정보
                검수를 마친 최종본만 안내합니다.
              </p>
              <p>
                현재는 공개 검토 중인 자료 범위와 향후 목록에서 제공할 정보,
                자료 게시 원칙을 확인할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="transparency-areas-heading"
        className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide"
      >
        <p className="text-small font-bold text-primary">자료 안내 범위</p>
        <h2
          id="transparency-areas-heading"
          className="mt-2 text-title font-bold text-foreground"
        >
          공개 여부를 확인하고 있는 자료
        </h2>
        <p className="mt-4 max-w-content text-body text-muted-foreground">
          아래 항목은 현재 게시된 자료 목록이 아니라 담당자 확인과 공개 범위
          검토가 필요한 정보입니다.
        </p>
        <dl className="mt-10 grid gap-x-10 md:grid-cols-2">
          {transparencyDocumentAreas.map((area) => (
            <div key={area.title} className="border-t border-border py-6">
              <dt className="font-bold text-foreground">{area.title}</dt>
              <dd className="mt-2 text-body text-muted-foreground">
                {area.description}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        aria-labelledby="transparency-list-heading"
        className="border-y border-border bg-surface"
      >
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
          <p className="text-small font-bold text-primary">공개 자료</p>
          <h2
            id="transparency-list-heading"
            className="mt-2 text-title font-bold text-foreground"
          >
            운영 투명성 자료
          </h2>
          <p className="mt-4 max-w-content text-body text-muted-foreground">
            공개 승인과 개인정보 검수를 마친 최종 자료가 등록되면 자료의
            목적과 기준 정보를 함께 안내합니다.
          </p>

          <div className="mt-12 max-w-content">
            <h3 className="text-heading font-bold text-foreground">
              자료 목록에서 제공할 정보
            </h3>
            <dl className="mt-6 border-y border-border">
              {transparencyMetadataGuidance.map((item) => (
                <div
                  key={item.title}
                  className="border-b border-border py-5 last:border-b-0 sm:grid sm:grid-cols-3 sm:gap-6"
                >
                  <dt className="font-bold text-foreground">{item.title}</dt>
                  <dd className="mt-2 text-body text-muted-foreground sm:col-span-2 sm:mt-0">
                    {item.description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-12 max-w-content border-y border-border-strong py-8">
            <p className="text-small font-bold text-primary">자료 준비 중</p>
            <h3 className="mt-2 text-heading font-bold text-foreground">
              현재 공개된 운영 자료가 없습니다
            </h3>
            <p className="mt-4 text-body text-muted-foreground">
              담당자 확인과 공개 승인을 마친 최종 자료가 준비되면 이 목록에서
              안내합니다.
            </p>
            <nav
              aria-label="운영자료가 없을 때 관련 정보"
              className="mt-6 flex flex-col items-start gap-2 sm:flex-row sm:gap-6"
            >
              <Link
                className="inline-flex min-h-11 items-center gap-2 py-2 font-bold text-primary underline underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                href="/support"
              >
                후원과 봉사 안내
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                className="inline-flex min-h-11 items-center gap-2 py-2 font-bold text-primary underline underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                href="/news"
              >
                샬롬 소식 보기
                <span aria-hidden="true">→</span>
              </Link>
            </nav>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="transparency-principles-heading"
        className="border-b border-border bg-primary-soft"
      >
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide lg:grid lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-small font-bold text-primary">
              자료 게시 원칙
            </p>
            <h2
              id="transparency-principles-heading"
              className="mt-2 text-title font-bold text-foreground"
            >
              확인된 최종 자료만 공개합니다
            </h2>
            <p className="mt-4 text-body text-muted-foreground">
              자료의 정확성, 공개 승인, 개인정보와 내부 정보 포함 여부, 접근
              가능한 제공 형식을 함께 확인합니다.
            </p>
          </div>
          <ul className="mt-10 lg:mt-0">
            {transparencyPublicationPrinciples.map((principle) => (
              <li
                key={principle.title}
                className="border-t border-border-strong py-6"
              >
                <h3 className="text-heading font-bold text-foreground">
                  {principle.title}
                </h3>
                <p className="mt-3 text-body text-muted-foreground">
                  {principle.description}
                </p>
              </li>
            ))}
          </ul>
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
        <p className="mt-4 max-w-content text-body text-muted-foreground">
          후원과 자원봉사 안내 준비 내용 및 공개가 승인된 소식은 각 페이지에서
          확인할 수 있습니다.
        </p>
        <ul className="mt-8 max-w-content divide-y divide-border border-y border-border">
          {transparencyRelatedLinks.map((link) => (
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
      </section>
    </>
  );
}
