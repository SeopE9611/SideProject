import { getStringingPricingView } from "@/app/services/_lib/stringingPricingView";
import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero } from "@/components/public/PublicPageHero";
import { PublicSurface } from "@/components/public/PublicSurface";
import { SectionHeader } from "@/components/public/SectionHeader";
import { SummaryCard } from "@/components/public/SummaryCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CUSTOM_STRING_MOUNTING_FEE, STRINGING_POLICY_TEXT } from "@/lib/stringing-pricing-policy";
import {
  ArrowRight,
  Check,
  Clock,
  PackageCheck,
  Shield,
  ShoppingBag,
  Truck,
  Wrench,
  Zap,
} from "lucide-react";
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

export default async function PricingPage() {
  const { primarySummaries, otherSummary, hybridGuide } = await getStringingPricingView();

  const basicServices = [
    {
      name: "보유/커스텀 스트링 장착",
      price: `${CUSTOM_STRING_MOUNTING_FEE.toLocaleString("ko-KR")}원`,
      time: "30-45분",
      description: "보유한 스트링 또는 직접 입력 스트링 기준 장착비입니다.",
      features: ["장착비 고정", "스트링 상품가 별도 없음", "장력/세팅 상담 가능"],
      icon: Wrench,
    },
    {
      name: "스트링 상품 선택 장착",
      price: "상품가 + 장착비",
      time: "30-60분",
      description: "사이트에서 선택한 스트링 상품가와 상품별 장착비를 기준으로 안내합니다.",
      features: [
        "상품별 가격 기준",
        "주문/대여 연계 시 기존 결제내역 우선",
        "신청 방식에 따라 최종 금액 상이",
      ],
      icon: ShoppingBag,
    },
    {
      name: "패키지 적용 신청",
      time: "30-60분",
      description: "사용가능한 패키지 횟수가 있으면 교체비 대신 패키지 잔여횟수가 차감됩니다",
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

  return (
    <div className="min-h-screen bg-background">
      <PublicPageHero
        align="center"
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            장착 서비스 정책
          </span>
        }
        title="장착 비용 안내"
        description="신청 방식과 선택 상품에 따라 달라지는 비용 구조를 한눈에 확인하세요."
      />
      <SiteContainer variant="wide" className="py-8 md:py-12 space-y-8 md:space-y-12">
        <section className="space-y-4 md:space-y-6">
          <SectionHeader
            align="center"
            title="비용 계산 방식"
            description="먼저 내 신청 방식이 어디에 해당하는지 확인하면 최종 비용을 이해하기 쉽습니다."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {basicServices.map((service) => {
              const Icon = service.icon;
              return (
                <SummaryCard
                  key={service.name}
                  className="transition-[border-color,box-shadow,background-color] duration-200 hover:border-primary/30 hover:shadow-md"
                  contentClassName="space-y-4"
                >
                  <div className="space-y-2 text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/5">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <h3 className="text-ui-card-title-lg font-semibold leading-tight text-foreground">
                      {service.name}
                    </h3>
                    <div className="text-ui-page-title font-semibold text-foreground">
                      {service.price}
                    </div>
                    <div className="text-ui-body-sm text-muted-foreground flex items-center justify-center gap-1">
                      <Clock className="h-4 w-4" /> 소요시간: {service.time}
                    </div>
                  </div>
                  <p className="text-ui-body-sm text-muted-foreground break-keep">
                    {service.description}
                  </p>
                  <ul className="space-y-1">
                    {service.features.map((feature) => (
                      <li
                        key={feature}
                        className="text-ui-body-sm flex items-center gap-2 break-keep"
                      >
                        <Check className="h-4 w-4 text-success" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </SummaryCard>
              );
            })}
          </div>
          <PublicSurface
            variant="muted"
            padding="sm"
            className="text-ui-body-sm text-muted-foreground space-y-1 break-keep"
          >
            <p>• {STRINGING_POLICY_TEXT.product}</p>
            <p>• {STRINGING_POLICY_TEXT.package}</p>
            <p>• {STRINGING_POLICY_TEXT.dynamic}</p>
          </PublicSurface>
        </section>

        <section className="space-y-4 md:space-y-6">
          <SectionHeader
            align="center"
            title="스트링 가격대별 안내"
            description="등록된 스트링 상품의 실제 상품가와 장착비 데이터를 소재별로 요약했습니다."
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
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
                <SummaryCard
                  key={category.key}
                  className={`transition-[border-color,box-shadow,background-color] duration-200 hover:border-primary/30 hover:shadow-md ${hasProducts ? "" : "opacity-75"}`}
                  title={
                    <span className="flex items-center gap-2 break-keep leading-snug">
                      <Shield className="h-5 w-5 text-foreground" />
                      {category.label}
                    </span>
                  }
                  description={materialDescriptions[category.key]}
                  action={
                    <Badge variant={hasProducts ? "brand" : "secondary"} className="w-fit">
                      등록 상품 {category.count.toLocaleString("ko-KR")}개
                    </Badge>
                  }
                  contentClassName="space-y-4 text-ui-body-sm"
                >
                  {hasProducts ? (
                    <>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        <PublicSurface variant="muted" padding="sm">
                          <p className="text-ui-label font-medium text-muted-foreground">상품가</p>
                          <p className="mt-1 break-keep tabular-nums font-semibold text-foreground">
                            {productPriceRange}
                          </p>
                        </PublicSurface>
                        <PublicSurface variant="muted" padding="sm">
                          <p className="text-ui-label font-medium text-muted-foreground">장착비</p>
                          <p className="mt-1 break-keep tabular-nums font-semibold text-foreground">
                            {mountingFeeRange}
                          </p>
                        </PublicSurface>
                      </div>
                      <div className="space-y-2">
                        <p className="text-ui-label font-medium text-muted-foreground">
                          대표 브랜드
                        </p>
                        <div className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1">
                          {category.brands.length ? (
                            category.brands.map((brand) => (
                              <Badge
                                key={brand}
                                variant="secondary"
                                className="max-w-[10rem] shrink-0 whitespace-normal break-keep text-left leading-snug"
                              >
                                {brand}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-ui-body-sm leading-relaxed text-muted-foreground bp-md:text-ui-body-lg">
                              데이터 없음
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-ui-label font-medium text-muted-foreground">대표 상품</p>
                        <div className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1">
                          {category.productNames.length ? (
                            category.productNames.map((name) => (
                              <Badge
                                key={name}
                                variant="outline"
                                className="max-w-[12rem] shrink-0 whitespace-normal break-words text-left leading-snug sm:max-w-[14rem]"
                              >
                                {name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-ui-body-sm leading-relaxed text-muted-foreground bp-md:text-ui-body-lg">
                              데이터 없음
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <PublicSurface
                      variant="muted"
                      padding="sm"
                      className="text-muted-foreground break-keep"
                    >
                      현재 등록된 상품 데이터가 없습니다.
                    </PublicSurface>
                  )}
                </SummaryCard>
              );
            })}
          </div>
          {/* {otherSummary?.count ? (
            <Card className="border-dashed bg-muted/30">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-ui-body-lg">기타/미분류 상품</CardTitle>
                  <Badge variant="secondary">보조 분류</Badge>
                </div>
                <p className="text-ui-body-sm text-muted-foreground">
                  기타/미분류는 주요 소재 분류에 자동 매칭되지 않은 상품입니다. 등록 상품과 소재값을 확인해 필요하면 관리자 상품 정보에서 소재 분류를 정리해 주세요.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 text-ui-body-sm text-muted-foreground">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-ui-label font-medium">등록 상품</p>
                    <p className="mt-1 break-keep tabular-nums font-semibold text-foreground">{otherSummary.count.toLocaleString("ko-KR")}개</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-ui-label font-medium">상품가</p>
                    <p className="mt-1 break-keep tabular-nums font-semibold text-foreground">{formatRange(otherSummary.minPrice, otherSummary.maxPrice, "가격 데이터 확인 필요")}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-ui-label font-medium">장착비</p>
                    <p className="mt-1 break-keep tabular-nums font-semibold text-foreground">{formatMountingFeeRange(otherSummary.minMountingFee, otherSummary.maxMountingFee, "장착비 미등록")}</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-ui-label font-medium">대표 브랜드</p>
                    <div className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1">
                      {otherSummary.brands.length ? (
                        otherSummary.brands.map((brand) => (
                          <Badge key={brand} variant="secondary" className="max-w-[10rem] shrink-0 whitespace-normal break-keep text-left leading-snug">
                            {brand}
                          </Badge>
                        ))
                      ) : (
                        <span>데이터 없음</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-ui-label font-medium">대표 상품</p>
                    <div className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1">
                      {otherSummary.productNames.length ? (
                        otherSummary.productNames.map((name) => (
                          <Badge key={name} variant="outline" className="max-w-[12rem] shrink-0 whitespace-normal break-words text-left leading-snug sm:max-w-[14rem]">
                            {name}
                          </Badge>
                        ))
                      ) : (
                        <span>데이터 없음</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-ui-label font-medium">등록 소재값</p>
                    <div className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1">
                      {otherSummary.materialLabels.length ? (
                        otherSummary.materialLabels.map((material) => (
                          <Badge key={material} variant="secondary" className="max-w-[12rem] shrink-0 whitespace-normal break-keep text-left leading-snug">
                            {material}
                          </Badge>
                        ))
                      ) : (
                        <span>데이터 없음</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null} */}
        </section>

        {/* <section className="space-y-4 md:space-y-6">
          <div className="text-center">
            <h2 className="text-ui-section-title font-semibold bp-md:text-ui-section-title-lg">하이브리드 조합 안내</h2>
            <p className="mt-2 text-ui-body-sm leading-relaxed text-muted-foreground">하이브리드는 단일 소재 가격표와 분리해 조합 기준으로 안내합니다.</p>
          </div>
          <Card className="transition-[border-color,box-shadow,background-color] duration-200 hover:border-primary/30 hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 break-keep leading-snug">
                <Shield className="h-5 w-5 text-foreground" />
                하이브리드는 메인/크로스 스트링 조합입니다
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-ui-body-sm">
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>하이브리드는 하나의 소재가 아니라 메인/크로스 스트링 조합입니다.</p>
                <p>따라서 단일 소재 가격표와 1:1로 비교하기보다 선택한 조합 기준으로 최종 금액을 확인해야 합니다.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-ui-label font-medium text-muted-foreground">등록 상품 수</p>
                  <p className="mt-1 break-keep tabular-nums font-semibold text-foreground">{hybridGuide.count.toLocaleString("ko-KR")}개</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-3 md:col-span-2">
                  <p className="text-ui-label font-medium text-muted-foreground">대표 조합</p>
                  <p className="mt-1 line-clamp-2 break-words font-semibold text-foreground">{hybridGuide.representativeMaterials.length ? hybridGuide.representativeMaterials.join(", ") : "데이터 없음"}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-ui-label font-medium text-muted-foreground">대표 상품</p>
                <div className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1">
                  {hybridGuide.representativeProducts.length ? (
                    hybridGuide.representativeProducts.map((name) => (
                      <Badge key={name} variant="outline" className="max-w-[12rem] shrink-0 whitespace-normal break-words text-left leading-snug sm:max-w-[14rem]">
                        {name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-ui-body-sm leading-relaxed text-muted-foreground bp-md:text-ui-body-lg">데이터 없음</span>
                  )}
                </div>
              </div>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/products?from=apply&material=hybrid" className="group">
                  하이브리드 상품 보기
                  <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section> */}

        <section className="grid gap-4 md:gap-6 lg:grid-cols-2">
          <SummaryCard title="추가 서비스 / 무료 지원" contentClassName="space-y-3">
            {additionalServices.map((service) => (
              <PublicSurface key={service.name} padding="sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <p className="font-medium">{service.name}</p>
                  <Badge variant="secondary" className="shrink-0 whitespace-nowrap">
                    {service.policy}
                  </Badge>
                </div>
                <p className="text-ui-body-sm text-muted-foreground mt-1">{service.description}</p>
              </PublicSurface>
            ))}
          </SummaryCard>

          <SummaryCard
            title={
              <span className="flex items-center gap-2 break-keep leading-snug">
                <Truck className="h-5 w-5" />
                예약 정책 안내
              </span>
            }
            contentClassName="space-y-2 text-ui-body-sm leading-relaxed text-muted-foreground"
          >
            <p>• 일반 소요 시간은 30~60분이며, 예약 상황에 따라 달라질 수 있습니다.</p>
            <p>• 스트링 교체는 예약제 운영이므로 신청서 또는 문의 후 방문해 주세요.</p>
          </SummaryCard>
        </section>

        <PublicSurface
          variant="muted"
          className="space-y-2 text-ui-body-sm leading-relaxed text-muted-foreground"
        >
          <h2 className="flex items-center gap-2 break-keep text-ui-card-title-lg font-semibold leading-snug text-foreground">
            <Zap className="h-5 w-5" />
            주의사항 / FAQ
          </h2>
          <p>• 스트링 포함 가격은 고정값이 아니며 선택 상품과 신청 방식에 따라 달라집니다.</p>
          <p>• 패키지 적용 가능 시 교체비가 무료입니다.</p>
          <p>
            • 주문/대여 기반 신청은 이미 결제된 내역과 이번 신청의 별도 결제 항목을 구분해
            안내됩니다.
          </p>
        </PublicSurface>

        <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/services/apply" className="group">
              교체 서비스 신청하기
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link href="/products?from=apply" className="group">
              스트링 먼저 고르기
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </SiteContainer>
    </div>
  );
}
