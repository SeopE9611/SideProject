"use client";

import type { ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  PackageCheck,
  Search,
  Sparkles,
  Truck,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const strings = [
  { name: "폴리 투어 프로 125", tag: "컨트롤", price: "18,000원" },
  { name: "하이퍼-G 120", tag: "스핀", price: "19,000원" },
  { name: "RPM 블라스트 125", tag: "파워", price: "22,000원" },
  { name: "X-원 바이페이즈", tag: "편안함", price: "31,000원" },
];

const quickEntries = ["스트링 교체", "스트링 쇼핑", "라켓 보기", "아카데미"];
const situations = [
  "처음 교체해요",
  "팔이 편해야 해요",
  "스핀을 더 원해요",
  "경기 전 빠르게 필요해요",
];
const process = ["신청/상담", "스트링 선택", "방문 또는 택배", "장착 후 수령"];

export default function HomeBenchmarkClient() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-ui-label font-semibold text-muted-foreground">
              Home Benchmark Concept
            </p>
            <h1 className="mt-2 text-ui-page-title-lg font-semibold tracking-tight">
              서비스형 이커머스 홈 레이아웃 후보
            </h1>
            <p className="mt-3 max-w-3xl text-ui-body text-muted-foreground">
              운영 홈과 데이터 호출을 건드리지 않고, TennisFlowShop의 쇼핑·교체서비스 균형을
              비교하기 위한 개발 전용 콘셉트 페이지입니다.
            </p>
          </div>
          <div className="rounded-full border border-border bg-secondary/60 px-4 py-2 text-ui-body-sm text-muted-foreground">
            Mock only · No API
          </div>
        </header>

        <Tabs defaultValue="hybrid" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-secondary p-1 md:w-[560px]">
            <TabsTrigger value="commerce" className="rounded-xl py-3">
              A 커머스
            </TabsTrigger>
            <TabsTrigger value="service" className="rounded-xl py-3">
              B 서비스
            </TabsTrigger>
            <TabsTrigger value="hybrid" className="rounded-xl py-3">
              C 하이브리드
            </TabsTrigger>
          </TabsList>

          <TabsContent value="commerce" className="mt-6">
            <CommerceConcept />
          </TabsContent>
          <TabsContent value="service" className="mt-6">
            <ServiceConcept />
          </TabsContent>
          <TabsContent value="hybrid" className="mt-6">
            <HybridConcept />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function CommerceConcept() {
  return (
    <ConceptFrame
      eyebrow="시안 A · 커머스 중심"
      title="내 라켓에 맞는 스트링을 빠르게 찾으세요"
      description="인기 스트링과 라켓 탐색을 첫 화면의 중심에 두어 쇼핑몰 경험을 강화합니다."
      ctas={["스트링 쇼핑하기", "교체서비스 신청"]}
      accent="상품 탐색 우선"
    >
      <ProductGrid title="인기 스트링 상품" />
      <TwoColumnSection
        leftTitle="라켓 둘러보기"
        leftText="신품 라켓은 브랜드와 플레이 성향 기준으로 탐색하고, 중고 라켓은 재고가 없을 때 준비 중 카드만 노출합니다."
        rightTitle="이용 안내"
        rightText="스트링 선택, 장착 신청, 배송/방문 수령까지 필요한 정보를 짧게 정리합니다."
      />
    </ConceptFrame>
  );
}

function ServiceConcept() {
  return (
    <ConceptFrame
      eyebrow="시안 B · 서비스 중심"
      title="스트링 교체, 방문도 택배도 간편하게"
      description="교체서비스 신청 전환을 최우선으로 두고, 처음 방문한 사용자가 다음 행동을 빠르게 고를 수 있게 설계합니다."
      ctas={["교체서비스 신청", "장착비 보기"]}
      accent="서비스 신청 우선"
    >
      <SituationPicker />
      <ProcessSteps />
      <ProductGrid title="추천 스트링" compact />
      <GuideStrip
        title="Q&A / 운영 안내"
        items={["방문 장착 가능 시간", "택배 접수 방법", "장착비 기준", "추천 장력 상담"]}
      />
    </ConceptFrame>
  );
}

function HybridConcept() {
  return (
    <ConceptFrame
      eyebrow="시안 C · 추천 · 서비스형 이커머스"
      title="테니스 장비 선택부터 스트링 교체까지 한 번에"
      description="쇼핑과 교체서비스를 동시에 살리되, 처음 온 사용자도 목적별로 빠르게 진입할 수 있는 균형형 홈입니다."
      ctas={["교체서비스 신청", "스트링 쇼핑", "라켓 둘러보기"]}
      accent="추천 시안"
    >
      <QuickEntries />
      <SituationPicker />
      <ProductGrid title="인기 스트링" />
      <ProcessSteps />
      <TwoColumnSection
        leftTitle="이용 안내"
        leftText="스트링 선택이 어렵다면 성향 기반으로 추천받고, 방문·택배 중 편한 방식으로 신청합니다."
        rightTitle="공지사항"
        rightText="운영 시간, 입고 소식, 이벤트는 하단 보조 영역에서 compact하게 노출합니다."
      />
    </ConceptFrame>
  );
}

function ConceptFrame({
  eyebrow,
  title,
  description,
  ctas,
  accent,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  ctas: string[];
  accent: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-background via-secondary/40 to-background p-6 shadow-sm md:p-10 lg:p-12">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-ui-label font-semibold text-primary">{eyebrow}</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              {title}
            </h2>
            <p className="mt-5 max-w-2xl text-ui-body-lg text-muted-foreground">{description}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {ctas.map((cta, index) => (
                <Button
                  key={cta}
                  variant={index === 0 ? "default" : "secondary"}
                  size="tall"
                  className="w-full sm:w-auto"
                >
                  {cta}
                  <ArrowRight className="size-4" />
                </Button>
              ))}
            </div>
          </div>
          <Card className="bg-card/85 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-ui-label text-muted-foreground">Benchmark focus</p>
                <p className="mt-2 text-ui-section-title font-semibold">{accent}</p>
              </div>
              <Sparkles className="size-8 text-primary" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 text-ui-body-sm">
              {["넓은 데스크톱 폭", "모바일 1열 CTA", "실데이터 호출 없음", "공지 하단 보조"].map(
                (item) => (
                  <div key={item} className="rounded-2xl bg-secondary/70 p-4">
                    {item}
                  </div>
                ),
              )}
            </div>
          </Card>
        </div>
      </div>
      {children}
    </section>
  );
}

function ProductGrid({ title, compact = false }: { title: string; compact?: boolean }) {
  return (
    <section>
      <SectionTitle title={title} subtitle="시각 확인용 최소 mock 상품" />
      <div
        className={cn(
          "grid gap-4",
          compact ? "md:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        {strings.map((item) => (
          <Card key={item.name} className="p-5">
            <div className="mb-5 aspect-[4/3] rounded-2xl bg-gradient-to-br from-secondary to-background" />
            <p className="text-ui-label text-muted-foreground">{item.tag}</p>
            <h3 className="mt-2 font-semibold">{item.name}</h3>
            <p className="mt-3 text-ui-body-sm text-muted-foreground">{item.price}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function QuickEntries() {
  return (
    <section>
      <SectionTitle title="Quick Entry" subtitle="목적별 4개 진입점" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickEntries.map((item, index) => (
          <Card key={item} className="flex items-center gap-4 p-5">
            <div className="rounded-2xl bg-secondary p-3">
              {
                [
                  <Wrench key="w" />,
                  <Search key="s" />,
                  <PackageCheck key="p" />,
                  <Clock3 key="c" />,
                ][index]
              }
            </div>
            <span className="font-semibold">{item}</span>
          </Card>
        ))}
      </div>
    </section>
  );
}

function SituationPicker() {
  return (
    <section>
      <SectionTitle title="처음이라면" subtitle="상황 선택형 UX" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {situations.map((item) => (
          <Card key={item} className="p-5">
            <CheckCircle2 className="mb-4 size-5 text-primary" />
            <p className="font-semibold">{item}</p>
            <p className="mt-2 text-ui-body-sm text-muted-foreground">
              추천 스트링과 신청 경로를 함께 안내합니다.
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function ProcessSteps() {
  return (
    <section>
      <SectionTitle title="교체 프로세스" subtitle="방문과 택배 모두 고려한 4단계" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {process.map((item, index) => (
          <Card key={item} className="p-5">
            <span className="text-ui-label text-muted-foreground">STEP {index + 1}</span>
            <h3 className="mt-3 font-semibold">{item}</h3>
            <p className="mt-2 text-ui-body-sm text-muted-foreground">
              필요한 정보만 짧게 확인하고 다음 단계로 이동합니다.
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function TwoColumnSection({
  leftTitle,
  leftText,
  rightTitle,
  rightText,
}: {
  leftTitle: string;
  leftText: string;
  rightTitle: string;
  rightText: string;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <InfoCard title={leftTitle} text={leftText} icon={<PackageCheck />} />
      <InfoCard title={rightTitle} text={rightText} icon={<Truck />} />
    </section>
  );
}

function GuideStrip({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <SectionTitle title={title} subtitle="하단 보조 정보" />
      <Card className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item} className="rounded-2xl bg-secondary/70 p-4 text-ui-body-sm">
            {item}
          </div>
        ))}
      </Card>
    </section>
  );
}

function InfoCard({ title, text, icon }: { title: string; text: string; icon: ReactNode }) {
  return (
    <Card className="p-6">
      <div className="mb-5 inline-flex rounded-2xl bg-secondary p-3 text-primary">{icon}</div>
      <h3 className="text-ui-card-title-lg font-semibold">{title}</h3>
      <p className="mt-3 text-ui-body text-muted-foreground">{text}</p>
    </Card>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <h2 className="text-ui-section-title font-semibold">{title}</h2>
      <p className="text-ui-body-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
