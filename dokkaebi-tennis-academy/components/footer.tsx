import Link from 'next/link';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import SiteContainer from '@/components/layout/SiteContainer';

const Footer = () => {

  /**
   * 비회원 주문(게스트) 기능 노출 정책
   * - server env: GUEST_ORDER_MODE = 'off' | 'legacy' | 'on'
   * - off/legacy: 비회원 주문/조회 진입점을 UI에서 숨김(직접 URL 접근은 레거시 케어용으로 남길 수 있음)
   * - on: 비회원 주문을 운영할 때만 '주문 조회(/order-lookup)' 링크 노출
   */
  const rawMode = (process.env.GUEST_ORDER_MODE ?? 'on').trim();
  const guestOrderMode = rawMode === 'off' || rawMode === 'legacy' || rawMode === 'on' ? rawMode : 'on';

  const quickLinks = [
    { name: '스트링 쇼핑', href: '/products' },
    { name: '장착 서비스', href: '/services' },
    { name: '패키지', href: '/services/packages' },
    // { name: '주문 조회', href: '/order-lookup' },
    ...(guestOrderMode === 'on' ? [{ name: '주문 조회', href: '/order-lookup' }] : []),
    { name: '오프라인 매장 찾기', href: '/services/locations' },
  ];

  const customerService = [
    { name: '공지사항', href: '/board/notice' },
    { name: 'Q&A', href: '/board/qna' },
    { name: '마이페이지', href: '/mypage' },
    { name: '이용약관', href: '/terms' },
    { name: '개인정보처리방침', href: '/privacy' },
  ];

  return (
    <footer className="w-full bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 relative overflow-hidden mt-8 bp-sm:mt-12">
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(circle_at_20%_20%,theme(colors.slate.400/40),transparent_40%),radial-gradient(circle_at_80%_0%,theme(colors.purple.400/30),transparent_35%),radial-gradient(circle_at_0%_80%,theme(colors.blue.400/30),transparent_35%)]" />
      <div className="bp-lg:pl-64 bp-lg:pr-8 xl:pl-72 xl:pr-12 2xl:pr-16 py-6 bp-sm:py-8">
        <SiteContainer className="bp-lg:mx-0">
          <div className="grid grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-4 gap-5 bp-sm:gap-8 mb-6 bp-sm:mb-8">
            {/* 브랜드 섹션 - 모바일에서 전체 너비 */}
            <div className="bp-sm:col-span-2 bp-lg:col-span-1">
              <Link href="/" className="flex items-center gap-3 mb-5 group">
                <div>
                  <div className="font-black text-lg bp-sm:text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">도깨비 테니스</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wider">DOKKAEBI TENNIS</div>
                </div>
              </Link>

              <p className="text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">전문 테니스 스트링 서비스로 여러분의 테니스 라이프를 완성해드립니다.</p>
            </div>

            <div>
              <h3 className="text-base bp-sm:text-lg font-bold mb-3 bp-sm:mb-4 text-slate-900 dark:text-white">바로가기</h3>
              <ul className="space-y-2">
                {quickLinks.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white transition-colors duration-300">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 고객센터 */}
            <div>
              <h3 className="text-base bp-sm:text-lg font-bold mb-3 bp-sm:mb-4 text-slate-900 dark:text-white">고객센터</h3>
              <ul className="space-y-2">
                {customerService.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white transition-colors duration-300">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-base bp-sm:text-lg font-bold mb-3 bp-sm:mb-4 text-slate-900 dark:text-white">연락처</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <Phone className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white block">0507-1392-3493</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">영업 시간 내 상담 가능</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs bp-sm:text-sm text-slate-900 dark:text-white break-all">korgis5813@naver.com</span>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm text-slate-900 dark:text-white block">서울 동작구 노량진로 22 B1</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">우편번호: 06938</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm space-y-0.5">
                    <div className="text-slate-900 dark:text-white">평일 10:00 - 22:00</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">토요일 09:00 - 18:00</div>
                    <div className="text-xs text-red-500 dark:text-red-400">일요일 정기 휴무</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SiteContainer>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/50">
        <div className="bp-lg:pl-64 bp-lg:pr-8 xl:pl-72 xl:pr-12 2xl:pr-16 py-4 bp-sm:py-5">
          <SiteContainer className="bp-lg:mx-0">
            <div className="flex flex-col bp-sm:flex-row items-start bp-sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="space-y-1">
                <p>&copy; {new Date().getFullYear()} 도깨비 테니스. All rights reserved.</p>
                <p>사업자등록번호: 등록예정 | 대표: 김재민 | 통신판매업신고: 등록예정</p>
              </div>
            </div>
          </SiteContainer>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
