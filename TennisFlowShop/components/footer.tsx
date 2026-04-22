import SiteContainer from "@/components/layout/SiteContainer";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
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
    // { name: '주문 조회', href: '/order-lookup' },
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
      <div className="bp-lg:pl-64 bp-lg:pr-8 xl:pl-72 xl:pr-12 2xl:pr-16 py-4 bp-sm:py-5">
        <SiteContainer className="bp-lg:mx-0">
          <div className="grid grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-[1.35fr_1fr_1fr_1fr_1fr] gap-4 bp-sm:gap-5 bp-lg:gap-5 mb-4 bp-sm:mb-6">
            {/* 브랜드 섹션 - 모바일에서 전체 너비 */}
            <div className="bp-sm:col-span-2 bp-lg:col-span-1">
              <Link href="/" className="flex items-center gap-3 mb-3 group">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden">
                  <Image src="/brand/symbol-light.png" alt="" aria-hidden="true" fill className="object-contain dark:hidden" />
                  <Image src="/brand/symbol-dark.png" alt="" aria-hidden="true" fill className="hidden object-contain dark:block" />
                </div>

                <div>
                  <div className="font-brand-bold font-black text-lg bp-sm:text-xl text-primary">도깨비테니스</div>
                  <div className="text-xs text-muted-foreground font-semibold tracking-wide whitespace-nowrap">Powered by Tennis Flow</div>
                </div>
              </Link>
            </div>

            <div>
              <h3 className="text-base bp-sm:text-lg font-bold mb-2 text-foreground">바로가기</h3>
              <ul className="space-y-1.5">
                {quickLinks.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 고객센터 */}
            <div>
              <h3 className="text-base bp-sm:text-lg font-bold mb-2 text-foreground">고객센터</h3>
              <ul className="space-y-1.5">
                {customerService.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-base bp-sm:text-lg font-bold mb-2 text-foreground">연락처</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-semibold text-foreground block">0507-1392-3493</span>
                    <p className="text-xs text-muted-foreground">영업 시간 내 상담 가능</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs text-foreground break-all">korgis5813@naver.com</span>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm text-foreground block">서울 동작구 노량진로 22 B1</span>
                    <p className="text-xs text-muted-foreground mt-0.5">우편번호: 06938</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm space-y-0.5">
                    <div className="text-foreground">평일 10:00 - 22:00</div>
                    <div className="text-xs text-muted-foreground">토요일 09:00 - 18:00</div>
                    <div className="text-xs text-destructive">일요일 정기 휴무</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base bp-sm:text-lg font-bold mb-2 text-foreground">입금계좌</h3>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-foreground">농협 123-4567-8901-23</p>
                <p className="text-xs text-muted-foreground">예금주: 도깨비테니스</p>
                <p className="text-xs text-muted-foreground leading-5">무통장 입금 확인은 영업시간 내 순차 처리</p>
              </div>
            </div>
          </div>
        </SiteContainer>
      </div>

      <div className="border-t border-border bg-muted/30">
        <div className="bp-lg:pl-64 bp-lg:pr-8 xl:pl-72 xl:pr-12 2xl:pr-16 py-4 bp-sm:py-5">
          <SiteContainer className="bp-lg:mx-0">
            <div className="flex flex-col items-start gap-2 text-[12px] bp-sm:text-[13px] text-muted-foreground leading-5">
              <div className="space-y-1.5">
                <p>&copy; {new Date().getFullYear()} 도깨비테니스. All rights reserved.</p>
                <p>상호: 도깨비테니스 | 대표: 김재민 | 사업자등록번호: 329-39-01593</p>
                <p>사업장 소재지: 서울특별시 동작구 여의대방로62길 16(대방동) | 통신판매업신고: 제 2026 - 서울동작 - 0548 호</p>
              </div>
            </div>
          </SiteContainer>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
