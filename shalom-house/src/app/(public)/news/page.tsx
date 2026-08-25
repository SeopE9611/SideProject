import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

const newsCategories = [
  {
    title: "공지사항",
    description:
      "시설이 공식적으로 안내할 필요가 있는 내용을 담당자 확인 후 게시합니다.",
  },
  {
    title: "활동 소식",
    description:
      "개인정보가 제거되고 공개가 승인된 활동 내용만 게시합니다.",
  },
] as const;

const newsPublicationPrinciples = [
  {
    title: "사실관계와 공개 권한 확인",
    description:
      "게시 전 내용의 정확성과 홈페이지에 공개할 권한이 있는지 확인합니다.",
  },
  {
    title: "개인정보와 민감정보 검수",
    description:
      "이름, 얼굴, 위치와 일정 등의 조합으로 개인을 알아볼 수 있는 정보가 없는지 확인합니다.",
  },
  {
    title: "이해하기 쉬운 정보 제공",
    description:
      "제목과 링크만으로도 내용을 예측할 수 있도록 쉬운 한국어와 명확한 구조를 사용합니다.",
  },
] as const;

export const metadata: Metadata = {
  title: "샬롬 소식",
  description:
    "샬롬의 집의 공지사항과 공개가 승인된 활동 소식 안내를 확인합니다.",
};

export default function NewsPage() {
  return (
    <>
      <section className="border-b border-border bg-surface-subtle">
        <div className="mx-auto w-full max-w-site px-page py-12 sm:px-page-wide sm:py-16">
          <div className="max-w-content">
            <p className="text-small font-bold text-primary">샬롬 소식</p>
            <h1 className="mt-5 text-display font-bold text-foreground sm:text-display-lg">
              공지사항과 활동 소식을 안내합니다
            </h1>
            <div className="mt-6 space-y-3 text-body text-muted-foreground">
              <p>
                {siteConfig.name}에서 공식적으로 공개하는 공지사항과 활동 소식을
                이 페이지에서 확인할 수 있습니다.
              </p>
              <p>현재는 공개가 승인된 게시물이 준비되지 않았습니다.</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="news-categories-heading" className="bg-surface">
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
          <div className="max-w-content">
            <p className="text-small font-bold text-primary">소식 분류</p>
            <h2
              id="news-categories-heading"
              className="mt-2 text-title font-bold text-foreground"
            >
              두 가지 소식으로 구분합니다
            </h2>
            <p className="mt-4 text-body text-muted-foreground">
              현재 분류는 게시물의 공개 범위를 설명하며 검색이나 필터 기능이
              아닙니다.
            </p>
          </div>
          <dl className="mt-10 grid border-y border-border md:grid-cols-2">
            {newsCategories.map((category) => (
              <div
                key={category.title}
                className="border-b border-border py-6 last:border-b-0 md:border-b-0 md:first:border-r md:first:pr-8 md:last:pl-8"
              >
                <dt className="text-heading font-bold text-foreground">
                  {category.title}
                </dt>
                <dd className="mt-3 text-body text-muted-foreground">
                  {category.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section
        aria-labelledby="news-list-heading"
        className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide"
      >
        <p className="text-small font-bold text-primary">최근 소식</p>
        <h2
          id="news-list-heading"
          className="mt-2 text-title font-bold text-foreground"
        >
          샬롬의 집 소식
        </h2>
        <p className="mt-4 max-w-2xl text-body text-muted-foreground">
          공개 승인을 마친 게시물이 등록되면 제목과 분류, 게시일을 중심으로
          안내합니다.
        </p>

        <div
          aria-labelledby="news-empty-heading"
          className="mt-10 border-y border-border-strong py-8 sm:py-10"
        >
          <p className="text-small font-bold text-primary">게시물 준비 중</p>
          <h3
            id="news-empty-heading"
            className="mt-2 text-heading font-bold text-foreground"
          >
            현재 공개된 게시물이 없습니다
          </h3>
          <p className="mt-4 max-w-2xl text-body text-muted-foreground">
            사실관계와 공개 범위 검토를 마친 게시물이 준비되면 이곳에서
            안내합니다.
          </p>
          <div className="mt-6 flex flex-col items-start gap-2 sm:flex-row sm:gap-6">
            <Link
              className="inline-flex min-h-11 items-center gap-2 py-2 text-base font-bold text-primary underline underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              href="/life"
            >
              함께하는 생활 보기
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              className="inline-flex min-h-11 items-center gap-2 py-2 text-base font-bold text-primary underline underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              href="/support"
            >
              후원과 봉사 안내
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="news-principles-heading"
        className="border-t border-border bg-primary-soft"
      >
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide lg:grid lg:grid-cols-5 lg:gap-16">
          <div className="lg:col-span-2">
            <p className="text-small font-bold text-primary">게시 원칙</p>
            <h2
              id="news-principles-heading"
              className="mt-2 max-w-3xl text-title font-bold text-foreground"
            >
              확인된 소식만 공개합니다
            </h2>
            <p className="mt-4 max-w-3xl text-body text-muted-foreground">
              게시 전 정확성, 공개 권한, 개인정보와 콘텐츠 접근성을 함께
              확인합니다.
            </p>
          </div>
          <ul className="mt-10 lg:col-span-3 lg:mt-0">
            {newsPublicationPrinciples.map((principle) => (
              <li
                key={principle.title}
                className="border-t border-border-strong py-6"
              >
                <h3 className="text-heading font-bold text-foreground">
                  {principle.title}
                </h3>
                <p className="mt-4 text-body text-muted-foreground">
                  {principle.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
