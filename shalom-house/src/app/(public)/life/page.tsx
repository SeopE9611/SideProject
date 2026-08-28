import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "생활이야기",
  description:
    "샬롬의 집에서 함께 보내는 일상과 지역사회로 이어지는 활동을 소개합니다.",
};

const dailyRhythms = [
  {
    number: "01",
    label: "식사",
    title: "한 식탁에 둘러앉는 시간",
    colorClassName: "bg-home-sun",
  },
  {
    number: "02",
    label: "관계",
    title: "서로의 안부를 묻는 시간",
    colorClassName: "bg-home-sky",
  },
  {
    number: "03",
    label: "경험",
    title: "집 밖의 세상을 만나는 시간",
    colorClassName: "bg-home-coral",
  },
  {
    number: "04",
    label: "휴식",
    title: "각자의 속도로 쉬는 시간",
    colorClassName: "bg-home-lilac",
  },
] as const;

type LifeScene = {
  number: string;
  label: string;
  title: string;
  description: string;
  imageSrc: string | null;
  imageAlt: string;
  mediaClassName: string;
  cardClassName: string;
};

const lifeScenes: readonly LifeScene[] = [
  {
    number: "01",
    label: "집 안의 하루",
    title: "익숙한 일상을 편안하게 이어 갑니다",
    description:
      "식사와 휴식, 대화처럼 매일 반복되는 시간이 안정적으로 이어지도록 생활을 함께 살핍니다.",
    imageSrc: null,
    imageAlt: "샬롬의 집에서 식사와 휴식을 함께하는 생활 모습",
    mediaClassName: "bg-home-sun",
    cardClassName: "lg:col-span-7",
  },
  {
    number: "02",
    label: "집 밖의 경험",
    title: "생활의 반경을 넓혀 갑니다",
    description:
      "외출과 나들이, 지역 활동을 통해 새로운 사람과 장소를 만나는 경험을 이어 갑니다.",
    imageSrc: null,
    imageAlt: "샬롬의 집에서 외출과 지역 활동을 하는 모습",
    mediaClassName: "bg-home-sky",
    cardClassName: "lg:col-span-5",
  },
  {
    number: "03",
    label: "함께하는 관계",
    title: "도움을 주고받는 이웃이 됩니다",
    description:
      "한쪽이 일방적으로 돕는 관계보다 식탁과 활동을 나누며 서로의 일상에 곁을 내어 줍니다.",
    imageSrc: null,
    imageAlt: "샬롬의 집과 지역사회 이웃이 함께하는 모습",
    mediaClassName: "bg-home-coral",
    cardClassName: "lg:col-span-5",
  },
  {
    number: "04",
    label: "머무는 공간",
    title: "집다운 환경을 함께 가꿉니다",
    description:
      "매일 머무는 공간을 더 안전하고 편안하게 살피며 생활에 필요한 변화를 이어 갑니다.",
    imageSrc: null,
    imageAlt: "안전하고 편안하게 가꾼 샬롬의 집 생활 공간",
    mediaClassName: "bg-home-lilac",
    cardClassName: "lg:col-span-7",
  },
];

const activityStories = [
  {
    number: "01",
    label: "식탁",
    title: "평일 점심 식사 도움",
    description:
      "식사를 준비하고 나누는 일상에 지역사회가 함께해 온 활동입니다.",
    colorClassName: "bg-home-sun",
  },
  {
    number: "02",
    label: "외출",
    title: "나들이 지원",
    description:
      "익숙한 공간을 벗어나 계절과 지역의 다양한 모습을 경험해 온 활동입니다.",
    colorClassName: "bg-home-sky",
  },
  {
    number: "03",
    label: "공간",
    title: "공간복지 드림하우스",
    description:
      "생활 공간을 더 안전하고 편안하게 가꾸기 위해 함께해 온 활동입니다.",
    colorClassName: "bg-home-coral",
  },
] as const;

const contentPrinciples = [
  {
    number: "01",
    title: "사람을 먼저 봅니다",
    description:
      "거주인을 활동의 홍보 수단이 아닌 자신의 생활과 선택을 가진 한 사람으로 소개합니다.",
  },
  {
    number: "02",
    title: "동의를 확인합니다",
    description:
      "사진과 영상은 촬영·공개 동의와 개인정보 검토를 마친 자료만 사용합니다.",
  },
  {
    number: "03",
    title: "확인된 사실만 전합니다",
    description:
      "활동 내용과 운영 여부는 담당자 확인을 거쳐 정확한 범위 안에서 안내합니다.",
  },
] as const;

const nextLinks = [
  {
    number: "01",
    label: "소식",
    description: "최근 활동과 공지사항을 확인합니다.",
    href: "/news",
  },
  {
    number: "02",
    label: "함께하기",
    description: "자원봉사와 후원 참여 방법을 살펴봅니다.",
    href: "/support",
  },
] as const;

function LifeSceneMedia({ scene }: { scene: LifeScene }) {
  return (
    <div
      className={`relative grid min-h-64 place-items-center overflow-hidden border-b border-home-ink/15 text-home-ink sm:min-h-72 ${scene.mediaClassName}`}
    >
      {scene.imageSrc ? (
        <Image
          fill
          alt={scene.imageAlt}
          className="object-cover"
          sizes="(min-width: 1024px) 58vw, 100vw"
          src={scene.imageSrc}
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex size-full flex-col justify-between p-7 sm:p-9"
        >
          <span className="text-small font-bold">
            {scene.number} {scene.label}
          </span>
          <span className="text-[clamp(4.5rem,10vw,8rem)] font-bold leading-none tracking-[-0.08em] opacity-20">
            {scene.label.slice(0, 2)}
          </span>
        </div>
      )}
    </div>
  );
}

export default function LifePage() {
  return (
    <>
      <section className="bg-home-cream px-page pb-16 pt-7 sm:px-page-wide sm:pb-20 sm:pt-10">
        <div className="mx-auto grid w-full max-w-site overflow-hidden rounded-panel bg-home-ink shadow-elevated lg:min-h-[37rem] lg:grid-cols-[1fr_0.9fr]">
          <div className="flex flex-col justify-between px-7 py-12 text-hero-on-dark sm:px-12 sm:py-16 lg:px-14">
            <div>
              <p className="text-small font-bold text-home-sun">
                생활이야기
              </p>
              <h1 className="text-safe-wrap mt-5 max-w-3xl text-balance text-[clamp(2.75rem,5.1vw,4.35rem)] font-bold leading-[1.06] tracking-[-0.05em]">
                서로 다른 하루가 함께 이어집니다
              </h1>
              <p className="text-safe-wrap mt-7 max-w-2xl text-pretty text-body text-hero-muted sm:text-xl sm:leading-9">
                식사를 나누고, 안부를 묻고, 바깥세상을 경험하고, 편안히 쉬는
                평범한 시간이 샬롬의 집의 하루를 만듭니다.
              </p>
            </div>

            <Link
              className="mt-10 inline-flex min-h-12 w-fit items-center justify-center rounded-control bg-home-sun px-6 py-3 text-base font-bold text-home-ink transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-hero-on-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hero-on-dark"
              href="#life-scenes"
            >
              생활 장면 살펴보기
            </Link>
          </div>

          <ol
            aria-label="샬롬의 집의 하루를 이루는 시간"
            className="grid gap-3 border-t border-home-ink/15 bg-surface p-5 sm:grid-cols-2 sm:p-7 lg:border-l lg:border-t-0"
          >
            {dailyRhythms.map((rhythm) => (
              <li
                key={rhythm.number}
                className={`flex min-h-40 flex-col justify-between rounded-card p-6 text-home-ink sm:p-7 ${rhythm.colorClassName}`}
              >
                <span className="text-small font-bold">
                  {rhythm.number} {rhythm.label}
                </span>
                <span className="text-safe-wrap text-balance text-heading font-bold">
                  {rhythm.title}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="life-scenes"
        aria-labelledby="life-scenes-heading"
        className="scroll-mt-24 bg-surface py-20 sm:py-24"
      >
        <div className="mx-auto w-full max-w-site px-page sm:px-page-wide">
          <div className="grid gap-7 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <div>
              <p className="text-small font-bold text-accent">하루의 장면</p>
              <h2
                id="life-scenes-heading"
                className="text-safe-wrap mt-3 max-w-3xl text-balance text-display font-bold text-foreground sm:text-display-lg"
              >
                특별한 행사보다 매일의 생활을 소중히 봅니다
              </h2>
            </div>
            <p className="text-safe-wrap max-w-xl text-pretty text-body text-muted-foreground lg:justify-self-end">
              사람마다 좋아하는 것과 편안한 속도가 다르기에, 같은 공간에서도
              각자의 선택과 생활 방식을 존중합니다.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-12">
            {lifeScenes.map((scene) => (
              <article
                key={scene.number}
                className={`overflow-hidden rounded-panel border border-border bg-surface shadow-card ${scene.cardClassName}`}
              >
                <LifeSceneMedia scene={scene} />
                <div className="p-7 sm:p-8">
                  <p className="text-small font-bold text-primary">
                    {scene.number} {scene.label}
                  </p>
                  <h3 className="text-safe-wrap mt-4 text-balance text-title font-bold text-foreground">
                    {scene.title}
                  </h3>
                  <p className="text-safe-wrap mt-4 max-w-2xl text-pretty text-body text-muted-foreground">
                    {scene.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="life-activities-heading"
        className="bg-home-cream py-20 sm:py-24"
      >
        <div className="mx-auto w-full max-w-site px-page sm:px-page-wide">
          <div className="max-w-3xl">
            <p className="text-small font-bold text-primary">함께한 활동</p>
            <h2
              id="life-activities-heading"
              className="text-safe-wrap mt-3 text-balance text-display font-bold text-foreground sm:text-display-lg"
            >
              생활에서 시작해 이웃과 이어집니다
            </h2>
            <p className="text-safe-wrap mt-5 max-w-2xl text-pretty text-body text-muted-foreground">
              아래 내용은 지역사회와 함께해 온 활동 사례입니다. 현재 일정과
              참여 방법은 확인된 소식에서 별도로 안내합니다.
            </p>
          </div>

          <ol className="mt-12 grid gap-5 lg:grid-cols-3">
            {activityStories.map((activity) => (
              <li
                key={activity.number}
                className="overflow-hidden rounded-panel border border-border bg-surface shadow-card"
              >
                <div
                  className={`flex min-h-32 items-start justify-between p-7 text-home-ink ${activity.colorClassName}`}
                >
                  <span className="text-small font-bold">
                    {activity.number} {activity.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-5xl font-bold leading-none opacity-20"
                  >
                    {activity.number}
                  </span>
                </div>
                <div className="p-7 sm:p-8">
                  <h3 className="text-safe-wrap text-balance text-title font-bold text-foreground">
                    {activity.title}
                  </h3>
                  <p className="text-safe-wrap mt-4 text-pretty text-body text-muted-foreground">
                    {activity.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-surface py-20 sm:py-24">
        <div className="mx-auto grid w-full max-w-site overflow-hidden rounded-panel border border-border bg-home-ink lg:grid-cols-[0.8fr_1.2fr]">
          <div className="px-7 py-12 text-hero-on-dark sm:px-12 sm:py-16 lg:px-14">
            <p className="text-small font-bold text-home-sun">기록의 원칙</p>
            <h2
              id="life-principles-heading"
              className="text-safe-wrap mt-4 max-w-xl text-balance text-display font-bold sm:text-display-lg"
            >
              생활을 전할 때도 사람을 먼저 생각합니다
            </h2>
          </div>

          <ol
            aria-labelledby="life-principles-heading"
            className="grid bg-surface"
          >
            {contentPrinciples.map((principle) => (
              <li
                key={principle.number}
                className="grid gap-4 border-b border-border px-7 py-8 last:border-b-0 sm:grid-cols-[3rem_0.75fr_1.25fr] sm:items-start sm:gap-6 lg:px-10"
              >
                <span className="text-small font-bold text-accent">
                  {principle.number}
                </span>
                <h3 className="text-safe-wrap text-balance text-lg font-bold text-foreground">
                  {principle.title}
                </h3>
                <p className="text-safe-wrap text-pretty text-body text-muted-foreground">
                  {principle.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <nav
        aria-labelledby="life-next-heading"
        className="bg-home-cream py-20 sm:py-24"
      >
        <div className="mx-auto w-full max-w-site px-page sm:px-page-wide">
          <p className="text-small font-bold text-primary">다음 안내</p>
          <h2
            id="life-next-heading"
            className="text-safe-wrap mt-3 text-balance text-display font-bold text-foreground sm:text-display-lg"
          >
            최근 소식과 참여 방법을 확인하세요
          </h2>

          <ul className="mt-10 grid overflow-hidden rounded-card border border-border bg-surface shadow-card sm:grid-cols-2">
            {nextLinks.map((item, index) => (
              <li
                key={item.href}
                className={
                  index === 1
                    ? "border-t border-border sm:border-l sm:border-t-0"
                    : ""
                }
              >
                <Link
                  className="group flex min-h-48 flex-col justify-between gap-6 p-7 text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-focus-ring sm:p-8"
                  href={item.href}
                >
                  <span className="text-small font-bold text-primary">
                    {item.number}
                  </span>
                  <span>
                    <span className="text-safe-wrap block text-title font-bold">
                      {item.label}
                    </span>
                    <span className="text-safe-wrap mt-2 block text-body text-muted-foreground">
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
