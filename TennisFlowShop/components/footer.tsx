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

  const customerServiceLinks = customerService.filter((link) => link.name === "공지사항" || link.name === "Q&A" || link.name === "마이페이지");
  const policyLinks = customerService.filter((link) => link.name === "이용약관" || link.name === "개인정보처리방침");

  return (
    <footer className="relative mt-8 w-full overflow-hidden border-t border-border bg-card bp-sm:mt-12">
      <div className="pointer-events-none absolute inset-0 bg-muted/20 opacity-60" />

      <div className="bp-lg:pl-64 bp-lg:pr-8 xl:pl-72 xl:pr-12 2xl:pr-16 py-6 bp-sm:py-8">
        <SiteContainer className="bp-lg:mx-0">
          <div className="space-y-6 bp-sm:space-y-8">
            <div className="grid grid-cols-1 items-start gap-6 border-b border-border/80 pb-5 bp-md:grid-cols-[1.2fr_1fr] bp-md:gap-8 bp-sm:pb-6">
              <div className="space-y-2.5">
                <Link href="/" className="group flex w-fit items-center gap-3">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden bp-sm:h-11 bp-sm:w-11">
                    <Image src="/brand/symbol-light.png" alt="" aria-hidden="true" fill className="object-contain dark:hidden" />
                    <Image src="/brand/symbol-dark.png" alt="" aria-hidden="true" fill className="hidden object-contain dark:block" />
                  </div>

                  <div className="space-y-0.5">
                    <div className="font-brand-bold text-lg font-bold tracking-tight text-foreground bp-sm:text-xl">도깨비테니스</div>
                    <div className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground/80">Powered by Tennis Flow</div>
                  </div>
                </Link>
                <p className="max-w-md text-sm leading-6 text-foreground/85">테니스 스트링 쇼핑과 교체 서비스를 한 곳에서 빠르고 정확하게 연결합니다.</p>
              </div>

              <div className="rounded-lg border border-border/70 bg-background/50 p-4 bp-sm:p-5">
                <h3 className="mb-3 text-sm font-semibold text-foreground bp-sm:text-base">핵심 바로가기</h3>
                <ul className="grid grid-cols-2 gap-x-5 gap-y-2.5">
                  {quickLinks.map((link) => (
                    <li key={link.name}>
                      <Link href={link.href} className="inline-flex text-sm text-muted-foreground transition-colors duration-300 hover:text-primary">
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 bp-sm:grid-cols-2 bp-sm:gap-4 bp-xl:grid-cols-4">
              <section className="rounded-xl border border-border/80 bg-background/65 p-4 bp-sm:p-5">
                <h3 className="mb-3 text-sm font-semibold text-foreground bp-sm:text-base">고객센터</h3>
                <div className="mb-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <span className="block text-base font-bold leading-none text-foreground">0507-1392-3493</span>
                      <p className="mt-1 text-xs text-muted-foreground">영업 시간 내 상담 가능</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0 text-primary/90" />
                    <span className="break-all text-foreground/85">info@tennis-flow.com</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary/90" />
                    <div className="space-y-0.5">
                      <div>평일 10:00 - 22:00</div>
                      <div>토요일 09:00 - 18:00</div>
                      <div>일요일/공휴일 휴무</div>
                    </div>
                  </div>
                </div>
                <ul className="flex flex-wrap gap-1.5 border-t border-border/70 pt-3">
                  {customerServiceLinks.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="inline-flex rounded-md border border-border/70 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors duration-300 hover:border-primary/40 hover:text-primary"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl border border-border/70 bg-background/45 p-4 bp-sm:p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground bp-sm:text-base">
                  <Truck className="h-4 w-4 text-primary" />
                  배송안내
                </h3>
                <ul className="space-y-2.5 text-xs leading-5 text-muted-foreground">
                  <li className="rounded-md border border-border/60 bg-background/60 px-2.5 py-2">
                    <span className="mr-1 font-semibold text-foreground/90">작업 완료 시</span>
                    당일 발송
                  </li>
                  <li className="rounded-md border border-border/60 bg-background/60 px-2.5 py-2">
                    <span className="mr-1 font-semibold text-foreground/90">영업일 기준</span>
                    순차 처리
                  </li>
                  <li className="rounded-md border border-border/60 bg-background/60 px-2.5 py-2">
                    <span className="mr-1 font-semibold text-foreground/90">작업량에 따라</span>
                    일정 변동 가능
                  </li>
                </ul>
              </section>

              <section className="relative overflow-hidden rounded-xl border border-border/80 bg-muted/40 p-4 bp-sm:p-5">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-14 border-b border-primary/15 bg-primary/[0.04]" />
                <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full border border-primary/20" />
                <div className="pointer-events-none absolute right-3 top-7 h-1.5 w-1.5 rounded-full bg-primary/30" />

                <h3 className="relative mb-3 flex items-center gap-2 text-sm font-semibold text-foreground bp-sm:text-base">
                  <MapPin className="h-4 w-4 text-primary" />
                  매장 위치
                </h3>
                <div className="relative space-y-3">
                  <div className="rounded-lg border border-border/70 bg-background/80 p-3">
                    <p className="text-sm font-medium text-foreground">서울 동작구 노량진로 22 B1</p>
                    <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                      <Train className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80" />
                      <span>대방역 2번출구 도보 이동</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/services/locations"
                      className="inline-flex items-center rounded-md border border-border/80 bg-background px-2.5 py-1.5 text-xs text-foreground transition-colors hover:border-primary/30 hover:bg-background"
                    >
                      위치 안내 보기
                    </Link>
                    <Link
                      href="https://map.naver.com/p/entry/place/1907032343?c=15.00,0,0,0,dh&placePath=/home?from=map&fromPanelNum=1&additionalHeight=76&timestamp=202601042339&locale=ko&svcName=map_pcv5"
                      className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/[0.06] px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-primary/[0.12]"
                    >
                      네이버 지도
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-border/60 bg-background/35 p-4 bp-sm:p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground bp-sm:text-base">
                  <CreditCard className="h-4 w-4 text-primary" />
                  결제안내
                </h3>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>무통장 입금 계좌</p>
                  <p className="text-sm font-semibold text-foreground">농협 123-4567-8901-23</p>
                  <p>예금주: 도깨비테니스</p>
                  <p className="leading-5">입금 확인은 영업시간 내 순차 처리됩니다.</p>
                </div>
              </section>
            </div>
          </div>
        </SiteContainer>
      </div>

      <div className="border-t border-border bg-muted/40">
        <div className="bp-lg:pl-64 bp-lg:pr-8 xl:pl-72 xl:pr-12 2xl:pr-16 py-4 bp-sm:py-5">
          <SiteContainer className="bp-lg:mx-0">
            <div className="space-y-2.5 text-xs leading-5 text-muted-foreground bp-sm:text-[13px]">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border/70 pb-2">
                {policyLinks.map((link) => (
                  <Link key={`policy-${link.name}`} href={link.href} className="font-medium text-foreground/85 transition-colors duration-300 hover:text-primary">
                    {link.name}
                  </Link>
                ))}
                <Link href="/board/notice" className="transition-colors duration-300 hover:text-primary">
                  공지사항
                </Link>
                {guestOrderMode === "on" && (
                  <Link href="/order-lookup" className="transition-colors duration-300 hover:text-primary">
                    주문조회
                  </Link>
                )}
              </div>
              <p className="text-foreground/80">상호: 도깨비테니스 | 대표: 김재민 | 사업자등록번호: 329-39-01593 | 통신판매업신고: 제 2026 - 서울동작 - 0548 호</p>
              <p className="text-foreground/75">사업장 소재지: 서울특별시 동작구 여의대방로62길 16(대방동)</p>
              <p className="text-[11px] text-muted-foreground">&copy; {new Date().getFullYear()} 도깨비테니스. All rights reserved.</p>
            </div>
          </SiteContainer>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
