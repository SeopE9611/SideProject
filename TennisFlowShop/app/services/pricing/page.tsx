import { getStringingPricingView } from "@/app/services/_lib/stringingPricingView";
import SiteContainer from "@/components/layout/SiteContainer";
import { PublicSurface } from "@/components/public/PublicSurface";
import { SectionHeader } from "@/components/public/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CUSTOM_STRING_MOUNTING_FEE, STRINGING_POLICY_TEXT } from "@/lib/stringing-pricing-policy";
import { ArrowRight, Check, Clock, PackageCheck, Shield, ShoppingBag, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "서비스 가격 안내",
};

const materialDescriptions: Record<string, string> = {
  polyester: "스핀/컨트롤 중심의 대표적인 스트링 소재입니다.",
  syntheticGut: "편안한 타구감과 범용성을 중시하는 입문·중급자용 소재입니다.",
  naturalGut: "부드러운 반발력과 프리미엄 타구감을 중시하는 소재입니다.",
};

const won = (n: number | null) => (n == null ? null : `${n.toLocaleString("ko-KR")}원`);
const mountingFeeWon = (n: number | null) => (n === 0 ? "무료" : won(n));

function formatRange(min: number | null, max: number | null, emptyLabel: string) {
  const minText = won(min);
  const maxText = won(max);

  if (!minText && !maxText) return emptyLabel;
  if (minText && maxText) return min === max ? minText : `${minText} ~ ${maxText}`;
  return minText ?? maxText ?? emptyLabel;
}

function formatMountingFeeRange(min: number | null, max: number | null, emptyLabel: string) {
  const minText = mountingFeeWon(min);
  const maxText = mountingFeeWon(max);

  if (!minText && !maxText) return emptyLabel;
  if (minText && maxText) return min === max ? minText : `${minText} ~ ${maxText}`;
  return minText ?? maxText ?? emptyLabel;
}

const costMethods = [
  {
    name: "보유/커스텀 스트링 장착",
    value: `${CUSTOM_STRING_MOUNTING_FEE.toLocaleString("ko-KR")}원`,
    valueType: "price",
    time: "30-45분",
    description: "보유한 스트링 또는 직접 입력 스트링 기준 장착비",
    features: ["장착비 고정", "스트링 상품가 별도 없음", "장력/세팅 상담 가능"],
    icon: Wrench,
  },
  {
    name: "스트링 상품 선택 장착",
    value: "상품가 + 장착비",
    valueType: "policy",
    time: "30-60분",
    description: "선택한 스트링 상품가와 상품별 장착비 기준",
    features: ["상품별 가격 기준", "신청 화면에서 최종 금액 확인", "주문/대여 연계 신청 가능"],
    icon: ShoppingBag,
  },
  {
    name: "패키지 적용 신청",
    value: "잔여 횟수 차감",
    valueType: "policy",
    time: "30-60분",
    description: "사용 가능한 패키지가 있으면 기존 정책에 따라 패키지 횟수가 차감됨",
    features: [
      "패키지 잔여 횟수 기준",
      "적용 불가 시 일반 정책으로 계산",
      "신청 방식에 따라 최종 금액 상이",
    ],
    icon: PackageCheck,
  },
];

const additionalServices = [
  {
    name: "장력 추천",
    policy: "무료 안내",
    description: "라켓/플레이 스타일 기준으로 권장 장력을 안내합니다.",
  },
  {
    name: "스트링 추천",
    policy: "무료 안내",
    description: "선호 타구감에 맞는 스트링 후보를 안내합니다.",
  },
  {
    name: "라켓 상태 점검",
    policy: "무료 점검",
    description: "프레임/그로밋 상태를 점검하고 교체 필요 여부를 안내합니다.",
  },
  {
    name: "그립 교체",
    policy: "별도 문의",
    description: "부자재/재고/작업 범위에 따라 비용이 달라질 수 있습니다.",
  },
];

function BadgeList({
  items,
  emptyLabel,
  variant = "secondary",
}: {
  items: string[];
  emptyLabel: string;
  variant?: "secondary" | "outline" | "brand";
}) {
  if (!items.length) {
    return (
      <span className="text-ui-body-sm leading-relaxed text-muted-foreground">{emptyLabel}</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item} variant={variant} wrap="normal">
          {item}
        </Badge>
      ))}
    </div>
  );
}

export default async function PricingPage() {
  const { primarySummaries, otherSummary, hybridGuide } = await getStringingPricingView();
  const hasOtherSummary = Boolean(otherSummary && otherSummary.count > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-muted/30 py-7 bp-sm:py-9">
        <SiteContainer>
          <div className="grid gap-5 bp-lg:grid-cols-[minmax(0,1fr)_24rem] bp-lg:items-center">
            <div className="max-w-3xl space-y-4">
              <p className="text-ui-label font-medium text-primary">장착 서비스 가격</p>
              <h1 className="text-balance font-ui-bold text-ui-page-title font-semibold text-foreground bp-sm:text-ui-page-title-lg">
                최종 비용은 선택한 신청 방식으로 결정됩니다.
              </h1>
              <p className="text-pretty text-ui-body leading-relaxed text-muted-foreground bp-sm:text-ui-body-lg">
                보유 스트링 장착, 스트링 상품 선택, 패키지 적용 방식에 따라 비용 구성이 달라집니다.
              </p>
              <div className="grid gap-2 bp-sm:flex bp-sm:flex-wrap">
                <Button
                  variant="highlight"
                  asChild
                  wrap="responsive"
                  className="w-full bp-sm:w-auto"
                >
                  <Link href="#cost-methods">비용 방식 확인하기</Link>
                </Button>
                <Button variant="outline" asChild wrap="responsive" className="w-full bp-sm:w-auto">
                  <Link href="/services">서비스 허브로 돌아가기</Link>
                </Button>
              </div>
            </div>

            <PublicSurface variant="feature" className="space-y-3 bg-muted/30">
              {["신청 방식 확인", "상품 또는 패키지 선택", "신청 화면에서 최종 금액 확인"].map(
                (step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-highlight text-ui-label font-semibold text-brand-highlight-foreground">
                      {index + 1}
                    </span>
                    <span className="text-ui-body-sm font-medium text-foreground">{step}</span>
                  </div>
                ),
              )}
            </PublicSurface>
          </div>
        </SiteContainer>
      </header>

      <SiteContainer variant="wide" className="space-y-8 py-8 bp-md:space-y-12 bp-md:py-12">
        <section
          id="cost-methods"
          className="scroll-mt-[calc(var(--header-h)+1rem)] space-y-4 bp-md:space-y-6"
        >
          <SectionHeader
            title="신청 방식별 비용 계산 구조"
            description="먼저 내 신청 방식이 어디에 해당하는지 확인하면 최종 비용을 이해하기 쉽습니다."
          />
          <PublicSurface padding="none" className="overflow-hidden">
            <div className="grid bp-md:grid-cols-3">
              {costMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <article
                    key={method.name}
                    className="space-y-4 border-b border-border p-5 last:border-b-0 bp-md:border-b-0 bp-md:border-r bp-md:last:border-r-0 bp-md:p-6"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted/30"
                        aria-hidden
                      >
                        <Icon className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <h3 className="text-ui-card-title font-semibold leading-snug text-foreground">
                          {method.name}
                        </h3>
                        <p className="text-ui-body-sm leading-relaxed text-muted-foreground">
                          {method.description}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-ui-label font-medium text-muted-foreground">가격/정책</p>
                      <p
                        className={
                          method.valueType === "price"
                            ? "mt-1 text-ui-section-title font-semibold tabular-nums text-foreground"
                            : "mt-1 text-ui-card-title-lg font-semibold text-primary"
                        }
                      >
                        {method.value}
                      </p>
                    </div>
                    <p className="flex items-center gap-2 text-ui-body-sm text-muted-foreground">
                      <Clock className="h-4 w-4" aria-hidden /> 소요시간: {method.time}
                    </p>
                    <ul className="space-y-1.5">
                      {method.features.slice(0, 3).map((feature) => (
                        <li
                          key={feature}
                          className="flex gap-2 text-ui-body-sm leading-relaxed text-foreground"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </PublicSurface>
        </section>

        <section className="space-y-4 bp-md:space-y-6">
          <SectionHeader
            title="소재별 실제 가격 범위"
            description="현재 공개 중인 스트링 상품의 상품가와 장착비를 소재별로 비교합니다."
          />
          <PublicSurface padding="none" className="overflow-hidden">
            <div className="hidden border-b border-border bg-muted/30 px-5 py-3 text-ui-label font-medium text-muted-foreground bp-md:grid bp-md:grid-cols-[1.4fr_0.8fr_1fr_1fr] bp-md:gap-4">
              <span>소재</span>
              <span>등록 상품</span>
              <span>상품 가격</span>
              <span>장착비</span>
            </div>
            <div className="divide-y divide-border">
              {primarySummaries.map((category) => {
                const hasProducts = category.count > 0;
                const productPriceRange = formatRange(
                  category.minPrice,
                  category.maxPrice,
                  "가격 데이터 확인 필요",
                );
                const mountingFeeRange = formatMountingFeeRange(
                  category.minMountingFee,
                  category.maxMountingFee,
                  "장착비 미등록",
                );

                return (
                  <article key={category.key} className="p-5 bp-md:p-6">
                    <div className="grid gap-4 bp-md:grid-cols-[1.4fr_0.8fr_1fr_1fr] bp-md:items-start">
                      <div className="space-y-2">
                        <h3 className="flex items-center gap-2 text-ui-card-title-lg font-semibold leading-snug text-foreground">
                          <Shield className="h-5 w-5" aria-hidden />
                          {category.label}
                        </h3>
                        <p className="text-ui-body-sm leading-relaxed text-muted-foreground">
                          {materialDescriptions[category.key]}
                        </p>
                        {!hasProducts ? (
                          <p className="text-ui-body-sm font-medium text-foreground">
                            등록된 상품 데이터 없음
                          </p>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2 bp-md:block">
                        <span className="text-ui-label font-medium text-muted-foreground bp-md:hidden">
                          등록 상품
                        </span>
                        <span className="text-ui-body-sm font-semibold tabular-nums text-foreground">
                          {category.count.toLocaleString("ko-KR")}개
                        </span>
                      </div>
                      <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2 bp-md:block">
                        <span className="text-ui-label font-medium text-muted-foreground bp-md:hidden">
                          상품 가격
                        </span>
                        <span className="text-ui-body-sm font-semibold tabular-nums leading-relaxed text-foreground">
                          {productPriceRange}
                        </span>
                      </div>
                      <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2 bp-md:block">
                        <span className="text-ui-label font-medium text-muted-foreground bp-md:hidden">
                          장착비
                        </span>
                        <span className="text-ui-body-sm font-semibold tabular-nums leading-relaxed text-foreground">
                          {mountingFeeRange}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 bp-md:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-ui-label font-medium text-muted-foreground">
                          대표 브랜드
                        </p>
                        <BadgeList items={category.brands} emptyLabel="데이터 없음" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-ui-label font-medium text-muted-foreground">대표 상품</p>
                        <BadgeList
                          items={category.productNames}
                          emptyLabel="데이터 없음"
                          variant="outline"
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </PublicSurface>
        </section>

        <section className={hasOtherSummary ? "grid gap-4 bp-lg:grid-cols-2" : "grid gap-4"}>
          {hasOtherSummary && otherSummary ? (
            <PublicSurface className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-ui-card-title-lg font-semibold text-foreground">기타 소재</h2>
                <Badge variant="secondary">보조 분류</Badge>
              </div>
              <div className="grid gap-3 bp-sm:grid-cols-3">
                <div>
                  <p className="text-ui-label text-muted-foreground">등록 상품 수</p>
                  <p className="mt-1 font-semibold tabular-nums text-foreground">
                    {otherSummary.count.toLocaleString("ko-KR")}개
                  </p>
                </div>
                <div>
                  <p className="text-ui-label text-muted-foreground">상품가 범위</p>
                  <p className="mt-1 font-semibold tabular-nums text-foreground">
                    {formatRange(
                      otherSummary.minPrice,
                      otherSummary.maxPrice,
                      "가격 데이터 확인 필요",
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-ui-label text-muted-foreground">장착비 범위</p>
                  <p className="mt-1 font-semibold tabular-nums text-foreground">
                    {formatMountingFeeRange(
                      otherSummary.minMountingFee,
                      otherSummary.maxMountingFee,
                      "장착비 미등록",
                    )}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 bp-sm:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-ui-label text-muted-foreground">대표 브랜드</p>
                  <BadgeList items={otherSummary.brands} emptyLabel="데이터 없음" />
                </div>
                <div className="space-y-2">
                  <p className="text-ui-label text-muted-foreground">대표 상품</p>
                  <BadgeList
                    items={otherSummary.productNames}
                    emptyLabel="데이터 없음"
                    variant="outline"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-ui-label text-muted-foreground">등록 소재값</p>
                  <BadgeList items={otherSummary.materialLabels} emptyLabel="데이터 없음" />
                </div>
              </div>
            </PublicSurface>
          ) : null}

          <PublicSurface className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-ui-card-title-lg font-semibold text-foreground">
                하이브리드 조합
              </h2>
              <p className="text-ui-body-sm leading-relaxed text-muted-foreground">
                하이브리드는 단일 소재가 아니라 메인·크로스 스트링 조합이므로 선택한 조합을 기준으로
                최종 금액을 확인합니다.
              </p>
            </div>
            {hybridGuide.count === 0 ? (
              <p className="text-ui-body-sm font-medium text-foreground">
                현재 등록된 하이브리드 상품이 없습니다.
              </p>
            ) : (
              <>
                <div className="grid gap-3 bp-sm:grid-cols-2">
                  <div>
                    <p className="text-ui-label text-muted-foreground">등록 상품 수</p>
                    <p className="mt-1 font-semibold tabular-nums text-foreground">
                      {hybridGuide.count.toLocaleString("ko-KR")}개
                    </p>
                  </div>
                  <div>
                    <p className="text-ui-label text-muted-foreground">대표 조합</p>
                    <div className="mt-2">
                      <BadgeList
                        items={hybridGuide.representativeMaterials}
                        emptyLabel="데이터 없음"
                        variant="brand"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-ui-label text-muted-foreground">대표 상품</p>
                  <BadgeList
                    items={hybridGuide.representativeProducts}
                    emptyLabel="데이터 없음"
                    variant="outline"
                  />
                </div>
              </>
            )}
          </PublicSurface>
        </section>

        <section className="grid gap-4 bp-lg:grid-cols-2">
          <PublicSurface className="space-y-4">
            <h2 className="text-ui-card-title-lg font-semibold text-foreground">
              무료 지원 및 추가 안내
            </h2>
            <div className="grid gap-3 bp-sm:grid-cols-2">
              {additionalServices.map((service) => (
                <div key={service.name} className="border-t border-border pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{service.name}</h3>
                    <Badge variant="secondary">{service.policy}</Badge>
                  </div>
                  <p className="mt-1 text-ui-body-sm leading-relaxed text-muted-foreground">
                    {service.description}
                  </p>
                </div>
              ))}
            </div>
          </PublicSurface>

          <PublicSurface className="space-y-4">
            <h2 className="text-ui-card-title-lg font-semibold text-foreground">예약 안내</h2>
            <ul className="space-y-2 text-ui-body-sm leading-relaxed text-muted-foreground">
              <li>• 일반 소요 시간은 30~60분입니다.</li>
              <li>• 작업 시간은 예약 상황에 따라 달라질 수 있습니다.</li>
              <li>• 스트링 교체는 예약제로 운영됩니다.</li>
              <li>• 신청서 작성 또는 문의 후 방문해 주세요.</li>
            </ul>
          </PublicSurface>
        </section>

        <PublicSurface variant="inverse" className="space-y-4">
          <h2 className="text-ui-card-title-lg font-semibold text-surface-inverse-foreground">
            결제 전 확인하세요
          </h2>
          <div className="grid gap-3 bp-md:grid-cols-3">
            {[
              STRINGING_POLICY_TEXT.product,
              STRINGING_POLICY_TEXT.package,
              STRINGING_POLICY_TEXT.dynamic,
            ].map((text, index) => (
              <p
                key={text}
                className="flex gap-3 text-ui-body-sm leading-relaxed text-surface-inverse-muted"
              >
                <span className="font-semibold text-brand-highlight" aria-hidden>
                  {index + 1}
                </span>
                <span>{text}</span>
              </p>
            ))}
          </div>
          <div className="space-y-2 border-t border-surface-inverse-foreground/15 pt-4 text-ui-body-sm leading-relaxed text-surface-inverse-muted">
            <p>• 스트링 포함 가격은 고정값이 아닙니다.</p>
            <p>
              • 주문/대여 기반 신청은 이미 결제된 내역과 이번 신청의 별도 결제 항목을 구분합니다.
            </p>
            <p>• 예약 상황에 따라 작업 시간이 달라질 수 있습니다.</p>
          </div>
        </PublicSurface>

        <section className="rounded-2xl border border-border bg-muted/30 p-5 text-center bp-sm:p-6">
          <h2 className="font-ui-bold text-ui-section-title font-semibold text-foreground">
            신청 화면에서 최종 금액을 확인하세요.
          </h2>
          <p className="mt-2 text-ui-body-sm leading-relaxed text-muted-foreground">
            상품, 보유 스트링, 패키지 상태에 따라 실제 결제 또는 차감 방식이 확정됩니다.
          </p>
          <div className="mt-4 grid gap-2 bp-sm:flex bp-sm:justify-center">
            <Button
              asChild
              size="lg"
              variant="highlight"
              wrap="responsive"
              className="w-full bp-sm:w-auto"
            >
              <Link href="/services#service-start" className="group">
                교체서비스 시작하기
                <ArrowRight
                  className="transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              wrap="responsive"
              className="w-full bp-sm:w-auto"
            >
              <Link href="/products?from=apply" className="group">
                스트링 먼저 고르기
                <ArrowRight
                  className="transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              </Link>
            </Button>
          </div>
        </section>
      </SiteContainer>
    </div>
  );
}
