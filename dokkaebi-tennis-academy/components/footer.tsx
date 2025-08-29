import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, Clock, Facebook, Instagram, Youtube, Award, Shield, Truck, Rocket as Racquet, Star, Heart, Zap } from 'lucide-react';

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
      color: 'text-emerald-400',
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
    <footer className="w-full bg-gradient-to-br from-slate-900 via-emerald-900 to-green-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/abstract-geometric-pattern.png')] opacity-5"></div>

      <div className="border-b border-white/10 relative z-10">
        <div className="container py-12 lg:py-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center group hover:scale-105 transition-transform duration-300">
                <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-2xl mx-auto mb-3 sm:mb-4 group-hover:bg-white/20 transition-colors">
                  <feature.icon className={`h-6 w-6 sm:h-8 sm:w-8 ${feature.color}`} />
                </div>
                <h4 className="font-bold text-sm sm:text-lg text-white mb-1 sm:mb-2">{feature.title}</h4>
                <p className="text-xs sm:text-sm text-emerald-200">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-12 sm:py-16 lg:py-20 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* 브랜드 섹션 */}
          <div className="sm:col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <div>
                <div className="font-black text-2xl sm:text-3xl bg-gradient-to-r from-emerald-300 to-green-300 bg-clip-text text-transparent">도깨비 테니스</div>
                <div className="text-xs sm:text-sm text-emerald-200 font-semibold tracking-wider">PROFESSIONAL STRING SHOP</div>
              </div>
            </Link>

            <p className="text-emerald-100 mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base lg:text-lg">15년 전통의 전문 테니스 스트링 서비스로 여러분의 테니스 라이프를 완성해드립니다. 최고 품질의 스트링과 전문적인 장착 서비스를 경험하세요.</p>

            <div className="flex space-x-3 sm:space-x-4 mb-6 sm:mb-8">
              <Button size="icon" variant="ghost" className="hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-110">
                <Facebook className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-300" />
              </Button>
              <Button size="icon" variant="ghost" className="hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-110">
                <Instagram className="h-5 w-5 sm:h-6 sm:w-6 text-pink-300" />
              </Button>
              <Button size="icon" variant="ghost" className="hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-110">
                <Youtube className="h-5 w-5 sm:h-6 sm:w-6 text-red-300" />
              </Button>
            </div>

            <div className="flex items-center gap-2 text-emerald-200">
              <Heart className="h-4 w-4 text-red-400 fill-current" />
              <span className="text-xs sm:text-sm">5,000+ 만족한 고객들과 함께</span>
            </div>
          </div>

          {/* 바로가기 */}
          <div>
            <h3 className="text-lg sm:text-xl font-bold mb-6 sm:mb-8 text-white flex items-center gap-2">바로가기</h3>
            <ul className="space-y-3 sm:space-y-4">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-emerald-200 hover:text-white transition-all duration-300 flex items-center group text-xs sm:text-sm">
                    <span className="w-0 group-hover:w-3 h-0.5 bg-gradient-to-r from-emerald-400 to-green-400 transition-all duration-300 mr-0 group-hover:mr-3 rounded-full"></span>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 고객센터 */}
          <div>
            <h3 className="text-lg sm:text-xl font-bold mb-6 sm:mb-8 text-white flex items-center gap-2">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
              고객센터
            </h3>
            <ul className="space-y-3 sm:space-y-4">
              {customerService.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-emerald-200 hover:text-white transition-all duration-300 flex items-center group text-xs sm:text-sm">
                    <span className="w-0 group-hover:w-3 h-0.5 bg-gradient-to-r from-emerald-400 to-green-400 transition-all duration-300 mr-0 group-hover:mr-3 rounded-full"></span>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-bold mb-6 sm:mb-8 text-white flex items-center gap-2">
              <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
              연락처
            </h3>
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center space-x-3 group">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
                  <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-300" />
                </div>
                <div>
                  <span className="text-white font-semibold text-sm sm:text-base">02-123-4567</span>
                  <p className="text-xs text-emerald-200">24시간 상담 가능</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 group">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-300" />
                </div>
                <div>
                  <span className="text-white font-semibold text-xs sm:text-sm break-all">info@dokkaebi-tennis.com</span>
                </div>
              </div>

              <div className="flex items-start space-x-3 group">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors mt-1">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-300" />
                </div>
                <div>
                  <span className="text-white font-semibold text-xs sm:text-sm">서울시 강남구 테니스로 123</span>
                  <p className="text-xs text-emerald-200 mt-1">지하철 2호선 강남역 3번 출구</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 group">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-300" />
                </div>
                <div>
                  <div className="text-white font-semibold text-xs sm:text-sm">평일: 09:00 - 20:00</div>
                  <div className="text-xs text-emerald-200">주말: 09:00 - 18:00</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-black/30 relative z-10">
        <div className="container py-6 sm:py-8">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
            <div className="text-center lg:text-left">
              <p className="text-emerald-200 text-xs sm:text-sm mb-2">&copy; {new Date().getFullYear()} 도깨비 테니스. All rights reserved.</p>
              <p className="text-emerald-300 text-xs">사업자등록번호: 123-45-67890 | 대표: 김재민 | 통신판매업신고: 2024-서울강남-1234</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
