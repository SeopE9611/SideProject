import Image from 'next/image';
import Link from 'next/link';
import { PhoneCall, Calendar, CheckCircle, HelpCircle } from 'lucide-react';
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
      image: '/placeholder.svg?height=300&width=300',
      examples: ['바볼랏 VS 터치', '윌슨 NXT', '테크니파이버 X-One'],
      color: '#3b82f6',
    },
    {
      id: 2,
      title: '컨트롤형 스트링',
      description: '정확한 컨트롤과 스핀을 위한 스트링',
      features: ['최대한의 스핀 생성', '정확한 볼 컨트롤', '내구성이 우수함', '중상급자용 하드 히팅에 적합'],
      recommended: ['컨트롤과 스핀 중심의 플레이 스타일', '강한 스트로크로 공격하는 플레이어', '중급자 및 상급자', '정확한 샷 배치를 중요시하는 분'],
      image: '/placeholder.svg?height=300&width=300',
      examples: ['바볼랏 RPM 블라스트', '소링크 투어바이트', '폴리스타 스트라이크'],
      color: '#ef4444',
    },
    {
      id: 3,
      title: '밸런스형 스트링',
      description: '파워와 컨트롤의 균형 잡힌 성능',
      features: ['파워와 컨트롤의 균형', '중간 정도의 타구감', '다양한 플레이 스타일에 적합', '하이브리드 구성으로 활용 가능'],
      recommended: ['올라운드 플레이 스타일', '다양한 샷을 구사하는 플레이어', '파워와 컨트롤 모두 중요시하는 분', '모든 수준의 플레이어'],
      image: '/placeholder.svg?height=300&width=300',
      examples: ['루키론 프로 스트링', '윌슨 레볼루션', '테크니파이버 멀티필'],
      color: '#fbbf24',
    },
  ];

  // 서비스 가격 정보
  const pricingInfo = [
    {
      service: '스트링 장착 (스트링 미포함)',
      price: 15000,
      description: '자신의 스트링 또는 별도 구매한 스트링 장착 서비스',
    },
    {
      service: '스트링 장착 (스트링 포함)',
      price: 35000,
      description: '도깨비 테니스 아카데미의 추천 스트링 포함 가격',
    },
    {
      service: '하이브리드 장착',
      price: 20000,
      description: '메인과 크로스에 서로 다른 스트링 조합 장착 (스트링 미포함)',
    },
    {
      service: '급행 서비스',
      price: 5000,
      description: '당일 완료 서비스 (1시간 이내, 예약자에 한함)',
    },
  ];

  // 추가 서비스 정보
  const additionalServices = [
    {
      title: '장력 추천 서비스',
      description: '플레이 스타일과 라켓에 맞는 최적의 장력을 추천해 드립니다.',
      free: true,
    },
    {
      title: '스트링 추천 서비스',
      description: '개인의 플레이 스타일에 맞는 최적의 스트링과 장력 조합을 추천해 드립니다.',
      free: true,
    },
    {
      title: '라켓 그립 교체',
      description: '새로운 베이스 그립 또는 오버그립 교체 서비스입니다.',
      free: false,
      price: 5000,
    },
  ];

  return (
    <div className="flex flex-col gap-16 py-8">
      {/* Hero 섹션 */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[#3b82f6]/80 to-[#3b82f6]/20">
          <div className="absolute inset-0 bg-[url('/placeholder.svg?height=600&width=1200')] bg-cover bg-center mix-blend-overlay opacity-30"></div>
        </div>
        <div className="container relative z-10 flex flex-col items-center justify-center py-24 text-center text-[#ffffff]">
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">스트링 장착 서비스</h1>
          <p className="mb-8 max-w-2xl text-xl sm:text-2xl">라켓 성능을 극대화하는 전문 스트링 서비스</p>
          <Button size="lg" asChild>
            <Link href="#booking">지금 예약하기</Link>
          </Button>
        </div>
      </section>

      {/* 서비스 소개 섹션 */}
      <section className="container" id="string-types">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold">스트링 종류 안내</h2>
          <p className="mx-auto max-w-2xl text-[#64748b] dark:text-[#94a3b8]">플레이 스타일과 경기력 향상을 위한 다양한 특성의 스트링을 제공합니다. 자신에게 맞는 최적의 스트링을 선택해보세요.</p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {stringTypes.map((type) => (
            <Card key={type.id} className="overflow-hidden border-t-4" style={{ borderTopColor: type.color }}>
              <div className="p-6 flex justify-center">
                <Image src={type.image || '/placeholder.svg'} alt={type.title} width={150} height={150} className="h-32 w-32 object-cover" />
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">{type.title}</CardTitle>
                <CardDescription>{type.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="mb-2 font-medium">주요 특징</h4>
                  <ul className="space-y-1">
                    {type.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="mr-2 h-4 w-4 shrink-0 text-[#3b82f6]" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="mb-2 font-medium">추천 대상</h4>
                  <ul className="space-y-1">
                    {type.recommended.map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <svg className="mr-2 h-4 w-4 shrink-0 text-[#3b82f6]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg bg-[#f1f5f9] p-4 dark:bg-[#1e293b]">
                  <h4 className="mb-2 font-medium">대표 제품</h4>
                  <div className="flex flex-wrap gap-2">
                    {type.examples.map((example, index) => (
                      <Badge key={index} variant="secondary">
                        {example}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 가격 안내 섹션 */}
      <section className="bg-[#f8fafc] py-16 dark:bg-[#0f172a]/60" id="pricing">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold">가격 안내</h2>
            <p className="mx-auto max-w-2xl text-[#64748b] dark:text-[#94a3b8]">합리적인 가격으로 최고의 스트링 장착 서비스를 제공합니다. 다양한 옵션 중 필요한 서비스를 선택하세요.</p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {pricingInfo.map((item, index) => (
              <Card key={index} className="flex flex-col justify-between">
                <CardHeader>
                  <CardTitle>{item.service}</CardTitle>
                  <div className="mt-2 text-3xl font-bold text-[#3b82f6]">{item.price.toLocaleString()}원</div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[#64748b] dark:text-[#94a3b8]">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 rounded-xl bg-[#ffffff] p-6 shadow-md dark:bg-[#1e293b]">
            <h3 className="mb-4 text-xl font-bold">할인 혜택</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <CheckCircle className="mr-2 h-5 w-5 shrink-0 text-[#3b82f6]" />
                <div>
                  <span className="font-medium">회원 할인</span>
                  <p className="text-sm text-[#64748b] dark:text-[#94a3b8]">도깨비 테니스 아카데미 회원은 모든 스트링 장착 서비스 10% 할인</p>
                </div>
              </li>
              <li className="flex items-start">
                <CheckCircle className="mr-2 h-5 w-5 shrink-0 text-[#3b82f6]" />
                <div>
                  <span className="font-medium">재장착 할인</span>
                  <p className="text-sm text-[#64748b] dark:text-[#94a3b8]">30일 이내 재장착 시 5,000원 할인</p>
                </div>
              </li>
              <li className="flex items-start">
                <CheckCircle className="mr-2 h-5 w-5 shrink-0 text-[#3b82f6]" />
                <div>
                  <span className="font-medium">패키지 할인</span>
                  <p className="text-sm text-[#64748b] dark:text-[#94a3b8]">3개 이상 라켓 동시 장착 시 라켓당 2,000원 할인</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="mt-12">
            <h3 className="mb-6 text-xl font-bold">추가 서비스</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {additionalServices.map((service, index) => (
                <div key={index} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-medium">{service.title}</h4>
                    {service.free ? (
                      <Badge variant="outline" className="bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                        무료 서비스
                      </Badge>
                    ) : (
                      <span className="font-bold text-[#3b82f6]">{(service.price ?? 0).toLocaleString()}원</span>
                    )}
                  </div>
                  <p className="text-sm text-[#64748b] dark:text-[#94a3b8]">{service.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 장착 과정 섹션 */}
      <section className="container">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold">전문적인 스트링 장착 과정</h2>
          <p className="mx-auto max-w-2xl text-[#64748b] dark:text-[#94a3b8]">도깨비 테니스 아카데미는 세심한 과정을 통해 최고 품질의 스트링 장착 서비스를 제공합니다.</p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#3b82f6] text-2xl font-bold text-white">1</div>
            <h3 className="mb-2 text-xl font-bold">라켓 상태 점검</h3>
            <p className="text-[#64748b] dark:text-[#94a3b8]">라켓 프레임과 그로밋의 상태를 세심하게 점검합니다.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#3b82f6] text-2xl font-bold text-white">2</div>
            <h3 className="mb-2 text-xl font-bold">정밀 스트링 제거</h3>
            <p className="text-[#64748b] dark:text-[#94a3b8]">라켓에 손상이 가지 않도록 기존 스트링을 조심스럽게 제거합니다.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#3b82f6] text-2xl font-bold text-white">3</div>
            <h3 className="mb-2 text-xl font-bold">정확한 장력 설정</h3>
            <p className="text-[#64748b] dark:text-[#94a3b8]">디지털 전자식 스트링머신으로 정확한 장력을 설정하고 장착합니다.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#3b82f6] text-2xl font-bold text-white">4</div>
            <h3 className="mb-2 text-xl font-bold">품질 확인 및 마무리</h3>
            <p className="text-[#64748b] dark:text-[#94a3b8]">장착 후 텐션과 패턴을 확인하고 완벽한 상태로 마무리합니다.</p>
          </div>
        </div>
      </section>

      {/* 예약 안내 섹션 */}
      <section className="bg-[#3b82f6] py-16" id="booking">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-xl bg-[#ffffff] p-8 text-center shadow-lg dark:bg-[#0f172a]">
            <h2 className="mb-4 text-3xl font-bold">예약 안내</h2>
            <p className="mb-6 text-lg">
              스트링 장착 서비스는 예약제로 운영됩니다.
              <br />
              아래 방법을 통해 편리하게 예약해 주세요.
            </p>

            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-lg border p-6">
                <div className="mb-4 flex items-center justify-center">
                  <PhoneCall className="h-10 w-10 text-[#3b82f6]" />
                </div>
                <h3 className="mb-2 text-xl font-bold">전화 예약</h3>
                <p className="mb-4 text-[#64748b] dark:text-[#94a3b8]">가장 빠른 예약은 전화로 문의해 주세요.</p>
                <div className="text-2xl font-bold text-[#3b82f6]">02-123-4567</div>
                <p className="mt-2 text-sm text-[#64748b] dark:text-[#94a3b8]">운영 시간: 평일 09:00 - 18:00, 토요일 09:00 - 12:00</p>
              </div>

              <div className="rounded-lg border p-6">
                <div className="mb-4 flex items-center justify-center">
                  <Calendar className="h-10 w-10 text-[#3b82f6]" />
                </div>
                <h3 className="mb-2 text-xl font-bold">온라인 신청</h3>
                <p className="mb-4 text-[#64748b] dark:text-[#94a3b8]">스트링 교체 신청서를 통해 예약 요청을 남겨주세요.</p>
                <Button className="w-full" asChild>
                  <Link href="/services/apply">교체 신청하러 가기</Link>
                </Button>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              <h3 className="text-xl font-bold">알아두세요</h3>
              <div className="rounded-lg bg-[#f8fafc] p-4 text-left dark:bg-[#1e293b]">
                <ul className="space-y-2 text-[#64748b] dark:text-[#94a3b8]">
                  <li className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 shrink-0 text-[#3b82f6]" />
                    <span>예약 시간 10분 전에 도착해 주시면 원활한 서비스 진행이 가능합니다.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 shrink-0 text-[#3b82f6]" />
                    <span>일반적인 스트링 장착은 30분~1시간 정도 소요됩니다.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 shrink-0 text-[#3b82f6]" />
                    <span>급행 서비스는 사전 예약 시에만 가능합니다.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button variant="outline" className="border-[#3b82f6] text-[#3b82f6] hover:bg-[#3b82f6] hover:text-[#ffffff]" asChild>
                <Link href="/board/qna">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  자주 묻는 질문
                </Link>
              </Button>
              <Button asChild>
                <Link href="/products">테니스 스트링 쇼핑하기</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 고객 후기 섹션 */}
      <section className="container pb-16">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold">고객 후기</h2>
          <p className="mx-auto max-w-2xl text-[#64748b] dark:text-[#94a3b8]">도깨비 테니스 아카데미 스트링 서비스를 경험한 고객들의 생생한 후기입니다.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="mb-4 flex">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="h-5 w-5 fill-[#fbbf24] text-[#fbbf24]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                ))}
              </div>
              <p className="mb-4">"프로 수준의 정확한 장력과 세심한 작업으로 스트링 장착해주셔서 경기력이 크게 향상되었습니다. 특히 스핀이 잘 걸리는 스트링 추천에 매우 만족합니다."</p>
              <div className="text-right text-sm font-medium">김테니스 - 동호회 선수</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="mb-4 flex">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="h-5 w-5 fill-[#fbbf24] text-[#fbbf24]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                ))}
              </div>
              <p className="mb-4">"테니스를 시작한 지 얼마 안 된 초보자였는데, 친절하게 스트링과 장력에 대해 상세히 설명해주셨어요. 덕분에 테니스에 더 재미를 붙이게 되었습니다!"</p>
              <div className="text-right text-sm font-medium">박초보 - 아카데미 회원</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="mb-4 flex">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="h-5 w-5 fill-[#fbbf24] text-[#fbbf24]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                ))}
              </div>
              <p className="mb-4">"하이브리드 조합을 추천받아 사용해봤는데, 정말 제 플레이 스타일에 딱 맞았습니다. 장착 후 실력이 눈에 띄게 향상되어 대회에서도 좋은 성적을 거둘 수 있었습니다. 다음에도 꼭 이용하겠습니다."</p>
              <div className="text-right text-sm font-medium">이프로 - 대회 참가자</div>
            </CardContent>
          </Card>
        </div>
        <div className="mt-10 flex justify-center">
          <Button size="lg" asChild>
            <Link href="/reviews/write?type=academy">리뷰 작성하기</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
