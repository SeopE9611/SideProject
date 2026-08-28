import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

type NavigationHref = (typeof siteConfig.mainNavigation)[number]["href"];

const dailyRhythms = [
  { number: "01", label: "식사를 나누는 시간" },
  { number: "02", label: "서로의 안부를 묻는 시간" },
  { number: "03", label: "바깥세상을 경험하는 시간" },
  { number: "04", label: "각자의 속도로 쉬는 시간" },
] as const;

const activityStories = [
  {
    number: "01",
    title: "평일 점심 식사 도움",
    lead: "식탁에서 만나는 이웃",
    description:
      "평일 점심 식사를 준비하고 나누는 일상에 지역사회가 함께할 수 있도록 자원봉사자 모집을 진행해 왔습니다.",
  },
  {
    number: "02",
    title: "나들이 지원",
    lead: "생활의 반경을 넓히는 하루",
    description:
      "익숙한 공간을 벗어나 계절과 지역사회의 다양한 모습을 경험할 수 있도록 나들이를 지원해 왔습니다.",
  },
  {
    number: "03",
    title: "공간복지 드림하우스",
    lead: "안전하고 편안한 생활 공간",
    description:
      "생활 공간을 더 안전하고 편안하게 가꾸는 공간복지 지원을 통해 일상의 환경을 함께 살펴 왔습니다.",
  },
] as const;

const lifeContentPrinciples = [
  {
    number: "01",
    title: "존엄을 먼저 봅니다",
    description:
      "거주인을 활동의 홍보 수단으로 다루지 않고, 한 사람의 생활과 선택을 존중합니다.",
  },
  {
    number: "02",
    title: "동의를 확인합니다",
    description:
      "사진·영상·음성은 촬영과 공개 동의, 배경의 개인정보를 확인한 자료만 사용합니다.",
  },
  {
    number: "03",
    title: "사실만 전합니다",
    description:
      "활동의 명칭과 내용, 현재 운영 여부는 담당자 확인과 공개 범위 검토를 거쳐 안내합니다.",
  },
] as const;

const lifeRelatedLinks = [
  {
    href: "/news",
    description: "공개가 승인된 최근 활동과 공지사항을 확인합니다.",
  },
  {
    href: "/support",
    description: "확인된 후원과 자원봉사 참여 방법을 살펴봅니다.",
  },
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
  title: "생활과 활동",
  description:
    "샬롬의 집에서 함께 이어 가는 일상과 지역사회가 함께해 온 활동 사례를 소개합니다.",
};

export default function LifePage() {
  return (
    <>
      <section className="border-b border-border bg-accent-soft">
        <div className="mx-auto grid w-full max-w-site gap-12 px-page py-section sm:px-page-wide sm:py-section-wide lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] lg:items-center lg:gap-20">
          <div>
            <p className="text-small font-bold text-accent">생활과 활동</p>
            <h1 className="mt-5 max-w-3xl text-hero font-bold text-foreground sm:text-hero-lg">
              함께해서 더 넓어지는,
              <span className="block text-accent">평범한 하루</span>
            </h1>
            <p className="mt-8 max-w-content text-body text-muted-foreground">
              {siteConfig.name}의 생활은 특별한 행사만으로 만들어지지 않습니다.
              식사를 나누고 안부를 묻고, 바깥세상을 경험하고 편안히 쉬는 매일의
              시간이 모여 한 사람의 삶을 이룹니다.
            </p>
          </div>

          <div className="overflow-hidden rounded-panel bg-hero-clay text-hero-on-dark shadow-elevated">
            <p className="px-7 pt-7 text-small font-bold text-sun-soft sm:px-9 sm:pt-9">
              일상을 이루는 네 가지 시간
            </p>
            <ul
              aria-label="샬롬의 집 일상을 이루는 시간"
              className="mt-5 px-7 pb-7 sm:px-9 sm:pb-9"
            >
              {dailyRhythms.map((rhythm) => (
                <li
                  key={rhythm.number}
                  className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-hero-on-dark/30 py-5"
                >
                  <span className="text-small font-bold text-sun-soft">
                    {rhythm.number}
                  </span>
                  <span className="text-lg font-bold text-hero-on-dark">
                    {rhythm.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="life-daily-heading" className="bg-background">
        <div className="mx-auto grid w-full max-w-site gap-10 px-page py-section sm:px-page-wide sm:py-section-wide lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
          <div>
            <p className="text-small font-bold text-primary">생활의 중심</p>
            <h2
              id="life-daily-heading"
              className="mt-4 max-w-xl text-display font-bold text-foreground sm:text-display-lg"
            >
              특별한 하루보다,
              <span className="block text-primary">계속되는 하루를 지킵니다</span>
            </h2>
          </div>

          <div className="max-w-content space-y-6 text-body text-muted-foreground lg:pt-3">
            <p className="text-xl font-semibold leading-9 text-foreground sm:text-2xl sm:leading-10">
              도움을 받는 사람과 주는 사람으로 나누기보다, 서로의 일상에 곁을
              내어 주는 관계를 중요하게 생각합니다.
            </p>
            <p>
              같은 공간에서 생활해도 사람마다 좋아하는 것과 편안한 속도는
              다릅니다. 필요한 도움을 주고받되 각자의 선택을 존중하고, 익숙한
              일상이 안정적으로 이어지도록 함께합니다.
            </p>
            <p>
              지역사회와 만나는 활동도 생활에서 출발합니다. 식탁을 함께
              준비하고, 새로운 장소를 경험하고, 머무는 공간을 편안하게 가꾸는
              일이 샬롬의 집과 이웃을 연결합니다.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="life-activities-heading"
        className="border-y border-border bg-surface"
      >
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:items-end lg:gap-16">
            <div>
              <p className="text-small font-bold text-accent">
                함께해 온 활동 사례
              </p>
              <h2
                id="life-activities-heading"
                className="mt-4 text-display font-bold text-foreground sm:text-display-lg"
              >
                일상에서 시작해 이웃과 이어집니다
              </h2>
            </div>
            <p className="max-w-content text-body text-muted-foreground lg:justify-self-end">
              아래 내용은 샬롬의 집이 지역사회와 함께해 온 활동 사례입니다.
              현재 운영 여부와 일정, 참여 방법은 확인된 내용만 별도로
              안내합니다.
            </p>
          </div>

          <ol className="mt-12 border-t border-border-strong">
            {activityStories.map((activity) => (
              <li
                key={activity.number}
                className="grid gap-5 border-b border-border py-8 md:grid-cols-[4rem_minmax(12rem,0.75fr)_minmax(0,1.25fr)] md:gap-8 md:py-10"
              >
                <p className="text-small font-bold text-accent">
                  {activity.number}
                </p>
                <div>
                  <p className="text-small font-bold text-muted-foreground">
                    {activity.lead}
                  </p>
                  <h3 className="mt-2 text-heading font-bold text-foreground">
                    {activity.title}
                  </h3>
                </div>
                <p className="max-w-content text-body text-muted-foreground md:pt-1">
                  {activity.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        aria-labelledby="life-principles-heading"
        className="bg-primary-soft"
      >
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
            <div>
              <p className="text-small font-bold text-primary">
                생활 이야기를 전하는 방법
              </p>
              <h2
                id="life-principles-heading"
                className="mt-4 max-w-xl text-title font-bold text-foreground"
              >
                보여 주는 것보다 먼저 지켜야 할 것이 있습니다
              </h2>
            </div>

            <ul className="border-t border-border-strong">
              {lifeContentPrinciples.map((principle) => (
                <li
                  key={principle.number}
                  className="grid gap-3 border-b border-border py-6 sm:grid-cols-[3rem_minmax(11rem,0.7fr)_minmax(0,1.3fr)] sm:gap-6"
                >
                  <p className="text-small font-bold text-primary">
                    {principle.number}
                  </p>
                  <h3 className="text-lg font-bold text-foreground">
                    {principle.title}
                  </h3>
                  <p className="text-body text-muted-foreground">
                    {principle.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="life-related-heading"
        className="bg-background"
      >
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)] lg:gap-16">
            <div>
              <p className="text-small font-bold text-primary">다음으로</p>
              <h2
                id="life-related-heading"
                className="mt-4 text-title font-bold text-foreground"
              >
                오늘의 소식과 참여 방법을 확인하세요
              </h2>
            </div>

            <ul className="divide-y divide-border border-y border-border-strong">
              {lifeRelatedLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    className="group flex min-h-11 items-center justify-between gap-5 py-6 text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                    href={link.href}
                  >
                    <span>
                      <span className="block text-heading font-bold">
                        {getNavigationLabel(link.href)}
                      </span>
                      <span className="mt-2 block text-small text-muted-foreground group-hover:text-primary">
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
        </div>
      </section>
    </>
  );
}
