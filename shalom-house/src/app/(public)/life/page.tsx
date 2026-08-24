import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

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

const lifeRelatedDescriptions: Partial<
  Record<(typeof siteConfig.mainNavigation)[number]["href"], string>
> = {
  "/about": "시설 기본 정보와 공개 홈페이지 안내를 확인합니다.",
  "/news": "공개가 승인된 공지사항과 활동 소식을 확인합니다.",
  "/support": "후원과 자원봉사 참여 정보를 확인합니다.",
  "/transparency": "공개가 승인된 운영 자료를 확인합니다.",
} satisfies Partial<
  Record<(typeof siteConfig.mainNavigation)[number]["href"], string>
>;

export const metadata: Metadata = {
  title: "함께하는 생활",
  description:
    "샬롬의 집의 생활 및 프로그램 안내 준비 내용과 콘텐츠 공개 원칙을 확인합니다.",
};

export default function LifePage() {
  return (
    <>
      <section className="border-b border-border bg-primary-soft">
        <div className="mx-auto grid w-full max-w-site items-center gap-10 px-page py-16 sm:px-page-wide sm:py-20 lg:min-h-[32rem] lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <div>
            <p className="inline-flex rounded-full border border-border bg-surface px-4 py-2 text-small font-semibold text-primary">
              함께하는 생활
            </p>
            <h1 className="mt-6 max-w-3xl text-display font-bold text-foreground sm:text-display-lg">
              생활과 프로그램 정보를 준비하고 있습니다
            </h1>
            <div className="mt-6 max-w-2xl space-y-3 text-body text-muted-foreground">
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

          <aside
            aria-labelledby="life-scope-heading"
            className="rounded-card border border-border bg-surface p-6 shadow-card sm:p-8"
          >
            <p className="text-small font-bold text-primary">안내 예정 범위</p>
            <h2
              id="life-scope-heading"
              className="mt-2 text-heading font-bold text-foreground"
            >
              확인 후 제공할 정보
            </h2>
            <ul className="mt-6 space-y-4">
              {lifeInformationAreas.map((area) => (
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
        aria-labelledby="life-principles-heading"
        className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide"
      >
        <p className="text-small font-bold text-primary">콘텐츠 공개 원칙</p>
        <h2
          id="life-principles-heading"
          className="mt-2 max-w-3xl text-title font-bold text-foreground"
        >
          생활 이야기는 존중과 확인을 바탕으로 전합니다
        </h2>
        <p className="mt-4 max-w-3xl text-body text-muted-foreground">
          생활과 활동에 관한 정보는 공개 필요성, 사실관계, 개인정보와 동의
          여부를 확인한 뒤 안내합니다.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {lifeContentPrinciples.map((principle) => (
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
      </section>

      <section
        aria-labelledby="life-related-heading"
        className="border-t border-border bg-surface-subtle"
      >
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
          <p className="text-small font-bold text-primary">홈페이지 안내</p>
          <h2
            id="life-related-heading"
            className="mt-2 text-title font-bold text-foreground"
          >
            다른 정보도 함께 살펴보세요
          </h2>
          <p className="mt-4 max-w-2xl text-body text-muted-foreground">
            시설 기본 정보와 소식, 참여 방법, 공개 운영 자료를 메뉴별로 확인할
            수 있습니다.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {siteConfig.mainNavigation.map((item) => {
              const description = lifeRelatedDescriptions[item.href];

              if (!description) {
                return null;
              }

              const isSupport = item.href === "/support";

              return (
                <Link
                  key={item.href}
                  className={`group flex min-h-44 flex-col justify-between rounded-card border p-6 transition-colors duration-[var(--motion-duration-standard)] ease-standard focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring ${
                    isSupport
                      ? "border-primary bg-primary text-primary-foreground hover:border-primary-hover hover:bg-primary-hover"
                      : "border-border bg-surface text-foreground hover:border-primary hover:bg-primary-soft"
                  }`}
                  href={item.href}
                >
                  <div>
                    <h3
                      className={`text-heading font-bold ${
                        isSupport
                          ? "text-primary-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {item.label}
                    </h3>
                    <p
                      className={`mt-4 text-body ${
                        isSupport
                          ? "text-primary-foreground opacity-90"
                          : "text-muted-foreground"
                      }`}
                    >
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
        </div>
      </section>
    </>
  );
}
