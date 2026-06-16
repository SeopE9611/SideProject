"use client";

import UnifiedPackageCard from "@/app/services/packages/_components/UnifiedPackageCard";
import { type PackageCardData } from "@/app/services/packages/_lib/packageCard";
import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero } from "@/components/public/PublicPageHero";
import { PublicSurface } from "@/components/public/PublicSurface";
import { SectionHeader } from "@/components/public/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { packagesBadgeVariant } from "@/lib/badge-style";
import {
  ArrowRight,
  Clock,
  Gift,
  MessageSquare,
  Phone,
  Shield,
  Users,
} from "lucide-react";
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
  const [ownershipBlockedMessage] = useState<string | null>(
    initialOwnershipBlockedMessage,
  );
  const isPendingOrderBlocked =
    ownershipBlockedMessage?.includes("결제대기") ||
    ownershipBlockedMessage?.includes("주문 상태");
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
      title: "품질 보장",
      description: "모든 스트링 교체에 대해 완벽한 품질을 보장합니다.",
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "빠른 서비스",
      description: "평균 30분 내 스트링 교체 완료",
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "전문가 상담",
      description: "전문가가 직접 상담해드립니다.",
    },
    {
      icon: <Gift className="h-6 w-6" />,
      title: "추가 혜택",
      description: "패키지 구매 시 다양한 부가 서비스 제공",
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
        title="플레이 빈도에 맞춰 더 합리적으로 관리하세요"
        description={
          <>
            플레이 빈도와 필요에 맞는 패키지를 선택하세요.
            <br className="hidden sm:block" />
            모든 패키지는 전문가 상담과 품질 보장이 포함됩니다.
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
        <PublicSurface
          variant="elevated"
          padding="lg"
          className="mx-auto max-w-5xl text-left"
        >
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <p className="break-keep text-sm leading-relaxed text-muted-foreground sm:text-base">
              현역 테니스 코치가 직접 매는 스트링은 다릅니다. 단순 기계
              작업이 아닌, 코트 위 실전 데이터를 기반으로 전담 코치가 직접
              스트링을 교체합니다. 전문가의 디테일한 상담과 완벽한 품질
              보장까지, 회원님의 스윙에 딱 맞는 스트링 패키지를 만나보세요.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {additionalBenefits.slice(0, 3).map((benefit) => (
                <div
                  key={benefit.title}
                  className="flex min-w-0 gap-3 rounded-lg border border-border bg-background p-3"
                >
                  <div className="shrink-0 text-primary">{benefit.icon}</div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{benefit.title}</p>
                    <p className="mt-1 break-keep text-sm leading-relaxed text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PublicSurface>
      </PublicPageHero>

      {/* Package Cards Section */}
      <section
        id="packages"
        ref={packagesSectionRef}
        className="py-12 md:py-20 bg-background scroll-mt-24"
      >
        <SiteContainer variant="wide">
          <SectionHeader
            align="center"
            className="mb-10 md:mb-14"
            eyebrow={<Badge variant={packagesBadgeVariant("selection")}>맞춤형 패키지 선택</Badge>}
            title="스트링 교체 패키지"
            description={
              <>
                플레이 빈도와 필요에 맞는 패키지를 선택하세요.
                <br className="hidden sm:block" />
                모든 패키지는 전문가 상담과 품질 보장이 포함됩니다.
              </>
            }
          />
          {ownershipBlockedMessage && (
            <PublicSurface variant="muted" className="mx-auto mb-8 max-w-3xl text-center text-sm text-muted-foreground">
              {ownershipBlockedMessage}
            </PublicSurface>
          )}

          <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4">
            {packages.map((pkg) => (
              <UnifiedPackageCard
                key={pkg.id}
                pkg={pkg}
                selected={selectedPackage === pkg.id}
                onSelect={() => setSelectedPackage(pkg.id)}
                ctaHref={`/services/packages/checkout?package=${pkg.id}`}
                ctaLabel={
                  ownershipBlockedMessage ? "추가 구매 불가" : "패키지 선택"
                }
                ctaDisabled={!!ownershipBlockedMessage}
                ctaHelperText={
                  ownershipBlockedMessage ? cardBlockedHelperText : undefined
                }
              />
            ))}
          </div>
        </SiteContainer>
      </section>

      {/* FAQ Section */}
      <section className="py-12 md:py-20 bg-background">
        <SiteContainer variant="wide">
          <SectionHeader
            align="center"
            className="mb-10 md:mb-14"
            eyebrow={<Badge variant={packagesBadgeVariant("faq")}>자주 묻는 질문</Badge>}
            title="패키지 이용 안내"
            description="구매 전 자주 확인하는 내용을 간결하게 정리했습니다."
          />

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {[
                {
                  question: "패키지 유효기간이 지나면 어떻게 되나요?",
                  answer:
                    "유효기간 만료 전 미사용 횟수는 30일 연장 가능하며, 추가 비용 없이 1회 연장해드립니다.",
                },
                {
                  question: "다른 사람과 패키지를 공유할 수 있나요?",
                  answer: "패키지는 구매자 본인만 사용 가능합니다.",
                },
                {
                  question: "패키지 환불이 가능한가요?",
                  answer:
                    "미사용 횟수에 대해서는 구매일로부터 7일 이내 100% 환불 가능합니다.",
                },
                {
                  question: "패키지 사용은 어떻게 하나요?",
                  answer:
                    "패키지 구매 후 교체 신청서에서 사용 가능합니다. 자세한 문의는 매장으로 연락 주세요.",
                },
              ].map((faq, index) => (
                <Card
                  key={index}
                  className="border border-border shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <CardContent className="p-4 md:p-6">
                    <h3 className="font-bold text-lg mb-3 text-foreground">
                      Q. {faq.question}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      A. {faq.answer}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="text-center mt-8 md:mt-12">
            <Button
              size="lg"
              variant="default"
              className="shadow-sm hover:shadow-md transition-all duration-300"
              asChild
            >
              <Link href="/board/qna">
                <MessageSquare className="w-5 h-5 mr-2" />더 궁금한 점이
                있으신가요?
              </Link>
            </Button>
          </div>
        </SiteContainer>
      </section>
    </div>
  );
}
