import Image from 'next/image';
import Link from 'next/link';
import { PhoneCall, Calendar, CheckCircle, HelpCircle, Clock, Shield, Award, Zap, Star, ArrowRight, Users, Target, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function ServicesPage() {
  // 스트링 유형 데이터
  const stringTypes = [
    {
      id: 1,
      title: '파워형 스트링',
      description: '강력한 파워와 반발력을 제공하는 스트링',
      features: ['최대한의 파워 제공', '부드러운 타구감', '관절에 부담이 적음', '낮은 장력에서도 충분한 반발력'],
      recommended: ['파워 중심의 플레이 스타일', '어깨나 팔꿈치에 부담을 줄이고 싶은 분', '초보자 및 중급자', '자연스러운 스윙으로 힘을 얻고 싶은 분'],
      image: '/placeholder.svg?height=300&width=300&text=Power+String',
      examples: ['바볼랏 VS 터치', '윌슨 NXT', '테크니화이버 X-One'],
      icon: <Zap className="h-8 w-8" />,
      performance: { power: 95, control: 70, spin: 75, durability: 80 },
    },
    {
      id: 2,
      title: '스핀형 스트링',
      description: '정확한 컨트롤과 스핀을 위한 스트링',
      features: ['최대한의 스핀 생성', '정확한 볼 컨트롤', '내구성이 우수함', '중상급자용 하드 히팅에 적합'],
      recommended: ['컨트롤과 스핀 중심의 플레이 스타일', '강한 스트로크로 공격하는 플레이어', '중급자 및 상급자', '정확한 샷 배치를 중요시하는 분'],
      image: '/placeholder.svg?height=300&width=300&text=Control+String',
      examples: ['바볼랏 RPM 블라스트', '솔린코 투어바이트', '폴리스타 스트라이크'],
      icon: <Target className="h-8 w-8" />,
      performance: { power: 75, control: 95, spin: 90, durability: 85 },
    },
    {
      id: 3,
      title: '내구성형 스트링',
      description: '파워와 컨트롤의 균형 잡힌 성능',
      features: ['파워와 컨트롤의 균형', '중간 정도의 타구감', '다양한 플레이 스타일에 적합', '하이브리드 구성으로 활용 가능'],
      recommended: ['올라운드 플레이 스타일', '다양한 샷을 구사하는 플레이어', '파워와 컨트롤 모두 중요시하는 분', '모든 수준의 플레이어'],
      image: '/placeholder.svg?height=300&width=300&text=Balance+String',
      examples: ['럭실론 프로 스트링', '윌슨 레볼루션', '테크니화이버 멀티필'],
      icon: <Trophy className="h-8 w-8" />,
      performance: { power: 85, control: 85, spin: 80, durability: 90 },
    },
  ];

  // 서비스 가격 정보
  const pricingInfo = [
    {
      service: '스트링 장착 (스트링 미포함)',
      price: 12000,
      description: '자신의 스트링 또는 별도 구매한 스트링 장착 서비스',
      icon: <Clock className="h-6 w-6" />,
      duration: '30-45분',
      popular: false,
    },
    {
      service: '스트링 장착 (스트링 포함)',
      price: 35000,
      description: '도깨비 테니스의 추천 스트링 포함 가격',
      icon: <Shield className="h-6 w-6" />,
      duration: '30-45분',
      popular: true,
    },
    {
      service: '하이브리드 장착',
      price: 13000,
      description: '메인과 크로스에 서로 다른 스트링 조합 장착 (스트링 미포함)',
      icon: <Award className="h-6 w-6" />,
      duration: '45-60분',
      popular: false,
    },
    // {
    //   service: '급행 서비스(서비스 X)',
    //   price: 0,
    //   description: '현재 해당 서비스는 이용하실 수 없습니다.',
    //   icon: <Zap className="h-6 w-6" />,
    //   duration: '1시간 이내',
    //   popular: false,
    // },
  ];

  // 추가 서비스 정보
  const additionalServices = [
    {
      title: '장력 추천 서비스',
      description: '플레이 스타일과 라켓에 맞는 최적의 장력을 추천해 드립니다.',
      free: true,
      icon: <Target className="h-5 w-5" />,
    },
    {
      title: '스트링 추천 서비스',
      description: '개인의 플레이 스타일에 맞는 최적의 스트링과 장력 조합을 추천해 드립니다.',
      free: true,
      icon: <Award className="h-5 w-5" />,
    },
    {
      title: '라켓 그립 교체',
      description: '새로운 베이스 그립 또는 오버그립 교체 서비스입니다.',
      free: false,
      price: 5000,
      icon: <Shield className="h-5 w-5" />,
    },
  ];

  const processSteps = [
    {
      step: 1,
      title: '라켓 상태 점검',
      description: '라켓 프레임과 그로밋의 상태를 세심하게 점검합니다.',
      icon: <Shield className="h-8 w-8" />,
    },
    {
      step: 2,
      title: '정밀 스트링 제거',
      description: '라켓에 손상이 가지 않도록 기존 스트링을 조심스럽게 제거합니다.',
      icon: <Target className="h-8 w-8" />,
    },
    {
      step: 3,
      title: '정확한 장력 설정',
      description: '디지털 전자식 스트링머신으로 정확한 장력을 설정하고 장착합니다.',
      icon: <Award className="h-8 w-8" />,
    },
    {
      step: 4,
      title: '품질 확인 및 마무리',
      description: '장착 후 텐션과 패턴을 확인하고 완벽한 상태로 마무리합니다.',
      icon: <CheckCircle className="h-8 w-8" />,
    },
  ];

  const reviews = [
    {
      name: '김재민',
      role: '메창',
      rating: 5,
      comment: '프로 수준의 정확한 장력과 세심한 작업으로 스트링 장착해주셔서 경기력이 크게 향상되었습니다. 특히 스핀이 잘 걸리는 스트링 추천에 매우 만족합니다.',
      avatar: '/placeholder.svg?height=60&width=60&text=김테니스',
    },
    {
      name: '윤형섭',
      role: '백수',
      rating: 5,
      comment: '테니스를 시작한 지 얼마 안 된 초보자였는데, 친절하게 스트링과 장력에 대해 상세히 설명해주셨어요. 덕분에 테니스에 더 재미를 붙이게 되었습니다!',
      avatar: '/placeholder.svg?height=60&width=60&text=박초보',
    },
    {
      name: '죡팡',
      role: '메붕이',
      rating: 5,
      comment: '하이브리드 조합을 추천받아 사용해봤는데, 정말 제 플레이 스타일에 딱 맞았습니다. 장착 후 실력이 눈에 띄게 향상되어 대회에서도 좋은 성적을 거둘 수 있었습니다.',
      avatar: '/placeholder.svg?height=60&width=60&text=이프로',
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero 섹션 */}
      <section className="relative min-h-[90vh] bp-md:min-h-[100vh] bp-lg:min-h-[110vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-muted">
          <div className="absolute inset-0 opacity-20">
            <svg className="w-full h-full text-foreground" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="courtLines" x="0" y="0" width="400" height="300" patternUnits="userSpaceOnUse">
                  <rect width="400" height="300" fill="none" stroke="currentColor" strokeWidth="2" />
                  <line x1="200" y1="0" x2="200" y2="300" stroke="currentColor" strokeWidth="2" />
                  <line x1="0" y1="150" x2="400" y2="150" stroke="currentColor" strokeWidth="2" />
                  <rect x="50" y="75" width="300" height="150" fill="none" stroke="currentColor" strokeWidth="1" />
                  <rect x="100" y="100" width="200" height="100" fill="none" stroke="currentColor" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#courtLines)" />
            </svg>
          </div>
          <div className="absolute inset-0 bg-background/40"></div>
        </div>

        {/* 장식 요소 */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-card/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-accent/20 rounded-full blur-lg  "></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-muted rounded-full blur-md animate-pulse delay-1000"></div>

        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto">
            <Card className="border-0 shadow-2xl bg-card/95 backdrop-blur-sm dark:bg-card/95 overflow-hidden">
              <div className="bg-card border-b border-primary/20 p-8 text-center text-foreground">
                <h2 className="text-4xl font-bold mb-4">예약 안내</h2>
                <p className="text-xl text-muted-foreground">
                  스트링 장착 서비스는 예약제로 운영됩니다.
                  <br />
                  아래 방법을 통해 편리하게 예약해 주세요.
                </p>
              </div>

              <CardContent className="p-5 bp-md:p-8">
                <div className="grid grid-cols-1 bp-md:grid-cols-2 gap-5 bp-md:gap-8 mb-6 bp-md:mb-8">
                  <div className="text-center p-6 border border-border rounded-xl hover:shadow-lg transition-shadow duration-300">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                      <PhoneCall className="h-10 w-10" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4">전화 예약</h3>
                    <p className="text-muted-foreground mb-4">가장 빠른 예약은 전화로 문의해 주세요.</p>
                    <div className="text-2xl bp-md:text-3xl font-bold text-foreground mb-2">0507-1392-3493</div>
                    <p className="text-sm text-muted-foreground">운영 시간: 평일 10:00 - 22:00, 토요일 09:00 - 18:00</p>
                  </div>

                  <div className="text-center p-6 border border-border rounded-xl hover:shadow-lg transition-shadow duration-300">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                      <Calendar className="h-10 w-10" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4">온라인 신청</h3>
                    <p className="text-muted-foreground mb-6">
                      스트링 교체 신청서를 통해 예약 요청을 남겨주세요. <br />
                    </p>
                    <Button variant="default" className="w-full" asChild>
                      <Link href="/services/apply">
                        <Calendar className="w-4 h-4 mr-2" />
                        교체 신청하러 가기
                      </Link>
                    </Button>
                  </div>
                </div>

                <Separator className="my-8" />

                <div className="bg-muted rounded-xl border border-border p-6 text-foreground">
                  <h3 className="text-xl font-bold mb-4 text-center">
                    <CheckCircle className="w-5 h-5 inline mr-2 text-accent" />
                    알아두세요
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-start">
                      <Clock className="w-5 h-5 text-accent mt-1 mr-3 flex-shrink-0" />
                      <div>
                        <p className="font-medium">예약 시간</p>
                        <p className="text-sm text-muted-foreground">방문 접수 시 완료 10분 전 도착 권장</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Shield className="w-5 h-5 text-accent mt-1 mr-3 flex-shrink-0" />
                      <div>
                        <p className="font-medium">소요 시간</p>
                        <p className="text-sm text-muted-foreground">30분~1시간</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Zap className="w-5 h-5 text-accent mt-1 mr-3 flex-shrink-0" />
                      <div>
                        <p className="font-medium">100% 예약제</p>
                        <p className="text-sm text-muted-foreground">사전 예약 필수</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                  <Button variant="outline"  asChild>
                    <Link href="/board/qna">
                      <HelpCircle className="mr-2 h-4 w-4" />
                      자주 묻는 질문
                    </Link>
                  </Button>
                  <Button variant="default" asChild>
                    <Link href="/products">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      테니스 스트링 쇼핑하기
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* <div className="container relative z-10 text-center text-primary-foreground">
          <div className="max-w-4xl mx-auto">
            <Badge className="mb-6 bg-card/20 text-primary-foreground border-border/30 backdrop-blur-sm">
              <Award className="w-4 h-4 mr-2" />
              전문 스트링 서비스
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-foreground">스트링 장착 서비스</h1>

            <p className="text-xl md:text-2xl mb-8 text-primary-foreground/90 leading-relaxed">
              라켓 성능을 극대화하는 전문 스트링 서비스
              <br />
              <span className="text-primary-foreground/80 font-semibold">당신의 플레이를 한 단계 업그레이드하세요</span>
            </p>

            <div className="flex flex-wrap justify-center gap-6 mb-10">
              <div className="flex items-center gap-2 bg-card/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Shield className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium">정품 보장</span>
              </div>
              <div className="flex items-center gap-2 bg-card/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Clock className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium">당일 완료</span>
              </div>
              <div className="flex items-center gap-2 bg-card/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Users className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium">전문가 상담</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="default" className="shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300" asChild>
                <Link href="#booking">
                  <Calendar className="w-5 h-5 mr-2" />
                  지금 예약하기
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="backdrop-blur-sm" asChild>
                <Link href="#string-types">
                  <ArrowRight className="w-5 h-5 mr-2" />
                  서비스 둘러보기
                </Link>
              </Button>
            </div>
          </div>
        </div> */}

        {/* 스크롤 인디케이터 */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2  ">
          <div className="w-6 h-10 border-2 border-border/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-card/70 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* 서비스 소개 섹션 */}
      <section className="py-12 bp-md:py-16 bp-lg:py-20 bg-muted/40" id="string-types">
        <div className="container">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-accent/10 text-foreground dark:bg-accent/15 dark:text-foreground">
              <Star className="w-4 h-4 mr-2" />
              프리미엄 스트링 컬렉션
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">스트링 종류 안내</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              플레이 스타일과 경기력 향상을 위한 다양한 특성의 스트링을 제공합니다.
              <br />
              자신에게 맞는 최적의 스트링을 선택해보세요.
            </p>
          </div>

          <div className="grid grid-cols-1 bp-md:grid-cols-2 bp-lg:grid-cols-3 gap-8">
            {stringTypes.map((type) => (
              <Card key={type.id} className="group relative overflow-hidden border border-border shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-card">
                <div className="h-2 bg-muted"></div>

                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg group-hover:scale-110 transition-transform duration-300">{type.icon}</div>
                  <CardTitle className="text-2xl font-bold mb-2">{type.title}</CardTitle>
                  <CardDescription className="text-base">{type.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* 성능 차트 */}
                  <div className="bg-muted/50 dark:bg-card rounded-xl p-4">
                    <h4 className="font-semibold mb-3 text-center">성능 특성</h4>
                    <div className="space-y-2">
                      {Object.entries(type.performance).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{key === 'power' ? '파워' : key === 'control' ? '컨트롤' : key === 'spin' ? '스핀' : '내구성'}</span>
                          <div className="flex-1 mx-3 bg-muted rounded-full h-2">
                            <div className="h-2 rounded-full bg-primary transition-all duration-1000 ease-out" style={{ width: `${value}%` }}></div>
                          </div>
                          <span className="text-sm font-medium">{value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 주요 특징 */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-accent" />
                      주요 특징
                    </h4>
                    <ul className="space-y-2">
                      {type.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start text-sm">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 추천 대상 */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center">
                      <Users className="w-4 h-4 mr-2 text-accent" />
                      추천 대상
                    </h4>
                    <ul className="space-y-2">
                      {type.recommended.slice(0, 2).map((rec, idx) => (
                        <li key={idx} className="flex items-start text-sm">
                          <ArrowRight className="w-3 h-3 mt-1 mr-2 text-accent flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 대표 제품 */}
                  <div className="bg-muted rounded-xl border border-border p-4 text-foreground">
                    <h4 className="font-semibold mb-3">대표 제품</h4>
                    <div className="flex flex-wrap gap-2">
                      {type.examples.map((example, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {example}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 가격 안내 섹션 */}
      <section className="py-12 bp-md:py-16 bp-lg:py-20 bg-background relative overflow-hidden" id="pricing">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full text-foreground" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="courtPattern" x="0" y="0" width="400" height="300" patternUnits="userSpaceOnUse">
                <rect width="400" height="300" fill="none" stroke="currentColor" strokeWidth="2" />
                <line x1="200" y1="0" x2="200" y2="300" stroke="currentColor" strokeWidth="2" />
                <line x1="0" y1="150" x2="400" y2="150" stroke="currentColor" strokeWidth="2" />
                <rect x="50" y="75" width="300" height="150" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#courtPattern)" />
          </svg>
        </div>

        <div className="container relative z-10">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-muted text-foreground border-border">
              <Award className="w-4 h-4 mr-2" />
              투명한 가격 정책
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">가격 안내</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              합리적인 가격으로 최고의 스트링 장착 서비스를 제공합니다.
              <br />
              다양한 옵션 중 필요한 서비스를 선택하세요.
            </p>
          </div>

          <div className="grid grid-cols-1 bp-md:grid-cols-2 bp-lg:grid-cols-3 gap-6 mb-16">
            {pricingInfo.map((item) => (
              <Card
                key={item.service}
                className={`relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 ${
                  item.popular ? 'bg-card text-foreground border border-primary/20 scale-105' : 'bg-card/95 backdrop-blur-sm dark:bg-card/95'
                }`}
              >
                {item.popular && <div className="absolute top-0 right-0 bg-destructive/100 text-primary-foreground px-3 py-1 text-xs font-bold rounded-bl-lg">인기</div>}

                <CardHeader className="text-center pb-4">
                  <div className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${item.popular ? 'bg-primary/10 text-primary' : 'bg-primary/10 text-primary'}`}>{item.icon}</div>
                  <CardTitle className={`text-lg font-bold ${item.popular ? 'text-foreground' : ''}`}>{item.service}</CardTitle>
                  <div className={`text-3xl font-bold ${item.popular ? 'text-foreground' : 'text-foreground'}`}>{item.price.toLocaleString()}원</div>
                  <div className={`text-sm ${item.popular ? 'text-muted-foreground' : 'text-muted-foreground'}`}>소요시간: {item.duration}</div>
                </CardHeader>

                <CardContent>
                  <p className={`text-sm text-center ${item.popular ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 할인 혜택 */}
          {/* <div className="bg-card/10 backdrop-blur-sm rounded-2xl p-8 mb-12">
            <h3 className="text-2xl font-bold text-primary-foreground mb-6 text-center">
              <Star className="w-6 h-6 inline mr-2" />
              특별 할인 혜택
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary-foreground" />
                </div>
                <h4 className="font-bold text-primary-foreground mb-2">회원 할인</h4>
                <p className="text-primary-foreground/90 text-sm">아카데미 회원 10% 할인</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-primary-foreground" />
                </div>
                <h4 className="font-bold text-primary-foreground mb-2">재장착 할인</h4>
                <p className="text-primary-foreground/90 text-sm">30일 이내 5,000원 할인</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-accent/100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-primary-foreground" />
                </div>
                <h4 className="font-bold text-primary-foreground mb-2">패키지 할인</h4>
                <p className="text-primary-foreground/90 text-sm">3개 이상 라켓당 2,000원 할인</p>
              </div>
            </div>
          </div> */}

          {/* 추가 서비스 */}
          <div className="bg-card/95 backdrop-blur-sm dark:bg-card/95 rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-6 text-center text-foreground">추가 서비스</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {additionalServices.map((service) => (
                <div key={service.title} className="border border-border rounded-xl p-6 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary mr-3">{service.icon}</div>
                      <h4 className="font-bold">{service.title}</h4>
                    </div>
                    {service.free ? <Badge className="bg-accent/10 text-foreground dark:bg-accent/15 dark:text-foreground">무료</Badge> : <span className="font-bold text-foreground">{(service.price ?? 0).toLocaleString()}원</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 장착 과정 섹션 */}
      <section className="py-12 bp-md:py-16 bp-lg:py-20 bg-background">
        <div className="container">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-accent/10 text-foreground dark:bg-accent/15 dark:text-foreground">
              <Shield className="w-4 h-4 mr-2" />
              전문적인 프로세스
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">스트링 장착 과정</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              도깨비 테니스 아카데미는 세심한 과정을 통해
              <br />
              최고 품질의 스트링 장착 서비스를 제공합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 bp-md:grid-cols-2 bp-lg:grid-cols-4 gap-8">
            {processSteps.map((step) => (
              <div key={step.step} className="relative group">
                {processSteps.indexOf(step) < processSteps.length - 1 && <div className="hidden bp-lg:block absolute top-16 left-full w-full h-0.5 bg-primary/20 transform translate-x-4 z-0"></div>}

                <Card className="relative z-10 text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 bg-card">
                  <CardContent className="p-5 bp-md:p-8">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300">{step.icon}</div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-sm font-bold shadow-lg">{step.step}</div>
                    </div>
                    <h3 className="text-xl font-bold mb-4">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 예약 안내 섹션 */}
      {/* <section className="py-12 bp-md:py-16 bp-lg:py-20 bg-background relative overflow-hidden" id="booking">
        <div className="absolute top-10 left-10 w-32 h-32 bg-card/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 bg-muted rounded-full blur-lg  "></div>
      </section> */}

      {/* 고객 후기 섹션 */}
      <section className="py-12 bp-md:py-16 bp-lg:py-20 bg-muted/40">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">고객 후기</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">도깨비 테니스 스트링 서비스를 경험한 후기를 확인해보세요</p>
          </div>

          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {reviews.map((review, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-card">
                <CardContent className="p-5 bp-md:p-8">
                  <div className="flex items-center mb-4">
                    <Image src={review.avatar || '/placeholder.svg'} alt={review.name} width={60} height={60} className="rounded-full mr-4" />
                    <div>
                      <h4 className="font-bold text-lg">{review.name}</h4>
                      <p className="text-sm text-muted-foreground">{review.role}</p>
                    </div>
                  </div>

                  <div className="flex mb-4">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                    ))}
                  </div>

                  <blockquote className="text-muted-foreground italic leading-relaxed">"{review.comment}"</blockquote>
                </CardContent>
              </Card>
            ))}
          </div> */}

          <div className="text-center">
            <Button size="lg" variant="default" className="shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300" asChild>
              {/* <Link href="/reviews/write?service=stringing"> */}
              <Link href="/reviews">
                <Star className="w-5 h-5 mr-2" />
                서비스 후기 보기
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
