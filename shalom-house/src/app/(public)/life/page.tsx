import type { Metadata } from "next";
import { SectionPageHeader } from "@/components/layout/section-page-header";

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
  },
  {
    number: "02",
    label: "관계",
    title: "서로의 안부를 묻는 시간",
  },
  {
    number: "03",
    label: "경험",
    title: "집 밖의 세상을 만나는 시간",
  },
  {
    number: "04",
    label: "휴식",
    title: "각자의 속도로 쉬는 시간",
  },
] as const;

type LifeScene = {
  number: string;
  label: string;
  title: string;
  description: string;
};

const lifeScenes: readonly LifeScene[] = [
  {
    number: "01",
    label: "집 안의 하루",
    title: "익숙한 일상을 편안하게 이어 갑니다",
    description:
      "식사와 휴식, 대화처럼 매일 반복되는 시간이 안정적으로 이어지도록 생활을 함께 살핍니다.",
  },
  {
    number: "02",
    label: "집 밖의 경험",
    title: "생활의 반경을 넓혀 갑니다",
    description:
      "외출과 나들이, 지역 활동을 통해 새로운 사람과 장소를 만나는 경험을 이어 갑니다.",
  },
  {
    number: "03",
    label: "함께하는 관계",
    title: "도움을 주고받는 이웃이 됩니다",
    description:
      "한쪽이 일방적으로 돕는 관계보다 식탁과 활동을 나누며 서로의 일상에 곁을 내어 줍니다.",
  },
  {
    number: "04",
    label: "머무는 공간",
    title: "집다운 환경을 함께 가꿉니다",
    description:
      "매일 머무는 공간을 더 안전하고 편안하게 살피며 생활에 필요한 변화를 이어 갑니다.",
  },
];

const activityStories = [
  {
    number: "01",
    label: "식탁",
    title: "평일 점심 식사 도움",
    description:
      "식사를 준비하고 나누는 일상에 지역사회가 함께해 온 활동입니다.",
  },
  {
    number: "02",
    label: "외출",
    title: "나들이 지원",
    description:
      "익숙한 공간을 벗어나 계절과 지역의 다양한 모습을 경험해 온 활동입니다.",
  },
  {
    number: "03",
    label: "공간",
    title: "공간복지 드림하우스",
    description:
      "생활 공간을 더 안전하고 편안하게 가꾸기 위해 함께해 온 활동입니다.",
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

export default function LifePage() {
  return (
    <>
      <SectionPageHeader
        sectionHref="/life"
        eyebrow="생활·프로그램"
        title="생활이야기"
        description="식사를 나누고 안부를 묻고 바깥세상을 경험하며 각자의 속도로 쉬는 시간까지, 샬롬의 집에서 이어지는 생활과 활동을 소개합니다."
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "생활·프로그램", href: "/life" },
          { label: "생활이야기" },
        ]}
      />
      <section
        className="bg-surface py-12 sm:py-16"
        aria-labelledby="daily-rhythms-heading"
      >
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <h2
            id="daily-rhythms-heading"
            className="text-safe-wrap text-heading font-bold"
          >
            하루의 흐름
          </h2>
          <ol className="mt-6 grid grid-cols-2 border-y border-border md:grid-cols-4">
            {dailyRhythms.map((item) => (
              <li
                key={item.number}
                className="border-b border-border py-5 odd:pr-4 even:border-l even:pl-4 md:border-b-0 md:border-l md:px-5 md:first:border-l-0 md:first:pl-0"
              >
                <p className="text-safe-wrap text-small font-bold text-primary">
                  {item.label}
                </p>
                <p className="text-safe-wrap mt-2 text-small text-muted-foreground">
                  {item.title}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section
        id="life-scenes"
        aria-labelledby="life-scenes-heading"
        className="bg-surface-subtle py-12 sm:py-16"
      >
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <p className="text-safe-wrap text-small font-bold text-accent">
            하루의 장면
          </p>
          <h2
            id="life-scenes-heading"
            className="text-safe-wrap mt-3 text-display font-bold"
          >
            특별한 행사보다 매일의 생활을 소중히 봅니다
          </h2>
          <p className="text-safe-wrap mt-4 max-w-3xl text-muted-foreground">
            사람마다 좋아하는 것과 편안한 속도가 다르기에, 같은 공간에서도
            각자의 선택과 생활 방식을 존중합니다.
          </p>
          <ol className="mt-8 grid border-t-2 border-foreground lg:grid-cols-2">
            {lifeScenes.map((item) => (
              <li
                key={item.number}
                className="border-b border-border py-6 lg:px-6 lg:odd:pl-0"
              >
                <p className="text-safe-wrap text-small font-bold text-accent">
                  {item.number} · {item.label}
                </p>
                <h3 className="text-safe-wrap mt-3 text-heading font-bold">
                  {item.title}
                </h3>
                <p className="text-safe-wrap mt-3 text-muted-foreground">
                  {item.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section
        aria-labelledby="life-activities-heading"
        className="bg-surface py-12 sm:py-16"
      >
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <p className="text-safe-wrap text-small font-bold text-primary">
            함께한 활동
          </p>
          <h2
            id="life-activities-heading"
            className="text-safe-wrap mt-3 text-display font-bold"
          >
            생활에서 시작해 이웃과 이어집니다
          </h2>
          <p className="text-safe-wrap mt-4 max-w-3xl text-muted-foreground">
            아래 내용은 지역사회와 함께해 온 활동 사례입니다. 현재 일정과 참여
            방법은 확인된 소식에서 별도로 안내합니다.
          </p>
          <ol className="mt-8 grid border-t-2 border-foreground lg:grid-cols-3">
            {activityStories.map((item) => (
              <li
                key={item.number}
                className="border-b border-border py-6 lg:px-6 lg:first:pl-0 lg:last:pr-0"
              >
                <p className="text-safe-wrap text-small font-bold text-accent">
                  {item.number} · {item.label}
                </p>
                <h3 className="text-safe-wrap mt-3 text-heading font-bold">
                  {item.title}
                </h3>
                <p className="text-safe-wrap mt-3 text-muted-foreground">
                  {item.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section
        aria-labelledby="life-principles-heading"
        className="bg-surface-subtle py-12 sm:py-16"
      >
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <p className="text-safe-wrap text-small font-bold text-primary">
            기록의 원칙
          </p>
          <h2
            id="life-principles-heading"
            className="text-safe-wrap mt-3 text-display font-bold"
          >
            생활을 전할 때도 사람을 먼저 생각합니다
          </h2>
          <ol className="mt-8 border-t-4 border-primary">
            {contentPrinciples.map((item) => (
              <li
                key={item.number}
                className="grid gap-3 border-b border-border py-5 sm:grid-cols-[3rem_0.8fr_1.2fr]"
              >
                <span className="text-safe-wrap text-small font-bold text-accent">
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
