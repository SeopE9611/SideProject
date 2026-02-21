import Image from 'next/image';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Star, Users, Trophy, Target, Award, ArrowRight, Phone, Mail, MapPin, Calendar } from 'lucide-react';

export default function AcademyPage() {
  type ProgramVariant = 'primary' | 'accent' | 'muted';

  // 프로그램 데이터
  const programs: Array<{
    id: number;
    title: string;
    description: string;
    features: string[];
    price: string;
    duration: string;
    icon: ReactElement;
    variant: ProgramVariant;
    students: string;
    satisfaction: string;
    isPopular?: boolean;
  }> = [
    {
      id: 1,
      title: '성인반',
      description: '테니스를 처음 접하는 성인부터 실력 향상을 원하는 중급자까지',
      features: ['주 2회 (화/목) 또는 주 3회 (월/수/금) 선택 가능', '오전반 (10:00-12:00), 저녁반 (19:00-21:00)', '기초 스트로크부터 경기 운영까지 체계적인 커리큘럼', '레벨별 맞춤 지도 (입문/초급/중급/상급)'],
      price: '월 180,000원 (주 2회) / 월 250,000원 (주 3회)',
      duration: '3개월 과정',
      icon: <Users className="h-8 w-8" />,
      variant: 'primary',
      students: '120+',
      satisfaction: '96%',
    },
    {
      id: 2,
      title: '주니어반',
      description: '어린이와 청소년을 위한 재미있고 체계적인 테니스 교육',
      features: ['연령별 그룹 구성 (초등/중등/고등)', '주 2회 (화/목) 또는 주 3회 (월/수/금) 선택 가능', '방과 후 시간대 운영 (16:00-18:00)', '기초 체력 훈련부터 기술 훈련까지 종합 프로그램'],
      price: '월 160,000원 (주 2회) / 월 220,000원 (주 3회)',
      duration: '3개월 과정',
      icon: <Trophy className="h-8 w-8" />,
      isPopular: true,
      variant: 'accent',
      students: '80+',
      satisfaction: '98%',
    },
    {
      id: 3,
      title: '주말 집중반',
      description: '평일에 시간이 없는 직장인과 학생을 위한 주말 집중 프로그램',
      features: ['토요일 또는 일요일 3시간 집중 레슨 (09:00-12:00)', '소규모 그룹 레슨 (최대 4명)', '개인별 피드백과 맞춤형 훈련', '월 1회 실전 경기 기회 제공'],
      price: '월 200,000원 (주 1회)',
      duration: '3개월 과정',
      icon: <Target className="h-8 w-8" />,
      variant: 'muted',
      students: '40+',
      satisfaction: '94%',
    },
  ];


  const variantStyles = {
    primary: {
      bar: 'bg-primary',
      icon: 'bg-primary text-primary-foreground',
      dot: 'bg-primary',
      price: 'text-primary',
      stat: 'text-primary',
      button: 'bg-primary text-primary-foreground hover:bg-primary/90',
    },
    accent: {
      bar: 'bg-accent',
      icon: 'bg-accent text-accent-foreground',
      dot: 'bg-accent',
      price: 'text-accent-foreground',
      stat: 'text-accent-foreground',
      button: 'bg-accent text-accent-foreground hover:bg-accent/90',
    },
    muted: {
      bar: 'bg-muted',
      icon: 'bg-muted text-foreground',
      dot: 'bg-muted-foreground',
      price: 'text-foreground',
      stat: 'text-foreground',
      button: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
    },
  } as const;

  // 강사 데이터
  const coaches = [
    {
      id: 1,
      name: '김도깨비',
      position: '수석 코치',
      image: '/placeholder.svg?height=400&width=400&text=김도깨비+코치',
      experience: '전 국가대표 테니스 선수',
      description: '수년 이상의 코칭 경력을 가진 테니스 전문가. KTA 공인 코치 자격증 보유.',
      specialties: ['초보자 지도', '서브 교정', '경기 전략'],
      achievements: ['국가대표 경력 5년', 'KTA 공인 코치', '주니어 육성 전문가'],
      rating: 4.9,
    },
    {
      id: 2,
      name: '박테니스',
      position: '주니어 전문 코치',
      image: '/placeholder.svg?height=400&width=400&text=박테니스+코치',
      experience: '전 아시안게임 국가대표',
      description: '주니어 선수 육성 전문가. 국내외 주니어 대회 우승자 다수 배출.',
      specialties: ['주니어 육성', '기초 체력', '스트로크 교정'],
      achievements: ['아시안게임 국가대표', '주니어 대회 우승자 배출', '체육학 석사'],
      rating: 4.8,
    },
    {
      id: 3,
      name: '이에이스',
      position: '체력 및 기술 코치',
      image: '/placeholder.svg?height=400&width=400&text=이에이스+코치',
      experience: '체육학 박사',
      description: '테니스에 특화된 체력 프로그램 개발. 선수들의 부상 방지와 퍼포먼스 향상에 중점.',
      specialties: ['체력 훈련', '부상 방지', '퍼포먼스 향상'],
      achievements: ['체육학 박사', '스포츠 의학 전문가', '재활 트레이닝 자격증'],
      rating: 4.7,
    },
  ];

  const facilities = [
    {
      name: '실내 테니스 코트',
      description: '날씨와 상관없이 연습할 수 있는 4면의 실내 코트',
      image: '/placeholder.svg?height=300&width=400&text=실내+테니스+코트',
      features: ['4면의 실내 코트', '최신 LED 조명', '에어컨 완비', '관중석 제공'],
    },
    {
      name: '피트니스 센터',
      description: '테니스에 특화된 체력 훈련을 위한 피트니스 시설',
      image: '/placeholder.svg?height=300&width=400&text=피트니스+센터',
      features: ['최신 운동기구', '개인 트레이닝 룸', '체성분 분석기', '샤워실 완비'],
    },
    {
      name: '휴게 공간',
      description: '수업 전후 휴식과 교류를 위한 편안한 라운지',
      image: '/placeholder.svg?height=300&width=400&text=휴게+공간',
      features: ['편안한 소파', '음료 자판기', 'Wi-Fi 제공', '개인 사물함'],
    },
  ];

  const reviews = [
    {
      name: '김민준',
      program: '성인반',
      rating: 5,
      comment: '처음 테니스를 배우는 초보자였는데, 김도깨비 코치님의 체계적인 지도 덕분에 빠르게 실력이 향상되었습니다. 기초부터 차근차근 알려주셔서 테니스의 재미를 느낄 수 있었어요!',
      avatar: '/placeholder.svg?height=60&width=60&text=김민준',
      date: '2024.01.15',
    },
    {
      name: '이서연',
      program: '주니어반',
      rating: 5,
      comment: '주니어반에서 아이가 테니스를 배우고 있는데, 아이의 성향과 체력에 맞춰 지도해주셔서 정말 감사합니다. 무엇보다 테니스를 즐기면서 배울 수 있도록 해주신 점이 가장 좋았습니다.',
      avatar: '/placeholder.svg?height=60&width=60&text=이서연',
      date: '2024.01.10',
    },
    {
      name: '박지훈',
      program: '주말 집중반',
      rating: 4,
      comment: '주말 집중반을 통해 테니스를 배우고 있습니다. 평일에는 시간이 없어 주말에만 배울 수 있는데, 3시간 동안 집중적으로 배울 수 있어 효율적입니다. 다만 조금 더 개인 피드백이 있으면 좋겠어요.',
      avatar: '/placeholder.svg?height=60&width=60&text=박지훈',
      date: '2024.01.08',
    },
  ];

  return (
    <div className="relative">
      {/* ▶ 고정된 오버레이 */}
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center gap-6">
        <p className="text-foreground text-2xl md:text-4xl font-semibold">이 페이지는 사용하지 않습니다. (아카데미 페이지)</p>
        <p className="text-sm text-muted-foreground">다시 활성화되기 전까지 현재 이 페이지는 접근 제한 상태입니다.</p>
        <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl">
          <Link href="/">홈으로 이동</Link>
        </Button>
      </div>

      <div className="flex flex-col">
        {/* Hero 섹션 */}
        <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
          {/* 배경 그라데이션 */}
          <div className="absolute inset-0 bg-background">
            <div className="absolute inset-0 bg-[url('/placeholder.svg?height=800&width=1200&text=Tennis+Academy')] bg-cover bg-center opacity-20"></div>
            <div className="absolute inset-0 bg-black/20"></div>
          </div>

          {/* 장식 요소 */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-accent/20 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-24 h-24 bg-accent/30 rounded-full blur-lg  "></div>
          <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-primary/20 rounded-full blur-md animate-pulse delay-1000"></div>

          <div className="container relative z-10 text-center text-foreground">
            <div className="max-w-4xl mx-auto">
              <Badge className="mb-6 bg-accent text-accent-foreground border-border backdrop-blur-sm">
                <Award className="w-4 h-4 mr-2" />
                테니스 교육 전문 기관
              </Badge>

              <h1 className="text-5xl md:text-7xl font-bold mb-6 text-foreground">도깨비 테니스 아카데미</h1>

              <p className="text-xl md:text-2xl mb-8 text-muted-foreground leading-relaxed">
                누구나 즐길 수 있는 체계적인 테니스 프로그램
                <br />
                <span className="text-accent-foreground font-semibold">당신의 테니스 실력을 한 단계 업그레이드하세요</span>
              </p>

              {/* 통계 정보 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="text-3xl font-bold text-foreground">240+</div>
                  <div className="text-sm text-muted-foreground">수강생</div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="text-3xl font-bold text-foreground">15년</div>
                  <div className="text-sm text-muted-foreground">운영 경력</div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="text-3xl font-bold text-foreground">96%</div>
                  <div className="text-sm text-muted-foreground">만족도</div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="text-3xl font-bold text-foreground">4.8</div>
                  <div className="text-sm text-muted-foreground">평점</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300" asChild>
                  <Link href="#apply">
                    <Calendar className="w-5 h-5 mr-2" />
                    수강 신청하기
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-accent backdrop-blur-sm bg-transparent" asChild>
                  <Link href="#programs">
                    <ArrowRight className="w-5 h-5 mr-2" />
                    프로그램 둘러보기
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* 스크롤 인디케이터 */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2  ">
            <div className="w-6 h-10 border-2 border-border rounded-full flex justify-center">
              <div className="w-1 h-3 bg-muted-foreground rounded-full mt-2 animate-pulse"></div>
            </div>
          </div>
        </section>

        {/* 프로그램 소개 섹션 */}
        <section className="py-20 bg-background" id="programs">
          <div className="container">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-accent text-accent-foreground">
                <Trophy className="w-4 h-4 mr-2" />
                맞춤형 교육 프로그램
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">프로그램 소개</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                도깨비 테니스 아카데미는 다양한 연령과 수준에 맞춘 프로그램을 제공합니다.
                <br />
                여러분의 목표와 일정에 맞는 프로그램을 선택해보세요.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {programs.map((program) => (
                <Card
                  key={program.id}
                  className={`group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-card border border-border ${
                    program.isPopular ? 'ring-2 ring-primary scale-105' : ''
                  }`}
                >
                  {program.isPopular && (
                    <div className="absolute top-0 right-0 bg-accent text-accent-foreground px-4 py-2 text-sm font-bold rounded-bl-xl">
                      <Star className="w-4 h-4 inline mr-1" />
                      인기 프로그램
                    </div>
                  )}

                  {/* 상단 그라데이션 바 */}
                  <div className={`h-2 ${variantStyles[program.variant].bar}`}></div>

                  <CardHeader className="text-center pb-4">
                    <div className={`mx-auto mb-4 w-20 h-20 rounded-full ${variantStyles[program.variant].icon} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>{program.icon}</div>
                    <CardTitle className="text-2xl font-bold mb-2">{program.title}</CardTitle>
                    <CardDescription className="text-base">{program.description}</CardDescription>

                    {/* 통계 정보 */}
                    <div className="flex justify-center gap-4 mt-4">
                      <div className="text-center">
                        <div className="font-bold text-lg text-foreground">{program.students}</div>
                        <div className="text-xs text-muted-foreground">수강생</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg text-foreground">{program.satisfaction}</div>
                        <div className="text-xs text-muted-foreground">만족도</div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* 주요 특징 */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                        프로그램 특징
                      </h4>
                      <ul className="space-y-2">
                        {program.features.map((feature, index) => (
                          <li key={index} className="flex items-start text-sm">
                            <div className={`w-2 h-2 rounded-full ${variantStyles[program.variant].bar} mt-2 mr-3 flex-shrink-0`}></div>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 가격 정보 */}
                    <div className="bg-muted rounded-xl p-4">
                      <div className="text-center">
                        <div className="font-medium text-muted-foreground">수강료</div>
                        <div className={`text-lg font-bold ${variantStyles[program.variant].bar} bg-clip-text text-transparent`}>{program.price}</div>
                        <div className="text-sm text-muted-foreground mt-1">{program.duration}</div>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter>
                    <Button className={`w-full ${variantStyles[program.variant].button} shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300`} asChild>
                      <Link href="#apply">
                        <Calendar className="w-4 h-4 mr-2" />
                        신청하기
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 강사 소개 섹션 */}
        <section className="py-20 bg-background relative overflow-hidden">
          {/* 배경 패턴 */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/placeholder.svg?height=400&width=400&text=Pattern')] bg-repeat opacity-20"></div>
          </div>

          <div className="container relative z-10">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-accent text-accent-foreground border-border">
                <Users className="w-4 h-4 mr-2" />
                전문 코칭진
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">강사 소개</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                도깨비 테니스 아카데미의 전문 코치진을 소개합니다.
                <br />
                풍부한 경험과 전문 지식을 바탕으로 여러분의 테니스 실력 향상을 도와드립니다.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {coaches.map((coach) => (
                <Card key={coach.id} className="group overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-card backdrop-blur-sm">
                  <div className="relative overflow-hidden">
                    <Image src={coach.image || '/placeholder.svg'} alt={coach.name} width={400} height={400} className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute top-4 right-4 bg-card backdrop-blur-sm border border-border rounded-full px-3 py-1 flex items-center">
                      <Star className="w-4 h-4 text-accent-foreground mr-1" />
                      <span className="text-sm font-bold">{coach.rating}</span>
                    </div>
                  </div>

                  <CardHeader>
                    <div className="text-center">
                      <CardTitle className="text-2xl font-bold mb-1">{coach.name}</CardTitle>
                      <div className="text-primary font-semibold mb-2">{coach.position}</div>
                      <Badge variant="outline" className="mb-4">
                        {coach.experience}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground leading-relaxed">{coach.description}</p>

                    <div>
                      <h4 className="font-semibold mb-2 flex items-center">
                        <Target className="w-4 h-4 mr-2 text-primary" />
                        전문 분야
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {coach.specialties.map((specialty, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 flex items-center">
                        <Award className="w-4 h-4 mr-2 text-primary" />
                        주요 경력
                      </h4>
                      <ul className="space-y-1">
                        {coach.achievements.map((achievement, index) => (
                          <li key={index} className="flex items-start text-sm">
                            <CheckCircle className="w-3 h-3 mt-1 mr-2 text-primary flex-shrink-0" />
                            <span>{achievement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 아카데미 시설 섹션 */}
        <section className="py-20 bg-background">
          <div className="container">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-accent text-accent-foreground">
                <Award className="w-4 h-4 mr-2" />
                최신 시설 완비
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">아카데미 시설</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                최신 시설과 장비를 갖춘 도깨비 테니스 아카데미에서
                <br />
                최적의 환경에서 테니스를 배워보세요.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {facilities.map((facility, index) => (
                <Card key={index} className="group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-card">
                  <div className="relative overflow-hidden">
                    <Image src={facility.image || '/placeholder.svg'} alt={facility.name} width={400} height={300} className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>

                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-3">{facility.name}</h3>
                    <p className="text-muted-foreground mb-4 leading-relaxed">{facility.description}</p>

                    <div className="space-y-2">
                      {facility.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 고객 후기 섹션 */}
        <section className="py-20 bg-background">
          <div className="container">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-accent text-accent-foreground">
                <Star className="w-4 h-4 mr-2" />
                수강생 만족도 96%
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">고객 후기</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                도깨비 테니스 아카데미를 수강한
                <br />
                수강생들의 생생한 후기입니다.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              {reviews.map((review, index) => (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-card">
                  <CardContent className="p-8">
                    <div className="flex items-center mb-4">
                      <Image src={review.avatar || '/placeholder.svg'} alt={review.name} width={60} height={60} className="rounded-full mr-4" />
                      <div>
                        <h4 className="font-bold text-lg">{review.name}</h4>
                        <p className="text-sm text-primary">{review.program}</p>
                        <p className="text-xs text-muted-foreground">{review.date}</p>
                      </div>
                    </div>

                    <div className="flex mb-4">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-warning fill-current" />
                      ))}
                    </div>

                    <blockquote className="text-foreground italic leading-relaxed">"{review.comment}"</blockquote>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300" asChild>
                <Link href="/reviews/write?type=academy">
                  <Star className="w-5 h-5 mr-2" />
                  리뷰 작성하기
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* 수강 신청 안내 섹션 */}
        <section className="py-20 bg-background relative overflow-hidden" id="apply">
          {/* 배경 장식 */}
          <div className="absolute top-10 left-10 w-32 h-32 bg-accent/20 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-24 h-24 bg-accent/30 rounded-full blur-lg  "></div>

          <div className="container relative z-10">
            <div className="max-w-4xl mx-auto">
              <Card className="border-0 shadow-2xl bg-card backdrop-blur-sm overflow-hidden">
                <div className="bg-card p-8 text-center text-foreground border-b border-border">
                  <h2 className="text-4xl font-bold mb-4">수강 신청 안내</h2>
                  <p className="text-xl text-muted-foreground">
                    도깨비 테니스 아카데미의 프로그램에 관심이 있으신가요?
                    <br />
                    아래 문의하기 버튼을 통해 상담을 신청하시거나, 전화로 문의해주세요.
                  </p>
                </div>

                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="text-center p-6 border border-border rounded-xl hover:shadow-lg transition-shadow duration-300">
                      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground mx-auto mb-4">
                        <Phone className="h-8 w-8" />
                      </div>
                      <h3 className="text-lg font-bold mb-2">전화 문의</h3>
                      <div className="text-2xl font-bold text-foreground mb-2">02-123-4567</div>
                      <p className="text-sm text-muted-foreground">
                        평일 09:00 - 18:00
                        <br />
                        토요일 09:00 - 12:00
                      </p>
                    </div>

                    <div className="text-center p-6 border border-border rounded-xl hover:shadow-lg transition-shadow duration-300">
                      <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center text-accent-foreground mx-auto mb-4">
                        <Mail className="h-8 w-8" />
                      </div>
                      <h3 className="text-lg font-bold mb-2">이메일 문의</h3>
                      <div className="text-lg font-bold text-foreground mb-2">info@dokkaebi.com</div>
                      <p className="text-sm text-muted-foreground">
                        24시간 접수
                        <br />
                        1일 이내 답변
                      </p>
                    </div>

                    <div className="text-center p-6 border border-border rounded-xl hover:shadow-lg transition-shadow duration-300">
                      <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground mx-auto mb-4">
                        <MapPin className="h-8 w-8" />
                      </div>
                      <h3 className="text-lg font-bold mb-2">방문 상담</h3>
                      <div className="text-sm font-medium text-foreground mb-2">서울시 강남구 테니스로 123</div>
                      <p className="text-sm text-muted-foreground">
                        사전 예약 필수
                        <br />
                        현장 시설 견학 가능
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted rounded-xl p-6 mb-8">
                    <h3 className="text-xl font-bold mb-4 text-center">
                      <CheckCircle className="w-5 h-5 inline mr-2 text-primary" />
                      수강 신청 혜택
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center">
                        <Award className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                        <div>
                          <p className="font-medium">무료 체험 레슨</p>
                          <p className="text-sm text-muted-foreground">첫 수업 무료 체험</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Trophy className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                        <div>
                          <p className="font-medium">장비 무료 대여</p>
                          <p className="text-sm text-muted-foreground">라켓, 볼 무료 제공</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Users className="w-5 h-5 text-accent-foreground mr-3 flex-shrink-0" />
                        <div>
                          <p className="font-medium">개인 맞춤 상담</p>
                          <p className="text-sm text-muted-foreground">레벨 테스트 및 상담</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300" asChild>
                      <Link href="/board/qna/write">
                        <Mail className="mr-2 h-5 w-5" />
                        문의하러 가기
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-accent bg-transparent" asChild>
                      <Link href="/board/qna">
                        <ArrowRight className="mr-2 h-5 w-5" />
                        자주 묻는 질문 보기
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
