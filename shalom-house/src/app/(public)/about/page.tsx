import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

type NavigationHref = (typeof siteConfig.mainNavigation)[number]["href"];

const aboutRelatedLinks = [
  { href: "/life", description: "함께 만드는 일상과 활동을 살펴봅니다." },
  {
    href: "/transparency",
    description: "공개가 승인된 운영 자료를 확인합니다.",
  },
] satisfies ReadonlyArray<{ href: NavigationHref; description: string }>;

const everydayScenes = [
  {
    number: "01",
    title: "매일의 생활",
    description:
      "식사와 대화, 외출과 휴식처럼 평범하지만 중요한 하루가 안전하게 이어지도록 함께합니다.",
  },
  {
    number: "02",
    title: "이웃과의 관계",
    description:
      "평일 점심 식사 도움처럼 일상에 이웃이 자연스럽게 참여하고 관계를 나누는 시간을 이어 왔습니다.",
  },
  {
    number: "03",
    title: "더 넓은 경험",
    description:
      "나들이 지원과 공간복지 드림하우스 같은 활동을 통해 생활의 반경과 경험을 넓혀 왔습니다.",
  },
] as const;

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
  title: "샬롬 소개",
  description:
    "30년 넘게 서울 강서구에서 지체 및 지적 장애인과 함께 일상을 이어 온 샬롬의 집을 소개합니다.",
};

export default function AboutPage() {
  return (
    <>
      <section className="overflow-hidden bg-hero-night text-on-dark">
        <div className="mx-auto grid w-full max-w-site gap-14 px-page py-section sm:px-page-wide sm:py-section-wide lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:items-end lg:gap-20">
          <div>
            <p className="text-small font-bold text-hero-sun">샬롬 소개</p>
            <h1 className="mt-5 max-w-3xl text-hero font-bold text-on-dark sm:text-hero-lg">
              함께 살아온 시간,
              <span className="block text-hero-mist">
                앞으로 이어 갈 일상
              </span>
            </h1>
            <p className="mt-8 max-w-content text-body text-hero-muted">
              샬롬의 집은 서울 강서구에서 지체 및 지적 장애인이 함께 생활하며
              서로의 하루를 나누는 보금자리입니다. 특별한 순간보다 매일의 삶을
              지키는 일을 소중히 생각합니다.
            </p>
          </div>

          <dl
            aria-label="샬롬의 집 핵심 정보"
            className="border-y border-white/35 lg:border-y-0 lg:border-l lg:pl-12"
          >
            <div className="py-7 lg:pt-0">
              <dt className="text-small font-bold text-hero-muted">
                함께해 온 시간
              </dt>
              <dd className="mt-2 text-6xl font-bold tracking-[-0.05em] text-on-dark sm:text-7xl">
                30년+
              </dd>
            </div>
            <div className="grid grid-cols-2 border-t border-white/25 py-6">
              <div className="pr-5">
                <dt className="text-small font-bold text-hero-muted">
                  자리한 곳
                </dt>
                <dd className="mt-2 text-lg font-bold text-on-dark">
                  서울 강서구
                </dd>
              </div>
              <div className="border-l border-white/25 pl-5">
                <dt className="text-small font-bold text-hero-muted">
                  시설 성격
                </dt>
                <dd className="mt-2 text-lg font-bold text-on-dark">
                  장애인거주시설
                </dd>
              </div>
            </div>
          </dl>
        </div>
      </section>

      <section
        aria-labelledby="about-home-heading"
        className="bg-background"
      >
        <div className="mx-auto grid w-full max-w-site gap-10 px-page py-section sm:px-page-wide sm:py-section-wide lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
          <div>
            <p className="text-small font-bold text-primary">함께 사는 집</p>
            <h2
              id="about-home-heading"
              className="mt-4 max-w-xl text-display font-bold text-foreground sm:text-display-lg"
            >
              시설보다 먼저,
              <span className="block text-primary">사람의 하루를 봅니다</span>
            </h2>
          </div>

          <div className="max-w-content space-y-6 text-body text-muted-foreground lg:pt-3">
            <p className="text-xl font-semibold leading-9 text-foreground sm:text-2xl sm:leading-10">
              한 사람의 속도와 선택을 존중할 때, 집다운 일상이 시작됩니다.
            </p>
            <p>
              샬롬의 집은 누군가를 일방적으로 돕는 공간이 아니라 서로 다른 몸과
              마음의 속도로 함께 살아가는 곳입니다. 익숙한 사람과 식탁을 나누고,
              필요한 도움을 주고받으며, 지역사회 안에서 관계를 이어 갑니다.
            </p>
            <p>
              홈페이지도 같은 태도를 따릅니다. 거주인을 홍보의 대상으로 다루지
              않고, 샬롬의 집을 이루는 평범한 생활과 관계를 차분하고 정확하게
              전합니다.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="about-everyday-heading"
        className="border-y border-border bg-surface"
      >
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end lg:gap-16">
            <div>
              <p className="text-small font-bold text-accent">
                30년을 이어 온 장면
              </p>
              <h2
                id="about-everyday-heading"
                className="mt-4 text-display font-bold text-foreground sm:text-display-lg"
              >
                시간은 매일의 생활로 쌓였습니다
              </h2>
            </div>
            <p className="max-w-content text-body text-muted-foreground lg:justify-self-end">
              오래 이어 온 역사를 숫자로만 설명하기보다, 그 시간을 채운 생활과
              관계의 모습을 먼저 소개합니다.
            </p>
          </div>

          <ol className="mt-12 grid border-t border-border-strong lg:grid-cols-3">
            {everydayScenes.map((scene) => (
              <li
                key={scene.number}
                className="border-b border-border py-8 lg:border-r lg:border-b-0 lg:px-8 lg:py-10 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
              >
                <p className="text-small font-bold text-accent">
                  {scene.number}
                </p>
                <h3 className="mt-5 text-heading font-bold text-foreground">
                  {scene.title}
                </h3>
                <p className="mt-4 text-body text-muted-foreground">
                  {scene.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        aria-labelledby="about-basic-info-heading"
        className="bg-primary-soft"
      >
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)] lg:gap-16">
            <div>
              <p className="text-small font-bold text-primary">기본 정보</p>
              <h2
                id="about-basic-info-heading"
                className="mt-4 text-title font-bold text-foreground"
              >
                샬롬의 집을 찾는 데 필요한 정보
              </h2>
            </div>

            <address className="not-italic">
              <dl className="border-y border-border-strong">
                <div className="grid gap-2 border-b border-border py-6 sm:grid-cols-[8rem_1fr] sm:gap-8">
                  <dt className="text-small font-bold text-foreground">
                    시설명
                  </dt>
                  <dd className="text-body text-muted-foreground">
                    {siteConfig.name}
                  </dd>
                </div>
                <div className="grid gap-2 border-b border-border py-6 sm:grid-cols-[8rem_1fr] sm:gap-8">
                  <dt className="text-small font-bold text-foreground">주소</dt>
                  <dd className="break-words text-body text-muted-foreground">
                    {siteConfig.address}
                  </dd>
                </div>
                <div className="grid gap-1 py-5 sm:grid-cols-[8rem_1fr] sm:items-center sm:gap-8">
                  <dt className="text-small font-bold text-foreground">
                    대표 전화
                  </dt>
                  <dd>
                    <a
                      aria-label={`${siteConfig.name} 대표 전화 ${siteConfig.phone}`}
                      className="inline-flex min-h-12 items-center text-body font-bold text-primary underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                      href={`tel:${siteConfig.phone}`}
                    >
                      {siteConfig.phone}
                    </a>
                  </dd>
                </div>
              </dl>
            </address>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="about-information-policy-heading"
        className="bg-accent-soft"
      >
        <div className="mx-auto grid w-full max-w-site gap-8 px-page py-section sm:px-page-wide sm:py-section-wide lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <p className="text-small font-bold text-accent">정확하게 알리기</p>
            <h2
              id="about-information-policy-heading"
              className="mt-4 max-w-xl text-title font-bold text-foreground"
            >
              공개하는 과정도 존중에서 시작합니다
            </h2>
          </div>
          <div className="max-w-content space-y-5 border-t border-border-strong pt-6 text-body text-muted-foreground lg:border-t-0 lg:pt-0">
            <p>
              상세 연혁과 운영 방향, 시설 환경은 담당자 확인과 공개 범위 검토를
              거쳐 순차적으로 안내합니다. 확인되지 않은 정보로 빈자리를 채우지
              않습니다.
            </p>
            <p>
              사진과 관계자 정보는 공개 동의와 개인정보 검수를 마친 자료만
              사용해, 거주인의 존엄과 사생활을 먼저 보호합니다.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="about-related-heading"
        className="bg-background"
      >
        <div className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)] lg:gap-16">
            <div>
              <p className="text-small font-bold text-primary">다음으로</p>
              <h2
                id="about-related-heading"
                className="mt-4 text-title font-bold text-foreground"
              >
                샬롬의 집을 더 알아보세요
              </h2>
            </div>

            <ul className="divide-y divide-border border-y border-border-strong">
              {aboutRelatedLinks.map((link) => (
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
