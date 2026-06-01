import { getStringingPricingView } from "@/app/services/_lib/stringingPricingView";
import HeroCourtBackdrop from "@/components/system/HeroCourtBackdrop";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CUSTOM_STRING_MOUNTING_FEE, STRINGING_POLICY_TEXT } from "@/lib/stringing-pricing-policy";
import { ArrowRight, Check, Clock, PackageCheck, Shield, ShoppingBag, Truck, Wrench, Zap } from "lucide-react";
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

function formatMountingFeeRange(
  min: number | null,
  max: number | null,
  emptyLabel: string,
) {
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
      features: ["상품별 가격 기준", "주문/대여 연계 시 기존 결제내역 우선", "신청 방식에 따라 최종 금액 상이"],
      icon: ShoppingBag,
    },
    {
      name: "패키지 적용 신청",
      time: "30-60분",
      description: "사용가능한 패키지 횟수가 있으면 교체비 대신 패키지 잔여횟수가 차감됩니다",
      features: ["패키지 잔여 횟수 기준", "적용 불가 시 일반 정책으로 계산", "신청 방식에 따라 최종 금액 상이"],
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
      <HeroCourtBackdrop opacity="soft" className="h-full w-full text-foreground" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-8 md:space-y-12">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-secondary border border-border px-4 py-2 rounded-full mb-4 md:mb-6">
            <Wrench className="h-5 w-5 text-foreground" />
            <span className="text-sm font-semibold text-foreground">장착 서비스 정책</span>
          </div>
          <h1 className="mb-3 text-2xl font-bold bp-md:text-3xl bp-lg:text-4xl">장착 비용 안내</h1>
          <p className="text-sm leading-relaxed text-muted-foreground bp-md:text-base">신청 방식과 선택 상품에 따라 달라지는 비용 구조를 한눈에 확인하세요.</p>
        </div>

        <section className="space-y-4 md:space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold bp-md:text-2xl">비용 계산 방식</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">먼저 내 신청 방식이 어디에 해당하는지 확인하면 최종 비용을 이해하기 쉽습니다.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {basicServices.map((service) => {
              const Icon = service.icon;
              return (
                <Card key={service.name} className="transition-[border-color,box-shadow,background-color] duration-200 hover:border-primary/30 hover:shadow-md">
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/5">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <CardTitle>{service.name}</CardTitle>
                    <div className="text-2xl font-bold text-foreground">{service.price}</div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <Clock className="h-4 w-4" /> 소요시간: {service.time}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3 break-keep">{service.description}</p>
                    <ul className="space-y-1">
                      {service.features.map((feature) => (
                        <li key={feature} className="text-sm flex items-center gap-2 break-keep">
                          <Check className="h-4 w-4 text-success" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-sm text-muted-foreground space-y-1 break-keep">
              <p>• {STRINGING_POLICY_TEXT.product}</p>
              <p>• {STRINGING_POLICY_TEXT.package}</p>
              <p>• {STRINGING_POLICY_TEXT.dynamic}</p>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4 md:space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold bp-md:text-2xl">스트링 가격대별 안내</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">등록된 스트링 상품의 실제 상품가와 장착비 데이터를 소재별로 요약했습니다.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {primarySummaries.map((category) => {
              const hasProducts = category.count > 0;
              const productPriceRange = formatRange(category.minPrice, category.maxPrice, "가격 데이터 확인 필요");
              const mountingFeeRange = formatMountingFeeRange(category.minMountingFee, category.maxMountingFee, "장착비 미등록");

              return (
                <Card
                  key={category.key}
                  className={`transition-[border-color,box-shadow,background-color] duration-200 hover:border-primary/30 hover:shadow-md ${hasProducts ? "" : "opacity-75"}`}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 break-keep leading-snug">
                      <Shield className="h-5 w-5 text-foreground" />
                      {category.label}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{materialDescriptions[category.key]}</p>
                    <Badge variant={hasProducts ? "brand" : "secondary"} className="w-fit">
                      등록 상품 {category.count.toLocaleString("ko-KR")}개
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {hasProducts ? (
                      <>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                          <div className="rounded-xl border border-border bg-muted/30 p-3">
                            <p className="text-xs font-medium text-muted-foreground">상품가</p>
                            <p className="mt-1 whitespace-nowrap tabular-nums font-semibold text-foreground">{productPriceRange}</p>
                          </div>
                          <div className="rounded-xl border border-border bg-muted/30 p-3">
                            <p className="text-xs font-medium text-muted-foreground">장착비</p>
                            <p className="mt-1 whitespace-nowrap tabular-nums font-semibold text-foreground">{mountingFeeRange}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">대표 브랜드</p>
                          <div className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1">
                            {category.brands.length ? (
                              category.brands.map((brand) => (
                                <Badge key={brand} variant="secondary" className="max-w-[8rem] shrink-0 truncate whitespace-nowrap">
                                  {brand}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm leading-relaxed text-muted-foreground bp-md:text-base">데이터 없음</span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">대표 상품</p>
                          <div className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1">
                            {category.productNames.length ? (
                              category.productNames.map((name) => (
                                <Badge key={name} variant="outline" className="max-w-[12rem] shrink-0 whitespace-normal break-words text-left leading-snug sm:max-w-[14rem]">
                                  {name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm leading-relaxed text-muted-foreground bp-md:text-base">데이터 없음</span>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-muted-foreground break-keep">
                        현재 등록된 상품 데이터가 없습니다.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {otherSummary?.count ? (
            <Card className="border-dashed bg-muted/30">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">기타/미분류 상품</CardTitle>
                  <Badge variant="secondary">보조 분류</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  기타/미분류는 주요 소재 분류에 자동 매칭되지 않은 상품입니다. 등록 상품과 소재값을 확인해 필요하면 관리자 상품 정보에서 소재 분류를 정리해 주세요.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-xs font-medium">등록 상품</p>
                    <p className="mt-1 whitespace-nowrap tabular-nums font-semibold text-foreground">{otherSummary.count.toLocaleString("ko-KR")}개</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-xs font-medium">상품가</p>
                    <p className="mt-1 whitespace-nowrap tabular-nums font-semibold text-foreground">{formatRange(otherSummary.minPrice, otherSummary.maxPrice, "가격 데이터 확인 필요")}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-xs font-medium">장착비</p>
                    <p className="mt-1 whitespace-nowrap tabular-nums font-semibold text-foreground">{formatMountingFeeRange(otherSummary.minMountingFee, otherSummary.maxMountingFee, "장착비 미등록")}</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-xs font-medium">대표 브랜드</p>
                    <div className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1">
                      {otherSummary.brands.length ? (
                        otherSummary.brands.map((brand) => (
                          <Badge key={brand} variant="secondary" className="max-w-[8rem] shrink-0 truncate whitespace-nowrap">
                            {brand}
                          </Badge>
                        ))
                      ) : (
                        <span>데이터 없음</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium">대표 상품</p>
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
                    <p className="text-xs font-medium">등록 소재값</p>
                    <div className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1">
                      {otherSummary.materialLabels.length ? (
                        otherSummary.materialLabels.map((material) => (
                          <Badge key={material} variant="secondary" className="max-w-[10rem] shrink-0 truncate whitespace-nowrap">
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
          ) : null}
        </section>

        <section className="space-y-4 md:space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold bp-md:text-2xl">하이브리드 조합 안내</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">하이브리드는 단일 소재 가격표와 분리해 조합 기준으로 안내합니다.</p>
          </div>
          <Card className="transition-[border-color,box-shadow,background-color] duration-200 hover:border-primary/30 hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 break-keep leading-snug">
                <Shield className="h-5 w-5 text-foreground" />
                하이브리드는 메인/크로스 스트링 조합입니다
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>하이브리드는 하나의 소재가 아니라 메인/크로스 스트링 조합입니다.</p>
                <p>따라서 단일 소재 가격표와 1:1로 비교하기보다 선택한 조합 기준으로 최종 금액을 확인해야 합니다.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground">등록 상품 수</p>
                  <p className="mt-1 whitespace-nowrap tabular-nums font-semibold text-foreground">{hybridGuide.count.toLocaleString("ko-KR")}개</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-3 md:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">대표 조합</p>
                  <p className="mt-1 line-clamp-2 break-words font-semibold text-foreground">
                    {hybridGuide.representativeMaterials.length ? hybridGuide.representativeMaterials.join(", ") : "데이터 없음"}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">대표 상품</p>
                <div className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1">
                  {hybridGuide.representativeProducts.length ? (
                    hybridGuide.representativeProducts.map((name) => (
                      <Badge key={name} variant="outline" className="max-w-[12rem] shrink-0 whitespace-normal break-words text-left leading-snug sm:max-w-[14rem]">
                        {name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm leading-relaxed text-muted-foreground bp-md:text-base">데이터 없음</span>
                  )}
                </div>
              </div>
              <Button asChild variant="outline" className="w-full whitespace-normal leading-snug sm:w-auto sm:whitespace-nowrap">
                <Link href="/products?from=apply&material=hybrid" className="group">
                  하이브리드 상품 보기
                  <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="break-keep leading-snug">추가 서비스 / 무료 지원</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {additionalServices.map((service) => (
                <div key={service.name} className="rounded-lg border border-border p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <p className="font-medium">{service.name}</p>
                    <Badge variant="secondary" className="shrink-0 whitespace-nowrap">{service.policy}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 break-keep leading-snug">
                <Truck className="h-5 w-5" />
                예약 정책 안내
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <p>• 일반 소요 시간은 30~60분이며, 예약 상황에 따라 달라질 수 있습니다.</p>
              <p>• 스트링 교체는 예약제 운영이므로 신청서 또는 문의 후 방문해 주세요.</p>
            </CardContent>
          </Card>
        </section>

        <Card className="bg-muted/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 break-keep leading-snug">
              <Zap className="h-5 w-5" />
              주의사항 / FAQ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            <p>• 스트링 포함 가격은 고정값이 아니며 선택 상품과 신청 방식에 따라 달라집니다.</p>
            <p>• 패키지 적용 가능 시 교체비가 무료입니다.</p>
            <p>• 주문/대여 기반 신청은 이미 결제된 내역과 이번 신청의 별도 결제 항목을 구분해 안내됩니다.</p>
          </CardContent>
        </Card>

        <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="w-full whitespace-normal leading-snug sm:w-auto sm:whitespace-nowrap">
            <Link href="/services/apply" className="group">
              교체 서비스 신청하기
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full whitespace-normal leading-snug sm:w-auto sm:whitespace-nowrap">
            <Link href="/products?from=apply" className="group">
              스트링 먼저 고르기
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
