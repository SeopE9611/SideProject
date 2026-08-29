import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/layout/page-hero";

export const metadata: Metadata = {
  title: "시설소개",
  description:
    "지체 및 지적 장애인이 서로의 속도와 선택을 존중하며 함께 생활하는 샬롬의 집을 소개합니다.",
};

const livingPrinciples = [
  {
    number: "01",
    title: "한 사람의 선택",
    description:
      "익숙한 생활 방식과 의사를 먼저 살피고, 스스로 선택할 수 있는 일상을 함께 만듭니다.",
  },
  {
    number: "02",
    title: "필요에 맞는 지원",
    description:
      "모두에게 같은 방법을 적용하지 않고 몸과 마음의 특성에 맞춰 필요한 도움을 나눕니다.",
  },
  {
    number: "03",
    title: "지역과 잇는 관계",
    description:
      "식사, 나들이, 이웃과의 만남을 통해 생활의 범위가 집 안에만 머물지 않도록 이어 갑니다.",
  },
] as const;

type LivingScene = {
  number: string;
  label: string;
  title: string;
  description: string;
};

const livingScenes: readonly LivingScene[] = [
  {
    number: "01",
    label: "일상",
    title: "같이 먹고 쉬는 집",
    description:
      "식탁을 나누고 대화를 이어 가며 편안하게 쉴 수 있는 평범한 하루를 소중히 여깁니다.",
  },
  {
    number: "02",
    label: "경험",
    title: "집 밖으로 이어지는 생활",
    description:
      "외출과 나들이, 지역 활동을 통해 새로운 사람과 장소를 만나는 경험을 지원합니다.",
  },
  {
    number: "03",
    label: "공간",
    title: "더 안전하고 편안한 환경",
    description:
      "매일 머무는 공간을 살피고 생활에 필요한 변화를 이어 가며 집다운 환경을 가꿉니다.",
  },
];

const aboutLinks = [
  {
    number: "01",
    label: "생활이야기",
    description: "함께 보내는 일상과 활동을 살펴봅니다.",
    href: "/life",
    borderClassName: "",
  },
  {
    number: "02",
    label: "함께하기",
    description: "자원봉사와 후원 참여 방법을 확인합니다.",
    href: "/support",
    borderClassName: "border-t border-border sm:border-l sm:border-t-0",
  },
  {
    number: "03",
    label: "찾아오시는 길",
    description: "주소와 교통 안내를 별도 페이지에서 확인합니다.",
    href: "/about/directions",
    borderClassName: "border-t border-border lg:border-l lg:border-t-0",
  },
  {
    number: "04",
    label: "정보공개",
    description: "공개가 승인된 운영 자료를 확인합니다.",
    href: "/transparency",
    borderClassName:
      "border-t border-border sm:border-l lg:border-t-0",
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="시설소개"
        title="서로의 생활을 존중하는 집, 샬롬의 집입니다"
        description="샬롬의 집은 지체 및 지적 장애인이 식사하고 쉬며 관계를 나누는 장애인거주시설입니다. 확인된 시설 정보와 생활의 기준을 분명한 순서로 안내합니다."
        asideTitle="시설 기본 안내"
        items={[
          { label: "시설 유형", value: "장애인거주시설" },
          { label: "생활", value: "지체 및 지적 장애인이 함께 생활합니다" },
          { label: "지역", value: "서울특별시 강서구" },
        ]}
        primaryAction={{ label: "찾아오시는 길", href: "/about/directions" }}
        secondaryAction={{ label: "생활이야기 보기", href: "/life" }}
      />

      <section
        aria-labelledby="about-principles-heading"
        className="bg-surface py-20 sm:py-24"
      >
        <div className="mx-auto w-full max-w-site px-page sm:px-page-wide">
          <div className="grid gap-7 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <div>
              <p className="text-small font-bold text-accent">함께 사는 기준</p>
              <h2
                id="about-principles-heading"
                className="text-safe-wrap mt-3 max-w-3xl text-balance text-display font-bold text-foreground sm:text-display-lg"
              >
                사람마다 다른 하루를 살핍니다
              </h2>
            </div>
            <p className="text-safe-wrap max-w-xl text-pretty text-body text-muted-foreground lg:justify-self-end">
              정해진 방식에 사람을 맞추기보다 각자의 의사와 생활 방식에 필요한
              지원을 함께 찾습니다.
            </p>
          </div>

          <ol className="mt-12 grid border-t-2 border-foreground lg:grid-cols-3">
            {livingPrinciples.map((principle) => (
              <li
                key={principle.number}
                className="border-b border-border-strong py-8 lg:border-r lg:px-8 lg:py-10 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
              >
                <p className="text-small font-bold text-accent">
                  {principle.number}
                </p>
                <h3 className="text-safe-wrap mt-5 text-balance text-heading font-bold text-foreground">
                  {principle.title}
                </h3>
                <p className="text-safe-wrap mt-4 text-pretty text-body text-muted-foreground">
                  {principle.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        aria-labelledby="about-scenes-heading"
        className="bg-home-cream py-20 sm:py-24"
      >
        <div className="mx-auto w-full max-w-site px-page sm:px-page-wide">
          <div className="max-w-3xl">
            <p className="text-small font-bold text-primary">생활의 모습</p>
            <h2
              id="about-scenes-heading"
              className="text-safe-wrap mt-3 text-balance text-display font-bold text-foreground sm:text-display-lg"
            >
              집 안과 밖에서 이어지는 일상
            </h2>
            <p className="text-safe-wrap mt-5 max-w-2xl text-pretty text-body text-muted-foreground">
              특별한 행사만이 아니라 매일 반복되는 생활과 관계가 샬롬의 집을
              이루는 가장 중요한 모습입니다.
            </p>
          </div>

          <ol className="mt-12 grid border-t-2 border-foreground lg:grid-cols-3">
            {livingScenes.map((scene) => (
              <li
                key={scene.number}
                className="border-b border-border-strong py-8 lg:border-r lg:px-8 lg:py-10 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
              >
                <p className="text-small font-bold text-accent">
                  {scene.number} · {scene.label}
                </p>
                <h3 className="text-safe-wrap mt-5 text-balance text-title font-bold text-foreground">
                  {scene.title}
                </h3>
                <p className="text-safe-wrap mt-4 text-pretty text-body text-muted-foreground">
                  {scene.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        aria-labelledby="about-policy-heading"
        className="bg-surface py-20 sm:py-24"
      >
        <div className="mx-auto grid w-full max-w-site overflow-hidden rounded-panel border border-border bg-home-ink lg:grid-cols-[1fr_1fr]">
          <div className="px-7 py-12 text-hero-on-dark sm:px-12 sm:py-16 lg:px-14">
            <p className="text-small font-bold text-home-sun">공개 원칙</p>
            <h2
              id="about-policy-heading"
              className="text-safe-wrap mt-4 max-w-xl text-balance text-display font-bold sm:text-display-lg"
            >
              소개하는 과정에서도 사람을 먼저 생각합니다
            </h2>
          </div>

          <div className="grid bg-surface sm:grid-cols-2 lg:grid-cols-1">
            <div className="border-b border-border px-7 py-8 sm:border-b-0 sm:border-r lg:border-b lg:border-r-0 lg:px-10">
              <p className="text-small font-bold text-accent">01 동의와 보호</p>
              <p className="text-safe-wrap mt-3 text-pretty text-body text-muted-foreground">
                사진과 관계자 정보는 공개 동의와 개인정보 검토를 마친 자료만
                사용합니다.
              </p>
            </div>
            <div className="px-7 py-8 lg:px-10">
              <p className="text-small font-bold text-primary">02 정확한 정보</p>
              <p className="text-safe-wrap mt-3 text-pretty text-body text-muted-foreground">
                운영 내용과 시설 정보는 담당자 확인을 거친 뒤 공개하고 확인되지
                않은 내용으로 빈자리를 채우지 않습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <nav
        aria-labelledby="about-next-heading"
        className="bg-home-cream py-20 sm:py-24"
      >
        <div className="mx-auto w-full max-w-site px-page sm:px-page-wide">
          <p className="text-small font-bold text-primary">다음 안내</p>
          <h2
            id="about-next-heading"
            className="text-safe-wrap mt-3 text-balance text-display font-bold text-foreground sm:text-display-lg"
          >
            필요한 정보를 이어서 확인하세요
          </h2>

          <ul className="mt-10 grid overflow-hidden rounded-card border border-border bg-surface shadow-card sm:grid-cols-2 lg:grid-cols-4">
            {aboutLinks.map((item) => (
              <li
                key={item.href}
                className={item.borderClassName}
              >
                <Link
                  className="group flex min-h-44 flex-col justify-between gap-6 p-6 text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-focus-ring"
                  href={item.href}
                >
                  <span className="text-small font-bold text-primary">
                    {item.number}
                  </span>
                  <span>
                    <span className="text-safe-wrap block text-heading font-bold">
                      {item.label}
                    </span>
                    <span className="text-safe-wrap mt-2 block text-small text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="self-end text-xl font-bold transition-transform duration-[var(--motion-duration-fast)] ease-standard group-hover:translate-x-1"
                  >
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
