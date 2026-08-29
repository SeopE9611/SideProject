import type { Metadata } from "next";
import { SectionPageHeader } from "@/components/layout/section-page-header";

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

export default function AboutPage() {
  return (
    <>
      <SectionPageHeader sectionHref="/about" eyebrow="시설소개" title="시설개요" description="샬롬의 집은 지체 및 지적 장애인이 식사하고 쉬며 관계를 나누는 장애인거주시설입니다. 확인된 시설 정보와 생활의 기준을 분명한 순서로 안내합니다." breadcrumbs={[{ label: "홈", href: "/" }, { label: "시설소개" }]} />
      <section className="bg-surface py-12 sm:py-16" aria-labelledby="about-summary-heading">
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <h2 id="about-summary-heading" className="sr-only">시설 기본 정보</h2>
          <dl className="grid border-y border-border sm:grid-cols-3">
            {[{ label: "시설 유형", value: "장애인거주시설" }, { label: "생활", value: "지체 및 지적 장애인이 함께 생활합니다" }, { label: "지역", value: "서울특별시 강서구" }].map((item) => <div key={item.label} className="border-b border-border py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-r-0"><dt className="text-small font-bold text-primary">{item.label}</dt><dd className="text-safe-wrap mt-2 text-body">{item.value}</dd></div>)}
          </dl>
        </div>
      </section>
      <section aria-labelledby="about-principles-heading" className="bg-surface-subtle py-12 sm:py-16"><div className="mx-auto max-w-site px-page sm:px-page-wide"><p className="text-small font-bold text-accent">함께 사는 기준</p><h2 id="about-principles-heading" className="text-safe-wrap mt-3 text-display font-bold">사람마다 다른 하루를 살핍니다</h2><p className="text-safe-wrap mt-4 max-w-3xl text-body text-muted-foreground">정해진 방식에 사람을 맞추기보다 각자의 의사와 생활 방식에 필요한 지원을 함께 찾습니다.</p><ol className="mt-8 grid border-t-2 border-foreground lg:grid-cols-3">{livingPrinciples.map((item) => <li key={item.number} className="border-b border-border py-6 lg:px-6 lg:first:pl-0 lg:last:pr-0"><p className="text-small font-bold text-accent">{item.number}</p><h3 className="mt-3 text-heading font-bold">{item.title}</h3><p className="text-safe-wrap mt-3 text-muted-foreground">{item.description}</p></li>)}</ol></div></section>
      <section aria-labelledby="about-scenes-heading" className="bg-surface py-12 sm:py-16"><div className="mx-auto max-w-site px-page sm:px-page-wide"><p className="text-small font-bold text-primary">생활의 모습</p><h2 id="about-scenes-heading" className="mt-3 text-display font-bold">집 안과 밖에서 이어지는 일상</h2><p className="text-safe-wrap mt-4 max-w-3xl text-muted-foreground">특별한 행사만이 아니라 매일 반복되는 생활과 관계가 샬롬의 집을 이루는 가장 중요한 모습입니다.</p><ol className="mt-8 grid border-t-2 border-foreground lg:grid-cols-3">{livingScenes.map((item) => <li key={item.number} className="border-b border-border py-6 lg:px-6 lg:first:pl-0 lg:last:pr-0"><p className="text-small font-bold text-accent">{item.number} · {item.label}</p><h3 className="mt-3 text-heading font-bold">{item.title}</h3><p className="text-safe-wrap mt-3 text-muted-foreground">{item.description}</p></li>)}</ol></div></section>
      <section aria-labelledby="about-policy-heading" className="bg-surface-subtle py-12 sm:py-16"><div className="mx-auto max-w-site px-page sm:px-page-wide"><p className="text-small font-bold text-primary">공개 원칙</p><h2 id="about-policy-heading" className="mt-3 max-w-3xl text-display font-bold">소개하는 과정에서도 사람을 먼저 생각합니다</h2><div className="mt-8 grid border-t-4 border-primary sm:grid-cols-2"><div className="border-b border-border py-6 sm:border-b-0 sm:border-r sm:pr-8"><h3 className="font-bold">동의와 보호</h3><p className="mt-3 text-muted-foreground">사진과 관계자 정보는 공개 동의와 개인정보 검토를 마친 자료만 사용합니다.</p></div><div className="py-6 sm:pl-8"><h3 className="font-bold">정확한 정보</h3><p className="mt-3 text-muted-foreground">운영 내용과 시설 정보는 담당자 확인을 거친 뒤 공개하고 확인되지 않은 내용으로 빈자리를 채우지 않습니다.</p></div></div></div></section>
    </>
  );
}
