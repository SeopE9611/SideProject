import { getStringingPricingView } from "@/app/services/_lib/stringingPricingView";
import HeroCourtBackdrop from "@/components/system/HeroCourtBackdrop";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CUSTOM_STRING_MOUNTING_FEE } from "@/lib/stringing-pricing-policy";
import {
  ArrowRight,
  Award,
  CheckCircle,
  File,
  Grid2X2,
  Package,
  RotateCw,
  Shield,
  ShoppingBag,
  Sliders,
  Star,
  Target,
  ThumbsUp,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import Link from "next/link";

import type { Metadata } from "next";
import { MdSportsTennis } from "react-icons/md";

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

export default async function ServicesPage() {
  const { primarySummaries, hybridGuide } = await getStringingPricingView();
  // 스트링 유형 데이터
  const stringTypes = [
    {
      id: 1,
      title: "파워형 스트링",
      description: "강력한 파워와 반발력을 제공하는 스트링",
      features: [
        "최대한의 파워 제공",
        "부드러운 타구감",
        "관절에 부담이 적음",
        "낮은 장력에서도 충분한 반발력",
      ],
      recommended: [
        "파워 중심의 플레이 스타일",
        "어깨나 팔꿈치에 부담을 줄이고 싶은 분",
        "초보자 및 중급자",
        "자연스러운 스윙으로 힘을 얻고 싶은 분",
      ],
      examples: [
        "핀포인트 엑스드라이브",
        "탑스핀 사이버블루",
        "포커스헥스울트라",
      ],
      icon: <Zap className="h-8 w-8" />,
      performance: { power: 95, control: 70, spin: 75, durability: 80 },
    },
    {
      id: 2,
      title: "스핀형 스트링",
      description: "정확한 컨트롤과 스핀을 위한 스트링",
      features: [
        "최대한의 스핀 생성",
        "정확한 볼 컨트롤",
        "내구성이 우수함",
        "중상급자용 하드 히팅에 적합",
      ],
      recommended: [
        "컨트롤과 스핀 중심의 플레이 스타일",
        "강한 스트로크로 공격하는 플레이어",
        "중급자 및 상급자",
        "정확한 샷 배치를 중요시하는 분",
      ],
      examples: [
        "볼키 사이클론",
        "탑스핀 센서스로테이션",
        "요넥스 폴리투어스핀",
        "Msv포커스헥스",
        "솔린코 하이퍼지",
      ],
      icon: <RotateCw className="h-8 w-8" />,
      performance: { power: 75, control: 95, spin: 90, durability: 85 },
    },
    {
      id: 3,
      title: "내구성형 스트링",
      description: "파워와 컨트롤의 균형 잡힌 성능",
      features: [
        "파워와 컨트롤의 균형",
        "중간 정도의 타구감",
        "다양한 플레이 스타일에 적합",
        "하이브리드 구성으로 활용 가능",
      ],
      recommended: [
        "올라운드 플레이 스타일",
        "다양한 샷을 구사하는 플레이어",
        "파워와 컨트롤 모두 중요시하는 분",
        "모든 수준의 플레이어",
      ],
      examples: [
        "핀포인트 엑스펜타",
        "탑스핀 사이버플래쉬",
        "요넥스 폴리투어프로",
        "솔린코 투어바이트소프트",
      ],
      icon: <Shield className="h-8 w-8" />,
      performance: { power: 85, control: 85, spin: 80, durability: 90 },
    },
  ];

  // 서비스 가격 정보
  const pricingInfo = [
    {
      service: "보유/커스텀 스트링 장착",
      priceLabel: `${CUSTOM_STRING_MOUNTING_FEE.toLocaleString()}원`,
      description: "보유 스트링 또는 직접 입력 스트링 기준 교체비",
      icon: <Wrench className="h-6 w-6" />,
      duration: "30-45분",
      popular: false,
    },
    {
      service: "스트링 상품 선택 장착",
      priceLabel: "상품별 상이",
      description:
        "선택한 스트링 상품과 신청 방식에 따라 최종 교체비가 안내됩니다.",
      icon: <ShoppingBag className="h-6 w-6" />,
      duration: "30-45분",
      popular: true,
    },
    {
      service: "패키지 적용 신청",
      description:
        "사용가능한 패키지 횟수가 있으면 교체비 대신 패키지 잔여횟수가 차감됩니다",
      icon: <Package className="h-6 w-6" />,
      duration: "45-60분",
      popular: false,
    },
  ];

  // 추가 서비스 정보
  const additionalServices = [
    {
      title: "장력 추천 서비스",
      description: "플레이 스타일과 라켓에 맞는 장력 추천을 무료로 안내합니다.",
      free: true,
      icon: <Sliders className="h-5 w-5" />,
    },
    {
      title: "스트링 추천 서비스",
      description:
        "개인의 플레이 스타일에 맞는 스트링/장력 조합을 무료로 안내합니다.",
      free: true,
      icon: <ThumbsUp className="h-5 w-5" />,
    },
    {
      title: "라켓 그립 교체",
      description:
        "부자재/작업 범위에 따라 비용이 달라져 별도 문의가 필요합니다.",
      free: false,
      priceLabel: "별도 문의",
      icon: <Wrench className="h-5 w-5" />,
    },
  ];

  const processSteps = [
    {
      step: 1,
      title: "라켓 상태 점검",
      description: "라켓 프레임과 그로밋의 상태를 세심하게 점검합니다.",
      icon: <Shield className="h-8 w-8" />,
    },
    {
      step: 2,
      title: "정밀 스트링 제거",
      description:
        "라켓에 손상이 가지 않도록 기존 스트링을 조심스럽게 제거합니다.",
      icon: <Target className="h-8 w-8" />,
    },
    {
      step: 3,
      title: "정확한 장력 설정",
      description:
        "디지털 전자식 스트링머신으로 정확한 장력을 설정하고 장착합니다.",
      icon: <Award className="h-8 w-8" />,
    },
    {
      step: 4,
      title: "품질 확인 및 마무리",
      description: "장착 후 텐션과 패턴을 확인하고 완벽한 상태로 마무리합니다.",
      icon: <CheckCircle className="h-8 w-8" />,
    },
  ];

  const serviceStartOptions = [
    {
      badge: "추천",
      icon: <Grid2X2 className="h-7 w-7" />,
      title: "새\u00A0스트링 구매 후 장착",
      description:
        "스트링을 새로 고르고 기존 라켓에 바로 장착 신청까지 이어갑니다.",
      steps: "스트링 선택 → 결제/장착 정보 입력 → 접수 완료",
      href: "/products?from=apply",
      cta: "스트링 고르고 신청하기",
      featured: true,
    },
    {
      badge: "구매 연계",
      icon: <MdSportsTennis className="h-7 w-7" />,
      title: "라켓 구매와 함께 장착",
      description:
        "중고 라켓을 구매하면서 원하는 스트링 세팅까지 한\u00A0번에 진행합니다.",
      steps: "라켓 선택 → 스트링 선택 → 결제 → 장착 접수",
      href: "/rackets?from=apply",
      cta: "라켓 고르고 신청하기",
      featured: false,
    },
    {
      badge: "대여 연계",
      icon: <MdSportsTennis className="h-7 w-7" />,
      title: "라켓 대여와 함께 장착",
      description:
        "대여 라켓에 원하는 스트링 세팅을 더해 바로 사용하기 좋게 준비합니다.",
      steps: "라켓 대여 → 스트링 선택 → 대여 결제 → 장착 접수",
      href: "/rackets?from=apply&rentOnly=1",
      cta: "대여 라켓 보기",
      featured: false,
    },
    {
      badge: "보유 장비",
      icon: <File className="h-7 w-7" />,
      title: "보유 라켓/보유 스트링으로 장착",
      description:
        "이미 가진 라켓이나 스트링으로 교체 작업만 맡기고 싶을 때 선택합니다.",
      steps: "신청서 작성 → 접수 → 비용 안내/진행",
      href: "/services/apply?mode=single",
      cta: "보유 장비로 신청",
      featured: false,
    },
  ];

  const serviceHelpLinks = [
    {
      label: "스트링 추천 도우미",
      href: "/products/recommend",
      helper: "플레이 성향에 맞는 스트링을 먼저 좁혀보세요.",
    },
    {
      label: "가격 먼저 보기",
      href: "#pricing",
      helper: "가격 안내 섹션으로 이동합니다.",
    },
    {
      label: "자주 묻는 질문",
      href: "/board/qna",
      helper: "예약·신청 문의를 확인합니다.",
    },
    {
      label: "전화 상담",
      href: "tel:01052185248",
      helper: "010-5218-5248 · 평일 10:00-22:00, 토요일 09:00-18:00",
    },
  ];

  const serviceNoticeChips = [
    { title: "100% 예약제", description: "사전 예약 필수" },
    { title: "소요 시간", description: "30분~1시간" },
    { title: "방문 안내", description: "완료 10분 전 도착 권장" },
  ];
  return (
    <div className="flex flex-col">
      {/* Hero 섹션 */}
      <section className="relative overflow-hidden py-12 bp-md:py-16 bp-lg:py-20">
        <div className="absolute inset-0 bg-muted">
          <HeroCourtBackdrop className="h-full w-full text-muted-foreground opacity-[0.10] dark:opacity-[0.12]" />
          <div className="absolute inset-0 bg-background/40"></div>
        </div>

        <div className="absolute top-16 left-8 hidden h-24 w-24 rounded-full bg-secondary/30 bp-md:block"></div>
        <div className="absolute bottom-14 right-8 h-16 w-16 rounded-full bg-muted dark:bg-muted/80"></div>

        <div className="container relative z-10">
          <div className="mx-auto max-w-4xl">
            <Card className="border border-border bg-card/95 shadow-md backdrop-blur-[1px]">
              <CardContent className="p-5 text-center bp-sm:p-6 bp-md:p-8">
                <h1 className="text-2xl font-bold leading-tight text-foreground bp-md:text-3xl bp-lg:text-4xl">
                  스트링 교체 서비스를 더 쉽게
                </h1>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  스트링 구매, 라켓 구매·대여, 보유 장비 신청까지 상황에 맞는
                  방식으로 접수할 수 있습니다.
                </p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button asChild className="whitespace-nowrap">
                    <Link href="#service-start">신청 방식 선택하기</Link>
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    className="whitespace-nowrap"
                  >
                    <Link href="#pricing">가격 안내 보기</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section
        className="scroll-mt-24 py-8 bp-md:scroll-mt-28 bp-md:py-12"
        id="service-start"
      >
        <div className="container">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 text-center bp-md:mb-8">
              <p className="text-sm font-semibold text-muted-foreground">
                신청 방식 먼저 선택하기
              </p>
              <h2 className="mt-1 break-keep text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                어떤 방식으로 시작할까요?
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                현재 상황에 맞는 시작 지점을 고르면 구매·대여·보유 장비 흐름에
                맞춰 신청이 이어집니다.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {serviceStartOptions.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`group relative flex h-full min-w-0 flex-col rounded-2xl border p-4 text-left shadow-sm transition-[border-color,box-shadow,background-color] duration-200 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background bp-sm:p-5 ${item.featured ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
                >
                  <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-colors group-hover:bg-muted bp-sm:h-14 bp-sm:w-14">
                      {item.icon}
                    </div>
                    <Badge
                      variant={item.featured ? "brand" : "secondary"}
                      className="shrink-0"
                    >
                      {item.badge}
                    </Badge>
                  </div>

                  <div className="flex flex-1 flex-col">
                    <h3 className="break-keep text-base font-semibold leading-snug text-foreground bp-sm:text-lg">
                      {item.title}
                    </h3>
                    <p className="mt-3 break-words text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>

                    <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
                      <p className="text-xs font-semibold text-primary">
                        진행 흐름
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {item.steps}
                      </p>
                    </div>

                    <div className="mt-auto pt-5">
                      <span className="inline-flex min-h-10 w-full items-center justify-center gap-2 whitespace-normal break-keep text-center leading-snug rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-semibold text-foreground transition-colors group-hover:bg-secondary">
                        <span className="min-w-0">{item.cta}</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <Card className="mt-5 border-border bg-muted/30 shadow-sm bp-md:mt-7">
              <CardContent className="p-4 bp-md:p-6">
                <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                  <div className="space-y-3">
                    <Badge variant="secondary">도움이 필요할 때</Badge>
                    <div className="space-y-2">
                      <h3 className="break-keep text-lg font-bold text-foreground bp-sm:text-xl">
                        잘 모르겠다면 상담과 안내를 먼저 확인하세요
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        추천 도우미, 가격 안내, FAQ, 전화 상담을 한{"\u00A0"}
                        곳에 모았습니다. 테니스 스트링 쇼핑은 첫 번째 신청
                        카드에서 바로 이어갈 수 있어요.
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                      {serviceNoticeChips.map((notice) => (
                        <div
                          key={notice.title}
                          className="rounded-xl border border-border bg-card p-3"
                        >
                          <p className="text-sm font-semibold text-foreground">
                            {notice.title}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {notice.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {serviceHelpLinks.map((link) => (
                      <Link
                        key={link.label}
                        href={link.href}
                        className="group flex h-full min-w-0 flex-col rounded-xl border border-border bg-card p-4 transition-[border-color,box-shadow,background-color] duration-200 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <span className="flex min-w-0 items-center justify-between gap-3 text-sm font-semibold text-foreground">
                          <span className="min-w-0 truncate">{link.label}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                        </span>
                        <span className="mt-2 break-words text-sm leading-relaxed text-muted-foreground">
                          {link.helper}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 서비스 소개 섹션 */}
      <section
        className="py-12 bp-md:py-16 bp-lg:py-20 bg-muted/40"
        id="string-types"
      >
        <div className="container">
          <div className="text-center mb-10 md:mb-16">
            <Badge variant="info" className="mb-4">
              <Star className="w-4 h-4 mr-2" />
              프리미엄 스트링 컬렉션
            </Badge>
            <h2 className="mb-4 break-keep text-2xl font-bold leading-tight text-foreground bp-md:mb-6 bp-md:text-3xl bp-lg:text-4xl">
              스트링 종류 안내
            </h2>
            <p className="mx-auto max-w-3xl text-sm leading-relaxed text-muted-foreground bp-md:text-base bp-lg:text-lg">
              플레이 스타일과 경기력 향상을 위한 다양한 특성의 스트링을
              제공합니다.
              <br />
              자신에게 맞는 최적의 스트링을 선택해보세요.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 bp-md:grid-cols-2 bp-md:gap-6 bp-lg:grid-cols-3 bp-lg:gap-8">
            {stringTypes.map((type) => (
              <Card
                key={type.id}
                className="group relative overflow-hidden border border-border shadow-sm hover:shadow-md transition-[box-shadow,border-color,background-color] duration-200 bg-card"
              >
                <div className="h-2 bg-muted"></div>

                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 w-20 h-20 rounded-full border border-border/60 bg-secondary flex items-center justify-center text-muted-foreground shadow-sm transition-shadow duration-300 group-hover:shadow-md">
                    {type.icon}
                  </div>
                  <CardTitle className="mb-2 break-keep text-2xl font-bold leading-tight">
                    {type.title}
                  </CardTitle>
                  <CardDescription className="text-pretty text-base leading-relaxed">
                    {type.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 md:space-y-6">
                  {/* 성능 차트 */}
                  <div className="bg-muted/50 dark:bg-card rounded-xl p-4">
                    <h4 className="font-semibold mb-3 text-center">
                      성능 특성
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(type.performance).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm capitalize">
                            {key === "power"
                              ? "파워"
                              : key === "control"
                                ? "컨트롤"
                                : key === "spin"
                                  ? "스핀"
                                  : "내구성"}
                          </span>
                          <div className="flex-1 mx-3 bg-muted rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-muted-foreground/70 transition-all duration-1000 ease-out"
                              style={{ width: `${value}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 주요 특징 */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-muted-foreground" />
                      주요 특징
                    </h4>
                    <ul className="space-y-2">
                      {type.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start text-sm">
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/70 mt-2 mr-3 flex-shrink-0"></div>
                          <span className="min-w-0 break-words">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 추천 대상 */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center">
                      <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                      추천 대상
                    </h4>
                    <ul className="space-y-2">
                      {type.recommended.slice(0, 2).map((rec, idx) => (
                        <li key={idx} className="flex items-start text-sm">
                          <ArrowRight className="w-3 h-3 mt-1 mr-2 text-muted-foreground flex-shrink-0" />
                          <span className="min-w-0 break-words">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 대표 제품 */}
                  <div className="bg-muted rounded-xl border border-border p-4 text-foreground">
                    <h4 className="font-semibold mb-3">대표 제품</h4>
                    <div className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1">
                      {type.examples.map((example, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="max-w-[9rem] shrink-0 truncate whitespace-nowrap text-xs"
                        >
                          {example}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 가격 안내 섹션 */}
      <section
        className="relative overflow-hidden bg-background py-12 scroll-mt-24 bp-md:scroll-mt-28 bp-md:py-16 bp-lg:py-20"
        id="pricing"
      >
        <HeroCourtBackdrop className="h-full w-full text-muted-foreground opacity-[0.10] dark:opacity-[0.12]" />

        <div className="container relative z-10">
          <div className="text-center mb-16">
            <Badge variant="neutral" className="mb-4">
              <Award className="w-4 h-4 mr-2" />
              투명한 가격 정책
            </Badge>
            <h2 className="mb-4 break-keep text-2xl font-bold leading-tight text-foreground bp-md:mb-6 bp-md:text-3xl bp-lg:text-4xl">
              가격 안내
            </h2>
            <p className="mx-auto max-w-3xl text-sm leading-relaxed text-muted-foreground bp-md:text-base bp-lg:text-lg">
              합리적 가격으로 최고의 스트링 서비스를 제공합니다.
              <br />
              다양한 옵션 중 필요한 서비스를 선택하세요.
            </p>
          </div>

          <div className="grid grid-cols-1 bp-md:grid-cols-2 bp-lg:grid-cols-3 gap-6 mb-16">
            {pricingInfo.map((item) => (
              <Card
                key={item.service}
                className={`relative overflow-hidden border border-border shadow-sm hover:shadow-md transition-[box-shadow,border-color,background-color] duration-200 ${item.popular ? "bg-card text-foreground ring-1 ring-border/60" : "bg-card"}`}
              >
                {item.popular && (
                  <div className="absolute top-0 right-0 bg-secondary text-foreground px-3 py-1 text-xs font-semibold rounded-bl-lg">
                    인기
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div
                    className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center shadow-sm ${item.popular ? "bg-secondary text-muted-foreground" : "bg-secondary text-muted-foreground"}`}
                  >
                    {item.icon}
                  </div>
                  <CardTitle
                    className={`break-keep text-lg font-bold leading-snug ${item.popular ? "text-foreground" : ""}`}
                  >
                    {item.service}
                  </CardTitle>
                  <div
                    className={`whitespace-nowrap tabular-nums text-2xl font-bold bp-sm:text-3xl ${item.popular ? "text-foreground" : "text-foreground"}`}
                  >
                    {item.priceLabel}
                  </div>
                  <div
                    className={`text-sm ${item.popular ? "text-muted-foreground" : "text-muted-foreground"}`}
                  >
                    소요시간: {item.duration}
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="text-center text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            {primarySummaries.map((cat) => (
              <Card key={cat.key} className="bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="break-keep text-base leading-tight">
                    {cat.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="break-words text-sm leading-relaxed text-muted-foreground">
                  {cat.count === 0
                    ? "등록된 상품 데이터 없음"
                    : `상품가 ${formatPriceRange(cat.minPrice, cat.maxPrice)} / 장착비 ${formatPriceRange(cat.minMountingFee, cat.maxMountingFee)}`}
                </CardContent>
              </Card>
            ))}
            <Card className="bg-card border-dashed md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="break-keep text-base leading-tight">
                  하이브리드 조합 안내
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <p>
                  하이브리드는 단일 재질이 아닌 조합 방식으로, 단일 재질
                  가격대와 분리해 안내합니다.
                </p>
                <p className="whitespace-nowrap tabular-nums">
                  등록된 하이브리드 상품: {hybridGuide.count.toLocaleString()}개
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 추가 서비스 */}
          <div className="rounded-2xl bg-card p-4 bp-md:p-8">
            <h3 className="mb-5 text-center text-xl font-bold text-foreground bp-md:mb-6 bp-md:text-2xl">
              추가 서비스
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {additionalServices.map((service) => (
                <div
                  key={service.title}
                  className="border border-border rounded-xl p-4 md:p-6"
                >
                  <div className="mb-4 flex flex-col gap-3 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center text-muted-foreground mr-3">
                        {service.icon}
                      </div>
                      <h4 className="font-bold">{service.title}</h4>
                    </div>
                    {service.free ? (
                      <Badge variant="info">무료</Badge>
                    ) : (
                      <span className="font-bold text-foreground">
                        {service.priceLabel ?? "별도 안내"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {service.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 장착 과정 섹션 */}
      <section className="py-12 bp-md:py-16 bp-lg:py-20 bg-background">
        <div className="container">
          <div className="text-center mb-10 md:mb-16">
            <Badge variant="info" className="mb-4">
              <Shield className="w-4 h-4 mr-2" />
              전문적인 프로세스
            </Badge>
            <h2 className="mb-4 break-keep text-2xl font-bold leading-tight text-foreground bp-md:mb-6 bp-md:text-3xl bp-lg:text-4xl">
              스트링 장착 과정
            </h2>
            <p className="mx-auto max-w-3xl text-sm leading-relaxed text-muted-foreground bp-md:text-base bp-lg:text-lg">
              도깨비테니스는 세심한 과정을 통해
              <br />
              최고 품질의 스트링 장착 서비스를 제공합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 bp-md:grid-cols-2 bp-md:gap-6 bp-lg:grid-cols-4 bp-lg:gap-8">
            {processSteps.map((step) => (
              <div key={step.step} className="relative group">
                {processSteps.indexOf(step) < processSteps.length - 1 && (
                  <div className="hidden bp-lg:block absolute top-16 left-full w-full h-0.5 bg-border/70 dark:bg-border/80 transform translate-x-4 z-0"></div>
                )}

                <Card className="relative z-10 text-center border border-border shadow-sm hover:shadow-md transition-[box-shadow,border-color,background-color] duration-200 bg-card">
                  <CardContent className="p-4 bp-md:p-8">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center text-muted-foreground mx-auto shadow-sm transition-shadow duration-300 group-hover:shadow-md">
                        {step.icon}
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-foreground text-sm font-bold shadow-sm">
                        {step.step}
                      </div>
                    </div>
                    <h3 className="mb-3 text-lg font-bold bp-md:mb-4 bp-md:text-xl">
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground bp-md:text-base">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 고객 후기 섹션 */}
      <section className="py-12 bp-md:py-16 bp-lg:py-20 bg-muted/40">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="mb-4 break-keep text-2xl font-bold leading-tight text-foreground bp-md:mb-6 bp-md:text-3xl bp-lg:text-4xl">
              고객 후기
            </h2>
            <p className="mx-auto max-w-3xl text-sm leading-relaxed text-muted-foreground bp-md:text-base bp-lg:text-lg">
              도깨비테니스 스트링 서비스를 경험한 후기를 확인해보세요
            </p>
          </div>

          <div className="text-center">
            <Button
              size="lg"
              variant="default"
              className="whitespace-nowrap shadow-sm hover:shadow-md transition-[background-color,color,border-color,box-shadow,opacity] duration-200"
              asChild
            >
              <Link href="/reviews">
                <Star className="w-5 h-5 mr-2" />
                서비스 후기 보기
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
