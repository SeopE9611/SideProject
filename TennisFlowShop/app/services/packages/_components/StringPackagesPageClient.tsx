"use client";

import UnifiedPackageCard from "@/app/services/packages/_components/UnifiedPackageCard";
import { type PackageCardData } from "@/app/services/packages/_lib/packageCard";
import SiteContainer from "@/components/layout/SiteContainer";
import { EmptyState, PublicSurface, SummaryCard } from "@/components/public";
import { PublicPageHero } from "@/components/public/PublicPageHero";
import { SectionHeader } from "@/components/public/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { packagesBadgeVariant } from "@/lib/badge-style";
import { ArrowRight, Clock, Gift, MessageSquare, Phone, Shield, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface StringPackagesPageClientProps {
  initialPackages: PackageCardData[];
  initialOwnershipBlockedMessage: string | null;
}

export default function StringPackagesPageClient({
  initialPackages,
  initialOwnershipBlockedMessage,
}: StringPackagesPageClientProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const packagesSectionRef = useRef<HTMLElement | null>(null);

  // 서버에서 선조회한 데이터를 초기값으로 사용한다.
  // 이렇게 하면 첫 렌더 직후 추가 네트워크 요청 없이 즉시 카드 UI를 그릴 수 있다.
  const [packages] = useState<PackageCardData[]>(initialPackages);
  const [ownershipBlockedMessage] = useState<string | null>(initialOwnershipBlockedMessage);
  const isPendingOrderBlocked =
    ownershipBlockedMessage?.includes("결제대기") || ownershipBlockedMessage?.includes("주문 상태");
  const cardBlockedHelperText = isPendingOrderBlocked
    ? "기존 주문 상태를 먼저 확인해주세요."
    : "기존 패키지 이용 종료 후 다시 구매할 수 있습니다.";

  const additionalBenefits: Array<{
    icon: React.ReactNode;
    title: string;
    description: string;
  }> = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: "교체 품질 확인",
      description: "접수 내용에 맞춰 스트링 상태와 작업 결과를 확인합니다.",
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "빠른 접수",
      description: "방문 전 신청 내용을 확인해 교체 진행을 돕습니다.",
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "전문 상담",
      description: "플레이 스타일에 맞는 장력과 스트링 선택을 안내합니다.",
    },
    {
      icon: <Gift className="h-6 w-6" />,
      title: "이용 횟수 관리",
      description: "남은 횟수와 유효기간을 기준으로 패키지를 사용할 수 있습니다.",
    },
  ];

  // 처음 진입 시 쿼리로 스크롤 트리거
  useEffect(() => {
    if (typeof window === "undefined") return;

    const shouldScroll = searchParams.get("target") === "packages";
    if (!shouldScroll) return;

    // 첫 페인트 이후로 살짝 지연 → 레이아웃/이미지 로딩 후 부드럽게
    const id = window.setTimeout(() => {
      packagesSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      // (선택) URL을 깔끔히: 해시로 교체해서 공유/북마크 친화적
      const url = new URL(window.location.href);
      url.searchParams.delete("target");
      url.hash = "packages";
      window.history.replaceState(null, "", url.toString());
    }, 0);

    return () => window.clearTimeout(id);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <PublicPageHero
        align="center"
        eyebrow="스트링 교체 패키지"
        title="이용 빈도에 맞는 스트링 교체 패키지"
        description={
          <>
            자주 교체하는 고객을 위한 선결제 패키지입니다.
            <br className="hidden sm:block" />
            횟수, 유효기간, 금액을 비교한 뒤 선택하세요.
          </>
        }
        actions={
          <>
            <Button
              size="lg"
              variant="default"
              className="w-full shadow-sm transition-[box-shadow,border-color,background-color] duration-200 hover:shadow-md sm:w-auto"
              asChild
            >
              <Link href="#packages">
                <ArrowRight className="mr-2 h-5 w-5" />
                패키지 선택하기
              </Link>
            </Button>

            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/services">
                <Phone className="mr-2 h-5 w-5" />
                상담 받기
              </Link>
            </Button>
          </>
        }
      >
        <SummaryCard
          eyebrow="이용 흐름"
          title="패키지 이용은 이렇게 진행됩니다"
          description="선택한 패키지는 결제 후 교체서비스 신청 시 사용할 수 있습니다."
          className="mx-auto max-w-5xl text-left"
          contentClassName="pt-4"
        >
          <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <ol className="grid gap-3 text-ui-body-sm leading-relaxed text-muted-foreground sm:text-ui-body-lg">
              {[
                "패키지별 횟수와 유효기간을 비교합니다.",
                "선택한 패키지를 주문하고 결제합니다.",
                "교체서비스 신청 시 보유 횟수에서 사용합니다.",
              ].map((step, index) => (
                <li key={step} className="flex min-w-0 gap-3 break-keep">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-ui-label font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="min-w-0 break-words">{step}</span>
                </li>
              ))}
            </ol>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {additionalBenefits.slice(0, 3).map((benefit) => (
                <div
                  key={benefit.title}
                  className="flex min-w-0 gap-3 rounded-xl border border-border bg-muted/20 p-3"
                >
                  <div className="shrink-0 text-primary">{benefit.icon}</div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{benefit.title}</p>
                    <p className="mt-1 break-keep text-ui-body-sm leading-relaxed text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SummaryCard>
      </PublicPageHero>

      {/* Package Cards Section */}
      <section
        id="packages"
        ref={packagesSectionRef}
        className="bg-background py-10 scroll-mt-24 md:py-16"
      >
        <SiteContainer variant="wide">
          <SectionHeader
            align="center"
            className="mb-8 md:mb-10"
            eyebrow={<Badge variant={packagesBadgeVariant("selection")}>맞춤형 패키지 선택</Badge>}
            title="스트링 교체 패키지"
            description={
              <>
                이용 횟수, 유효기간, 회당 금액을 비교해 선택하세요.
                <br className="hidden sm:block" />
                선택 후 결제 화면에서 주문 정보를 확인할 수 있습니다.
              </>
            }
          />
          {ownershipBlockedMessage && (
            <PublicSurface
              variant="muted"
              className="mx-auto mb-6 max-w-3xl text-left sm:text-center"
            >
              <p className="text-ui-body-sm font-semibold text-foreground">
                추가 구매가 제한되어 있습니다
              </p>
              <p className="mt-2 break-keep text-ui-body-sm leading-relaxed text-muted-foreground">
                {ownershipBlockedMessage}
              </p>
              <p className="mt-1 break-keep text-ui-label leading-relaxed text-muted-foreground">
                {cardBlockedHelperText}
              </p>
            </PublicSurface>
          )}

          {packages.length > 0 ? (
            <div className="grid items-stretch gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-4">
              {packages.map((pkg) => (
                <UnifiedPackageCard
                  key={pkg.id}
                  pkg={pkg}
                  selected={selectedPackage === pkg.id}
                  onSelect={() => setSelectedPackage(pkg.id)}
                  ctaHref={`/services/packages/checkout?package=${pkg.id}`}
                  ctaLabel={ownershipBlockedMessage ? "추가 구매 불가" : "패키지 선택"}
                  ctaDisabled={!!ownershipBlockedMessage}
                  ctaHelperText={ownershipBlockedMessage ? cardBlockedHelperText : undefined}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="현재 구매 가능한 패키지가 없습니다"
              description="현재 선택 가능한 패키지가 없습니다. 구성이 준비되면 다시 안내드리겠습니다."
              className="mx-auto max-w-3xl"
            />
          )}
        </SiteContainer>
      </section>

      {/* FAQ Section */}
      <section className="bg-background py-10 md:py-16">
        <SiteContainer variant="wide">
          <SectionHeader
            align="center"
            className="mb-8 md:mb-10"
            eyebrow={<Badge variant={packagesBadgeVariant("faq")}>자주 묻는 질문</Badge>}
            title="패키지 이용 안내"
            description="구매 전 자주 확인하는 내용을 간결하게 정리했습니다."
          />

          <div className="mx-auto max-w-4xl">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
              {[
                {
                  question: "패키지 유효기간이 지나면 어떻게 되나요?",
                  answer: "유효기간이 임박한 경우 운영 정책에 따라 연장 가능 여부를 안내드립니다.",
                },
                {
                  question: "다른 사람과 패키지를 공유할 수 있나요?",
                  answer: "패키지는 구매자 본인 사용을 기준으로 운영됩니다.",
                },
                {
                  question: "패키지 환불이 가능한가요?",
                  answer: "환불 가능 여부와 금액은 사용 횟수와 결제 상태를 확인한 뒤 안내드립니다.",
                },
                {
                  question: "패키지 사용은 어떻게 하나요?",
                  answer: "구매 후 교체서비스 신청 시 보유 패키지를 선택해 사용할 수 있습니다.",
                },
              ].map((faq, index) => (
                <PublicSurface
                  key={index}
                  className="h-full transition-shadow duration-200 hover:shadow-md"
                >
                  <h3 className="break-keep text-ui-card-title-lg font-semibold leading-tight text-foreground">
                    Q. {faq.question}
                  </h3>
                  <p className="mt-2 break-keep text-ui-body-sm leading-relaxed text-muted-foreground">
                    A. {faq.answer}
                  </p>
                </PublicSurface>
              ))}
            </div>
          </div>

          <div className="mt-8 text-center md:mt-10">
            <Button
              size="lg"
              variant="default"
              className="w-full shadow-sm transition-all duration-300 hover:shadow-md sm:w-auto"
              asChild
            >
              <Link href="/board/qna">
                <MessageSquare className="w-5 h-5 mr-2" />더 궁금한 점이 있으신가요?
              </Link>
            </Button>
          </div>
        </SiteContainer>
      </section>
    </div>
  );
}
