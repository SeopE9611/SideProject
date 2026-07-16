"use client";

import PackagePlanCard from "@/app/services/packages/_components/PackagePlanCard";
import { type PackageCardData } from "@/app/services/packages/_lib/packageCard";
import SiteContainer from "@/components/layout/SiteContainer";
import { EmptyState, PublicSurface } from "@/components/public";
import { SectionHeader } from "@/components/public/SectionHeader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { packagesBadgeVariant } from "@/lib/badge-style";
import { ArrowRight, Clock, Gift, MessageSquare, Shield, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

interface StringPackagesPageClientProps {
  initialPackages: PackageCardData[];
  initialOwnershipBlockedMessage: string | null;
}

const packageUseSteps = ["패키지 선택", "결제 후 보유", "교체서비스 신청 시 횟수 사용"];

const packageValueItems: Array<{
  icon: ReactNode;
  title: string;
  description: string;
}> = [
  {
    icon: <Shield className="h-5 w-5" />,
    title: "교체 품질 확인",
    description: "접수 내용에 맞춰 스트링 상태와 작업 결과를 확인합니다.",
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "빠른 접수",
    description: "방문 전 신청 내용을 확인해 교체 진행을 돕습니다.",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "전문 상담",
    description: "플레이 스타일에 맞는 장력과 스트링 선택을 안내합니다.",
  },
  {
    icon: <Gift className="h-5 w-5" />,
    title: "잔여 횟수·유효기간 관리",
    description: "남은 횟수와 유효기간을 기준으로 패키지를 사용할 수 있습니다.",
  },
];

const packageFaqs = [
  {
    value: "validity",
    question: "패키지 유효기간이 지나면 어떻게 되나요?",
    answer: "유효기간이 임박한 경우 운영 정책에 따라 연장 가능 여부를 안내드립니다.",
  },
  {
    value: "share",
    question: "다른 사람과 패키지를 공유할 수 있나요?",
    answer: "패키지는 구매자 본인 사용을 기준으로 운영됩니다.",
  },
  {
    value: "refund",
    question: "패키지 환불이 가능한가요?",
    answer: "환불 가능 여부와 금액은 사용 횟수와 결제 상태를 확인한 뒤 안내드립니다.",
  },
  {
    value: "usage",
    question: "패키지 사용은 어떻게 하나요?",
    answer: "구매 후 교체서비스 신청 시 보유 패키지를 선택해 사용할 수 있습니다.",
  },
];

export default function StringPackagesPageClient({
  initialPackages,
  initialOwnershipBlockedMessage,
}: StringPackagesPageClientProps) {
  const searchParams = useSearchParams();
  const packagesSectionRef = useRef<HTMLElement | null>(null);

  // 서버에서 선조회한 데이터를 초기값으로 사용한다.
  // 이렇게 하면 첫 렌더 직후 추가 네트워크 요청 없이 즉시 카드 UI를 그릴 수 있다.
  const [packages] = useState<PackageCardData[]>(initialPackages);
  const [ownershipBlockedMessage] = useState<string | null>(initialOwnershipBlockedMessage);
  const isPendingOrderBlocked =
    ownershipBlockedMessage?.includes("결제대기") || ownershipBlockedMessage?.includes("주문 상태");
  const ownershipCtaHref = isPendingOrderBlocked ? "/mypage?tab=orders" : "/mypage?tab=passes";
  const ownershipCtaLabel = isPendingOrderBlocked ? "주문 상태 확인하기" : "보유 패키지 확인하기";
  const packageGridClass =
    packages.length <= 1
      ? "max-w-md grid-cols-1"
      : packages.length === 2
        ? "max-w-4xl grid-cols-1 bp-sm:grid-cols-2"
        : packages.length === 3
          ? "max-w-[1500px] grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-3"
          : "max-w-[1500px] grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-3 bp-2xl:grid-cols-4";

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
      <section className="border-b border-border bg-muted/30 py-8 bp-sm:py-10">
        <SiteContainer>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:items-center">
            <div className="max-w-3xl space-y-4">
              <Badge variant="signal">스트링 교체 패키지</Badge>
              <div className="space-y-3">
                <h1 className="text-balance text-ui-page-title font-semibold tracking-tight text-foreground bp-sm:text-ui-page-title-lg">
                  교체 횟수에 맞춰, 필요한 만큼 미리 준비하세요.
                </h1>
                <p className="max-w-2xl break-keep text-ui-body leading-relaxed text-muted-foreground bp-sm:text-ui-body-lg">
                  횟수·회당 금액·유효기간을 비교하고, 교체서비스 신청 시 보유 횟수에서
                  간편하게 사용하세요.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 bp-sm:w-auto bp-sm:flex-row bp-sm:flex-wrap">
                <Button size="lg" variant="highlight" className="w-full bp-sm:w-auto" asChild>
                  <Link href="#packages">
                    <ArrowRight className="h-5 w-5" />
                    패키지 비교하기
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="w-full bp-sm:w-auto" asChild>
                  <Link href="/services">교체서비스 알아보기</Link>
                </Button>
              </div>
            </div>

            <PublicSurface variant="inverse" padding="md" className="lg:justify-self-end">
              <p className="text-ui-label font-medium text-surface-inverse-muted">이용 흐름</p>
              <ol className="mt-4 space-y-3">
                {packageUseSteps.map((step, index) => (
                  <li key={step} className="flex min-w-0 items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-highlight text-ui-label font-semibold text-brand-highlight-foreground">
                      {index + 1}
                    </span>
                    <span className="break-keep text-ui-body-sm font-medium text-surface-inverse-foreground">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </PublicSurface>
          </div>
        </SiteContainer>
      </section>

      <section
        id="packages"
        ref={packagesSectionRef}
        className="scroll-mt-[calc(var(--header-h)+1rem)] bg-background py-10 md:py-14"
      >
        <SiteContainer variant="wide">
          <SectionHeader
            align="left"
            className="mb-6 md:mb-8"
            eyebrow={<Badge variant={packagesBadgeVariant("selection")}>패키지 선택</Badge>}
            title="횟수와 총액을 한 번에 비교하세요"
            description="이용 횟수, 회당 금액, 절감액과 유효기간만 빠르게 확인할 수 있도록 정리했습니다."
          />
          {ownershipBlockedMessage && (
            <PublicSurface
              variant="muted"
              className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-ui-body-sm font-semibold text-foreground">
                  추가 구매가 제한되어 있습니다
                </p>
                <p className="mt-2 break-keep text-ui-body-sm leading-relaxed text-muted-foreground">
                  {ownershipBlockedMessage}
                </p>
              </div>
              <Button variant="outline" className="w-full md:w-auto" asChild>
                <Link href={ownershipCtaHref}>{ownershipCtaLabel}</Link>
              </Button>
            </PublicSurface>
          )}

          {packages.length > 0 ? (
            <div
              className={`mx-auto grid ${packageGridClass} items-stretch gap-4`}
            >
              {packages.map((pkg) => (
                <PackagePlanCard
                  key={pkg.id}
                  pkg={pkg}
                  ctaHref={`/services/packages/checkout?package=${pkg.id}`}
                  blocked={!!ownershipBlockedMessage}
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

      <section className="bg-background py-10 md:py-14">
        <SiteContainer variant="wide">
          <PublicSurface variant="inverse" padding="lg">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div className="space-y-3">
                <Badge variant="secondary">패키지 이용 가치</Badge>
                <h2 className="text-ui-section-title-lg font-semibold text-surface-inverse-foreground">
                  결제 후에도 교체 과정까지 이어지는 관리
                </h2>
                <p className="break-keep text-ui-body-sm leading-relaxed text-surface-inverse-muted">
                  패키지는 단순 할인권이 아니라 교체서비스 접수와 상담, 남은 횟수 관리까지
                  연결되는 이용 방식입니다.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {packageValueItems.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-control border border-surface-inverse-foreground/15 bg-surface-inverse-foreground/5 p-4"
                  >
                    <div className="text-surface-inverse-muted">{item.icon}</div>
                    <h3 className="mt-3 break-keep text-ui-body-sm font-semibold text-surface-inverse-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-2 break-keep text-ui-label leading-relaxed text-surface-inverse-muted">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </PublicSurface>
        </SiteContainer>
      </section>

      <section className="bg-background py-10 md:py-14">
        <SiteContainer variant="wide">
          <SectionHeader
            align="center"
            className="mb-8 md:mb-10"
            eyebrow={<Badge variant={packagesBadgeVariant("faq")}>자주 묻는 질문</Badge>}
            title="패키지 이용 안내"
            description="구매 전 자주 확인하는 내용을 간결하게 정리했습니다."
          />

          <PublicSurface className="mx-auto max-w-4xl" padding="md">
            <Accordion type="single" className="divide-y divide-border">
              {packageFaqs.map((faq) => (
                <AccordionItem key={faq.value} value={faq.value} className="border-b-0">
                  <AccordionTrigger value={faq.value} className="py-4 text-ui-body font-semibold">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent
                    value={faq.value}
                    className="pb-4 text-ui-body-sm leading-relaxed text-muted-foreground"
                  >
                    {faq.answer}
                    {faq.value === "refund" && (
                      <Link
                        href="/refund-policy"
                        className="ml-1 font-medium text-foreground underline underline-offset-4"
                      >
                        환불 정책 보기
                      </Link>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </PublicSurface>

          <div className="mt-8 text-center md:mt-10">
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/board/qna">
                <MessageSquare className="h-5 w-5" />
                패키지 이용 문의하기
              </Link>
            </Button>
          </div>
        </SiteContainer>
      </section>
    </div>
  );
}
