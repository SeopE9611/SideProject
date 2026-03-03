'use client';

import UnifiedPackageCard from '@/app/services/packages/_components/UnifiedPackageCard';
import { normalizePackageCardData, type PackageCardData } from '@/app/services/packages/_lib/packageCard';
import { type PackageVariant, getPackageVariantByIndex, toPackageVariant } from '@/app/services/packages/_lib/packageVariant';
import SiteContainer from '@/components/layout/SiteContainer';
import HeroCourtBackdrop from '@/components/system/HeroCourtBackdrop';
import { FullPageSpinner } from '@/components/system/PageLoading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { packagesBadgeVariant } from '@/lib/badge-style';
import { ArrowRight, Award, Calendar, Clock, Gift, MessageSquare, Package, Percent, Phone, Shield, Star, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// 하드코딩 값(임시)
const STATIC_PACKAGES: PackageCardData[] = [
  {
    id: '10-sessions',
    title: '스타터 패키지',
    sessions: 10,
    price: 100000,
    originalPrice: 120000,
    discount: 17,
    features: ['10회 스트링 교체', '무료 장력 상담', '기본 스트링 포함'],
    benefits: ['2만원 절약'],
    variant: 'primary' as PackageVariant,
    description: '테니스를 시작하는 분들에게 적합한 기본 패키지',
    validityPeriod: '3개월',
    popular: false,
  },
  {
    id: '30-sessions',
    title: '레귤러 패키지',
    sessions: 30,
    price: 300000,
    originalPrice: 360000,
    discount: 17,
    popular: true,
    features: ['30회 스트링 교체', '무료 장력 상담', '프리미엄 스트링 선택', '우선 예약'],
    benefits: ['6만원 절약', '우선 예약 혜택'],
    variant: 'accent' as PackageVariant,
    description: '정기적으로 테니스를 즐기는 분들을 위한 인기 패키지',
    validityPeriod: '6개월',
  },
  {
    id: '50-sessions',
    title: '프로 패키지',
    sessions: 50,
    price: 500000,
    originalPrice: 600000,
    discount: 17,
    features: ['50회 스트링 교체', '무료 장력 상담', '프리미엄 스트링 선택', '우선 예약', '무료 그립 교체 5회'],
    benefits: ['10만원 절약', '그립 교체 혜택'],
    variant: 'primary' as PackageVariant,
    description: '진지한 테니스 플레이어를 위한 프리미엄 패키지',
    validityPeriod: '9개월',
    popular: false,
  },
  {
    id: '100-sessions',
    title: '챔피언 패키지',
    sessions: 100,
    price: 1000000,
    originalPrice: 1200000,
    discount: 17,
    features: ['100회 스트링 교체', '무료 장력 상담', '프리미엄 스트링 선택', '우선 예약', '무료 그립 교체 10회'],
    benefits: ['20만원 절약', '전용 서비스'],
    variant: 'primary' as PackageVariant,
    description: '프로 선수와 열정적인 플레이어를 위한 최고급 패키지',
    validityPeriod: '12개월',
    popular: false,
  },
].map((pkg) => normalizePackageCardData(pkg));

export default function StringPackagesPage() {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const packagesSectionRef = useRef<HTMLElement | null>(null);

  // 처음에는 비어있는 상태 + 로딩 중
  const [packages, setPackages] = useState<PackageCardData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [ownershipBlockedMessage, setOwnershipBlockedMessage] = useState<string | null>(null);
  const cardBlockedHelperText = '기존 패키지 이용 종료 후 다시 구매할 수 있습니다.';

  useEffect(() => {
    let mounted = true;

    const fetchPackages = async () => {
      try {
        const res = await fetch('/api/packages/settings', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
          console.error('패키지 설정 조회 실패', await res.text());
          // 실패 시: 기본 STATIC_PACKAGES로 대체
          if (mounted) {
            setPackages(STATIC_PACKAGES);
          }
          return;
        }

        const data = await res.json();
        if (!mounted) return;

        const serverPackages = Array.isArray(data.packages) ? data.packages : [];

        if (!serverPackages.length) {
          // 서버 설정이 없으면 기본값 사용
          setPackages(STATIC_PACKAGES);
          return;
        }

        const mapped: PackageCardData[] = serverPackages.map((pkg: any, index: number) => {
          const sessions = Number(pkg.sessions || 0);
          const price = Number(pkg.price || 0);
          const originalPrice = Number(pkg.originalPrice != null ? pkg.originalPrice : pkg.price || 0);

          const variant = toPackageVariant(pkg.variant, pkg.isPopular ? 'accent' : getPackageVariantByIndex(index));
          return normalizePackageCardData({
            id: pkg.id || `package-${index + 1}`,
            title: pkg.name || `${sessions}회 패키지`,
            sessions,
            price,
            originalPrice,
            popular: !!pkg.isPopular,
            features: Array.isArray(pkg.features) ? pkg.features : [],
            benefits: [],
            variant,
            description: pkg.description || '',
            validityPeriod: pkg.validityDays,
          });
        });

        setPackages(mapped);
      } catch (error) {
        console.error('패키지 안내용 설정 조회 중 오류', error);
        if (mounted) {
          setPackages(STATIC_PACKAGES);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPackages();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchOwnership = async () => {
      try {
        const res = await fetch('/api/packages/ownership', { cache: 'no-store', credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data?.hasBlockingPackage) {
          setOwnershipBlockedMessage(data?.message ?? '이미 보유 중인 패키지가 있어 추가 구매할 수 없습니다.');
          return;
        }
        setOwnershipBlockedMessage(null);
      } catch {
        // UX 보조용 조회 실패는 무시 (최종 차단은 서버)
      }
    };

    fetchOwnership();
    return () => {
      cancelled = true;
    };
  }, []);

  const additionalBenefits: Array<{ icon: React.ReactNode; title: string; description: string }> = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: '품질 보장',
      description: '모든 스트링 교체에 대해 완벽한 품질을 보장합니다.',
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: '빠른 서비스',
      description: '평균 30분 내 스트링 교체 완료',
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: '전문가 상담',
      description: '전문가가 직접 상담해드립니다.',
    },
    {
      icon: <Gift className="h-6 w-6" />,
      title: '추가 혜택',
      description: '패키지 구매 시 다양한 부가 서비스 제공',
    },
  ];

  // 처음 진입 시 쿼리로 스크롤 트리거
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const shouldScroll = searchParams.get('target') === 'packages';
    if (!shouldScroll) return;

    // 첫 페인트 이후로 살짝 지연 → 레이아웃/이미지 로딩 후 부드럽게
    const id = window.setTimeout(() => {
      packagesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // (선택) URL을 깔끔히: 해시로 교체해서 공유/북마크 친화적
      const url = new URL(window.location.href);
      url.searchParams.delete('target');
      url.hash = 'packages';
      window.history.replaceState(null, '', url.toString());
    }, 0);

    return () => window.clearTimeout(id);
  }, [searchParams]);

  if (isLoading && packages.length === 0) {
    return <FullPageSpinner label="패키지 목록 불러오는 중..." />;
  }
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-[70svh] md:min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-muted/30 dark:bg-muted/20">
          <HeroCourtBackdrop className="h-full w-full text-primary opacity-[0.10] dark:opacity-[0.12]" />
          <div className="absolute inset-0 bg-overlay/20"></div>
        </div>

        <SiteContainer variant="wide" className="relative z-10 text-center text-foreground">
          <div className="max-w-4xl mx-auto">
            <Badge variant={packagesBadgeVariant('hero')} className="mb-6 backdrop-blur-sm">
              <Package className="w-4 h-4 mr-2" />
              프리미엄 스트링 패키지
            </Badge>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 text-foreground">스트링 교체 패키지</h1>

            <p className="text-base sm:text-xl md:text-2xl mb-8 text-muted-foreground leading-relaxed">
              정기적인 스트링 교체로 최상의 경기력을 유지하세요
              <br />
              <span className="text-foreground font-semibold">패키지 구매 시 최대 20만원 절약</span>
            </p>

            <div className="flex flex-wrap justify-center gap-6 mb-10">
              <div className="flex items-center gap-2 bg-card/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Percent className="w-5 h-5 text-success" />
                <span className="text-sm font-medium">최대 17% 할인</span>
              </div>
              <div className="flex items-center gap-2 bg-card/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">최대 12개월 유효</span>
              </div>
              <div className="flex items-center gap-2 bg-card/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Shield className="w-5 h-5 text-foreground" />
                <span className="text-sm font-medium">품질 보장</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="default" className="shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300" asChild>
                <Link href="#packages">
                  <ArrowRight className="w-5 h-5 mr-2" />
                  패키지 선택하기
                </Link>
              </Button>

              <Button size="lg" variant="outline" className="backdrop-blur-sm" asChild>
                <Link href="/services">
                  <Phone className="w-5 h-5 mr-2" />
                  상담 받기
                </Link>
              </Button>
            </div>
          </div>
        </SiteContainer>
      </section>

      {/* Package Cards Section */}
      <section id="packages" ref={packagesSectionRef} className="py-20 bg-background scroll-mt-24">
        <SiteContainer variant="wide">
          <div className="text-center mb-16">
            <Badge variant={packagesBadgeVariant('selection')} className="mb-4">
              <Star className="w-4 h-4 mr-2" />
              맞춤형 패키지 선택
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">스트링 교체 패키지</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              플레이 빈도와 필요에 맞는 패키지를 선택하세요.
              <br />
              모든 패키지는 전문가 상담과 품질 보장이 포함됩니다.
            </p>
            {ownershipBlockedMessage && (
              <p className="mt-6 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">현재 보유 중인 패키지가 있어 추가 구매가 제한됩니다.</p>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-8">
            {packages.map((pkg) => (
              <UnifiedPackageCard
                key={pkg.id}
                pkg={pkg}
                selected={selectedPackage === pkg.id}
                onSelect={() => setSelectedPackage(pkg.id)}
                ctaHref={`/services/packages/checkout?package=${pkg.id}`}
                ctaLabel={ownershipBlockedMessage ? '추가 구매 불가' : '패키지 선택'}
                ctaDisabled={!!ownershipBlockedMessage}
                ctaHelperText={ownershipBlockedMessage ? cardBlockedHelperText : undefined}
              />
            ))}
          </div>
        </SiteContainer>
      </section>

      {/* Additional Benefits Section */}
      <section className="py-20 bg-muted/30 dark:bg-muted/20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-border/10" />

        <SiteContainer variant="wide" className="relative z-10">
          <div className="text-center mb-16">
            <Badge variant={packagesBadgeVariant('benefits')} className="mb-4">
              <Award className="w-4 h-4 mr-2" />
              추가 혜택
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">패키지만의 특별한 혜택</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">단순한 할인을 넘어서는 프리미엄 서비스를 경험하세요.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {additionalBenefits.map((benefit, index) => (
              <div key={index} className="group bg-card/10 backdrop-blur-sm rounded-2xl p-8 border border-border/20 hover:border-border/40 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">{benefit.icon}</div>
                <h3 className="text-xl font-bold text-foreground mb-4 text-center">{benefit.title}</h3>
                <p className="text-muted-foreground text-center leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </SiteContainer>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-background">
        <SiteContainer variant="wide">
          <div className="text-center mb-16">
            <Badge variant={packagesBadgeVariant('faq')} className="mb-4">
              <Zap className="w-4 h-4 mr-2" />
              자주 묻는 질문
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">패키지 이용 안내</h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  question: '패키지 유효기간이 지나면 어떻게 되나요?',
                  answer: '유효기간 만료 전 미사용 횟수는 30일 연장 가능하며, 추가 비용 없이 1회 연장해드립니다.',
                },
                {
                  question: '다른 사람과 패키지를 공유할 수 있나요?',
                  answer: '패키지는 구매자 본인만 사용 가능합니다.',
                },
                {
                  question: '패키지 환불이 가능한가요?',
                  answer: '미사용 횟수에 대해서는 구매일로부터 7일 이내 100% 환불 가능합니다.',
                },
                {
                  question: '패키지 사용은 어떻게 하나요?',
                  answer: '패키지 구매 후 교체 신청서에서 사용 가능합니다. 자세한 문의는 매장으로 연락 주세요.',
                },
              ].map((faq, index) => (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg mb-3 text-primary">Q. {faq.question}</h3>
                    <p className="text-muted-foreground leading-relaxed">A. {faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="text-center mt-12">
            <Button size="lg" variant="default" className="shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300" asChild>
              <Link href="/board/qna">
                <MessageSquare className="w-5 h-5 mr-2" />더 궁금한 점이 있으신가요?
              </Link>
            </Button>
          </div>
        </SiteContainer>
      </section>
    </div>
  );
}
