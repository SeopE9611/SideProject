import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

type NavigationHref = (typeof siteConfig.mainNavigation)[number]["href"];

const lifeInformationAreas = [
  {
    title: "생활 안내",
    description:
      "공개할 수 있는 생활 관련 정보의 범위를 확인한 뒤 안내합니다.",
  },
  {
    title: "주요 프로그램",
    description:
      "프로그램의 공식 명칭과 설명을 담당자 확인 후 안내합니다.",
  },
  {
    title: "활동 이야기",
    description:
      "개인정보가 제거되고 공개가 승인된 활동 소식만 안내합니다.",
  },
  {
    title: "시설 이용 관련 안내",
    description: "공개 여부와 범위를 협의한 정보만 안내합니다.",
  },
] as const;

const lifeContentPrinciples = [
  {
    title: "존엄과 사생활 보호",
    description:
      "거주인을 홍보 수단으로 다루지 않고 존엄과 사생활 보호를 우선합니다.",
  },
  {
    title: "확인된 정보 공개",
    description:
      "생활과 프로그램 정보는 사실관계와 공개 권한을 확인한 뒤 안내합니다.",
  },
  {
    title: "동의와 검수",
    description:
      "사진·영상·음성은 촬영 및 공개 동의와 배경 개인정보를 확인한 자료만 사용합니다.",
  },
] as const;

const lifeRelatedLinks = [
  { href: "/news", description: "공지사항과 공개가 승인된 활동 소식" },
  { href: "/support", description: "후원과 자원봉사 안내" },
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
  title: "함께하는 생활",
  description:
    "샬롬의 집의 생활 및 프로그램 안내 준비 내용과 콘텐츠 공개 원칙을 확인합니다.",
};

export default function LifePage() {
  return (
    <>
      <section className="border-b border-border bg-primary-soft">
        <div className="mx-auto w-full max-w-site px-page py-16 sm:px-page-wide sm:py-20">
          <div className="max-w-content">
            <p className="text-small font-bold text-primary">함께하는 생활</p>
            <h1 className="mt-5 text-display font-bold text-foreground sm:text-display-lg">
              생활과 프로그램 정보를 준비하고 있습니다
            </h1>
            <div className="mt-6 space-y-3 text-body text-muted-foreground">
              <p>
                {siteConfig.name}의 생활과 프로그램 관련 정보는 담당자 확인과
                공개 범위 검토를 거쳐 순차적으로 안내합니다.
              </p>
              <p>
                현재는 앞으로 제공할 정보의 범위와 콘텐츠 공개 원칙을 먼저
                확인할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="life-scope-heading"
        className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide"
      >
        <p className="text-small font-bold text-primary">안내 예정 범위</p>
        <h2
          id="life-scope-heading"
          className="mt-2 text-title font-bold text-foreground"
        >
          확인 후 제공할 정보
        </h2>
        <p className="mt-4 max-w-content text-body text-muted-foreground">
          다음 항목은 현재 제공 중인 프로그램 목록이 아니라 공개 범위를 검토하고
          있는 정보입니다.
        </p>
        <ol className="mt-10 grid gap-x-10 md:grid-cols-2">
          {lifeInformationAreas.map((area, index) => (
            <li
              key={area.title}
              className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 border-t border-border-strong py-7"
            >
              <span className="text-small font-bold text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-heading font-bold text-foreground">
                  {area.title}
                </h3>
                <p className="mt-3 text-body text-muted-foreground">
                  {area.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="life-principles-heading"
        className="bg-surface-subtle"
      >
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
          <p className="text-small font-bold text-primary">콘텐츠 공개 원칙</p>
          <h2
            id="life-principles-heading"
            className="mt-2 max-w-3xl text-title font-bold text-foreground"
          >
            생활 이야기는 존중과 확인을 바탕으로 전합니다
          </h2>
          <p className="mt-4 max-w-content text-body text-muted-foreground">
            생활과 활동에 관한 정보는 공개 필요성, 사실관계, 개인정보와 동의
            여부를 확인한 뒤 안내합니다.
          </p>
          <ul className="mt-10 grid gap-x-8 md:grid-cols-3">
            {lifeContentPrinciples.map((principle) => (
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

      <section
        aria-labelledby="life-related-heading"
        className="border-t border-border bg-surface"
      >
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <h2
              id="life-related-heading"
              className="text-title font-bold text-foreground"
            >
              소식과 참여 안내를 확인하세요
            </h2>
            <p className="mt-4 text-body text-muted-foreground">
              공개가 승인된 소식과 후원·자원봉사 안내 경로를 확인할 수
              있습니다.
            </p>
          </div>
          <ul className="mt-8 divide-y divide-border border-y border-border lg:mt-0">
            {lifeRelatedLinks.map((link) => (
              <li key={link.href}>
                <Link
                  className="group flex min-h-11 items-center justify-between gap-5 py-5 text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                  href={link.href}
                >
                  <span>
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
