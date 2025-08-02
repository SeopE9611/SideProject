import { CardHeader } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Award, Users, Clock, Shield, Zap, Target, TrendingUp, CheckCircle, ArrowRight, Play, Quote, Calendar, MapPin, Phone, Mail } from 'lucide-react';

export default function Home() {
  // 임시 상품 데이터
  const featuredProducts = [
    {
      id: 1,
      name: '루키론 프로 스트링',
      price: 25000,
      originalPrice: 30000,
      image: '/placeholder.svg?height=300&width=300',
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
      image: '/placeholder.svg?height=300&width=300',
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
      image: '/placeholder.svg?height=300&width=300',
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
      image: '/placeholder.svg?height=300&width=300',
      brand: '바볼랏',
      features: ['반발력 ★★★☆☆', '내구성 ★★★★☆', '스핀 ★★★★★'],
      isNew: true,
      isBestseller: true,
      rating: 4.7,
      reviews: 156,
    },
  ];

  // 카테고리 데이터
  const categories = [
    {
      name: '멀티필라멘트',
      icon: '🧵',
      href: '/products/multifilament',
      description: '부드러운 타감과 편안함',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      name: '폴리에스터',
      icon: '🔄',
      href: '/products/polyester',
      description: '강력한 스핀과 컨트롤',
      color: 'from-purple-500 to-pink-500',
    },
    {
      name: '나일론',
      icon: '🧶',
      href: '/products/nylon',
      description: '균형잡힌 성능',
      color: 'from-green-500 to-emerald-500',
    },
    {
      name: '하이브리드',
      icon: '🔀',
      href: '/products/hybrid',
      description: '최적의 조합',
      color: 'from-orange-500 to-red-500',
    },
  ];

  // 공지사항 데이터
  const notices = [
    { id: 1, title: '5월 스트링 할인 이벤트 진행중', date: '2024-05-01', isHot: true },
    { id: 2, title: '여름 아카데미 회원 모집 시작', date: '2024-05-10', isHot: false },
    { id: 3, title: '신규 프리미엄 스트링 입고 안내', date: '2024-05-15', isHot: true },
    { id: 4, title: '장착 서비스 예약 시스템 업데이트', date: '2024-05-20', isHot: false },
  ];

  // 통계 데이터
  const stats = [
    { icon: Users, label: '만족한 고객', value: '5,000+', color: 'text-blue-600' },
    { icon: Award, label: '전문 경력', value: '15년+', color: 'text-green-600' },
    { icon: Target, label: '장착 완료', value: '50,000+', color: 'text-purple-600' },
    { icon: Star, label: '평균 평점', value: '4.9/5', color: 'text-yellow-600' },
  ];

  // 고객 후기
  const testimonials = [
    {
      name: '죡팡',
      role: '메접 전분가',
      content: '도깨비 테니스 아카데미의 스트링 장착 서비스는 정말 전문적입니다. 제 플레이 스타일에 맞는 완벽한 세팅을 해주셨어요.',
      rating: 5,
      image: '/placeholder.svg?height=60&width=60',
    },
    {
      name: '주말',
      role: '메붕이',
      content: '다양한 스트링을 체험해볼 수 있어서 좋았고, 전문가의 조언이 경기력 향상에 큰 도움이 되었습니다.',
      rating: 5,
      image: '/placeholder.svg?height=60&width=60',
    },
    {
      name: '쑹빵이',
      role: '백수',
      content: '학생들에게 추천하고 있는 곳입니다. 품질과 서비스 모두 만족스럽고, 가격도 합리적이에요.',
      rating: 5,
      image: '/placeholder.svg?height=60&width=60',
    },
  ];

  return (
    <div className="flex flex-col">
      {/* 메인 히어로 섹션 */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-green-900" />
        <div className="absolute inset-0 bg-black/40" />
        <Image src="/placeholder.svg?height=800&width=1600" alt="테니스 코트 배경" fill className="object-cover mix-blend-overlay" priority />

        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Award className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-medium">100년 전통의 전문 테니스 샵</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-green-100 bg-clip-text text-transparent">
              도깨비 테니스
              <br />
              아카데미
            </h1>

            <p className="text-xl md:text-2xl mb-8 text-gray-200 max-w-2xl mx-auto leading-relaxed">
              당신의 플레이 스타일에 맞는 <span className="text-yellow-400 font-semibold">최적의 스트링</span>으로
              <br />
              <span className="text-green-400 font-semibold">최상의 경기력</span>을 경험하세요
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg rounded-full shadow-2xl">
                <Link href="/products" className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  스트링 쇼핑하기
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 px-8 py-4 text-lg rounded-full">
                <Link href="/services" className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  장착 서비스 예약
                </Link>
              </Button>
            </div>

            {/* 통계 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full mb-2">
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-gray-300">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 스크롤 인디케이터 */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse" />
          </div>
        </div>
      </section>

      {/* 특징 섹션 */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">왜 도깨비 테니스를 선택해야 할까요?</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">15년간 쌓아온 전문성과 노하우로 최고의 테니스 경험을 제공합니다</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-6 group-hover:scale-110 transition-transform">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">전문 기술력</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">100년 경력의 전문가가 직접 장착하는 프리미엄 서비스로 완벽한 텐션과 균형을 보장합니다.</p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mb-6 group-hover:scale-110 transition-transform">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">맞춤형 상담</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">개인의 플레이 스타일과 선호도를 분석하여 최적의 스트링과 텐션을 추천해드립니다.</p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full mb-6 group-hover:scale-110 transition-transform">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">빠른 서비스</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">당일 장착 서비스와 온라인 예약 시스템으로 편리하고 빠른 서비스를 제공합니다.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 카테고리 섹션 */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">스트링 카테고리</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">다양한 스트링 타입으로 당신만의 완벽한 세팅을 찾아보세요</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link key={category.name} href={'/'} className="group">
                <Card className="h-full overflow-hidden border-0 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 hover:shadow-2xl transition-all duration-300 group-hover:scale-105">
                  <CardContent className="p-8 text-center relative">
                    <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                    <div className="relative z-10">
                      <div className="text-4xl mb-4">{category.icon}</div>
                      <h3 className="text-xl font-bold mb-2">{category.name}</h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{category.description}</p>
                      <div className="flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors">
                        <span className="text-sm font-medium">자세히 보기</span>
                        <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 추천 상품 섹션 */}
      <section className="py-20 bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="popular" className="w-full">
            <div className="flex flex-col md:flex-row items-center justify-between mb-12">
              <div>
                <h2 className="text-4xl font-bold mb-4">추천 상품</h2>
                <p className="text-xl text-gray-600 dark:text-gray-300">전문가가 엄선한 최고 품질의 테니스 스트링</p>
              </div>
              <TabsList className="bg-white/80 backdrop-blur-sm">
                <TabsTrigger value="popular" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  인기 상품
                </TabsTrigger>
                <TabsTrigger value="new" className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  신상품
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="popular" className="mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {featuredProducts.map((product) => (
                  <Link key={product.id} href={`/`} className="group">
                    <Card className="h-full overflow-hidden border-0 bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 group-hover:scale-105">
                      <div className="relative overflow-hidden">
                        <Image src={product.image || '/placeholder.svg'} alt={product.name} width={300} height={300} className="h-64 w-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                          {product.isNew && <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">NEW</Badge>}
                          {product.isBestseller && <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">BEST</Badge>}
                        </div>
                        {product.originalPrice && (
                          <div className="absolute top-3 right-3">
                            <Badge variant="destructive" className="bg-red-500">
                              {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                            </Badge>
                          </div>
                        )}
                      </div>

                      <CardContent className="p-6">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{product.brand}</div>
                        <CardTitle className="text-lg mb-3 group-hover:text-blue-600 transition-colors">{product.name}</CardTitle>

                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`h-4 w-4 ${i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                            ))}
                          </div>
                          <span className="text-sm text-gray-600">({product.reviews})</span>
                        </div>

                        <div className="space-y-2 mb-4">
                          {product.features.map((feature, index) => (
                            <div key={index} className="text-sm text-gray-600 dark:text-gray-300">
                              {feature}
                            </div>
                          ))}
                        </div>
                      </CardContent>

                      <CardFooter className="p-6 pt-0 flex justify-between items-center">
                        <div className="flex flex-col">
                          {product.originalPrice && <span className="text-sm text-gray-400 line-through">{product.originalPrice.toLocaleString()}원</span>}
                          <span className="text-xl font-bold text-blue-600">{product.price.toLocaleString()}원</span>
                        </div>
                        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">상세보기</Button>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="new" className="mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {featuredProducts
                  .filter((product) => product.isNew)
                  .map((product) => (
                    <Link key={product.id} href={`/`} className="group">
                      <Card className="h-full overflow-hidden border-0 bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 group-hover:scale-105">
                        <div className="relative overflow-hidden">
                          <Image src={product.image || '/placeholder.svg'} alt={product.name} width={300} height={300} className="h-64 w-full object-cover group-hover:scale-110 transition-transform duration-300" />
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">NEW</Badge>
                          </div>
                          {product.originalPrice && (
                            <div className="absolute top-3 right-3">
                              <Badge variant="destructive" className="bg-red-500">
                                {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                              </Badge>
                            </div>
                          )}
                        </div>

                        <CardContent className="p-6">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{product.brand}</div>
                          <CardTitle className="text-lg mb-3 group-hover:text-blue-600 transition-colors">{product.name}</CardTitle>

                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`h-4 w-4 ${i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">({product.reviews})</span>
                          </div>

                          <div className="space-y-2 mb-4">
                            {product.features.map((feature, index) => (
                              <div key={index} className="text-sm text-gray-600 dark:text-gray-300">
                                {feature}
                              </div>
                            ))}
                          </div>
                        </CardContent>

                        <CardFooter className="p-6 pt-0 flex justify-between items-center">
                          <div className="flex flex-col">
                            {product.originalPrice && <span className="text-sm text-gray-400 line-through">{product.originalPrice.toLocaleString()}원</span>}
                            <span className="text-xl font-bold text-blue-600">{product.price.toLocaleString()}원</span>
                          </div>
                          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">상세보기</Button>
                        </CardFooter>
                      </Card>
                    </Link>
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* 고객 후기 섹션 */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">고객 후기</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">실제 고객들이 경험한 도깨비 테니스의 서비스</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 shadow-xl">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>

                  <Quote className="h-8 w-8 text-gray-300 mb-4" />

                  <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">{testimonial.content}</p>

                  <div className="flex items-center gap-4">
                    <Image src={testimonial.image || '/placeholder.svg'} alt={testimonial.name} width={60} height={60} className="rounded-full" />
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-gray-500">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 공지사항 & 정보 섹션 */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* 공지사항 */}
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20">
                <CardTitle className="text-2xl flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500/20 p-2">
                    <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  공지사항
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <ul className="space-y-4">
                  {notices.map((notice) => (
                    <li key={notice.id} className="group">
                      <Link href={`/board/notice/${notice.id}`} className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-center gap-3">
                          {notice.isHot && <Badge className="bg-red-500 text-white text-xs">HOT</Badge>}
                          <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{notice.title}</span>
                        </div>
                        <span className="text-sm text-gray-500">{notice.date}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 text-center">
                  <Button asChild variant="outline" className="hover:bg-blue-50 dark:hover:bg-blue-900 bg-transparent">
                    <Link href="/board/notice" className="flex items-center gap-2">
                      더 많은 공지사항 보기
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 아카데미 & 연락처 정보 */}
            <div className="space-y-8">
              {/* 아카데미 소개 */}
              <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl">
                <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20">
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <div className="rounded-lg bg-green-500/20 p-2">
                      <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    아카데미 소개
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                    도깨비 테니스 아카데미는 초보부터 프로까지 모든 레벨의 테니스 선수들을 위한 전문 교육 프로그램을 제공합니다. 개인 맞춤형 레슨과 그룹 레슨을 통해 체계적이고 효과적인 테니스 교육을 받으실 수 있습니다.
                  </p>
                  <Image src="/placeholder.svg?height=200&width=400" alt="아카데미 레슨 모습" width={400} height={200} className="rounded-lg mb-6 w-full h-48 object-cover" />
                  <Button asChild className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                    <Link href="/academy" className="flex items-center justify-center gap-2">
                      <Play className="h-4 w-4" />
                      아카데미 신청하기
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* 연락처 정보 */}
              <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl">
                <CardHeader className="bg-gradient-to-r from-orange-500/10 to-red-500/10 dark:from-orange-500/20 dark:to-red-500/20">
                  <CardTitle className="text-xl flex items-center gap-3">
                    <div className="rounded-lg bg-orange-500/20 p-2">
                      <Phone className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    연락처 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">02-123-4567</p>
                      <p className="text-sm text-gray-500">평일 09:00 - 18:00</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-500" />
                    <p className="font-medium">info@dokkaebi-tennis.com</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-gray-500" />
                    <p className="font-medium">서울시 강남구 테니스로 123</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="py-20 bg-gradient-to-r from-blue-900 via-purple-900 to-green-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">지금 바로 시작하세요!</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto text-gray-200">전문가의 맞춤 상담을 통해 당신에게 완벽한 스트링을 찾아보세요</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-4 text-lg rounded-full">
              <Link href="/services" className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                무료 상담 예약하기
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-gray-900 px-8 py-4 text-lg rounded-full bg-transparent">
              <Link href="/products" className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                스트링 둘러보기
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
