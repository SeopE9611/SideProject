import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero } from "@/components/public/PublicPageHero";
import { PublicSurface } from "@/components/public/PublicSurface";
import { SummaryCard } from "@/components/public/SummaryCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Phone, Train } from "lucide-react";
import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "장착 가능 매장",
};

export default function LocationsPage() {
  const locations = [
    {
      name: "도깨비테니스",
      address: "서울 동작구 노량진로 22 B1",
      phone: "010-5218-5248",
      email: "korgis5813@naver.com",
      hours: {
        weekday: "10:00 - 22:00",
        weekend: "09:00 - 18:00",
        holiday: "일요일/공휴일 휴무",
      },
      services: ["스트링 장착", "텐션 가이드", "스트링 추천", "라켓 상담"],
      transport: ["대방역 2번 출구"],
      isMain: true,
      specialNote: "매장에 방문하시면 친절하게 상담해드립니다.",
    },
  ];

  const reservationSteps = [
    {
      step: 1,
      title: "서비스 선택",
      description: "스트링 장착 서비스를 선택하세요",
    },
    {
      step: 2,
      title: "날짜/시간 선택",
      description: "편리한 시간을 예약하세요",
    },
    {
      step: 3,
      title: "상담 및 확인",
      description: "전화 또는 방문 상담을 받으세요",
    },
    {
      step: 4,
      title: "서비스 완료",
      description: "전문적인 스트링 장착을 받으세요",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicPageHero
        align="center"
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            오프라인 매장 찾기
          </span>
        }
        title="매장 위치 안내"
        description="가까운 매장을 찾아 편리하게 서비스를 이용하세요"
      />

      <SiteContainer variant="wide" className="py-8 md:py-12">
        {/* Locations */}
        <div className="mb-16">
          <div className="max-w-2xl mx-auto">
            {locations.map((location, index) => (
              <SummaryCard
                key={index}
                className="ring-2 ring-ring transition-[border-color,box-shadow,background-color] duration-200 hover:shadow-md"
                title={location.name}
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-ui-body-sm">{location.address}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-ui-body-sm font-mono">{location.phone}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-ui-body-sm font-semibold">운영시간</span>
                    </div>
                    <div className="ml-6 space-y-1 text-ui-body-sm text-muted-foreground">
                      <div>평일: {location.hours.weekday}</div>
                      <div>토요일: {location.hours.weekend}</div>
                      <div>일요일/공휴일: {location.hours.holiday}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Train className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-ui-body-sm font-semibold">교통</span>
                    </div>
                    <div className="ml-6 space-y-1 text-ui-body-sm text-muted-foreground">
                      {location.transport.map((info, i) => (
                        <div key={i}>{info}</div>
                      ))}
                    </div>
                  </div>

                  <PublicSurface variant="muted" padding="sm" className="rounded-lg">
                    <p className="text-ui-body-sm font-medium text-primary">
                      {location.specialNote}
                    </p>
                  </PublicSurface>

                  <div className="flex flex-wrap gap-1">
                    {location.services.map((service, i) => (
                      <Badge key={i} variant="secondary" className="text-ui-label">
                        {service}
                      </Badge>
                    ))}
                  </div>

                  <Button className="w-full" asChild>
                    <Link
                      href="https://map.naver.com/p/entry/place/1907032343?c=15.00,0,0,0,dh&placePath=/home?from=map&fromPanelNum=1&additionalHeight=76&timestamp=202601042339&locale=ko&svcName=map_pcv5"
                      target="_blank"
                      rel="noreferrer"
                    >
                      네이버 지도 검색
                    </Link>
                  </Button>
                </div>
              </SummaryCard>
            ))}
          </div>
        </div>

        {/* <div className="mb-16">
          <h2 className="font-semibold text-ui-page-title text-foreground mb-8 text-center">예약 절차</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {reservationSteps.map((step, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-secondary text-foreground rounded-full border border-border flex items-center justify-center mx-auto mb-4 text-ui-card-title-lg font-semibold">{step.step}</div>
                  <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-ui-body-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div> */}

        {/* <Card className="bg-muted/40 dark:bg-muted/30 border-border">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-ui-section-title font-semibold text-foreground mb-4">예약 및 상담</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-semibold">전화 예약</div>
                      <div className="text-ui-body-sm text-muted-foreground">010-5218-5248</div>
                      <div className="text-ui-label text-muted-foreground">평일 09:00-18:00, 토요일 09:00-12:00</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-semibold">온라인 신청</div>
                      <div className="text-ui-body-sm text-muted-foreground">스트링 교체 신청서 작성</div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-ui-section-title font-semibold text-foreground mb-4">서비스 특징</h3>
                <ul className="space-y-2 text-ui-body-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    전문가 직접 서비스
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    무료 텐션 및 스트링 상담
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    정밀한 디지털 스트링머신 사용
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Button size="lg" asChild>
                <Link href="/services">스트링 장착 예약</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="tel:010-5218-5248">전화 상담</Link>
              </Button>
            </div>
          </CardContent>
        </Card> */}
      </SiteContainer>
    </div>
  );
}
