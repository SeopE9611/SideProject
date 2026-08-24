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
        <div className="mx-auto grid w-full max-w-site items-center gap-10 px-page py-16 sm:px-page-wide sm:py-20 lg:min-h-[32rem] lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <div>
            <p className="inline-flex rounded-full border border-border bg-surface px-4 py-2 text-small font-semibold text-primary">
              샬롬 소식
            </p>
            <h1 className="mt-6 max-w-3xl text-display font-bold text-foreground sm:text-display-lg">
              공지사항과 활동 소식을 준비하고 있습니다
            </h1>
            <div className="mt-6 max-w-2xl space-y-3 text-body text-muted-foreground">
              <p>
                {siteConfig.name}의 공지사항과 활동 소식은 사실관계와 공개 범위를
                확인한 뒤 안내합니다.
              </p>
              <p>
                공개가 승인된 게시물이 준비되면 이 페이지에서 확인할 수
                있습니다.
              </p>
            </div>
          </div>

          <aside
            aria-labelledby="news-categories-heading"
            className="rounded-card border border-border bg-surface p-6 shadow-card sm:p-8"
          >
            <p className="text-small font-bold text-primary">소식 분류</p>
            <h2
              id="news-categories-heading"
              className="mt-2 text-heading font-bold text-foreground"
            >
              두 가지 소식으로 안내합니다
            </h2>
            <ul className="mt-6 space-y-4">
              {newsCategories.map((category) => (
                <li
                  key={category.title}
                  className="rounded-control border border-border bg-surface-subtle p-4"
                >
                  <p className="font-bold text-foreground">{category.title}</p>
                  <p className="mt-1 text-small text-muted-foreground">
                    {category.description}
                  </p>
                </li>
              ))}
            </ul>
          </aside>
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
          공개가 승인된 공지사항과 활동 소식을 이곳에서 안내할 예정입니다.
        </p>

        <div
          aria-labelledby="news-empty-heading"
          className="mt-10 rounded-card border border-border-strong bg-surface px-6 py-12 text-center shadow-card sm:px-10 sm:py-16"
        >
          <p className="text-small font-bold text-primary">게시물 준비 중</p>
          <h3
            id="news-empty-heading"
            className="mt-2 text-heading font-bold text-foreground"
          >
            현재 공개된 게시물이 없습니다
          </h3>
          <p className="mx-auto mt-4 max-w-2xl text-body text-muted-foreground">
            게시물 관리 기능과 공개 승인된 콘텐츠가 준비되면 공지사항과 활동
            소식을 확인할 수 있습니다.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-control border border-primary bg-primary px-5 py-3 text-base font-bold text-primary-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:border-primary-hover hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              href="/life"
            >
              함께하는 생활 보기
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-control border border-border-strong bg-surface px-5 py-3 text-base font-bold text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:border-primary hover:bg-primary-soft hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              href="/support"
            >
              후원과 봉사 안내
            </Link>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="news-principles-heading"
        className="border-t border-border bg-primary-soft"
      >
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
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
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {newsPublicationPrinciples.map((principle) => (
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
    </>
  );
}
