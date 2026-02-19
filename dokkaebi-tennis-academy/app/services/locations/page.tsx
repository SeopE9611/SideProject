import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Phone, Calendar, Car, Train, Star } from 'lucide-react';
import Link from 'next/link';

export default function LocationsPage() {
  const locations = [
    {
      name: '도깨비 테니스',
      address: '서울 동작구 노량진로 22 B1',
      phone: '0507-1392-3493',
      email: 'info@dokkaebi-tennis.com',
      hours: {
        weekday: '10:00 - 22:00',
        weekend: '09:00 - 18:00',
        holiday: '휴무',
      },
      services: ['스트링 장착', '텐션 가이드', '스트링 추천', '라켓 상담'],
      parking: '무료 주차 가능',
      transport: ['대방역 2번출구'],
      isMain: true,
      specialNote: '매장에 방문하시면 친절하게 상담해드립니다.',
    },
  ];

  const reservationSteps = [
    {
      step: 1,
      title: '서비스 선택',
      description: '스트링 장착 서비스를 선택하세요',
    },
    {
      step: 2,
      title: '날짜/시간 선택',
      description: '편리한 시간을 예약하세요',
    },
    {
      step: 3,
      title: '상담 및 확인',
      description: '전화 또는 방문 상담을 받으세요',
    },
    {
      step: 4,
      title: '서비스 완료',
      description: '전문적인 스트링 장착을 받으세요',
    },
  ];

  return (
    <div className="min-h-screen bg-background from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Tennis court line pattern background */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 50h100M50 0v100M20 20h60M20 80h60M20 20v60M80 20v60' stroke='%23334155' strokeWidth='1' fill='none'/%3E%3C/svg%3E")`,
          backgroundSize: '100px 100px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-accent dark:bg-blue-900/30 px-4 py-2 rounded-full mb-6">
            <MapPin className="h-5 w-5 text-primary dark:text-blue-400" />
            <span className="text-sm font-semibold text-primary dark:text-blue-300">오프라인 매장 찾기</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-foreground mb-4">매장 위치 안내</h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">가까운 매장을 찾아 편리하게 서비스를 이용하세요</p>
        </div>

        {/* Locations */}
        <div className="mb-16">
          <div className="max-w-2xl mx-auto">
            {locations.map((location, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300 ring-2 ring-blue-500 dark:ring-blue-400">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold">{location.name}</h3>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-slate-500 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{location.address}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                    <span className="text-sm font-mono">{location.phone}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                      <span className="text-sm font-semibold">운영시간</span>
                    </div>
                    <div className="ml-6 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      <div>평일: {location.hours.weekday}</div>
                      <div>토요일: {location.hours.weekend}</div>
                      <div>일요일/공휴일: {location.hours.holiday}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                      <span className="text-sm font-semibold">주차</span>
                    </div>
                    <div className="ml-6 text-sm text-slate-600 dark:text-slate-400">{location.parking}</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Train className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                      <span className="text-sm font-semibold">교통</span>
                    </div>
                    <div className="ml-6 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      {location.transport.map((info, i) => (
                        <div key={i}>{info}</div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-accent dark:bg-blue-900/20 p-3 rounded-lg">
                    <p className="text-sm font-medium text-primary dark:text-blue-300">{location.specialNote}</p>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {location.services.map((service, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>

                  <Button className="w-full" asChild>
                    <Link href="https://map.naver.com/p/entry/place/1907032343?c=15.00,0,0,0,dh&placePath=/home?from=map&fromPanelNum=1&additionalHeight=76&timestamp=202601042339&locale=ko&svcName=map_pcv5">네이버 지도 검색</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-foreground mb-8 text-center">예약 절차</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {reservationSteps.map((step, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary text-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">{step.step}</div>
                  <h3 className="font-semibold text-slate-900 dark:text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div> */}

        {/* <Card className="bg-primary  to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border-border dark:border-blue-800">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-foreground mb-4">예약 및 상담</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-primary dark:text-blue-400" />
                    <div>
                      <div className="font-semibold">전화 예약</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">02-123-4567</div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">평일 09:00-18:00, 토요일 09:00-12:00</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary dark:text-blue-400" />
                    <div>
                      <div className="font-semibold">온라인 신청</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">스트링 교체 신청서 작성</div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-foreground mb-4">서비스 특징</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    전문가 직접 서비스
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    무료 텐션 및 스트링 상담
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    정밀한 디지털 스트링머신 사용
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Button size="lg" asChild>
                <Link href="/services">스트링 장착 예약</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="tel:02-123-4567">전화 상담</Link>
              </Button>
            </div>
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
}
