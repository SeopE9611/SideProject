import SiteContainer from "@/components/layout/SiteContainer";
import { PublicSurface } from "@/components/public/PublicSurface";
import { SectionHeader } from "@/components/public/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowUpRight, Clock, Mail, MapPin, Phone, Train } from "lucide-react";
import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "장착 가능 매장",
};

const NAVER_MAP_URL =
  "https://map.naver.com/p/entry/place/1907032343?c=15.00,0,0,0,dh&placePath=/home?from=map&fromPanelNum=1&additionalHeight=76&timestamp=202601042339&locale=ko&svcName=map_pcv5";
const PHONE_LINK = "tel:01052185248";
const EMAIL_LINK = "mailto:korgis5813@naver.com";

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

export default function LocationsPage() {
  const mainLocation = locations[0];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-muted/30 py-7 bp-sm:py-9">
        <SiteContainer>
          <div className="grid gap-5 bp-lg:grid-cols-[minmax(0,1fr)_24rem] bp-lg:items-center">
            <div className="max-w-3xl space-y-4">
              <p className="text-ui-label font-medium uppercase tracking-[0.14em] text-primary">
                OFFLINE STORE
              </p>
              <h1 className="text-balance font-ui-bold text-ui-page-title font-semibold text-foreground bp-sm:text-ui-page-title-lg">
                방문 전 위치와 운영시간을 확인하세요.
              </h1>
              <p className="text-pretty text-ui-body leading-relaxed text-muted-foreground bp-sm:text-ui-body-lg">
                대방역 인근 도깨비테니스에서 스트링 장착, 장력 가이드, 스트링 추천과 라켓 상담을
                받을 수 있습니다.
              </p>
              <div className="grid gap-2 bp-sm:flex bp-sm:flex-wrap">
                <Button
                  variant="highlight"
                  asChild
                  wrap="responsive"
                  className="w-full bp-sm:w-auto"
                >
                  <Link
                    href={NAVER_MAP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="네이버 지도에서 도깨비테니스 길찾기 새 창으로 열기"
                  >
                    네이버 지도에서 길찾기
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button variant="outline" asChild wrap="responsive" className="w-full bp-sm:w-auto">
                  <Link href={PHONE_LINK}>전화 상담</Link>
                </Button>
              </div>
            </div>

            <PublicSurface variant="inverse" className="space-y-3">
              <div className="flex items-start gap-3 border-b border-surface-inverse-foreground/15 pb-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-highlight" aria-hidden />
                <div className="min-w-0 space-y-1">
                  <p className="text-ui-body-sm font-semibold text-surface-inverse-foreground">
                    {mainLocation.name}
                  </p>
                  <p className="break-words text-ui-body-sm leading-relaxed text-surface-inverse-muted">
                    {mainLocation.address}
                  </p>
                  <p className="text-ui-body-sm leading-relaxed text-surface-inverse-muted">
                    {mainLocation.transport.join(" · ")}
                  </p>
                </div>
              </div>
              <dl className="space-y-2 text-ui-body-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-surface-inverse-foreground">평일</dt>
                  <dd className="text-right tabular-nums text-surface-inverse-muted">
                    {mainLocation.hours.weekday}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-surface-inverse-foreground">토요일</dt>
                  <dd className="text-right tabular-nums text-surface-inverse-muted">
                    {mainLocation.hours.weekend}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-surface-inverse-foreground">휴무</dt>
                  <dd className="text-right text-surface-inverse-muted">
                    {mainLocation.hours.holiday}
                  </dd>
                </div>
              </dl>
            </PublicSurface>
          </div>
        </SiteContainer>
      </header>

      <main>
        <section className="py-8 bp-sm:py-10 bp-lg:py-12">
          <SiteContainer variant="wide" className="space-y-5 bp-sm:space-y-7">
            <SectionHeader
              eyebrow="Visit Information"
              title="도깨비테니스 방문 안내"
              description="방문 전 위치, 교통, 연락처와 이용 가능한 서비스를 확인해 주세요."
            />

            {locations.map((location) => (
              <PublicSurface key={location.name} padding="none" className="overflow-hidden">
                <article className="grid bp-lg:grid-cols-[minmax(0,1fr)_1.1fr]">
                  <div className="bg-muted/30 p-5 bp-sm:p-6 bp-lg:p-8">
                    <div className="space-y-5">
                      <div className="flex items-start gap-3">
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-highlight-ink/30 bg-brand-highlight-muted text-brand-highlight-ink"
                          aria-hidden
                        >
                          <MapPin className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 space-y-2">
                          <h3 className="text-ui-card-title-lg font-semibold text-foreground">
                            {location.name}
                          </h3>
                          <p className="break-words text-ui-body leading-relaxed text-foreground">
                            {location.address}
                          </p>
                          <p className="text-ui-body-sm leading-relaxed text-muted-foreground">
                            주소의 B1은 지하 1층을 의미합니다.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 border-t border-border pt-5">
                        <p className="flex items-center gap-2 text-ui-body-sm font-semibold text-foreground">
                          <Train className="h-4 w-4 text-muted-foreground" aria-hidden />
                          교통 안내
                        </p>
                        <ul className="space-y-2 text-ui-body-sm leading-relaxed text-muted-foreground">
                          {location.transport.map((transport) => (
                            <li key={transport}>{transport}</li>
                          ))}
                          <li>대방역 2번 출구 → 노량진로 22 → 지하 1층</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 space-y-6 p-5 bp-sm:p-6 bp-lg:p-8">
                    <div className="space-y-2">
                      {location.isMain ? <Badge variant="secondary">메인 매장</Badge> : null}
                      <h3 className="text-ui-section-title font-semibold tracking-tight text-foreground">
                        {location.name}
                      </h3>
                      <p className="text-ui-body-sm leading-relaxed text-muted-foreground">
                        {location.specialNote}
                      </p>
                    </div>

                    <address className="not-italic">
                      <dl className="grid gap-3 text-ui-body-sm">
                        <div className="grid gap-1 bp-sm:grid-cols-[5rem_minmax(0,1fr)] bp-sm:gap-4">
                          <dt className="flex items-center gap-2 font-semibold text-foreground">
                            <Phone className="h-4 w-4 text-muted-foreground" aria-hidden />
                            전화
                          </dt>
                          <dd>
                            <Link
                              href={PHONE_LINK}
                              className="tabular-nums text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {location.phone}
                            </Link>
                          </dd>
                        </div>
                        <div className="grid gap-1 bp-sm:grid-cols-[5rem_minmax(0,1fr)] bp-sm:gap-4">
                          <dt className="flex items-center gap-2 font-semibold text-foreground">
                            <Mail className="h-4 w-4 text-muted-foreground" aria-hidden />
                            이메일
                          </dt>
                          <dd>
                            <Link
                              href={EMAIL_LINK}
                              className="break-all text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {location.email}
                            </Link>
                          </dd>
                        </div>
                      </dl>
                    </address>

                    <div className="space-y-3">
                      <h4 className="flex items-center gap-2 text-ui-body-sm font-semibold text-foreground">
                        <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
                        운영시간
                      </h4>
                      <dl className="grid gap-2 text-ui-body-sm leading-relaxed text-muted-foreground">
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                          <dt>평일</dt>
                          <dd className="tabular-nums text-foreground">{location.hours.weekday}</dd>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                          <dt>토요일</dt>
                          <dd className="tabular-nums text-foreground">{location.hours.weekend}</dd>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                          <dt>휴무</dt>
                          <dd className="text-foreground">{location.hours.holiday}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-ui-body-sm font-semibold text-foreground">제공 서비스</h4>
                      <div className="flex flex-wrap gap-2">
                        {location.services.map((service) => (
                          <Badge key={service} variant="outline" wrap="normal">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-2 border-t border-border bg-muted/30 px-4 py-4 bp-sm:flex bp-sm:flex-wrap bp-sm:items-center bp-sm:justify-between">
                      <p className="text-ui-body-sm leading-relaxed text-muted-foreground">
                        {location.specialNote}
                      </p>
                      <div className="grid gap-2 bp-sm:flex bp-sm:flex-wrap">
                        <Button
                          variant="highlight"
                          asChild
                          wrap="responsive"
                          className="w-full bp-sm:w-auto"
                        >
                          <Link
                            href={NAVER_MAP_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="네이버 지도에서 도깨비테니스 길찾기 새 창으로 열기"
                          >
                            네이버 지도에서 길찾기
                            <ArrowUpRight className="h-4 w-4" aria-hidden />
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          asChild
                          wrap="responsive"
                          className="w-full bp-sm:w-auto"
                        >
                          <Link href={PHONE_LINK}>전화 상담</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              </PublicSurface>
            ))}
          </SiteContainer>
        </section>

        <section className="pb-10 bp-sm:pb-12 bp-lg:pb-16">
          <SiteContainer>
            <PublicSurface variant="inverse" className="space-y-5">
              <div className="max-w-2xl space-y-2">
                <h2 className="text-ui-section-title-lg font-semibold text-surface-inverse-foreground">
                  방문 전 교체서비스 신청 또는 상담을 진행해 주세요.
                </h2>
                <p className="text-ui-body-sm leading-relaxed text-surface-inverse-muted bp-sm:text-ui-body">
                  신청 내용과 희망 일정을 먼저 확인하면 방문 상담과 작업 진행이 더 원활합니다.
                </p>
              </div>
              <div className="grid gap-2 bp-sm:flex bp-sm:flex-wrap">
                <Button
                  variant="highlight"
                  asChild
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
                <Button variant="outline" asChild wrap="responsive" className="w-full bp-sm:w-auto">
                  <Link href="/services">서비스 안내로 돌아가기</Link>
                </Button>
              </div>
            </PublicSurface>
          </SiteContainer>
        </section>
      </main>
    </div>
  );
}
