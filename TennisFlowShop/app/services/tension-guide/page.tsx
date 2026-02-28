'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, ChevronRight, Gauge, Info, Layers, Lightbulb, Settings2, Shield, Sun, Target, Thermometer, TrendingUp, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { type ComponentType, useMemo, useState } from 'react';

type Gender = 'female' | 'male';
type PlayStyle = 'soft' | 'control' | 'spinPower';
type SwingSpeed = 'slow' | 'medium' | 'fast';
type StringType = 'softPoly' | 'controlPoly' | 'spinPoly' | 'syntheticGut' | 'naturalGut';

type TensionRange = {
  min: number;
  max: number;
  base: number;
};

type StringPro =
  | string
  | {
      title: string;
      description: string;
    };

type StringGuide = {
  id: StringType;
  name: string;
  icon: ComponentType<{ className?: string }>;
  characteristics: string;
  pros: StringPro[];
  adjustment: string;
  bestFor: string;
  helperText?: string;
  ranges: {
    female: TensionRange;
    male: TensionRange;
  };
  color: string;
};

export default function TensionGuidePage() {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [gender, setGender] = useState<Gender>('male');
  const [playStyle, setPlayStyle] = useState<PlayStyle>('control');
  const [swingSpeed, setSwingSpeed] = useState<SwingSpeed>('medium');
  const [stringType, setStringType] = useState<StringType>('softPoly');
  const [activeSection, setActiveSection] = useState<string>('calculator');

  // 수준별 가이드는 남/녀 범위를 분리해서 명확히 보여주도록 데이터 구조를 변경합니다.
  const playerTypes = [
    {
      type: '초급자',
      level: 1,
      icon: Users,
      femaleTension: '42~46LB',
      maleTension: '48~52LB',
      femaleRange: [42, 46],
      maleRange: [48, 52],
      description: '컨트롤과 파워의 균형을 맞춘 텐션',
      characteristics: ['파워 증가', '편안한 느낌', '부상 위험 감소', '넓은 스윗스팟'],
      recommended: '기본 세팅은 여자 44LB / 남자 50LB를 기준으로 시작해 보세요',
      color: 'bg-primary/10 dark:bg-primary/20',
    },
    {
      type: '중급자',
      level: 2,
      icon: Target,
      femaleTension: '42~46LB',
      maleTension: '48~52LB',
      femaleRange: [42, 46],
      maleRange: [48, 52],
      description: '컨트롤과 파워의 균형을 맞춘 텐션',
      characteristics: ['균형잡힌 플레이', '적당한 컨트롤', '다양한 샷 구사', '스핀 생성 용이'],
      recommended: '안정적인 경기 운영을 위해 여자 44LB / 남자 50LB를 먼저 테스트해 보세요',
      color: 'bg-primary/10 dark:bg-primary/20',
    },
    {
      type: '상급자',
      level: 3,
      icon: Zap,
      femaleTension: '44~48LB',
      maleTension: '50~54LB',
      femaleRange: [44, 48],
      maleRange: [50, 54],
      description: '경기 운영의 정밀도를 높이기 위한 텐션',
      characteristics: ['정밀한 컨트롤', '강한 스핀', '빠른 스윙 활용', '일관된 타구감'],
      recommended: '강한 스윙을 쓰는 경우 여자 46LB / 남자 52LB 전후가 안정적입니다',
      color: 'bg-primary/10 dark:bg-primary/20',
    },
    {
      type: '프로/투어',
      level: 4,
      icon: TrendingUp,
      femaleTension: '46~50LB',
      maleTension: '52~56LB',
      femaleRange: [46, 50],
      maleRange: [52, 56],
      description: '투어 레벨의 타점 재현성과 정확도를 위한 텐션',
      characteristics: ['최고 컨트롤', '정확한 플레이스먼트', '프로 수준 스핀', '정교한 터치'],
      recommended: '실전 매치 기준으로 여자 48LB / 남자 54LB 세팅부터 미세 조정해 보세요',
      color: 'bg-primary/10 dark:bg-primary/20',
    },
  ];

  const tensionAxis = { min: 42, max: 56 };
  const tensionAxisSpan = tensionAxis.max - tensionAxis.min;

  // 스트링 타입은 요청사항에 맞춰 5개로 재구성하고, 성별별 추천 범위/기준점을 함께 보관합니다.
  const stringTypes: StringGuide[] = [
    {
      id: 'softPoly',
      name: '소프트(폴리)',
      icon: Sun,
      characteristics: '부드러운 타구감과 편안함을 우선하면서도 폴리 특유의 안정감을 원하는 세팅입니다.',
      pros: [
        {
          title: '부상 방지 및 편안함',
          description: '팔과 손목에 전달되는 충격을 줄여 엘보 이슈가 있는 플레이어에게 유리합니다.',
        },
        {
          title: '파워와 반발력 보강',
          description: '스트링 베드가 공을 깊게 받아주어, 동일한 스윙에서도 볼이 더 쉽게 뻗어 나갑니다.',
        },
        {
          title: '부드러운 타구감',
          description: '타구 시 이질감이 덜하고 손에 전해지는 느낌이 편안해 장시간 플레이에도 부담이 적습니다.',
        },
      ],
      adjustment: '팔 부담을 줄이고 싶다면 기준점에서 시작해 1~2LB씩 올려보세요.',
      bestFor: '엘보 이슈가 있거나 편안한 타구감을 중요하게 보는 플레이어',
      helperText: '폴리에스터 공통 권장 범위: 여자 42~48LB / 남자 48~54LB',
      ranges: {
        female: { min: 42, max: 48, base: 42 },
        male: { min: 48, max: 54, base: 48 },
      },
      color: 'bg-primary/10 dark:bg-primary/20',
    },
    {
      id: 'controlPoly',
      name: '컨트롤(폴리)',
      icon: Shield,
      characteristics: '강한 스윙에서도 볼을 안정적으로 잡아 주는 컨트롤 중심 폴리 세팅입니다.',
      pros: [
        {
          title: '높은 정밀도',
          description: '타구 방향과 깊이를 일정하게 유지하기 쉬워 랠리 안정성과 코스 공략에 강점을 보입니다.',
        },
        {
          title: '볼 홀딩(Holding) 능력',
          description: '임팩트 순간 공을 안정적으로 잡아줘 런치각 제어와 타점 재현성이 좋아집니다.',
        },
        {
          title: '강한 스윙 대응력',
          description: '스윙이 커져도 탄도가 과하게 뜨지 않아, 공격적인 템포에서도 컨트롤이 무너지지 않습니다.',
        },
      ],
      adjustment: '공이 짧아지면 1~2LB 낮추고, 런치각이 높으면 1~2LB 높여 보세요.',
      bestFor: '강한 스트로크에서 궤적 안정성과 정확도를 우선하는 플레이어',
      helperText: '폴리에스터 공통 권장 범위: 여자 42~48LB / 남자 48~54LB',
      ranges: {
        female: { min: 42, max: 48, base: 48 },
        male: { min: 48, max: 54, base: 54 },
      },
      color: 'bg-muted/40',
    },
    {
      id: 'spinPoly',
      name: '스핀(폴리)',
      icon: Zap,
      characteristics: '각진 단면과 빠른 스냅백을 활용해 회전량과 탄도 제어를 강화한 폴리 타입입니다.',
      pros: [
        {
          title: '최상급 스핀 성능',
          description: '스트링의 형상과 마찰 특성으로 회전량을 높여, 바운드 이후 궤적 변화를 크게 만들 수 있습니다.',
        },
        {
          title: '컨트롤과 홀딩력 강화',
          description: '회전뿐 아니라 볼을 잡아주는 느낌이 좋아 공격과 수비 전환 시 탄도 제어가 안정적입니다.',
        },
        {
          title: '스냅백 기반 구질 압박',
          description: '빠른 복원력으로 탑스핀·슬라이스 구질을 더 날카롭게 만들어 상대 타점을 흔들기 좋습니다.',
        },
      ],
      adjustment: '회전량은 충분한데 비거리가 부족하면 1LB씩 낮춰 탄성을 확보하세요.',
      bestFor: '탑스핀/슬라이스 활용이 많고 볼의 궤적 제어가 중요한 플레이어',
      helperText: '폴리에스터 공통 권장 범위: 여자 42~48LB / 남자 48~54LB',
      ranges: {
        female: { min: 42, max: 48, base: 46 },
        male: { min: 48, max: 54, base: 52 },
      },
      color: 'bg-primary/10 dark:bg-primary/20',
    },
    {
      id: 'syntheticGut',
      name: '인조쉽',
      icon: Layers,
      characteristics: '부담 없이 쓰기 좋은 만능형 세팅으로, 반발력과 컨트롤의 균형이 좋습니다.',
      pros: ['가성비가 좋고 세팅이 쉬움', '초중급자에게 무난한 타구감', '적당한 파워와 안정적인 구질'],
      adjustment: '기준점에서 시작한 뒤 볼이 뜨면 +1LB, 짧으면 -1LB로 미세 조정하세요.',
      bestFor: '연습량이 많고 관리가 쉬운 범용 세팅을 원하는 플레이어',
      ranges: {
        female: { min: 42, max: 46, base: 44 },
        male: { min: 48, max: 52, base: 50 },
      },
      color: 'bg-muted/40',
    },
    {
      id: 'naturalGut',
      name: '내추럴 거트',
      icon: Zap,
      characteristics: '풍부한 반발력과 깊은 포켓팅으로 프리미엄 타구감을 제공하는 고급 세팅입니다.',
      pros: ['우수한 탄성과 편안함', '긴장 유지력이 좋아 안정적인 타구감', '섬세한 터치 플레이에 유리'],
      adjustment: '비·습기에 민감하므로 보관 상태를 관리하고 범위 내에서 1LB 단위 조정하세요.',
      bestFor: '손맛과 반발력, 텐션 유지력을 모두 챙기고 싶은 플레이어',
      ranges: {
        female: { min: 46, max: 50, base: 48 },
        male: { min: 50, max: 55, base: 53 },
      },
      color: 'bg-primary/10 dark:bg-primary/20',
    },
  ];

  const environmentFactors = [
    {
      factor: '날씨 - 더운 날',
      icon: Sun,
      adjustment: '+2~4LB',
      reason: '열로 인해 스트링이 늘어나므로 텐션을 높여야 합니다',
      color: 'text-muted-foreground',
    },
    {
      factor: '날씨 - 추운 날',
      icon: Thermometer,
      adjustment: '-2~4LB',
      reason: '추위로 스트링이 딱딱해지므로 텐션을 낮춰야 합니다',
      color: 'text-primary',
    },
  ];

  const playStyleOptions = [
    { id: 'soft', label: '소프트', adjust: -2, desc: '편안함과 파워를 우선하는 플레이' },
    { id: 'control', label: '컨트롤', adjust: 0, desc: '안정적인 탄도와 밸런스 중심' },
    { id: 'spinPower', label: '스핀 파워', adjust: 2, desc: '회전과 구질 압박을 강화하는 플레이' },
  ];

  const swingSpeedOptions = [
    { id: 'slow', label: '느림', adjust: -4, desc: '컴팩트한 스윙' },
    { id: 'medium', label: '보통', adjust: 0, desc: '평균적인 스윙 스피드' },
    { id: 'fast', label: '빠름', adjust: 4, desc: '강력하고 빠른 스윙' },
  ];

  const selectedString = stringTypes.find((st) => st.id === stringType) ?? stringTypes[0];

  const selectedRange: TensionRange = selectedString.ranges[gender];
  const oppositeGender: Gender = gender === 'female' ? 'male' : 'female';
  const oppositeRange: TensionRange = selectedString.ranges[oppositeGender];
  const styleAdjust = playStyleOptions.find((option) => option.id === playStyle)?.adjust ?? 0;
  const speedAdjust = swingSpeedOptions.find((option) => option.id === swingSpeed)?.adjust ?? 0;

  // 계산 공식: (성별 + 스트링 기준점) + 플레이 스타일 보정 + 스윙 스피드 보정 후, 선택 범위 내로 clamp
  const calculatedTension = useMemo(() => {
    const value = selectedRange.base + styleAdjust + speedAdjust;

    return Math.max(selectedRange.min, Math.min(selectedRange.max, value));
  }, [selectedRange, speedAdjust, styleAdjust]);

  const gaugePosition = useMemo(() => {
    const clampedValue = Math.max(tensionAxis.min, Math.min(tensionAxis.max, calculatedTension));
    return ((clampedValue - tensionAxis.min) / tensionAxisSpan) * 100;
  }, [calculatedTension, tensionAxisSpan]);

  const getRangeBarStyle = (min: number, max: number) => ({
    left: `${((Math.max(min, tensionAxis.min) - tensionAxis.min) / tensionAxisSpan) * 100}%`,
    width: `${((Math.min(max, tensionAxis.max) - Math.max(min, tensionAxis.min)) / tensionAxisSpan) * 100}%`,
  });

  const getTensionFeedback = () => {
    const rangeSpan = Math.max(1, selectedRange.max - selectedRange.min);
    const relativePosition = (calculatedTension - selectedRange.min) / rangeSpan;

    if (relativePosition <= 1 / 3) {
      return { text: '편안함과 파워 중심 세팅', color: 'text-primary' };
    }

    if (relativePosition <= 2 / 3) {
      return { text: '컨트롤과 파워의 균형 세팅', color: 'text-muted-foreground' };
    }

    return { text: '컨트롤 중심 세팅', color: 'text-foreground' };
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-muted/30 dark:bg-card/40 border-b border-border">
        <div className="relative mx-auto w-full px-3 bp-sm:px-4 bp-md:px-6 bp-lg:max-w-[1200px] bp-lg:px-6 pt-8 bp-sm:pt-10 bp-md:pt-12 pb-10 bp-md:pb-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 dark:bg-primary/20 px-4 py-2 rounded-full mb-4 bp-md:mb-6">
              <Gauge className="h-4 w-4 bp-sm:h-5 bp-sm:w-5 text-primary" />
              <span className="text-xs bp-sm:text-sm font-semibold text-muted-foreground">전문가 텐션 가이드</span>
            </div>
            <h1 className="text-3xl bp-sm:text-4xl bp-md:text-5xl bp-lg:text-6xl font-bold text-foreground mb-4 bp-md:mb-6 text-balance">
              나에게 맞는
              <br />
              <span className="text-primary">최적의 텐션</span>을 찾아보세요
            </h1>
            <p className="text-base bp-sm:text-lg bp-md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 bp-md:mb-8 text-pretty px-2">플레이 스타일, 스윙 스피드, 스트링 타입에 따른 맞춤형 텐션 가이드로 최고의 퍼포먼스를 경험하세요</p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full px-3 bp-sm:px-4 bp-md:px-6 bp-lg:max-w-[1200px] bp-lg:px-6 py-6 bp-md:py-10 bp-lg:pb-16">
        {/* Navigation Tabs */}
        <Tabs value={activeSection} onValueChange={setActiveSection} className="mb-8 bp-md:mb-12">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4 h-auto p-1 bg-muted">
            <TabsTrigger value="calculator" className="py-2 bp-sm:py-3 text-[10px] bp-sm:text-xs bp-md:text-sm gap-1 bp-sm:gap-1.5">
              <BarChart3 className="h-3 w-3 bp-sm:h-4 bp-sm:w-4" />
              <span className="hidden bp-sm:inline">텐션</span> 계산기
            </TabsTrigger>
            <TabsTrigger value="levels" className="py-2 bp-sm:py-3 text-[10px] bp-sm:text-xs bp-md:text-sm gap-1 bp-sm:gap-1.5">
              <Users className="h-3 w-3 bp-sm:h-4 bp-sm:w-4" />
              <span className="bp-xs:hidden">수준별</span>
              <span className="hidden bp-xs:inline">수준별 가이드</span>
            </TabsTrigger>
            <TabsTrigger value="strings" className="py-2 bp-sm:py-3 text-[10px] bp-sm:text-xs bp-md:text-sm gap-1 bp-sm:gap-1.5">
              <Layers className="h-3 w-3 bp-sm:h-4 bp-sm:w-4" />
              <span className="bp-xs:hidden">스트링</span>
              <span className="hidden bp-xs:inline">스트링 타입</span>
            </TabsTrigger>
            <TabsTrigger value="tips" className="py-2 bp-sm:py-3 text-[10px] bp-sm:text-xs bp-md:text-sm gap-1 bp-sm:gap-1.5">
              <Lightbulb className="h-3 w-3 bp-sm:h-4 bp-sm:w-4" />
              <span className="bp-xs:hidden">팁</span>
              <span className="hidden bp-xs:inline">전문가 팁</span>
            </TabsTrigger>
          </TabsList>

          {/* 텐션 계산기 */}
          <TabsContent value="calculator" className="mt-6 bp-md:mt-8">
            <div className="grid bp-lg:grid-cols-2 gap-6 bp-md:gap-8">
              {/* 입력 섹션 */}
              <div className="space-y-6">
                <Card className="border-0 shadow-md bg-card dark:bg-muted/90">
                  <CardHeader className="pb-4 bp-md:pb-6">
                    <CardTitle className="flex items-center gap-2 text-base bp-md:text-lg text-foreground">
                      <Settings2 className="h-4 w-4 bp-md:h-5 bp-md:w-5 text-primary" />
                      나의 플레이 정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 bp-md:space-y-8">
                    {/* 성별 선택 */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-3">성별</label>
                      <div className="grid grid-cols-2 gap-2 bp-sm:gap-3">
                        {[
                          { id: 'female', label: '여자', desc: '여성 추천 범위 기준 계산' },
                          { id: 'male', label: '남자', desc: '남성 추천 범위 기준 계산' },
                        ].map((option) => (
                          <button
                            key={option.id}
                            onClick={() => setGender(option.id as Gender)}
                            className={`p-3 bp-sm:p-4 rounded-xl transition-all duration-200 text-left ${gender === option.id ? 'bg-primary/10 dark:bg-primary/20 ring-2 ring-ring shadow-sm' : 'bg-muted/50 dark:bg-muted/50 hover:bg-muted dark:hover:bg-muted hover:shadow-sm'}`}
                          >
                            <div className={`font-medium text-sm ${gender === option.id ? 'text-primary' : 'text-foreground'}`}>{option.label}</div>
                            <div className="text-xs text-muted-foreground mt-1">{option.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 스윙 스피드 선택 */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-3">스윙 스피드</label>
                      <div className="grid grid-cols-3 gap-2 bp-sm:gap-3">
                        {swingSpeedOptions.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => setSwingSpeed(option.id as SwingSpeed)}
                            className={`p-2 bp-sm:p-3 rounded-xl transition-all duration-200 ${swingSpeed === option.id ? 'bg-primary/10 dark:bg-primary/20 ring-2 ring-ring shadow-sm' : 'bg-muted/50 dark:bg-muted/50 hover:bg-muted dark:hover:bg-muted hover:shadow-sm'}`}
                          >
                            <div className={`font-medium text-xs bp-sm:text-sm ${swingSpeed === option.id ? 'text-primary' : 'text-foreground'}`}>{option.label}</div>
                            <div className="text-[10px] bp-sm:text-xs text-muted-foreground mt-1 hidden bp-sm:block">{option.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* 스트링 타입 선택 */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-3">스트링 타입</label>
                      <div className="grid grid-cols-2 gap-2 bp-sm:gap-3">
                        {stringTypes.map((st) => (
                          <button
                            key={st.id}
                            onClick={() => setStringType(st.id as StringType)}
                            className={`p-3 bp-sm:p-4 rounded-xl transition-all duration-200 text-left ${stringType === st.id ? 'bg-primary/10 dark:bg-primary/20 ring-2 ring-ring shadow-sm' : 'bg-muted/50 dark:bg-muted/50 hover:bg-muted dark:hover:bg-muted hover:shadow-sm'}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <st.icon className={`h-4 w-4 ${stringType === st.id ? 'text-primary' : 'text-muted-foreground'}`} />
                              <span className={`font-medium text-sm ${stringType === st.id ? 'text-primary' : 'text-foreground'}`}>{st.name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">여 {st.ranges.female.min}~{st.ranges.female.max}LB · 남 {st.ranges.male.min}~{st.ranges.male.max}LB</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 플레이 스타일 선택 */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-3">플레이 스타일</label>
                      <div className="grid grid-cols-3 gap-2 bp-sm:gap-3">
                        {playStyleOptions.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => setPlayStyle(option.id as PlayStyle)}
                            className={`p-2 bp-sm:p-3 rounded-xl transition-all duration-200 ${playStyle === option.id ? 'bg-primary/10 dark:bg-primary/20 ring-2 ring-ring shadow-sm' : 'bg-muted/50 dark:bg-muted/50 hover:bg-muted dark:hover:bg-muted hover:shadow-sm'}`}
                          >
                            <div className={`font-medium text-xs bp-sm:text-sm ${playStyle === option.id ? 'text-primary' : 'text-foreground'}`}>{option.label}</div>
                            <div className="text-[10px] bp-sm:text-xs text-muted-foreground mt-1 hidden bp-sm:block">{option.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 결과 섹션 */}
              <div className="space-y-6">
                <Card className="border-0 shadow-lg bg-muted/40 dark:bg-muted/30 overflow-hidden">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base bp-md:text-lg text-foreground dark:text-primary-foreground/90">
                      <Target className="h-4 w-4 bp-md:h-5 bp-md:w-5" />
                      추천 텐션
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-6 bp-md:mb-8">
                      <div className="text-5xl bp-sm:text-6xl bp-md:text-7xl font-bold text-primary mb-2 animate-in fade-in duration-500">{calculatedTension}LB</div>
                      <div className={`text-base bp-md:text-lg font-medium ${getTensionFeedback().color}`}>{getTensionFeedback().text}</div>
                    </div>

                    {/* 텐션 시각화 */}
                    <div className="mb-6 bp-md:mb-8">
                      <div className="flex justify-between text-xs text-muted-foreground mb-2">
                        <span>42LB</span>
                        <span>56LB</span>
                      </div>
                      <div className="relative h-3 bp-sm:h-4 bg-muted/30 rounded-full shadow-inner">
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bp-sm:w-6 bp-sm:h-6 bg-card ring-4 ring-ring rounded-full shadow-lg transition-all duration-500 ease-out"
                          style={{ left: `calc(${gaugePosition}% - 12px)` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs mt-2">
                        <span className="text-primary">파워</span>
                        <span className="text-muted-foreground">컨트롤</span>
                      </div>
                    </div>

                    {/* 추천 범위 */}
                    <div className="bg-card/80 dark:bg-muted/80 backdrop-blur-sm rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">추천 범위 (선택 성별 기준)</span>
                      </div>
                      <p className="text-sm text-muted-foreground">최종 추천 텐션 {calculatedTension}LB · {selectedRange.min}LB ~ {selectedRange.max}LB</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs">{gender === 'female' ? '여자' : '남자'} {selectedRange.min}~{selectedRange.max}LB</Badge>
                        <Badge variant="outline" className="text-xs">{oppositeGender === 'female' ? '여자' : '남자'} {oppositeRange.min}~{oppositeRange.max}LB</Badge>
                      </div>
                    </div>

                    {/* 계산 근거를 한눈에 보여주면 사용자가 추천값의 출처를 빠르게 이해할 수 있습니다. */}
                    <div className="bg-card/80 dark:bg-muted/80 backdrop-blur-sm rounded-xl p-4 mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">계산 근거</span>
                      </div>
                      <ul className="space-y-2">
                        <li className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">기준점</span>
                          <span className="font-medium text-foreground">{selectedRange.base}LB</span>
                        </li>
                        <li className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">플레이 스타일 보정</span>
                          <span className="font-medium text-foreground">{styleAdjust > 0 ? `+${styleAdjust}` : styleAdjust}LB</span>
                        </li>
                        <li className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">스윙 스피드 보정</span>
                          <span className="font-medium text-foreground">{speedAdjust > 0 ? `+${speedAdjust}` : speedAdjust}LB</span>
                        </li>
                        <li className="pt-2 border-t border-border flex items-center justify-between text-sm">
                          <span className="text-foreground font-medium">최종 추천</span>
                          <span className="text-primary font-semibold">{calculatedTension}LB</span>
                        </li>
                      </ul>
                    </div>

                    {/* <Button asChild className="w-full bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] text-primary-foreground transition-all duration-200">
                      <Link href="/services/apply">
                        이 텐션으로 스트링 신청하기
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button> */}
                  </CardContent>
                </Card>

                {/* 환경 요인 */}
                <Card className="border-0 shadow-md bg-card dark:bg-muted/90">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm bp-md:text-base flex items-center gap-2 text-foreground">
                      <Thermometer className="h-4 w-4 text-muted-foreground" />
                      환경에 따른 조정
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 bp-sm:gap-3">
                      {environmentFactors.map((factor, index) => (
                        <div key={index} className="flex items-start gap-2 p-2 bp-sm:p-3 bg-muted/50 dark:bg-muted/50 rounded-lg hover:bg-muted dark:hover:bg-muted transition-colors duration-200">
                          <factor.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${factor.color}`} />
                          <div>
                            <div className="text-[10px] bp-sm:text-xs font-medium text-foreground">{factor.factor}</div>
                            <div className="text-[10px] bp-sm:text-xs text-primary font-semibold">{factor.adjustment}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 플레이어 수준별 가이드 */}
          <TabsContent value="levels" className="mt-6 bp-md:mt-8">
            <div className="grid grid-cols-1 bp-md:grid-cols-2 gap-4 bp-md:gap-6">
              {playerTypes.map((player, index) => {
                const IconComponent = player.icon;
                const isSelected = selectedLevel === index;
                return (
                  <Card key={index} className={`cursor-pointer transition-all duration-300 overflow-hidden border bg-card ${isSelected ? 'ring-2 ring-ring shadow-lg' : 'hover:shadow-md'}`} onClick={() => setSelectedLevel(isSelected ? null : index)}>
                    <CardHeader className="pb-3 bp-md:pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 bp-sm:gap-4">
                          <div className={`w-10 h-10 bp-sm:w-12 bp-sm:h-12 bp-md:w-14 bp-md:h-14 ${player.color} rounded-xl bp-md:rounded-2xl flex items-center justify-center shadow-md`}>
                            <IconComponent className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 bp-md:h-7 bp-md:w-7 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base bp-sm:text-lg bp-md:text-xl mb-1 text-card-foreground">{player.type}</CardTitle>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary" className="text-xs bp-md:text-sm px-2 bp-md:px-3 py-0.5 bp-md:py-1">여자 {player.femaleTension}</Badge>
                              <Badge variant="outline" className="text-xs bp-md:text-sm px-2 bp-md:px-3 py-0.5 bp-md:py-1">남자 {player.maleTension}</Badge>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className={`h-4 w-4 bp-md:h-5 bp-md:w-5 text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm bp-md:text-base text-muted-foreground mb-3 bp-md:mb-4">{player.description}</p>

                      {/* 공통 축(42~56LB)으로 맞춰야 여자/남자 범위를 동일 스케일에서 직관적으로 비교할 수 있습니다. */}
                      <div className="mb-3 bp-md:mb-4">
                        <div className="space-y-2">
                          <div>
                            <div className="flex items-center justify-between text-[10px] bp-sm:text-xs mb-1">
                              <span className="text-muted-foreground">여자</span>
                              <span className="text-muted-foreground">{player.femaleRange[0]}~{player.femaleRange[1]}LB</span>
                            </div>
                            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="absolute h-full bg-primary/60 rounded-full"
                                style={{
                                  ...getRangeBarStyle(player.femaleRange[0], player.femaleRange[1]),
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-[10px] bp-sm:text-xs mb-1">
                              <span className="text-muted-foreground">남자</span>
                              <span className="text-muted-foreground">{player.maleRange[0]}~{player.maleRange[1]}LB</span>
                            </div>
                            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="absolute h-full bg-muted-foreground/40 rounded-full"
                                style={{
                                  ...getRangeBarStyle(player.maleRange[0], player.maleRange[1]),
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex justify-between text-[10px] bp-sm:text-xs text-muted-foreground">
                            <span>{tensionAxis.min}LB</span>
                            <span>{tensionAxis.max}LB</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 bp-sm:gap-2 mb-3 bp-md:mb-4">
                        {player.characteristics.map((char, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-[10px] bp-sm:text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-primary" />
                            {char}
                          </span>
                        ))}
                      </div>

                      {isSelected && (
                        <div className="mt-3 bp-md:mt-4 pt-3 bp-md:pt-4 border-t border-border animate-in fade-in">
                          <div className="flex items-start gap-2 bg-muted/50 dark:bg-muted/40 p-3 rounded-lg">
                            <Lightbulb className="h-4 w-4 bp-md:h-5 bp-md:w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <p className="text-xs bp-md:text-sm text-foreground">{player.recommended}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* 스트링 타입별 가이드 */}
          <TabsContent value="strings" className="mt-6 bp-md:mt-8">
            <div className="grid grid-cols-1 bp-lg:grid-cols-2 gap-4 bp-md:gap-6">
              {stringTypes.map((string, index) => (
                <Card key={index} className="overflow-hidden border bg-card hover:shadow-md transition-all duration-300">
                  <div className={`h-1.5 bp-md:h-2 ${string.color}`} />
                  <CardHeader className="pb-3 bp-md:pb-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="flex items-center gap-2 bp-sm:gap-3 text-base bp-sm:text-lg bp-md:text-xl text-card-foreground">
                        <div className={`w-8 h-8 bp-sm:w-9 bp-sm:h-9 bp-md:w-10 bp-md:h-10 ${string.color} rounded-lg bp-md:rounded-xl flex items-center justify-center`}>
                          <string.icon className="h-4 w-4 bp-sm:h-5 bp-sm:w-5 text-primary" />
                        </div>
                        {string.name}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 bp-md:space-y-4">
                    <p className="text-sm text-muted-foreground">{string.characteristics}</p>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">여자 {string.ranges.female.min}~{string.ranges.female.max}LB</Badge>
                      <Badge variant="outline" className="text-xs">남자 {string.ranges.male.min}~{string.ranges.male.max}LB</Badge>
                    </div>

                    {string.helperText && <p className="text-xs text-muted-foreground">{string.helperText}</p>}

                    <div>
                      <div>
                        <h4 className="text-xs bp-md:text-sm font-semibold text-primary mb-2 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 bp-md:h-4 bp-md:w-4" /> 장점
                        </h4>
                        <ul className="space-y-2">
                          {string.pros.map((pro: StringPro, i: number) => (
                            <li key={i} className="text-[10px] bp-sm:text-xs text-muted-foreground flex items-start gap-2">
                              <div className="w-1 h-1 bg-primary/70 rounded-full flex-shrink-0 mt-1.5" />
                              {typeof pro === 'string' ? (
                                <span>{pro}</span>
                              ) : (
                                <div>
                                  <p className="font-semibold text-foreground text-[11px] bp-sm:text-xs">{pro.title}</p>
                                  <p className="text-muted-foreground">{pro.description}</p>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="bg-primary/10 dark:bg-primary/20 p-3 bp-md:p-4 rounded-xl">
                      <div className="flex items-start gap-2">
                        <Info className="h-3 w-3 bp-md:h-4 bp-md:w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs bp-md:text-sm font-medium text-foreground mb-0.5 bp-md:mb-1">텐션 조정 팁</p>
                          <p className="text-[10px] bp-sm:text-xs text-muted-foreground">{string.adjustment}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 bp-md:pt-2">
                      <Target className="h-3 w-3 bp-md:h-4 bp-md:w-4 text-muted-foreground" />
                      <span className="text-[10px] bp-sm:text-xs text-muted-foreground">추천: {string.bestFor}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 전문가 팁 */}
          <TabsContent value="tips" className="mt-6 bp-md:mt-8">
            <div className="grid gap-4 bp-md:gap-6">
              {/* 텐션 이해하기 */}
              <Card className="overflow-hidden border bg-card">
                <div className="h-1 bg-muted/30" />
                <CardHeader className="pb-3 bp-md:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base bp-md:text-lg text-card-foreground">
                    <BarChart3 className="h-4 w-4 bp-md:h-5 bp-md:w-5 text-primary" />
                    텐션이 플레이에 미치는 영향
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid bp-md:grid-cols-2 gap-6 bp-md:gap-8">
                    {/* 낮은 텐션 */}
                    <div className="space-y-3 bp-md:space-y-4">
                      <div className="flex items-center gap-2 bp-sm:gap-3">
                        <div className="w-10 h-10 bp-md:w-12 bp-md:h-12 border border-primary/20 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 bp-md:h-6 bp-md:w-6 text-primary rotate-180" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm bp-md:text-base text-foreground">낮은 텐션</h4>
                          <p className="text-xs bp-md:text-sm text-muted-foreground">파워와 편안함 중심</p>
                        </div>
                      </div>
                      <ul className="space-y-1.5 bp-md:space-y-2">
                        <li className="flex items-start gap-2 text-xs bp-md:text-sm text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 bp-md:h-4 bp-md:w-4 text-primary mt-0.5 flex-shrink-0" />
                          스트링 베드가 더 많이 휘어져 볼에 더 많은 에너지를 전달합니다
                        </li>
                        <li className="flex items-start gap-2 text-xs bp-md:text-sm text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 bp-md:h-4 bp-md:w-4 text-primary mt-0.5 flex-shrink-0" />
                          스윗스팟이 넓어져 미스히트 시에도 괜찮은 샷이 나옵니다
                        </li>
                        <li className="flex items-start gap-2 text-xs bp-md:text-sm text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 bp-md:h-4 bp-md:w-4 text-primary mt-0.5 flex-shrink-0" />
                          팔과 어깨에 가해지는 충격이 줄어들어 부상 위험이 감소합니다
                        </li>
                        <li className="flex items-start gap-2 text-xs bp-md:text-sm text-muted-foreground">
                          <AlertTriangle className="h-3 w-3 bp-md:h-4 bp-md:w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          정밀한 컨트롤이 어려울 수 있습니다
                        </li>
                      </ul>
                    </div>

                    {/* 높은 텐션 */}
                    <div className="space-y-3 bp-md:space-y-4">
                      <div className="flex items-center gap-2 bp-sm:gap-3">
                        <div className="w-10 h-10 bp-md:w-12 bp-md:h-12 bg-muted/40 rounded-xl flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 bp-md:h-6 bp-md:w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm bp-md:text-base text-foreground">높은 텐션</h4>
                          <p className="text-xs bp-md:text-sm text-muted-foreground">컨트롤과 정밀함 중심</p>
                        </div>
                      </div>
                      <ul className="space-y-1.5 bp-md:space-y-2">
                        <li className="flex items-start gap-2 text-xs bp-md:text-sm text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 bp-md:h-4 bp-md:w-4 text-primary mt-0.5 flex-shrink-0" />
                          스트링 베드가 단단해져 정밀한 샷 컨트롤이 가능합니다
                        </li>
                        <li className="flex items-start gap-2 text-xs bp-md:text-sm text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 bp-md:h-4 bp-md:w-4 text-primary mt-0.5 flex-shrink-0" />
                          스핀 생성이 용이하고 볼의 궤적을 예측하기 쉽습니다
                        </li>
                        <li className="flex items-start gap-2 text-xs bp-md:text-sm text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 bp-md:h-4 bp-md:w-4 text-primary mt-0.5 flex-shrink-0" />
                          강한 스윙 스피드를 가진 선수에게 적합합니다
                        </li>
                        <li className="flex items-start gap-2 text-xs bp-md:text-sm text-muted-foreground">
                          <AlertTriangle className="h-3 w-3 bp-md:h-4 bp-md:w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          팔에 무리가 갈 수 있으며 파워가 줄어들 수 있습니다
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 텐션 관리 팁 */}
              <div className="grid bp-sm:grid-cols-2 bp-lg:grid-cols-3 gap-4 bp-md:gap-6">
                <Card className="bg-primary/10 dark:bg-primary/20 border-border">
                  <CardHeader className="pb-2 bp-md:pb-3">
                    <CardTitle className="text-sm bp-md:text-base flex items-center gap-2 text-foreground dark:text-primary-foreground/90">
                      <Gauge className="h-4 w-4 bp-md:h-5 bp-md:w-5" />
                      텐션 손실 이해하기
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 bp-md:space-y-3">
                    <p className="text-xs bp-md:text-sm text-foreground">스트링은 장착 후 지속적으로 텐션이 감소합니다.</p>
                    <ul className="space-y-1.5 bp-md:space-y-2 text-xs bp-md:text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bp-md:w-2 bp-md:h-2 bg-primary/70 rounded-full flex-shrink-0" />첫 24시간: 10-15% 손실
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bp-md:w-2 bp-md:h-2 bg-primary/70 rounded-full flex-shrink-0" />첫 주: 추가 5-10% 손실
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bp-md:w-2 bp-md:h-2 bg-primary/70 rounded-full flex-shrink-0" />
                        이후: 점진적 안정화
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-primary/10 dark:bg-primary/20 border-border">
                  <CardHeader className="pb-2 bp-md:pb-3">
                    <CardTitle className="text-sm bp-md:text-base flex items-center gap-2 text-foreground">
                      <Shield className="h-4 w-4 bp-md:h-5 bp-md:w-5" />
                      스트링 보관 팁
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 bp-md:space-y-3">
                    <p className="text-xs bp-md:text-sm text-foreground">올바른 보관은 스트링 수명과 텐션 유지에 중요합니다.</p>
                    <ul className="space-y-1.5 bp-md:space-y-2 text-xs bp-md:text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bp-md:w-2 bp-md:h-2 bg-primary/70 rounded-full flex-shrink-0" />
                        직사광선 피하기
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bp-md:w-2 bp-md:h-2 bg-primary/70 rounded-full flex-shrink-0" />
                        극단적 온도 피하기
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bp-md:w-2 bp-md:h-2 bg-primary/70 rounded-full flex-shrink-0" />
                        라켓 커버 사용
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50 dark:bg-muted/40 border-border bp-sm:col-span-2 bp-lg:col-span-1">
                  <CardHeader className="pb-2 bp-md:pb-3">
                    <CardTitle className="text-sm bp-md:text-base flex items-center gap-2 text-foreground">
                      <Target className="h-4 w-4 bp-md:h-5 bp-md:w-5" />
                      교체 시기 판단
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 bp-md:space-y-3">
                    <p className="text-xs bp-md:text-sm text-muted-foreground">다음 신호가 나타나면 교체를 고려하세요.</p>
                    <ul className="space-y-1.5 bp-md:space-y-2 text-xs bp-md:text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bp-md:w-2 bp-md:h-2 bg-muted-foreground/60 rounded-full flex-shrink-0" />
                        탄력 감소 느낌
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bp-md:w-2 bp-md:h-2 bg-muted-foreground/60 rounded-full flex-shrink-0" />
                        노칭(홈) 발생
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bp-md:w-2 bp-md:h-2 bg-muted-foreground/60 rounded-full flex-shrink-0" />
                        변색 또는 보풀
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* FAQ 섹션 */}
              <Card className="border bg-card">
                <CardHeader className="pb-3 bp-md:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base bp-md:text-lg text-card-foreground">
                    <Info className="h-4 w-4 bp-md:h-5 bp-md:w-5 text-primary" />
                    자주 묻는 질문
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 bp-md:space-y-4">
                  <div className="space-y-4 bp-md:space-y-6">
                    <div className="border-b border-border pb-3 bp-md:pb-4">
                      <h4 className="font-semibold text-sm bp-md:text-base text-foreground mb-1.5 bp-md:mb-2">메인과 크로스 텐션을 다르게 해야 하나요?</h4>
                      <p className="text-xs bp-md:text-sm text-muted-foreground">반드시 필요하지는 않지만, 일부 선수들은 메인을 크로스보다 2-4LB 높게 설정합니다. 이는 스윗스팟을 확장하고 컨트롤과 파워의 균형을 맞추는 데 도움이 됩니다.</p>
                    </div>
                    <div className="border-b border-border pb-3 bp-md:pb-4">
                      <h4 className="font-semibold text-sm bp-md:text-base text-foreground mb-1.5 bp-md:mb-2">새 라켓에는 어떤 텐션으로 시작해야 하나요?</h4>
                      <p className="text-xs bp-md:text-sm text-muted-foreground">라켓 제조사가 권장하는 텐션 범위의 중간값으로 시작하는 것이 좋습니다. 이후 플레이 느낌에 따라 2-4LB씩 조절해 나가세요.</p>
                    </div>
                    <div className="border-b border-border pb-3 bp-md:pb-4">
                      <h4 className="font-semibold text-sm bp-md:text-base text-foreground mb-1.5 bp-md:mb-2">텐션을 자주 바꿔도 되나요?</h4>
                      <p className="text-xs bp-md:text-sm text-muted-foreground">일관된 텐션을 유지하는 것이 플레이 향상에 도움이 됩니다. 하지만 계절 변화나 코트 조건에 따라 2-4LB 정도 조절하는 것은 권장됩니다.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm bp-md:text-base text-foreground mb-1.5 bp-md:mb-2">프로 선수들은 어떤 텐션을 사용하나요?</h4>
                      <p className="text-xs bp-md:text-sm text-muted-foreground">
                        프로 선수들은 보통 51-60LB 범위를 사용합니다. 일반적인 인식과 달리 매우 높은 텐션을 사용하지 않는 경우가 많습니다. 중요한 것은 자신의 플레이 스타일에 맞는 텐션을 찾는 것입니다.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* CTA 섹션 */}
        <Card className="bg-primary/10 border border-primary/20 dark:bg-primary/20 overflow-hidden mb-8">
          <CardContent className="p-6 bp-sm:p-8 bp-md:p-10 bp-lg:p-12">
            <div className="flex flex-col bp-md:flex-row items-center justify-between gap-4 bp-md:gap-6">
              <div className="text-center bp-md:text-left">
                <h3 className="text-xl bp-sm:text-2xl bp-md:text-3xl font-bold mb-2 text-foreground">최적의 텐션으로 스트링 서비스를 받아보세요</h3>
                <p className="text-muted-foreground text-sm bp-md:text-base bp-lg:text-lg">스트링어가 정밀하게 작업해 드립니다</p>
              </div>
              <Button asChild size="lg" variant="secondary" className="px-6 bp-md:px-8 whitespace-nowrap">
                <Link href="/services/apply">
                  스트링 신청하기
                  <ArrowRight className="ml-2 h-4 w-4 bp-md:h-5 bp-md:w-5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary/10 border border-primary/20 dark:bg-primary/20 overflow-hidden mb-8">
          <CardContent className="p-6 bp-sm:p-8 bp-md:p-10 bp-lg:p-12">
            <div className="flex flex-col bp-md:flex-row items-center justify-between gap-4 bp-md:gap-6">
              <div className="text-center bp-md:text-left">
                <h3 className="text-xl bp-sm:text-2xl bp-md:text-3xl font-bold mb-2 text-foreground">나에게 맞는 라켓을 찾아보세요</h3>
                <p className="text-muted-foreground text-sm bp-md:text-base bp-lg:text-lg">라켓 검색을 활용해 나의 라켓을 선택해보세요</p>
              </div>
              <Button asChild size="lg" variant="secondary" className="px-6 bp-md:px-8 whitespace-nowrap">
                <Link href="/rackets/finder">
                  라켓 검색 사용하기
                  <ArrowRight className="ml-2 h-4 w-4 bp-md:h-5 bp-md:w-5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
