'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ArrowRight, Play, Phone, MapPin, Target, Shield, Clock, Award, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { useState, useRef } from 'react';

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  brand: string;
  rating: number;
  reviews: number;
  description: string;
}

interface StringProducts {
  polyester: Product[];
  hybrid: Product[];
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<keyof StringProducts>('polyester');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const stringProducts: StringProducts = {
    polyester: [
      {
        id: 1,
        name: '루키론 프로 스트링',
        price: 25000,
        originalPrice: 30000,
        image: '/tennis-string-luxilon-pro.png',
        brand: '루키론',
        rating: 4.8,
        reviews: 124,
        description: '프로 선수들이 선택하는 최고급 폴리에스터 스트링',
      },
      {
        id: 2,
        name: '바볼랏 RPM 블라스트',
        price: 30000,
        originalPrice: 35000,
        image: '/babolat-rpm-blast-tennis-string.png',
        brand: '바볼랏',
        rating: 4.7,
        reviews: 156,
        description: '강력한 스핀과 컨트롤을 제공하는 폴리에스터',
      },
      {
        id: 3,
        name: '소링코 투어 바이트',
        price: 28000,
        image: '/solinco-tour-bite-tennis-string.png',
        brand: '소링코',
        rating: 4.6,
        reviews: 89,
        description: '뛰어난 내구성과 파워를 자랑하는 폴리에스터',
      },
      {
        id: 4,
        name: '헤드 린스 투어',
        price: 26000,
        image: '/head-lynx-tour-tennis-string.png',
        brand: '헤드',
        rating: 4.5,
        reviews: 67,
        description: '부드러운 타구감의 프리미엄 폴리에스터',
      },
      {
        id: 5,
        name: '윌슨 폴리 프로',
        price: 24000,
        image: '/wilson-poly-pro-tennis-string.png',
        brand: '윌슨',
        rating: 4.4,
        reviews: 45,
        description: '가성비 뛰어난 폴리에스터 스트링',
      },
      {
        id: 6,
        name: '요넥스 폴리투어 프로',
        price: 27000,
        image: '/yonex-polytour-pro-tennis-string.png',
        brand: '요넥스',
        rating: 4.6,
        reviews: 78,
        description: '일본 기술력의 정밀한 폴리에스터',
      },
      {
        id: 7,
        name: '테크니파이버 블랙 코드',
        price: 29000,
        image: '/tecnifibre-black-code-tennis-string.png',
        brand: '테크니파이버',
        rating: 4.7,
        reviews: 91,
        description: '독특한 5각형 단면의 혁신적 스트링',
      },
    ],
    hybrid: [
      {
        id: 8,
        name: '루키론 + 윌슨 NXT',
        price: 35000,
        originalPrice: 40000,
        image: '/hybrid-luxilon-wilson-tennis-string.png',
        brand: '하이브리드',
        rating: 4.9,
        reviews: 78,
        description: '파워와 컨트롤의 완벽한 조합',
      },
      {
        id: 9,
        name: '바볼랏 + 테크니파이버',
        price: 38000,
        image: '/hybrid-babolat-tecnifibre-tennis-string.png',
        brand: '하이브리드',
        rating: 4.8,
        reviews: 92,
        description: '프로 선수들이 선호하는 하이브리드 세팅',
      },
      {
        id: 10,
        name: '소링코 + 헤드 멀티',
        price: 32000,
        image: '/hybrid-solinco-head-tennis-string.png',
        brand: '하이브리드',
        rating: 4.7,
        reviews: 56,
        description: '스핀과 편안함을 동시에 제공',
      },
      {
        id: 11,
        name: '윌슨 + 바볼랏 멀티',
        price: 30000,
        image: '/hybrid-wilson-babolat-tennis-string.png',
        brand: '하이브리드',
        rating: 4.6,
        reviews: 34,
        description: '초보자부터 중급자까지 추천',
      },
      {
        id: 12,
        name: '요넥스 + 테크니파이버',
        price: 36000,
        image: '/hybrid-yonex-tecnifibre-tennis-string.png',
        brand: '하이브리드',
        rating: 4.8,
        reviews: 65,
        description: '정밀함과 편안함의 조화',
      },
      {
        id: 13,
        name: '헤드 + 윌슨 멀티',
        price: 31000,
        image: '/hybrid-head-wilson-tennis-string.png',
        brand: '하이브리드',
        rating: 4.5,
        reviews: 43,
        description: '균형잡힌 성능의 하이브리드',
      },
      {
        id: 14,
        name: '바볼랏 + 윌슨 NXT',
        price: 37000,
        image: '/hybrid-babolat-wilson-tennis-string.png',
        brand: '하이브리드',
        rating: 4.7,
        reviews: 58,
        description: '클래식한 조합의 하이브리드 세팅',
      },
    ],
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -340, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 340, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* ... existing hero section ... */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        {/* Tennis court line pattern background */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 800 600" fill="none">
            {/* Court outline */}
            <rect x="100" y="100" width="600" height="400" stroke="white" strokeWidth="4" fill="none" />
            {/* Center line */}
            <line x1="400" y1="100" x2="400" y2="500" stroke="white" strokeWidth="2" />
            {/* Service boxes */}
            <line x1="100" y1="250" x2="700" y2="250" stroke="white" strokeWidth="2" />
            <line x1="100" y1="350" x2="700" y2="350" stroke="white" strokeWidth="2" />
            <line x1="250" y1="250" x2="250" y2="350" stroke="white" strokeWidth="2" />
            <line x1="550" y1="250" x2="550" y2="350" stroke="white" strokeWidth="2" />
            {/* Net posts */}
            <circle cx="100" cy="300" r="4" fill="white" />
            <circle cx="700" cy="300" r="4" fill="white" />
          </svg>
        </div>

        {/* String pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full bg-[linear-gradient(0deg,transparent_24%,rgba(255,255,255,0.1)_25%,rgba(255,255,255,0.1)_26%,transparent_27%,transparent_74%,rgba(255,255,255,0.1)_75%,rgba(255,255,255,0.1)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(255,255,255,0.1)_25%,rgba(255,255,255,0.1)_26%,transparent_27%,transparent_74%,rgba(255,255,255,0.1)_75%,rgba(255,255,255,0.1)_76%,transparent_77%,transparent)] bg-[size:20px_20px]"></div>
        </div>

        <div className="relative z-10 text-center max-w-6xl mx-auto px-4">
          <div className="space-y-8 mb-12">
            {/* Court-inspired title layout */}
            <div className="relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
              <h1 className="text-6xl lg:text-8xl font-black text-white leading-tight tracking-tight">
                <span className="block">PRECISION</span>
                <span className="block text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text">STRINGS</span>
              </h1>
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
            </div>

            <p className="text-xl lg:text-2xl text-slate-300 font-medium max-w-3xl mx-auto leading-relaxed">
              프로 선수들이 신뢰하는 정밀한 스트링 기술로
              <br />
              당신의 게임을 한 단계 끌어올리세요
            </p>
          </div>

          {/* Court-inspired button layout */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button
              asChild
              size="lg"
              className="relative bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-blue-400/20"
            >
              <Link href="/products" className="flex items-center gap-3">
                <Target className="h-5 w-5" />
                스트링 둘러보기
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>

            <Button asChild variant="outline" size="lg" className="relative border-2 border-slate-300 text-slate-300 hover:bg-slate-300 hover:text-slate-900 px-8 py-4 text-lg font-semibold bg-transparent rounded-lg transition-all duration-300">
              <Link href="/services" className="flex items-center gap-3">
                <Play className="h-5 w-5" />
                장착 서비스
              </Link>
            </Button>

            <Button asChild variant="outline" size="lg" className="relative border-2 border-purple-300 text-purple-300 hover:bg-purple-300 hover:text-purple-900 px-8 py-4 text-lg font-semibold bg-transparent rounded-lg transition-all duration-300">
              <Link href="/services/packages" className="flex items-center gap-3">
                <Package className="h-5 w-5" />
                패키지 상품
              </Link>
            </Button>
          </div>
        </div>

        {/* Floating tennis ball dots */}
        <div className="absolute top-20 left-20 w-3 h-3 bg-yellow-400 rounded-full animate-bounce opacity-60"></div>
        <div className="absolute top-40 right-32 w-2 h-2 bg-yellow-400 rounded-full animate-pulse opacity-40"></div>
        <div className="absolute bottom-32 left-40 w-4 h-4 bg-yellow-400 rounded-full animate-bounce opacity-50" style={{ animationDelay: '1s' }}></div>
      </section>

      <section className="py-20 bg-white dark:bg-slate-800 relative">
        <div className="container mx-auto px-4">
          {/* Court center line inspired divider */}
          <div className="flex items-center justify-center mb-16">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-slate-300 dark:to-slate-600"></div>
            <div className="px-8">
              <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
            </div>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-300 dark:to-slate-600"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Award,
                title: '15년 전문 경력',
                description: '검증된 전문성',
                color: 'blue',
                detail: '15년간 축적된 노하우로 최고의 서비스를 제공합니다',
              },
              {
                icon: Shield,
                title: '품질 보장',
                description: 'A/S 완벽 지원',
                color: 'indigo',
                detail: '모든 제품과 서비스에 대해 완벽한 품질을 보장합니다',
              },
              {
                icon: Clock,
                title: '빠른 배송',
                description: '당일/익일 배송',
                color: 'purple',
                detail: '주문 후 24시간 내 빠른 배송으로 만족도를 높입니다',
              },
              {
                icon: Star,
                title: '고객 만족',
                description: '4.9/5 평점',
                color: 'blue',
                detail: '5,000명 이상의 고객이 인정한 최고의 서비스',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group relative text-center p-8 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-lg"
              >
                {/* Court corner inspired decoration */}
                <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-slate-300 dark:border-slate-500 group-hover:border-blue-400 transition-colors duration-300"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-slate-300 dark:border-slate-500 group-hover:border-blue-400 transition-colors duration-300"></div>

                <div className="space-y-4">
                  <div className={`inline-flex p-4 rounded-full bg-${feature.color}-100 dark:bg-${feature.color}-900/30`}>
                    <feature.icon className={`h-8 w-8 text-${feature.color}-600 dark:text-${feature.color}-400`} />
                  </div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white">{feature.title}</div>
                  <div className="text-slate-600 dark:text-slate-300 font-medium">{feature.description}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feature.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-50 dark:bg-slate-900 relative">
        {/* String pattern background */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full bg-[linear-gradient(45deg,transparent_24%,rgba(59,130,246,0.1)_25%,rgba(59,130,246,0.1)_26%,transparent_27%,transparent_74%,rgba(59,130,246,0.1)_75%,rgba(59,130,246,0.1)_76%,transparent_77%,transparent),linear-gradient(-45deg,transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent)] bg-[size:40px_40px]"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-4 mb-6">
              <div className="w-12 h-px bg-gradient-to-r from-transparent to-blue-400"></div>
              <h2 className="text-4xl lg:text-6xl font-bold text-slate-900 dark:text-white">프리미엄 스트링</h2>
              <div className="w-12 h-px bg-gradient-to-l from-transparent to-purple-400"></div>
            </div>
            <p className="text-xl text-slate-600 dark:text-slate-300">프로가 선택하는 최고급 테니스 스트링</p>
          </div>

          {/* Category Tabs */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-white dark:bg-slate-800 rounded-2xl p-2 border border-slate-200 dark:border-slate-700 shadow-lg">
              <button
                onClick={() => setActiveCategory('polyester')}
                className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                  activeCategory === 'polyester' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                폴리에스터
              </button>
              <button
                onClick={() => setActiveCategory('hybrid')}
                className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                  activeCategory === 'hybrid' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                하이브리드
              </button>
            </div>
          </div>

          <div className="relative">
            <div ref={scrollContainerRef} className="overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              <div className="flex gap-6 pb-4" style={{ width: 'max-content' }}>
                {stringProducts[activeCategory].map((product: Product, index: number) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="group block flex-none w-[320px] bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-xl hover:-translate-y-2"
                  >
                    {/* Product Image Placeholder */}
                    <div className="relative mb-6 h-48 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-xl flex items-center justify-center overflow-hidden">
                      <div className="text-4xl font-bold text-slate-400 dark:text-slate-500">{product.brand.charAt(0)}</div>
                      {product.originalPrice && <Badge className="absolute top-3 right-3 bg-red-500 text-white">할인</Badge>}
                    </div>

                    {/* Product Info */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">{product.brand}</div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-slate-600 dark:text-slate-300">{product.rating}</span>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">{product.name}</h3>

                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{product.description}</p>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{product.price.toLocaleString()}원</div>
                          {product.originalPrice && <div className="text-sm text-slate-400 line-through">{product.originalPrice.toLocaleString()}원</div>}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{product.reviews}개 리뷰</div>
                      </div>
                    </div>
                  </Link>
                ))}

                <Link
                  href="/products"
                  className="group flex-none w-[320px] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-6 border-2 border-dashed border-blue-300 dark:border-blue-600 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 flex items-center justify-center"
                >
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                      <ArrowRight className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">더 많은 상품</h3>
                      <p className="text-sm text-blue-600 dark:text-blue-300">전체 스트링 컬렉션 보기</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            <div className="flex justify-center mt-8 gap-4">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full w-12 h-12 p-0 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-500"
                onClick={scrollLeft}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full w-12 h-12 p-0 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-500"
                onClick={scrollRight}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Expert Testimonials Section */}
      <section className="py-20 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
        {/* Net pattern background */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-[repeating-linear-gradient(0deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_11px),repeating-linear-gradient(90deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_11px)]"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-4 mb-6">
              <div className="w-12 h-px bg-gradient-to-r from-transparent to-blue-400"></div>
              <h2 className="text-4xl lg:text-6xl font-bold text-white">전문가 추천</h2>
              <div className="w-12 h-px bg-gradient-to-l from-transparent to-purple-400"></div>
            </div>
            <p className="text-xl text-slate-300">프로 선수와 코치들이 인정한 스트링 전문성</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {[
              {
                name: '김재민',
                title: '낚시신공',
                image: '/expert-kim-minsu.jpg',
                quote: '도깨비 테니스의 스트링 장착 기술은 정말 뛰어납니다. 매번 완벽한 텐션으로 제 플레이를 한 단계 끌어올려 주죠.',
                rating: 5,
                specialty: '금붕어 낚아봄',
              },
              {
                name: '윤형섭',
                title: '비숍',
                image: '/expert-park-jiyoung.jpg',
                quote: '15년간 다양한 스트링 샵을 이용해봤지만, 이곳만큼 정밀하고 신뢰할 수 있는 곳은 없었습니다.',
                rating: 5,
                specialty: '검밑솔전문가',
              },
              {
                name: '쿠키선수',
                title: '귀여워',
                image: '/expert-lee-junho.jpg',
                quote: '하이브리드 스트링 세팅을 완벽하게 해주셔서 파워와 컨트롤을 동시에 얻을 수 있었습니다.',
                rating: 5,
                specialty: '귀여움대회우승자',
              },
            ].map((expert, index) => (
              <div key={index} className="group bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:border-blue-400/50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                {/* Expert Image Placeholder */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">{expert.name.charAt(0)}</span>
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-1">{expert.name}</h3>
                    <p className="text-blue-300 text-sm font-medium">{expert.title}</p>
                    <p className="text-slate-400 text-xs mt-1">{expert.specialty}</p>
                  </div>
                </div>

                {/* Rating Stars */}
                <div className="flex justify-center mb-6">
                  {[...Array(expert.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-slate-200 text-center leading-relaxed italic">"{expert.quote}"</blockquote>

                {/* Court corner decoration */}
                <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-white/30 group-hover:border-blue-400/70 transition-colors duration-300"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-white/30 group-hover:border-purple-400/70 transition-colors duration-300"></div>
              </div>
            ))}
          </div>

          {/* Call to Action */}
          <div className="text-center mt-16">
            <div className="space-y-6">
              <h3 className="text-3xl font-bold text-white">당신도 전문가의 서비스를 경험해보세요</h3>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                  <Link href="/contact" className="flex items-center gap-3">
                    <Phone className="h-5 w-5" />
                    상담 받기
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-2 border-slate-300 text-slate-300 hover:bg-slate-300 hover:text-slate-900 px-8 py-4 text-lg font-semibold bg-transparent rounded-xl transition-all duration-300">
                  <Link href="/services/locations" className="flex items-center gap-3">
                    <MapPin className="h-5 w-5" />
                    매장 찾기
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
