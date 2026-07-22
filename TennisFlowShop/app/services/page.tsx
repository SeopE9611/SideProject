import { getStringingPricingView } from "@/app/services/_lib/stringingPricingView";
import SiteContainer from "@/components/layout/SiteContainer";
import { InteractiveCard } from "@/components/public/InteractiveCard";
import { PublicSurface } from "@/components/public/PublicSurface";
import { SectionHeader } from "@/components/public/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CUSTOM_STRING_MOUNTING_FEE } from "@/lib/stringing-pricing-policy";
import {
  ArrowRight,
  Award,
  CheckCircle,
  File,
  Grid2X2,
  MapPin,
  Package,
  Phone,
  Shield,
  ShoppingBag,
  Sliders,
  Target,
} from "lucide-react";
import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "장착 서비스",
};

const formatPriceRange = (
  min: number | null | undefined,
  max: number | null | undefined,
  emptyLabel = "-",
) => {
  if (min == null && max == null) return emptyLabel;
  if (min != null && max != null) {
    return min === max
      ? `${min.toLocaleString("ko-KR")}원`
      : `${min.toLocaleString("ko-KR")}~${max.toLocaleString("ko-KR")}원`;
  }

  const value = min ?? max;
  return value == null ? emptyLabel : `${value.toLocaleString("ko-KR")}원`;
};

const serviceStartOptions = [
  {
    badge: "빠른 신청",
    icon: <Grid2X2 className="h-7 w-7" aria-hidden />,
    title: "새 스트링으로 교체서비스 신청",
    description: "새 스트링을 고른 뒤 보유 라켓에 바로 장착 신청까지 이어갑니다.",
    steps: "스트링 선택 → 결제/장착 정보 입력 → 접수 완료",
    href: "/products?from=apply",
    cta: "새 스트링 선택하기",
    featured: true,
  },
  {
    badge: "라켓 구매/대여",
    icon: <Target className="h-7 w-7" aria-hidden />,
    title: "라켓 구매/대여 후 스트링 선택",
    description: "라켓을 구매하거나 대여한 뒤 스트링을 선택해 교체서비스까지 함께 진행합니다.",
    steps: "라켓 선택 → 스트링 선택 → 결제/접수",
    href: "/rackets?from=apply",
    cta: "라켓 구매/대여 시작하기",
    featured: false,
  },
  {
    badge: "보유 장비",
    icon: <File className="h-7 w-7" aria-hidden />,
    title: "보유 장비로 교체서비스 신청",
    description: "이미 가진 라켓이나 스트링으로 교체 작업만 맡기고 싶을 때 선택합니다.",
    steps: "교체서비스 정보 입력 → 결제/접수 → 작업 진행",
    href: "/services/apply?mode=single",
    cta: "보유 장비로 신청하기",
    featured: false,
  },
];

const serviceNoticeChips = [
  { title: "100% 예약제", description: "사전 예약 필수" },
  { title: "소요 시간", description: "30분~1시간" },
  { title: "방문 안내", description: "완료 10분 전 도착 권장" },
];

const serviceHubLinks = [
  {
    title: "패키지 비교",
    description: "횟수권과 이용 조건을 비교합니다.",
    href: "/services/packages",
    icon: <Package className="h-5 w-5" aria-hidden />,
  },
  {
    title: "가격 안내",
    description: "상품가·장착비·패키지 차감을 확인합니다.",
    href: "/services/pricing",
    icon: <ShoppingBag className="h-5 w-5" aria-hidden />,
  },
  {
    title: "장력 가이드",
    description: "플레이 성향별 장력 선택 기준을 봅니다.",
    href: "/services/tension-guide",
    icon: <Sliders className="h-5 w-5" aria-hidden />,
  },
  {
    title: "매장 위치",
    description: "방문 가능 매장과 안내를 확인합니다.",
    href: "/services/locations",
    icon: <MapPin className="h-5 w-5" aria-hidden />,
  },
  {
    title: "스트링 추천",
    description: "내 플레이에 맞는 스트링 후보를 좁힙니다.",
    href: "/products/recommend",
    icon: <Target className="h-5 w-5" aria-hidden />,
  },
  {
    title: "자주 묻는 질문",
    description: "예약·신청 전 궁금한 점을 확인합니다.",
    href: "/board/qna",
    icon: <CheckCircle className="h-5 w-5" aria-hidden />,
  },
];

const processSteps = [
  {
    step: 1,
    title: "라켓 상태 점검",
    description: "프레임과 그로밋 상태를 먼저 확인합니다.",
    icon: <Shield className="h-6 w-6" aria-hidden />,
  },
  {
    step: 2,
    title: "정밀 스트링 제거",
    description: "라켓 손상을 줄이도록 기존 스트링을 제거합니다.",
    icon: <Target className="h-6 w-6" aria-hidden />,
  },
  {
    step: 3,
    title: "정확한 장력 설정",
    description: "전자식 머신으로 요청 장력을 세팅합니다.",
    icon: <Award className="h-6 w-6" aria-hidden />,
  },
  {
    step: 4,
    title: "품질 확인 및 마무리",
    description: "텐션과 패턴을 확인한 뒤 마무리합니다.",
    icon: <CheckCircle className="h-6 w-6" aria-hidden />,
  },
];

export default async function ServicesPage() {
  const { primarySummaries, hybridGuide } = await getStringingPricingView();

  return (
    <div className="flex flex-col bg-background">
      <header className="border-b border-border bg-muted/30 py-7 bp-sm:py-9">
        <SiteContainer>
          <div className="grid gap-5 bp-lg:grid-cols-[minmax(0,1fr)_24rem] bp-lg:items-center">
            <div className="max-w-3xl space-y-4">
              <p className="text-ui-label font-medium text-primary">스트링 교체 서비스</p>
              <h1 className="text-balance font-ui-bold text-ui-page-title  text-foreground bp-sm:text-ui-page-title-lg">
                스트링 교체, 내 상황에 맞는 흐름부터 선택하세요.
              </h1>
              <p className="text-pretty text-ui-body leading-relaxed text-muted-foreground bp-sm:text-ui-body-lg">
                새 스트링 구매부터 라켓 구매·대여 연계, 보유 장비 장착까지 필요한 시작점을 한곳에서
                안내합니다.
              </p>
              <div className="grid gap-2 bp-sm:flex bp-sm:flex-wrap">
                <Button
                  variant="highlight"
                  asChild
                  wrap="responsive"
                  className="w-full bp-sm:w-auto"
                >
                  <Link href="#service-start">신청 방식 선택하기</Link>
                </Button>
                <Button variant="outline" asChild wrap="responsive" className="w-full bp-sm:w-auto">
                  <Link href="#pricing">가격 구조 확인하기</Link>
                </Button>
              </div>
            </div>

            <PublicSurface variant="inverse" className="space-y-3">
              {serviceNoticeChips.map((notice) => (
                <div
                  key={notice.title}
                  className="flex items-start justify-between gap-4 border-b border-surface-inverse-foreground/15 pb-3 last:border-b-0 last:pb-0"
                >
                  <span className="text-ui-body-sm font-ui-medium text-surface-inverse-foreground">
                    {notice.title}
                  </span>
                  <span className="text-right text-ui-body-sm leading-relaxed text-surface-inverse-muted">
                    {notice.description}
                  </span>
                </div>
              ))}
            </PublicSurface>
          </div>
        </SiteContainer>
      </header>

      <section
        className="scroll-mt-[calc(var(--header-h)+1rem)] py-8 bp-sm:py-10 bp-lg:py-12"
        id="service-start"
      >
        <SiteContainer>
          <SectionHeader
            title="어떤 방식으로 시작할까요?"
            description="현재 보유한 장비와 구매 계획에 맞는 시작점을 선택하면 신청 흐름이 이어집니다."
            className="mb-5 bp-sm:mb-7"
          />
          <div className="grid gap-4 bp-sm:grid-cols-2 bp-lg:grid-cols-12">
            {serviceStartOptions.map((item) => (
              <InteractiveCard
                key={item.title}
                href={item.href}
                className={`group flex h-full min-w-0 flex-col ${item.featured ? "border-brand-highlight-ink/35 bg-brand-highlight-muted bp-sm:col-span-2 bp-lg:col-span-6" : "bp-lg:col-span-3"}`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${item.featured ? "border-brand-highlight-ink/30 text-brand-highlight-ink" : "border-border bg-background text-muted-foreground"}`}
                  >
                    {item.icon}
                  </div>
                  <Badge variant={item.featured ? "signal" : "secondary"} wrap="normal">
                    {item.badge}
                  </Badge>
                </div>
                <h3 className="text-ui-card-title-lg font-ui-medium leading-snug text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-ui-body-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
                <div className="my-4 border-t border-border/80 pt-3 text-ui-body-sm leading-relaxed text-muted-foreground">
                  {item.steps}
                </div>
                <span
                  className={`mt-auto inline-flex items-center gap-2 text-ui-body-sm font-ui-medium ${item.featured ? "text-brand-highlight-ink" : "text-foreground"}`}
                >
                  {item.cta}
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden
                  />
                </span>
              </InteractiveCard>
            ))}
          </div>
        </SiteContainer>
      </section>

      <section className="py-8 bp-sm:py-10 bp-lg:py-12">
        <SiteContainer>
          <SectionHeader
            title="신청 전에 필요한 안내를 골라보세요"
            description="가격·패키지·장력·매장 안내는 전문 페이지에서 더 자세히 확인할 수 있습니다."
            className="mb-5 bp-sm:mb-7"
          />
          <PublicSurface padding="none" className="overflow-hidden">
            <div className="grid bp-sm:grid-cols-2 bp-lg:grid-cols-3">
              {serviceHubLinks.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group flex min-w-0 items-start gap-3 border-b border-border p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset bp-sm:border-r bp-lg:[&:nth-child(3n)]:border-r-0 bp-sm:[&:nth-last-child(-n+2)]:border-b-0 bp-lg:[&:nth-last-child(-n+3)]:border-b-0"
                >
                  <span className="mt-0.5 text-muted-foreground group-hover:text-primary">
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block text-ui-body-sm font-ui-medium text-foreground">
                      {item.title}
                    </span>
                    <span className="block text-ui-body-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  <ArrowRight
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
                    aria-hidden
                  />
                </Link>
              ))}
            </div>
            <Link
              href="tel:01052185248"
              className="flex flex-col gap-2 border-t border-border bg-muted/25 p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset bp-sm:flex-row bp-sm:items-center bp-sm:justify-between"
            >
              <span className="flex items-center gap-3 text-ui-body-sm font-ui-medium text-foreground">
                <Phone className="h-4 w-4 text-primary" aria-hidden />
                전화 상담
              </span>
              <span className="text-ui-body-sm leading-relaxed text-muted-foreground">
                <span className="tabular-nums text-foreground">010-5218-5248</span> · 평일
                10:00-22:00, 토요일 09:00-18:00
              </span>
            </Link>
          </PublicSurface>
        </SiteContainer>
      </section>

      <section
        className="scroll-mt-[calc(var(--header-h)+1rem)] bg-muted/30 py-8 bp-sm:py-10 bp-lg:py-12"
        id="pricing"
      >
        <SiteContainer>
          <div className="grid gap-6 bp-lg:grid-cols-[0.9fr_1.1fr] bp-lg:items-start">
            <div className="space-y-4">
              <p className="text-ui-label font-medium text-primary">가격 구조</p>
              <h2 className="text-ui-section-title-lg font-ui-bold tracking-normal text-foreground">
                신청 방식에 따라 비용이 달라집니다
              </h2>
              <div className="space-y-3 text-ui-body-sm leading-relaxed text-muted-foreground">
                <p>
                  <span className="font-ui-medium text-foreground">보유/커스텀 스트링 장착비</span>:{" "}
                  <span className="whitespace-nowrap tabular-nums">
                    {CUSTOM_STRING_MOUNTING_FEE.toLocaleString("ko-KR")}원
                  </span>
                </p>
                <p>
                  <span className="font-ui-medium text-foreground">스트링 상품 선택</span>: 상품가와
                  상품별 장착비 기준
                </p>
                <p>
                  <span className="font-ui-medium text-foreground">패키지 적용</span>: 사용 가능한
                  잔여 횟수 차감
                </p>
              </div>
              <Button variant="outline" asChild wrap="responsive" className="w-full bp-sm:w-auto">
                <Link href="/services/pricing">전체 가격 안내 보기</Link>
              </Button>
              <div className="border-t border-border pt-3 text-ui-body-sm leading-relaxed text-muted-foreground">
                장력 추천: 무료 안내 · 스트링 추천: 무료 안내 · 라켓 그립 교체: 별도 문의
              </div>
            </div>
            <PublicSurface padding="none" className="overflow-hidden">
              <div className="hidden grid-cols-[1.1fr_0.7fr_1fr_1fr] border-b border-border bg-muted/40 px-4 py-3 text-ui-label font-medium text-muted-foreground bp-sm:grid">
                <span>소재</span>
                <span>상품</span>
                <span>상품 가격</span>
                <span>장착비</span>
              </div>
              {primarySummaries.map((cat) => (
                <div
                  key={cat.key}
                  className="grid gap-2 border-b border-border px-4 py-3 text-ui-body-sm last:border-b-0 bp-sm:grid-cols-[1.1fr_0.7fr_1fr_1fr]"
                >
                  <div className="font-ui-medium text-foreground">{cat.label}</div>
                  {cat.count === 0 ? (
                    <div className="text-muted-foreground bp-sm:col-span-3">
                      등록된 상품 데이터 없음
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between gap-3 bp-sm:block">
                        <span className="text-muted-foreground bp-sm:hidden">등록 상품 개수</span>
                        <span className="whitespace-nowrap tabular-nums">
                          {cat.count.toLocaleString("ko-KR")}개
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 bp-sm:block">
                        <span className="text-muted-foreground bp-sm:hidden">상품 가격 범위</span>
                        <span className="whitespace-nowrap tabular-nums">
                          {formatPriceRange(cat.minPrice, cat.maxPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 bp-sm:block">
                        <span className="text-muted-foreground bp-sm:hidden">장착비 범위</span>
                        <span className="whitespace-nowrap tabular-nums">
                          {formatPriceRange(cat.minMountingFee, cat.maxMountingFee)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div className="grid gap-2 px-4 py-3 text-ui-body-sm bp-sm:grid-cols-[1.1fr_2.7fr]">
                <div className="font-ui-medium text-foreground">하이브리드 조합</div>
                <div className="text-muted-foreground">
                  등록된 하이브리드 상품 개수{" "}
                  <span className="whitespace-nowrap tabular-nums text-foreground">
                    {hybridGuide.count.toLocaleString("ko-KR")}개
                  </span>
                </div>
              </div>
            </PublicSurface>
          </div>
        </SiteContainer>
      </section>

      <section className="py-8 bp-sm:py-10 bp-lg:py-12">
        <SiteContainer>
          <PublicSurface variant="inverse" className="space-y-5">
            <div className="max-w-2xl space-y-2">
              <p className="text-ui-label font-medium text-surface-inverse-muted">
                전문적인 프로세스
              </p>
              <h2 className="text-ui-section-title-lg font-ui-bold text-surface-inverse-foreground">
                스트링 장착 과정
              </h2>
            </div>
            <ol className="grid gap-0 bp-sm:grid-cols-2 bp-lg:grid-cols-4">
              {processSteps.map((step) => (
                <li
                  key={step.step}
                  className="border-t border-surface-inverse-foreground/15 py-4 bp-sm:px-4 bp-sm:[&:nth-child(2n)]:border-l bp-lg:border-l bp-lg:first:border-l-0"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-highlight-muted text-ui-body-sm font-ui-medium text-brand-highlight-ink">
                      {step.step}
                    </span>
                    <span className="text-brand-highlight-ink">{step.icon}</span>
                  </div>
                  <h3 className="text-ui-body font-ui-medium text-surface-inverse-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-ui-body-sm leading-relaxed text-surface-inverse-muted">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </PublicSurface>
        </SiteContainer>
      </section>

      <section className="pb-10 pt-2 bp-sm:pb-12 bp-lg:pb-16">
        <SiteContainer>
          <PublicSurface className="flex flex-col gap-4 bp-lg:flex-row bp-lg:items-center bp-lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-ui-section-title font-ui-bold text-foreground">
                준비됐다면 신청 방식부터 선택하세요.
              </h2>
              <p className="text-ui-body-sm leading-relaxed text-muted-foreground">
                보유 장비와 구매 계획에 맞는 시작점을 고르면 필요한 신청 화면으로 이어집니다.
              </p>
            </div>
            <div className="grid gap-2 bp-sm:flex bp-sm:flex-wrap">
              <Button variant="highlight" asChild wrap="responsive" className="w-full bp-sm:w-auto">
                <Link href="#service-start">신청 방식 선택하기</Link>
              </Button>
              <Button variant="outline" asChild wrap="responsive" className="w-full bp-sm:w-auto">
                <Link href="/reviews">서비스 후기 보기</Link>
              </Button>
            </div>
          </PublicSurface>
        </SiteContainer>
      </section>
    </div>
  );
}
