import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function AcademyPage() {
  // 프로그램 데이터
  const programs = [
    {
      id: 1,
      title: "성인반",
      description: "테니스를 처음 접하는 성인부터 실력 향상을 원하는 중급자까지",
      features: [
        "주 2회 (화/목) 또는 주 3회 (월/수/금) 선택 가능",
        "오전반 (10:00-12:00), 저녁반 (19:00-21:00)",
        "기초 스트로크부터 경기 운영까지 체계적인 커리큘럼",
        "레벨별 맞춤 지도 (입문/초급/중급/상급)",
      ],
      price: "월 180,000원 (주 2회) / 월 250,000원 (주 3회)",
      duration: "3개월 과정",
      icon: "🎾",
    },
    {
      id: 2,
      title: "주니어반",
      description: "어린이와 청소년을 위한 재미있고 체계적인 테니스 교육",
      features: [
        "연령별 그룹 구성 (초등/중등/고등)",
        "주 2회 (화/목) 또는 주 3회 (월/수/금) 선택 가능",
        "방과 후 시간대 운영 (16:00-18:00)",
        "기초 체력 훈련부터 기술 훈련까지 종합 프로그램",
      ],
      price: "월 160,000원 (주 2회) / 월 220,000원 (주 3회)",
      duration: "3개월 과정",
      icon: "🏆",
      isPopular: true,
    },
    {
      id: 3,
      title: "주말 집중반",
      description: "평일에 시간이 없는 직장인과 학생을 위한 주말 집중 프로그램",
      features: [
        "토요일 또는 일요일 3시간 집중 레슨 (09:00-12:00)",
        "소규모 그룹 레슨 (최대 4명)",
        "개인별 피드백과 맞춤형 훈련",
        "월 1회 실전 경기 기회 제공",
      ],
      price: "월 200,000원 (주 1회)",
      duration: "3개월 과정",
      icon: "🌟",
    },
  ]

  // 강사 데이터
  const coaches = [
    {
      id: 1,
      name: "김도깨비",
      position: "수석 코치",
      image: "/placeholder.svg?height=300&width=300",
      experience: "전 국가대표 테니스 선수",
      description: "15년 이상의 코칭 경력을 가진 테니스 전문가. KTA 공인 코치 자격증 보유.",
      specialties: ["초보자 지도", "서브 교정", "경기 전략"],
    },
    {
      id: 2,
      name: "박테니스",
      position: "주니어 전문 코치",
      image: "/placeholder.svg?height=300&width=300",
      experience: "전 아시안게임 국가대표",
      description: "주니어 선수 육성 전문가. 국내외 주니어 대회 우승자 다수 배출.",
      specialties: ["주니어 육성", "기초 체력", "스트로크 교정"],
    },
    {
      id: 3,
      name: "이에이스",
      position: "체력 및 기술 코치",
      image: "/placeholder.svg?height=300&width=300",
      experience: "체육학 박사",
      description: "테니스에 특화된 체력 프로그램 개발. 선수들의 부상 방지와 퍼포먼스 향상에 중점.",
      specialties: ["체력 훈련", "부상 방지", "퍼포먼스 향상"],
    },
  ]

  return (
    <div className="flex flex-col gap-16 py-8">
      {/* Hero 섹션 */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[#3b82f6]/80 to-[#3b82f6]/20">
          <div className="absolute inset-0 bg-[url('/placeholder.svg?height=600&width=1200')] bg-cover bg-center mix-blend-overlay opacity-30"></div>
        </div>
        <div className="container relative z-10 flex flex-col items-center justify-center py-24 text-center text-[#ffffff]">
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">도깨비 테니스 아카데미</h1>
          <p className="mb-8 max-w-2xl text-xl sm:text-2xl">누구나 즐길 수 있는 체계적인 테니스 프로그램</p>
          <Button size="lg" asChild>
            <Link href="#apply">신청하기</Link>
          </Button>
        </div>
      </section>

      {/* 프로그램 소개 섹션 */}
      <section className="container" id="programs">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold">프로그램 소개</h2>
          <p className="mx-auto max-w-2xl text-[#64748b] dark:text-[#94a3b8]">
            도깨비 테니스 아카데미는 다양한 연령과 수준에 맞춘 프로그램을 제공합니다. 여러분의 목표와 일정에 맞는
            프로그램을 선택해보세요.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {programs.map((program) => (
            <Card key={program.id} className="relative overflow-hidden">
              {program.isPopular && (
                <div className="absolute right-0 top-0">
                  <Badge className="rounded-none rounded-bl-lg px-3 py-1.5">인기 프로그램</Badge>
                </div>
              )}
              <CardHeader>
                <div className="mb-2 text-4xl">{program.icon}</div>
                <CardTitle className="text-2xl">{program.title}</CardTitle>
                <CardDescription>{program.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {program.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="mr-2 h-5 w-5 shrink-0 text-[#3b82f6]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="rounded-lg bg-[#f1f5f9] p-4 dark:bg-[#1e293b]">
                  <div className="font-medium">수강료</div>
                  <div className="text-lg font-bold text-[#3b82f6]">{program.price}</div>
                  <div className="mt-1 text-sm text-[#64748b] dark:text-[#94a3b8]">{program.duration}</div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" asChild>
                  <Link href="#apply">신청하기</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* 강사 소개 섹션 */}
      <section className="bg-[#f8fafc] py-16 dark:bg-[#0f172a]/60">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold">강사 소개</h2>
            <p className="mx-auto max-w-2xl text-[#64748b] dark:text-[#94a3b8]">
              도깨비 테니스 아카데미의 전문 코치진을 소개합니다. 풍부한 경험과 전문 지식을 바탕으로 여러분의 테니스 실력
              향상을 도와드립니다.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {coaches.map((coach) => (
              <Card key={coach.id} className="overflow-hidden">
                <div className="aspect-[4/3] overflow-hidden">
                  <Image
                    src={coach.image || "/placeholder.svg"}
                    alt={coach.name}
                    width={300}
                    height={300}
                    className="h-full w-full object-cover transition-transform hover:scale-105"
                  />
                </div>
                <CardHeader>
                  <div className="space-y-1">
                    <CardTitle>{coach.name}</CardTitle>
                    <CardDescription className="text-[#3b82f6]">{coach.position}</CardDescription>
                    <div className="text-sm font-medium">{coach.experience}</div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>{coach.description}</p>
                  <div>
                    <h4 className="mb-2 font-medium">전문 분야</h4>
                    <div className="flex flex-wrap gap-2">
                      {coach.specialties.map((specialty, index) => (
                        <Badge key={index} variant="secondary">
                          {specialty}
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

      {/* 신청 안내 섹션 */}
      <section className="container py-16" id="apply">
        <div className="mx-auto max-w-3xl rounded-xl bg-[#3b82f6] p-8 text-center text-[#ffffff] shadow-lg">
          <h2 className="mb-4 text-3xl font-bold">수강 신청 안내</h2>
          <p className="mb-6 text-lg">
            도깨비 테니스 아카데미의 프로그램에 관심이 있으신가요?
            <br />
            아래 문의하기 버튼을 통해 상담을 신청하시거나, 전화로 문의해주세요.
          </p>
          <div className="mb-8 rounded-lg bg-[#ffffff]/10 p-4">
            <p className="text-xl font-medium">전화 문의: 02-123-4567</p>
            <p className="mt-2">운영 시간: 평일 09:00 - 18:00, 토요일 09:00 - 12:00</p>
          </div>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              variant="outline"
              className="border-[#ffffff] text-[#ffffff] hover:bg-[#ffffff] hover:text-[#3b82f6]"
              asChild
            >
              <Link href="/board/qna/write">문의하러 가기</Link>
            </Button>
            <Button size="lg" className="bg-[#ffffff] text-[#3b82f6] hover:bg-[#f8fafc]" asChild>
              <Link href="/board/qna">자주 묻는 질문 보기</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 아카데미 시설 섹션 */}
      <section className="container pb-16">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold">아카데미 시설</h2>
          <p className="mx-auto max-w-2xl text-[#64748b] dark:text-[#94a3b8]">
            최신 시설과 장비를 갖춘 도깨비 테니스 아카데미에서 최적의 환경에서 테니스를 배워보세요.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="overflow-hidden rounded-lg">
            <Image
              src="/placeholder.svg?height=300&width=400"
              alt="실내 테니스 코트"
              width={400}
              height={300}
              className="h-64 w-full object-cover transition-transform hover:scale-105"
            />
            <div className="p-4">
              <h3 className="font-bold">실내 테니스 코트</h3>
              <p className="text-sm text-[#64748b] dark:text-[#94a3b8]">
                날씨와 상관없이 연습할 수 있는 4면의 실내 코트
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg">
            <Image
              src="/placeholder.svg?height=300&width=400"
              alt="피트니스 센터"
              width={400}
              height={300}
              className="h-64 w-full object-cover transition-transform hover:scale-105"
            />
            <div className="p-4">
              <h3 className="font-bold">피트니스 센터</h3>
              <p className="text-sm text-[#64748b] dark:text-[#94a3b8]">
                테니스에 특화된 체력 훈련을 위한 피트니스 시설
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg">
            <Image
              src="/placeholder.svg?height=300&width=400"
              alt="휴게 공간"
              width={400}
              height={300}
              className="h-64 w-full object-cover transition-transform hover:scale-105"
            />
            <div className="p-4">
              <h3 className="font-bold">휴게 공간</h3>
              <p className="text-sm text-[#64748b] dark:text-[#94a3b8]">수업 전후 휴식과 교류를 위한 편안한 라운지</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
