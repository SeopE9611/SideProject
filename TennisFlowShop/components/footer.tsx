import SiteContainer from "@/components/layout/SiteContainer";
import { ArrowUpRight, Clock, CreditCard, Mail, MapPin, Phone, Train, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const Footer = () => {
  /**
   * 비회원 주문(게스트) 기능 노출 정책
   * - server env: GUEST_ORDER_MODE = 'off' | 'legacy' | 'on'
   * - off/legacy: 비회원 주문/조회 진입점을 UI에서 숨김(직접 URL 접근은 레거시 케어용으로 남길 수 있음)
   * - on: 비회원 주문을 운영할 때만 '주문 조회(/order-lookup)' 링크 노출
   */
  const rawMode = (process.env.GUEST_ORDER_MODE ?? "on").trim();
  const guestOrderMode = rawMode === "off" || rawMode === "legacy" || rawMode === "on" ? rawMode : "on";

  const quickLinks = [
    { name: "스트링 쇼핑", href: "/products" },
    { name: "장착 서비스", href: "/services" },
    { name: "패키지", href: "/services/packages" },
    ...(guestOrderMode === "on" ? [{ name: "주문 조회", href: "/order-lookup" }] : []),
    { name: "오프라인 매장 찾기", href: "/services/locations" },
  ];

  const customerService = [
    { name: "공지사항", href: "/board/notice" },
    { name: "Q&A", href: "/board/qna" },
    { name: "마이페이지", href: "/mypage" },
    { name: "이용약관", href: "/terms" },
    { name: "개인정보처리방침", href: "/privacy" },
  ];

  return (
    <footer className="w-full bg-card border-t border-border relative overflow-hidden mt-8 bp-sm:mt-12">
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-muted/30" />

      <div className="bp-lg:pl-64 bp-lg:pr-8 xl:pl-72 xl:pr-12 2xl:pr-16 py-6 bp-sm:py-8">
        <SiteContainer className="bp-lg:mx-0">
          <div className="space-y-6 bp-sm:space-y-8">
            <div className="grid grid-cols-1 bp-md:grid-cols-[1.25fr_1fr] gap-5 bp-md:gap-8 items-start">
              <div>
                <Link href="/" className="flex items-center gap-3 mb-3 group w-fit">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden">
                    <Image src="/brand/symbol-light.png" alt="" aria-hidden="true" fill className="object-contain dark:hidden" />
                    <Image src="/brand/symbol-dark.png" alt="" aria-hidden="true" fill className="hidden object-contain dark:block" />
                  </div>

                  <div>
                    <div className="font-brand-bold font-bold text-lg bp-sm:text-xl text-primary">도깨비테니스</div>
                    <div className="text-[11px] text-muted-foreground/90 font-semibold tracking-wide whitespace-nowrap">Powered by Tennis Flow</div>
                  </div>
                </Link>
                <p className="text-sm text-muted-foreground">테니스 스트링 쇼핑과 교체 서비스를 한 곳에서</p>
              </div>

              <div>
                <h3 className="text-sm bp-sm:text-base font-bold mb-3 text-foreground">핵심 바로가기</h3>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {quickLinks.map((link) => (
                    <li key={link.name}>
                      <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300">
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 bp-sm:grid-cols-2 bp-xl:grid-cols-4 gap-3 bp-sm:gap-4">
              <section className="rounded-xl border border-border/80 bg-background/60 p-4">
                <h3 className="text-sm bp-sm:text-base font-semibold text-foreground mb-3">고객센터</h3>
                <div className="space-y-2.5 mb-3.5">
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="text-sm font-semibold text-foreground block">0507-1392-3493</span>
                      <p className="text-xs text-muted-foreground">영업 시간 내 상담 가능</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs text-foreground break-all">info@tennis-flow.com</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>평일 10:00 - 22:00</div>
                      <div>토요일 09:00 - 18:00</div>
                      <div>일요일/공휴일 휴무</div>
                    </div>
                  </div>
                </div>
                <ul className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                  {customerService.map((link) => (
                    <li key={link.name}>
                      <Link href={link.href} className="text-xs text-muted-foreground hover:text-primary transition-colors duration-300">
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl border border-border/80 bg-background/60 p-4">
                <h3 className="text-sm bp-sm:text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  배송안내
                </h3>
                <ul className="space-y-1.5 text-xs text-muted-foreground leading-5">
                  <li>택배사는 현재 운영 정책에 따라 추후 확정될 예정입니다.</li>
                  <li>매장 도착 후 작업이 완료되면 완료 당일 발송됩니다.</li>
                  <li>영업일 및 작업량에 따라 발송 일정은 변동될 수 있습니다.</li>
                </ul>
              </section>

              <section className="rounded-xl border border-border/80 bg-muted/40 p-4">
                <h3 className="text-sm bp-sm:text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  매장 위치
                </h3>
                <div className="space-y-2.5">
                  <p className="text-sm text-foreground">서울 동작구 노량진로 22 B1</p>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Train className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>대방역 2번출구</span>
                  </div>
                  <div className="pt-2 border-t border-border/70 flex flex-wrap gap-2">
                    <Link
                      href="/services/locations"
                      className="inline-flex items-center rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
                    >
                      위치 안내 보기
                    </Link>
                    <Link
                      href="https://map.naver.com/p/entry/place/1907032343?c=15.00,0,0,0,dh&placePath=/home?from=map&fromPanelNum=1&additionalHeight=76&timestamp=202601042339&locale=ko&svcName=map_pcv5"
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
                    >
                      네이버 지도
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-border/80 bg-background/60 p-4">
                <h3 className="text-sm bp-sm:text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  결제안내
                </h3>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">무통장 입금 계좌</p>
                  <p className="text-sm font-semibold text-foreground">농협 123-4567-8901-23</p>
                  <p className="text-xs text-muted-foreground">예금주: 도깨비테니스</p>
                  <p className="text-xs text-muted-foreground leading-5">입금 확인은 영업시간 내 순차 처리됩니다.</p>
                </div>
              </section>
            </div>
          </div>
        </SiteContainer>
      </div>

      <div className="border-t border-border bg-muted/30">
        <div className="bp-lg:pl-64 bp-lg:pr-8 xl:pl-72 xl:pr-12 2xl:pr-16 py-4 bp-sm:py-5">
          <SiteContainer className="bp-lg:mx-0">
            <div className="space-y-2 text-[11px] bp-sm:text-xs text-muted-foreground leading-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {customerService.map((link) => (
                  <Link key={`policy-${link.name}`} href={link.href} className="hover:text-primary transition-colors duration-300">
                    {link.name}
                  </Link>
                ))}
                {guestOrderMode === "on" && (
                  <Link href="/order-lookup" className="hover:text-primary transition-colors duration-300">
                    주문조회
                  </Link>
                )}
              </div>
              <p>상호: 도깨비테니스 | 대표: 김재민 | 사업자등록번호: 329-39-01593 | 통신판매업신고: 제 2026 - 서울동작 - 0548 호</p>
              <p>사업장 소재지: 서울특별시 동작구 여의대방로62길 16(대방동)</p>
              <p>&copy; {new Date().getFullYear()} 도깨비테니스. All rights reserved.</p>
            </div>
          </SiteContainer>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
