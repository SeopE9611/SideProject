import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, Clock, Facebook, Instagram, Youtube, Award, Shield, Truck, Star } from 'lucide-react';

const Footer = () => {
  const quickLinks = [
    { name: '스트링 쇼핑', href: '/products' },
    { name: '장착 서비스', href: '/services' },
    { name: '아카데미 신청', href: '/academy' },
    { name: '주문 조회', href: '/order-lookup' },
  ];

  const customerService = [
    { name: '공지사항', href: '/board/notice' },
    { name: 'Q&A', href: '/board/qna' },
    { name: '마이페이지', href: '/mypage' },
    { name: '이용약관', href: '/terms' },
    { name: '개인정보처리방침', href: '/privacy' },
  ];

  const features = [
    {
      icon: Award,
      title: '15년 전문 경력',
      description: '검증된 전문성',
      color: 'text-yellow-400',
    },
    {
      icon: Shield,
      title: '품질 보장',
      description: 'A/S 완벽 지원',
      color: 'text-blue-400',
    },
    {
      icon: Truck,
      title: '빠른 배송',
      description: '당일/익일 배송',
      color: 'text-slate-400',
    },
    {
      icon: Star,
      title: '고객 만족',
      description: '4.9/5 평점',
      color: 'text-amber-400',
    },
  ];

  return (
    <footer className="w-full bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(circle_at_20%_20%,theme(colors.slate.400/40),transparent_40%),radial-gradient(circle_at_80%_0%,theme(colors.purple.400/30),transparent_35%),radial-gradient(circle_at_0%_80%,theme(colors.blue.400/30),transparent_35%)]" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 sm:py-16 lg:py-20 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-8">
          {/* 브랜드 섹션 */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 group">
              <div>
                <div className="font-black text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">도깨비 테니스</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wider">PROFESSIONAL STRING SHOP</div>
              </div>
            </Link>

            <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed text-sm">15년 전통의 전문 테니스 스트링 서비스로 여러분의 테니스 라이프를 완성해드립니다.</p>

            <div className="flex space-x-3 mb-6">
              <Button size="icon" variant="ghost" className="opacity-80 hover:opacity-100 focus:ring-2 ring-blue-500 rounded-md">
                <Facebook className="h-5 w-5 text-blue-600" />
              </Button>
              <Button size="icon" variant="ghost" className="opacity-80 hover:opacity-100 focus:ring-2 ring-blue-500 rounded-md">
                <Instagram className="h-5 w-5 text-pink-600" />
              </Button>
              <Button size="icon" variant="ghost" className="opacity-80 hover:opacity-100 focus:ring-2 ring-blue-500 rounded-md">
                <Youtube className="h-5 w-5 text-red-600" />
              </Button>
            </div>
          </div>

          {/* 바로가기 */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-white">바로가기</h3>
            <ul className="space-y-3">
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
            <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-white">고객센터</h3>
            <ul className="space-y-3">
              {customerService.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white transition-colors duration-300">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 연락처 */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-white">연락처</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-blue-600" />
                <div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">02-123-4567</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">24시간 상담 가능</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-slate-900 dark:text-white break-all">info@dokkaebi-tennis.com</span>
              </div>

              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-blue-600 mt-1" />
                <div>
                  <span className="text-sm text-slate-900 dark:text-white">서울시 강남구 테니스로 123</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">지하철 2호선 강남역 3번 출구</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Clock className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="text-sm text-slate-900 dark:text-white">평일: 09:00 - 20:00</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">주말: 09:00 - 18:00</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t mt-8 pt-4 border-slate-200 dark:border-slate-800 max-w-7xl mx-auto px-4 md:px-6 pb-6">
        <div>
          <p className="mb-1">&copy; {new Date().getFullYear()} 도깨비 테니스. All rights reserved.</p>
          <p>사업자등록번호: 123-45-67890 | 대표: 김재민 | 통신판매업신고: 2024-서울강남-1234</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
