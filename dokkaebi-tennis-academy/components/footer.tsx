import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Phone, Mail, MapPin, Clock, Facebook, Instagram, Youtube, Send, Award, Shield, Truck } from 'lucide-react';

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
      title: '100년 전문 경력',
      description: '검증된 전문성',
    },
    {
      icon: Shield,
      title: '품질 보장',
      description: 'A/S 완벽 지원',
    },
    {
      icon: Truck,
      title: '빠른 배송',
      description: '당일/익일 배송',
    },
  ];

  return (
    <footer className="w-full bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      {/* Top Section */}
      <div className="border-b border-white/10">
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-4 group">
                <div className="flex items-center justify-center w-12 h-12 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-blue-300" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">{feature.title}</h4>
                  <p className="text-sm text-blue-200">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-6 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-sm opacity-75 group-hover:opacity-100 transition-opacity"></div>
                {/* <div className="relative bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-full">
                  <Image src="/placeholder.svg?height=32&width=32" alt="도깨비 테니스 아카데미 로고" width={32} height={32} className="filter brightness-0 invert" />
                </div> */}
              </div>
              <div>
                <div className="font-bold text-xl bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">도깨비 테니스</div>
                <div className="text-xs text-blue-200">DOKKAEBI TENNIS ACADEMY</div>
              </div>
            </Link>
            <p className="text-blue-100 mb-6 leading-relaxed">100년 전통의 전문 테니스 스트링 서비스와 아카데미로 여러분의 테니스 라이프를 완성해드립니다.</p>

            <div className="flex space-x-4">
              <Button size="icon" variant="ghost" className="hover:bg-white/10 rounded-full">
                <Facebook className="h-5 w-5 text-blue-300" />
              </Button>
              <Button size="icon" variant="ghost" className="hover:bg-white/10 rounded-full">
                <Instagram className="h-5 w-5 text-pink-300" />
              </Button>
              <Button size="icon" variant="ghost" className="hover:bg-white/10 rounded-full">
                <Youtube className="h-5 w-5 text-red-300" />
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">바로가기</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-blue-200 hover:text-white transition-colors duration-300 flex items-center group">
                    <span className="w-0 group-hover:w-2 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300 mr-0 group-hover:mr-2"></span>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">고객센터</h3>
            <ul className="space-y-3">
              {customerService.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-blue-200 hover:text-white transition-colors duration-300 flex items-center group">
                    <span className="w-0 group-hover:w-2 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300 mr-0 group-hover:mr-2"></span>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">연락처</h3>
            <div className="space-y-4 mb-6">
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-blue-300 flex-shrink-0" />
                <span className="text-blue-100">010-5218-5248</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-green-300 flex-shrink-0" />
                <span className="text-blue-100">info@dokkaebi-tennis.com</span>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-purple-300 flex-shrink-0 mt-0.5" />
                <span className="text-blue-100">서울시 강남구 테니스로 123</span>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-orange-300 flex-shrink-0" />
                <div className="text-blue-100">
                  <div>평일: 09:00 - 20:00</div>
                  <div className="text-sm">주말: 09:00 - 18:00</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-black/20">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <p className="text-blue-200 text-sm">&copy; {new Date().getFullYear()} 도깨비 테니스 아카데미. All rights reserved.</p>
              <p className="text-blue-300 text-xs mt-1">사업자등록번호: 123-45-67890 | 대표: 김재민 | 통신판매업신고: 2024-서울강남-1234</p>
            </div>
            <div className="flex items-center space-x-6 text-sm text-blue-200">
              <span className="flex items-center space-x-2">
                <Award className="h-4 w-4 text-yellow-400" />
                <span>100년 전문 경력</span>
              </span>
              <span className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-green-400" />
                <span>품질 보장</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
