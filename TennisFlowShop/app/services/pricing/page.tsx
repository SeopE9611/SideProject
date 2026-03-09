import { getStringingPricingView } from '@/app/services/_lib/stringingPricingView';
import HeroCourtBackdrop from '@/components/system/HeroCourtBackdrop';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COURIER_PICKUP_FEE, CUSTOM_STRING_MOUNTING_FEE, STRINGING_POLICY_TEXT } from '@/lib/stringing-pricing-policy';
import { Check, Clock, Shield, Truck, Wrench, Zap } from 'lucide-react';
import Link from 'next/link';

const won = (n: number | null) => (n == null ? '데이터 없음' : `${n.toLocaleString('ko-KR')}원`);

export default async function PricingPage() {
  const { primarySummaries, otherSummary, hybridGuide } = await getStringingPricingView();

  const basicServices = [
    {
      name: '보유/커스텀 스트링 장착',
      price: `${CUSTOM_STRING_MOUNTING_FEE.toLocaleString('ko-KR')}원`,
      time: '30-45분',
      description: '보유한 스트링 또는 직접 입력 스트링 기준 장착비입니다.',
      features: ['교체비 고정', '스트링 금액 별도', '장력/세팅 상담 가능'],
    },
    {
      name: '스트링 상품 선택 장착',
      price: '상품별 상이',
      time: '30-60분',
      description: '선택한 상품의 상품별 장착비를 기준으로 교체비가 계산됩니다.',
      features: ['상품별 장착비 적용', '주문/대여 연계 시 기존 결제내역 우선', '최종 결제 금액은 신청 방식에 따라 상이'],
    },
    {
      name: '패키지 적용 신청',
      price: '교체비 0원',
      time: '30-60분',
      description: '사용 가능한 패키지 횟수가 있으면 교체비를 0원으로 처리합니다.',
      features: ['패키지 잔여 횟수 기준', '적용 불가 시 일반 정책으로 계산', '수거비는 별도 후정산 가능'],
    },
  ];

  const additionalServices = [
    { name: '장력 추천', policy: '무료 안내', description: '라켓/플레이 스타일 기준으로 권장 장력을 안내합니다.' },
    { name: '스트링 추천', policy: '무료 안내', description: '선호 타구감에 맞는 스트링 후보를 안내합니다.' },
    { name: '라켓 상태 점검', policy: '무료 점검', description: '프레임/그로밋 상태를 점검하고 교체 필요 여부를 안내합니다.' },
    { name: '그립 교체', policy: '별도 문의', description: '부자재/재고/작업 범위에 따라 비용이 달라질 수 있습니다.' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <HeroCourtBackdrop opacity="soft" className="h-full w-full text-primary" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-8 md:space-y-12">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4 md:mb-6">
            <Wrench className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-primary">장착 서비스 정책</span>
          </div>
          <h1 className="text-4xl font-bold mb-3">장착 비용 안내</h1>
          <p className="text-muted-foreground">실제 정산 정책 기준으로 요금을 안내합니다.</p>
        </div>

        <section>
          <h2 className="text-2xl font-bold mb-4 md:mb-6 text-center">장착 서비스 요금 안내</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {basicServices.map((service) => (
              <Card key={service.name}>
                <CardHeader className="text-center">
                  <CardTitle>{service.name}</CardTitle>
                  <div className="text-2xl font-bold text-primary">{service.price}</div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4" /> 소요시간: {service.time}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                  <ul className="space-y-1">
                    {service.features.map((feature) => (
                      <li key={feature} className="text-sm flex items-center gap-2">
                        <Check className="h-4 w-4 text-success" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="mt-5 bg-muted/30">
            <CardContent className="p-4 text-sm text-muted-foreground space-y-1">
              <p>• {STRINGING_POLICY_TEXT.product}</p>
              <p>• {STRINGING_POLICY_TEXT.package}</p>
              <p>• {STRINGING_POLICY_TEXT.courier}</p>
              <p>• {STRINGING_POLICY_TEXT.dynamic}</p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 md:mb-6 text-center">스트링 가격대별 안내</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {primarySummaries.map((category) => (
              <Card key={category.key}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    {category.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {category.count === 0 ? (
                    <p className="text-muted-foreground">현재 등록된 상품 데이터가 없습니다.</p>
                  ) : (
                    // <>
                    //   <p>상품가 범위: <b>{won(category.minPrice)}</b> ~ <b>{won(category.maxPrice)}</b></p>
                    //   <p>장착비 범위: <b>{won(category.minMountingFee)}</b> ~ <b>{won(category.maxMountingFee)}</b></p>
                    //   <p className="text-muted-foreground">대표 브랜드: {category.brands.length ? category.brands.join(', ') : '데이터 없음'}</p>
                    //   <p className="text-muted-foreground">대표 상품: {category.productNames.length ? category.productNames.join(', ') : '데이터 없음'}</p>
                    // </>
                    <>
                      <p>
                        상품가 범위: <b>0원</b> ~ <b>0원</b>
                      </p>
                      <p>
                        장착비 범위: <b>0원</b> ~ <b>0원</b>
                      </p>
                      <p className="text-muted-foreground">대표 브랜드: {category.brands.length ? category.brands.join(', ') : '데이터 없음'}</p>
                      <p className="text-muted-foreground">대표 상품: {category.productNames.length ? category.productNames.join(', ') : '데이터 없음'}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {otherSummary?.count ? (
            <Card className="mt-5 border-dashed">
              <CardHeader>
                <CardTitle className="text-base">{otherSummary.label} (보조 분류)</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                상품가 <b>{won(otherSummary.minPrice)}</b> ~ <b>{won(otherSummary.maxPrice)}</b> / 장착비 <b>{won(otherSummary.minMountingFee)}</b> ~ <b>{won(otherSummary.maxMountingFee)}</b>
              </CardContent>
            </Card>
          ) : null}
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 md:mb-6 text-center">하이브리드 조합 안내</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                하이브리드는 조합 방식으로 안내합니다
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">하이브리드는 단일 재질이 아닌 메인/크로스 스트링의 조합 방식입니다. 가격 비교는 단일 재질(폴리에스터, 인조쉽/멀티필라멘트, 내추럴 거트)을 먼저 확인해 주세요.</p>
              <p>
                등록된 하이브리드 상품 수: <b>{hybridGuide.count.toLocaleString('ko-KR')}개</b>
              </p>
              <p className="text-muted-foreground">대표 조합 표기: {hybridGuide.representativeMaterials.length ? hybridGuide.representativeMaterials.join(', ') : '데이터 없음'}</p>
              <p className="text-muted-foreground">대표 상품: {hybridGuide.representativeProducts.length ? hybridGuide.representativeProducts.join(', ') : '데이터 없음'}</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>추가 서비스 / 무료 지원</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {additionalServices.map((service) => (
                <div key={service.name} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{service.name}</p>
                    <Badge variant="secondary">{service.policy}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                예약 / 수거 / 방문 정책
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <p>• 매장 방문 / 자가 발송 / 기사 방문 수거 중 선택 가능합니다.</p>
              <p>• 기사 방문 수거는 {COURIER_PICKUP_FEE.toLocaleString('ko-KR')}원이 별도로 후정산됩니다.</p>
              <p>• 일반 소요 시간은 30~60분이며, 예약 상황에 따라 달라질 수 있습니다.</p>
              <p>• 스트링 교체는 예약제 운영이므로 신청서 또는 문의 후 방문해 주세요.</p>
            </CardContent>
          </Card>
        </section>

        <Card className="bg-muted/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              주의사항 / FAQ
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• 스트링 포함 가격은 고정값이 아니며 선택 상품과 신청 방식에 따라 달라집니다.</p>
            <p>• 패키지 적용 가능 시 교체비는 0원 처리됩니다.</p>
            <p>• 주문/대여 기반 신청은 이미 결제된 내역과 이번 신청의 별도 결제 항목을 구분해 안내됩니다.</p>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button asChild size="lg">
            <Link href="/services">장착 서비스 예약하러 가기</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
