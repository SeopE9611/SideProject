"use client";

import UnifiedPackageCard from "@/app/services/packages/_components/UnifiedPackageCard";
import { type PackageCardData } from "@/app/services/packages/_lib/packageCard";
import SiteContainer from "@/components/layout/SiteContainer";
import HeroCourtBackdrop from "@/components/system/HeroCourtBackdrop";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { packagesBadgeVariant } from "@/lib/badge-style";
import { ArrowRight, Clock, Gift, MessageSquare, Phone, Shield, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface StringPackagesPageClientProps {
  initialPackages: PackageCardData[];
  initialOwnershipBlockedMessage: string | null;
}

export default function StringPackagesPageClient({ initialPackages, initialOwnershipBlockedMessage }: StringPackagesPageClientProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const packagesSectionRef = useRef<HTMLElement | null>(null);

  // 서버에서 선조회한 데이터를 초기값으로 사용한다.
  // 이렇게 하면 첫 렌더 직후 추가 네트워크 요청 없이 즉시 카드 UI를 그릴 수 있다.
  const [packages] = useState<PackageCardData[]>(initialPackages);
  const [ownershipBlockedMessage] = useState<string | null>(initialOwnershipBlockedMessage);
  const isPendingOrderBlocked = ownershipBlockedMessage?.includes("결제대기") || ownershipBlockedMessage?.includes("주문 상태");
  const cardBlockedHelperText = isPendingOrderBlocked ? "기존 주문 상태를 먼저 확인해주세요." : "기존 패키지 이용 종료 후 다시 구매할 수 있습니다.";

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
      {/* Hero Section */}
      <section className="relative min-h-[70svh] md:min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-muted/30 dark:bg-muted/20">
          <HeroCourtBackdrop className="h-full w-full text-primary opacity-[0.10] dark:opacity-[0.12]" />
          <div className="absolute inset-0 bg-overlay/20"></div>
        </div>

        <SiteContainer variant="wide" className="relative z-10 text-center text-foreground">
          <div className="max-w-4xl mx-auto">
            <h1 className="font-bold text-3xl sm:text-4xl md:text-5xl mb-6 text-foreground">스트링 교체 패키지</h1>

            <p className="text-base sm:text-xl md:text-2xl mb-8 text-muted-foreground leading-relaxed">정기적인 스트링 교체로 최상의 경기력을 유지하세요</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="default" className="shadow-sm hover:shadow-md transition-[box-shadow,border-color,background-color] duration-200" asChild>
                <Link href="#packages">
                  <ArrowRight className="w-5 h-5 mr-2" />
                  패키지 선택하기
                </Link>
              </Button>

              <Button size="lg" variant="outline" asChild>
                <Link href="/services">
                  <Phone className="w-5 h-5 mr-2" />
                  상담 받기
                </Link>
              </Button>
            </div>
          </div>
        </SiteContainer>
      </section>

      {/* Package Cards Section */}
      <section id="packages" ref={packagesSectionRef} className="py-12 md:py-20 bg-background scroll-mt-24">
        <SiteContainer variant="wide">
          <div className="text-center mb-10 md:mb-16">
            <Badge variant={packagesBadgeVariant("selection")} className="mb-4">
              맞춤형 패키지 선택
            </Badge>
            <h2 className="font-bold text-3xl sm:text-4xl md:text-4xl mb-6 text-foreground">스트링 교체 패키지</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              플레이 빈도와 필요에 맞는 패키지를 선택하세요.
              <br />
              모든 패키지는 전문가 상담과 품질 보장이 포함됩니다.
            </p>
            {ownershipBlockedMessage && <p className="mt-6 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{ownershipBlockedMessage}</p>}
          </div>

          <div className="flex min-h-[420px] flex-wrap justify-center gap-6 md:gap-8">
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
        </SiteContainer>
      </section>

      {/* FAQ Section */}
      <section className="py-12 md:py-20 bg-background">
        <SiteContainer variant="wide">
          <div className="text-center mb-10 md:mb-16">
            <Badge variant={packagesBadgeVariant("faq")} className="mb-4">
              자주 묻는 질문
            </Badge>
            <h2 className="font-bold text-3xl sm:text-4xl md:text-4xl mb-6 text-foreground">패키지 이용 안내</h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {[
                {
                  question: "패키지 유효기간이 지나면 어떻게 되나요?",
                  answer: "유효기간 만료 전 미사용 횟수는 30일 연장 가능하며, 추가 비용 없이 1회 연장해드립니다.",
                },
                {
                  question: "다른 사람과 패키지를 공유할 수 있나요?",
                  answer: "패키지는 구매자 본인만 사용 가능합니다.",
                },
                {
                  question: "패키지 환불이 가능한가요?",
                  answer: "미사용 횟수에 대해서는 구매일로부터 7일 이내 100% 환불 가능합니다.",
                },
                {
                  question: "패키지 사용은 어떻게 하나요?",
                  answer: "패키지 구매 후 교체 신청서에서 사용 가능합니다. 자세한 문의는 매장으로 연락 주세요.",
                },
              ].map((faq, index) => (
                <Card key={index} className="border border-border shadow-sm hover:shadow-md transition-shadow duration-300">
                  <CardContent className="p-4 md:p-6">
                    <h3 className="font-bold text-lg mb-3 text-primary">Q. {faq.question}</h3>
                    <p className="text-muted-foreground leading-relaxed">A. {faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="text-center mt-8 md:mt-12">
            <Button size="lg" variant="default" className="shadow-sm hover:shadow-md transition-all duration-300" asChild>
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
