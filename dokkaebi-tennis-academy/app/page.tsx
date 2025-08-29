import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Award, Users, Clock, Shield, Zap, Target, ArrowRight, Quote, Calendar, ChevronRight, Sparkles, Trophy, Heart } from 'lucide-react';

export default function Home() {
  const featuredProducts = [
    {
      id: 1,
      name: '루키론 프로 스트링',
      price: 25000,
      originalPrice: 30000,
      image: '/tennis-string-luxilon-pro.png',
      brand: '루키론',
      features: ['반발력 ★★★★☆', '내구성 ★★★★★', '스핀 ★★★☆☆'],
      isNew: true,
      isBestseller: false,
      rating: 4.8,
      reviews: 124,
    },
    {
      id: 2,
      name: '테크니파이버 블랙코드',
      price: 32000,
      originalPrice: null,
      image: '/tecnifibre-black-code-tennis-string.png',
      brand: '테크니파이버',
      features: ['반발력 ★★★★★', '내구성 ★★★☆☆', '스핀 ★★★★☆'],
      isNew: false,
      isBestseller: true,
      rating: 4.9,
      reviews: 89,
    },
    {
      id: 3,
      name: '윌슨 NXT 파워',
      price: 28000,
      originalPrice: null,
      image: '/wilson-nxt-power-tennis-string.png',
      brand: '윌슨',
      features: ['반발력 ★★★★★', '내구성 ★★★☆☆', '스핀 ★★★☆☆'],
      isNew: false,
      isBestseller: false,
      rating: 4.6,
      reviews: 67,
    },
    {
      id: 4,
      name: '바볼랏 RPM 블라스트',
      price: 30000,
      originalPrice: 35000,
      image: '/babolat-rpm-blast-tennis-string.png',
      brand: '바볼랏',
      features: ['반발력 ★★★☆☆', '내구성 ★★★★☆', '스핀 ★★★★★'],
      isNew: true,
      isBestseller: true,
      rating: 4.7,
      reviews: 156,
    },
  ];

  const categories = [
    {
      name: '폴리에스터',
      icon: <Target className="w-6 h-6" />,
      href: '/products/polyester',
      description: '강력한 스핀과 컨트롤',
      color: 'from-emerald-600 to-green-700',
    },
    {
      name: '멀티필라멘트',
      icon: <Shield className="w-6 h-6" />,
      href: '/products/multifilament',
      description: '부드러운 타감과 편안함',
      color: 'from-slate-600 to-slate-700',
    },
    {
      name: '하이브리드',
      icon: <Zap className="w-6 h-6" />,
      href: '/products/hybrid',
      description: '최적의 조합',
      color: 'from-gray-800 to-black',
    },
    {
      name: '내추럴 거트',
      icon: <Award className="w-6 h-6" />,
      href: '/products/natural',
      description: '최고급 프리미엄',
      color: 'from-amber-600 to-yellow-700',
    },
  ];

  const notices = [
    { id: 1, title: '5월 스트링 할인 이벤트 진행중', date: '2024-05-01', isHot: true },
    { id: 2, title: '여름 아카데미 회원 모집 시작', date: '2024-05-10', isHot: false },
    { id: 3, title: '신규 프리미엄 스트링 입고 안내', date: '2024-05-15', isHot: true },
    { id: 4, title: '장착 서비스 예약 시스템 업데이트', date: '2024-05-20', isHot: false },
  ];

  const stats = [
    { icon: Users, label: '만족한 고객', value: '5,000+', color: 'text-emerald-600' },
    { icon: Award, label: '전문 경력', value: '15년+', color: 'text-slate-600' },
    { icon: Target, label: '장착 완료', value: '50,000+', color: 'text-gray-800' },
    { icon: Star, label: '평균 평점', value: '4.9/5', color: 'text-amber-600' },
  ];

  const testimonials = [
    {
      name: '죡팡',
      role: '테니스 동호회 회장',
      content: '도깨비 테니스의 스트링 장착 서비스는 정말 전문적입니다. 제 플레이 스타일에 맞는 완벽한 세팅을 해주셨어요.',
      rating: 5,
      image: '/korean-tennis-player-portrait.png',
    },
    {
      name: '주말',
      role: '테니스 코치',
      content: '다양한 스트링을 체험해볼 수 있어서 좋았고, 전문가의 조언이 경기력 향상에 큰 도움이 되었습니다.',
      rating: 5,
      image: '/korean-female-tennis-coach.png',
    },
    {
      name: '쑹빵이',
      role: '주니어 선수',
      content: '학생들에게 추천하고 있는 곳입니다. 품질과 서비스 모두 만족스럽고, 가격도 합리적이에요.',
      rating: 5,
      image: '/young-korean-tennis-player.png',
    },
  ];

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-emerald-50 to-green-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25"></div>

        <div className="relative container mx-auto px-4 py-12 sm:py-16 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* 왼쪽 콘텐츠 */}
            <div className="space-y-6 lg:space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 rounded-full px-3 sm:px-4 py-2 border border-emerald-200/50 dark:border-emerald-800/50">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300">15년 전통의 전문 테니스 스트링 샵</span>
              </div>

              <div className="space-y-4">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black leading-tight">
                  <span className="text-slate-900 dark:text-white">완벽한</span>
                  <br />
                  <span className="bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 bg-clip-text text-transparent">테니스 스트링</span>
                  <br />
                  <span className="text-slate-900 dark:text-white">경험을</span>
                </h1>

                <p className="text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg mx-auto lg:mx-0">
                  당신의 플레이 스타일에 맞는 최적의 스트링으로
                  <span className="font-semibold text-emerald-600"> 최상의 경기력</span>을 경험하세요
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Link href="/products" className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    스트링 쇼핑하기
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-xl transition-all duration-300 bg-transparent"
                >
                  <Link href="/services" className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    장착 서비스 예약
                  </Link>
                </Button>
              </div>

              {/* 통계 */}
              <div className="grid grid-cols-2 gap-4 sm:gap-6 pt-6 lg:pt-8 max-w-sm mx-auto lg:max-w-none">
                {stats.slice(0, 2).map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className={`text-2xl sm:text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                    <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 오른쪽 이미지 */}
            <div className="relative order-first lg:order-last">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/20 shadow-2xl">
                <Image src="/test2.jpg" alt="테니스 스트링 장착 작업실" width={600} height={400} className="rounded-2xl object-cover w-full h-48 sm:h-64 lg:h-80" priority />
                <div className="absolute -bottom-2 sm:-bottom-4 -right-2 sm:-right-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-2xl shadow-lg">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="font-semibold text-xs sm:text-sm">15년 전문 경력</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">스트링 카테고리</h2>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400">다양한 스트링 타입으로 당신만의 완벽한 세팅을 찾아보세요</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {categories.map((category, index) => (
              <Link key={category.name} href={category.href} className="group">
                <Card className="h-full overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-2">
                  <div className={`h-2 bg-gradient-to-r ${category.color}`}></div>
                  <CardContent className="p-6 lg:p-8 text-center">
                    <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r ${category.color} rounded-2xl mb-4 sm:mb-6 text-white group-hover:scale-110 transition-transform duration-300`}>
                      {category.icon}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold mb-2">{category.name}</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{category.description}</p>
                    <div className="flex items-center justify-center text-emerald-600 group-hover:text-emerald-700 transition-colors">
                      <span className="text-sm font-medium">자세히 보기</span>
                      <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">왜 도깨비 테니스를 선택해야 할까요?</h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">15년간 쌓아온 전문성과 노하우로 최고의 테니스 스트링 서비스를 제공합니다</p>
          </div>

          <div className="space-y-20">
            {/* 첫 번째 특징 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-3xl font-bold">전문 기술력</h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  15년 경력의 전문가가 직접 장착하는 프리미엄 서비스로 완벽한 텐션과 균형을 보장합니다. 각 라켓의 특성과 플레이어의 스타일을 고려한 맞춤형 장착 서비스를 제공합니다.
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20 rounded-3xl blur-2xl"></div>
                <Image src="/professional-tennis-stringing-service.png" alt="전문 스트링 장착 서비스" width={500} height={400} className="relative rounded-2xl shadow-2xl" />
              </div>
            </div>

            {/* 두 번째 특징 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="relative lg:order-1">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-400/20 to-gray-400/20 rounded-3xl blur-2xl"></div>
                <Image src="/tennis-string-consultation-and-advice.png" alt="맞춤형 상담 서비스" width={500} height={400} className="relative rounded-2xl shadow-2xl" />
              </div>
              <div className="space-y-6 lg:order-2">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-slate-500 to-gray-600 rounded-2xl">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-3xl font-bold">맞춤형 상담</h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">개인의 플레이 스타일과 선호도를 분석하여 최적의 스트링과 텐션을 추천해드립니다. 초보자부터 프로까지 모든 레벨에 맞는 전문적인 컨설팅을 제공합니다.</p>
                {/* <Button asChild className="bg-slate-600 hover:bg-slate-700">
                  <Link href="/">무료 상담 받기</Link>
                </Button> */}
              </div>
            </div>

            {/* 세 번째 특징 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-gray-800 to-black rounded-2xl">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-3xl font-bold">빠른 서비스</h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">당일 장착 서비스와 온라인 예약 시스템으로 편리하고 빠른 서비스를 제공합니다. 바쁜 일정 중에도 언제든지 예약하고 빠르게 서비스를 받으실 수 있습니다.</p>
                {/* <Button asChild className="bg-gray-800 hover:bg-black">
                  <Link href="/booking">지금 예약하기</Link>
                </Button> */}
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-400/20 to-black/20 rounded-3xl blur-2xl"></div>
                <Image src="/fast-tennis-string-service-booking-system.png" alt="빠른 서비스 예약" width={500} height={400} className="relative rounded-2xl shadow-2xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center justify-between mb-8 lg:mb-12">
            <div className="text-center lg:text-left mb-4 lg:mb-0">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">추천 상품</h2>
              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400">전문가가 엄선한 최고 품질의 테니스 스트링</p>
            </div>
            <Button asChild variant="outline" className="bg-transparent">
              <Link href="/products" className="flex items-center gap-2">
                전체 상품 보기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
            {featuredProducts.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`} className="group">
                <Card className="h-full overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-2">
                  <div className="relative overflow-hidden">
                    <Image src={product.image || '/placeholder.svg'} alt={product.name} width={300} height={300} className="h-48 sm:h-56 lg:h-64 w-full object-cover group-hover:scale-110 transition-transform duration-500" priority />
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                      {product.isNew && <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 text-xs">NEW</Badge>}
                      {product.isBestseller && <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 text-xs">BEST</Badge>}
                    </div>
                    {product.originalPrice && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 text-xs">{Math.round((1 - product.price / product.originalPrice) * 100)}% OFF</Badge>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>

                  <CardContent className="p-4 sm:p-6">
                    <div className="text-sm text-slate-500 mb-2">{product.brand}</div>
                    <CardTitle className="text-base sm:text-lg mb-3 group-hover:text-emerald-600 transition-colors line-clamp-2">{product.name}</CardTitle>

                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-3 w-3 sm:h-4 sm:w-4 ${i < Math.floor(product.rating) ? 'text-yellow-500 fill-current' : 'text-slate-300'}`} />
                        ))}
                      </div>
                      <span className="text-xs sm:text-sm text-slate-500">({product.reviews})</span>
                    </div>

                    <div className="space-y-1 mb-4">
                      {product.features.slice(0, 2).map((feature, index) => (
                        <div key={index} className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                          {feature}
                        </div>
                      ))}
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 sm:p-6 pt-0 flex justify-between items-center">
                    <div className="flex flex-col">
                      {product.originalPrice && <span className="text-xs sm:text-sm text-slate-500 line-through">{product.originalPrice.toLocaleString()}원</span>}
                      <span className="text-lg sm:text-xl font-bold text-emerald-600">{product.price.toLocaleString()}원</span>
                    </div>
                    <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white border-0 text-xs sm:text-sm">
                      상세보기
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">고객 후기</h2>
            <p className="text-xl text-slate-600 dark:text-slate-400">실제 고객들이 경험한 도깨비 테니스의 서비스</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-500 fill-current" />
                    ))}
                  </div>

                  <Quote className="h-8 w-8 text-blue-200 mb-4" />

                  <p className="text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">{testimonial.content}</p>

                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Image src={testimonial.image || '/placeholder.svg'} alt={testimonial.name} width={60} height={60} className="rounded-full border-2 border-blue-200" />
                      <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full p-1">
                        <Heart className="h-3 w-3 text-white fill-current" />
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{testimonial.name}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button asChild variant="outline" className="border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/20 bg-transparent">
              <Link href="/reviews" className="inline-flex items-center gap-2">
                리뷰 더보기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 bg-[url('/tennis-court-background.png')] bg-cover bg-center opacity-10"></div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 sm:px-6 py-2 sm:py-3">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="font-semibold text-sm sm:text-base">지금 바로 시작하세요!</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black leading-tight">
              완벽한 테니스 경험을
              <br />
              <span className="text-yellow-300">지금 시작하세요</span>
            </h2>

            <p className="text-base sm:text-lg lg:text-xl xl:text-2xl opacity-90 max-w-2xl mx-auto leading-relaxed">전문가의 맞춤 상담을 통해 당신에게 완벽한 스트링을 찾아보세요</p>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
              <Button asChild size="lg" className="bg-white text-emerald-600 hover:bg-gray-100 px-6 sm:px-10 py-4 sm:py-5 text-base sm:text-lg rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 font-semibold w-full sm:w-auto">
                <Link href="/services" className="flex items-center gap-2 sm:gap-3">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
                  무료 상담 예약하기
                  <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-2 border-white text-white hover:bg-white hover:text-emerald-600 px-6 sm:px-10 py-4 sm:py-5 text-base sm:text-lg rounded-2xl bg-transparent shadow-lg hover:shadow-xl transition-all duration-300 font-semibold w-full sm:w-auto"
              >
                <Link href="/products" className="flex items-center gap-2 sm:gap-3">
                  <Zap className="h-5 w-5 sm:h-6 sm:w-6" />
                  스트링 둘러보기
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 pt-8 lg:pt-12 max-w-2xl lg:max-w-none mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-yellow-300 mb-2">{stat.value}</div>
                  <div className="text-xs sm:text-sm opacity-80">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
