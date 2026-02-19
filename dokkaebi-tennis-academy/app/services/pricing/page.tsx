import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Clock, Star, Wrench, Zap, Shield } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  const basicServices = [
    {
      name: '스트링 장착 (스트링 미포함)',
      price: '12,000원',
      time: '30-45분',
      description: '자신의 스트링 또는 별도 구매한 스트링 장착 서비스',
      features: ['정밀한 텐션 설정', '장착 후 점검', '1개월 A/S'],
    },
    {
      name: '스트링 장착 (스트링 포함)',
      price: '35,000원',
      time: '30-45분',
      description: '도깨비 테니스의 추천 스트링 포함 가격',
      features: ['추천 스트링 포함', '맞춤 텐션 설정', '플레이 스타일 분석', '3개월 A/S'],
      popular: true,
    },
    {
      name: '하이브리드 장착',
      price: '13,000원',
      time: '45-60분',
      description: '메인과 크로스에 서로 다른 스트링 조합 장착 (스트링 미포함)',
      features: ['전문 하이브리드 세팅', '정밀 텐션 측정', '장착 후 상세 점검', '1개월 A/S'],
    },
  ];

  const stringPrices = [
    {
      category: '폴리에스터',
      ranges: [
        { name: '엔트리', price: '15,000 - 25,000원', examples: 'Luxilon ALU Power, Babolat RPM Blast' },
        { name: '미드레인지', price: '25,000 - 35,000원', examples: 'Solinco Hyper-G, Tecnifibre Razor Code' },
        { name: '프리미엄', price: '35,000 - 45,000원', examples: 'Luxilon 4G, Babolat Pro Hurricane Tour' },
      ],
    },
    {
      category: '멀티필라멘트',
      ranges: [
        { name: '엔트리', price: '18,000 - 28,000원', examples: 'Prince Synthetic Gut, Wilson NXT' },
        { name: '미드레인지', price: '28,000 - 38,000원', examples: 'Tecnifibre X-One Biphase, Babolat Xcel' },
        { name: '프리미엄', price: '38,000 - 50,000원', examples: 'Wilson NXT Tour, Prince Premier Touch' },
      ],
    },
    {
      category: '하이브리드',
      ranges: [
        { name: '스탠다드', price: '30,000 - 45,000원', examples: '폴리 + 멀티 조합' },
        { name: '프리미엄', price: '45,000 - 60,000원', examples: '고급 폴리 + 프리미엄 멀티' },
      ],
    },
    {
      category: '내추럴 거트',
      ranges: [
        { name: '스탠다드', price: '80,000 - 120,000원', examples: 'Wilson Natural Gut' },
        { name: '프리미엄', price: '120,000 - 180,000원', examples: 'Babolat VS Touch, Luxilon Natural Gut' },
      ],
    },
  ];

  const additionalServices = [
    {
      name: '장력 추천 서비스',
      price: '무료',
      time: '10분',
      description: '플레이 스타일과 라켓에 맞는 최적의 장력 추천',
    },
    {
      name: '스트링 추천 서비스',
      price: '무료',
      time: '15분',
      description: '개인의 플레이 스타일에 맞는 최적의 스트링 추천',
    },
    {
      name: '라켓 그립 교체',
      price: '5,000원',
      time: '15분',
      description: '새로운 베이스 그립 또는 오버그립 교체 서비스',
    },
    { name: '라켓 상태 점검', price: '무료', time: '10분', description: '라켓 프레임과 그로밋 상태 점검' },
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
          <div className="inline-flex items-center gap-2 bg-accent dark:bg-primary px-4 py-2 rounded-full mb-6">
            <Wrench className="h-5 w-5 text-primary dark:text-primary" />
            <span className="text-sm font-semibold text-primary dark:text-primary">장착 서비스 요금</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground dark:text-foreground mb-4">장착 비용 안내</h1>
          <p className="text-lg text-muted-foreground dark:text-muted-foreground max-w-2xl mx-auto">투명하고 합리적인 가격으로 최고의 스트링 장착 서비스를 제공합니다</p>
        </div>

        {/* Service Plans */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-foreground dark:text-foreground mb-8 text-center">장착 서비스 요금</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {basicServices.map((service, index) => (
              <Card key={index} className={`relative hover:shadow-lg transition-all duration-300 ${service.popular ? 'ring-2 ring-ring dark:ring-ring' : ''}`}>
                {service.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary hover:bg-primary">
                      <Star className="h-3 w-3 mr-1" />
                      인기
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{service.name}</CardTitle>
                  <div className="text-3xl font-bold text-primary dark:text-primary">{service.price}</div>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    소요시간: {service.time}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground dark:text-muted-foreground mb-4 text-center">{service.description}</p>
                  <ul className="space-y-2">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full mt-6" variant={service.popular ? 'default' : 'outline'}>
                    예약하기
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* String Prices */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-foreground dark:text-foreground mb-8 text-center">스트링 가격대별 안내</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {stringPrices.map((category, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary dark:text-primary" />
                    {category.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {category.ranges.map((range, i) => (
                      <div key={i} className="border-l-4 border-border dark:border-border pl-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-foreground dark:text-foreground">{range.name}</span>
                          <Badge variant="secondary">{range.price}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground">{range.examples}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Additional Services */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-foreground dark:text-foreground mb-8 text-center">추가 서비스</h2>
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {additionalServices.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-background dark:bg-card rounded-lg">
                    <div>
                      <div className="font-semibold text-foreground dark:text-foreground">{service.name}</div>
                      <div className="text-sm text-muted-foreground dark:text-muted-foreground">{service.time}</div>
                      <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-2">{service.description}</p>
                    </div>
                    <div className="font-bold text-primary dark:text-primary">{service.price}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="bg-primary  to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border-border dark:border-border">
          <CardContent className="p-8 text-center">
            <Zap className="h-12 w-12 text-primary dark:text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-foreground dark:text-foreground mb-4">지금 예약하고 최고의 서비스를 경험하세요</h3>
            <p className="text-muted-foreground dark:text-muted-foreground mb-6 max-w-2xl mx-auto">전문가가 직접 장착하는 프리미엄 서비스를 합리적인 가격에 만나보세요</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/services">장착 서비스 예약</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/services/locations">매장 찾기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
