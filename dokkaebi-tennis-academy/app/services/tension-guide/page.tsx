'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gauge, Target, Zap, Shield, Users, TrendingUp, ChevronRight, Info, Thermometer, Wind, Sun, CloudRain, ArrowRight, CheckCircle2, AlertTriangle, Lightbulb, BarChart3, Layers, Settings2 } from 'lucide-react';
import Link from 'next/link';

type PlayStyle = 'baseline' | 'allcourt' | 'servevolley';
type SwingSpeed = 'slow' | 'medium' | 'fast';
type StringType = 'poly' | 'multi' | 'hybrid' | 'natural';

export default function TensionGuidePage() {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [playStyle, setPlayStyle] = useState<PlayStyle>('allcourt');
  const [swingSpeed, setSwingSpeed] = useState<SwingSpeed>('medium');
  const [stringType, setStringType] = useState<StringType>('poly');
  const [tensionValue, setTensionValue] = useState([25]);
  const [activeSection, setActiveSection] = useState<string>('calculator');

  const playerTypes = [
    {
      type: '초보자',
      level: 1,
      icon: Users,
      tension: '22-26kg',
      tensionRange: [22, 26],
      description: '편안한 플레이와 부상 방지를 위한 낮은 텐션',
      characteristics: ['파워 증가', '편안한 느낌', '부상 위험 감소', '넓은 스윗스팟'],
      recommended: '처음 시작하시는 분들께는 24kg을 권장합니다',
      color: 'bg-primary/10 dark:bg-primary/20',
      bgColor: 'bg-primary/10 dark:bg-primary/15',
      borderColor: 'border-border',
    },
    {
      type: '중급자',
      level: 2,
      icon: Target,
      tension: '24-28kg',
      tensionRange: [24, 28],
      description: '컨트롤과 파워의 균형을 맞춘 중간 텐션',
      characteristics: ['균형잡힌 플레이', '적당한 컨트롤', '다양한 샷 구사', '스핀 생성 용이'],
      recommended: '균형 잡힌 플레이를 원하시면 26kg이 적합합니다',
      color: 'bg-primary/10 dark:bg-primary/20',
      bgColor: 'bg-primary/10 dark:bg-primary/20',
      borderColor: 'border-border',
    },
    {
      type: '상급자',
      level: 3,
      icon: Zap,
      tension: '26-30kg',
      tensionRange: [26, 30],
      description: '정밀한 컨트롤과 스핀을 위한 높은 텐션',
      characteristics: ['정밀한 컨트롤', '강한 스핀', '빠른 스윙 활용', '일관된 타구감'],
      recommended: '빠른 스윙을 가지신 분은 28kg을 권장합니다',
      color: 'bg-primary/10 dark:bg-primary/20',
      bgColor: 'bg-primary/10 dark:bg-primary/20',
      borderColor: 'border-border',
    },
    {
      type: '프로/투어',
      level: 4,
      icon: TrendingUp,
      tension: '28-32kg',
      tensionRange: [28, 32],
      description: '최고 수준의 컨트롤과 정확성을 위한 고텐션',
      characteristics: ['최고 컨트롤', '정확한 플레이스먼트', '프로 수준 스핀', '정교한 터치'],
      recommended: '프로 수준의 파워가 있다면 30kg 이상을 고려하세요',
      color: 'bg-primary/10 dark:bg-primary/20',
      bgColor: 'bg-muted/50 dark:bg-muted/40',
      borderColor: 'border-border',
    },
  ];

  const stringTypes = [
    {
      id: 'poly',
      name: '폴리에스터',
      icon: Shield,
      recommendedTension: '24-28kg',
      tensionAdjust: -2,
      characteristics: '내구성이 뛰어나고 스핀 생성에 유리합니다. 단단한 느낌으로 컨트롤이 좋습니다.',
      pros: ['뛰어난 내구성', '스핀 생성 우수', '컨트롤 향상', '텐션 유지력 양호'],
      cons: ['팔에 무리 가능', '파워 감소', '정기적 교체 필요'],
      adjustment: '일반 텐션보다 2-3kg 낮게 시작하세요',
      bestFor: '스핀 위주 플레이어, 스트링이 자주 끊어지는 분',
      color: 'bg-muted/40',
    },
    {
      id: 'multi',
      name: '멀티필라멘트',
      icon: Layers,
      recommendedTension: '22-26kg',
      tensionAdjust: 0,
      characteristics: '부드러운 느낌과 뛰어난 파워를 제공합니다. 팔에 무리가 적습니다.',
      pros: ['편안한 타구감', '파워 증가', '팔 부담 감소', '넓은 스윗스팟'],
      cons: ['내구성 낮음', '텐션 손실 빠름', '가격이 높음'],
      adjustment: '표준 텐션을 그대로 적용하세요',
      bestFor: '팔꿈치 문제가 있는 분, 편안한 느낌을 원하는 분',
      color: 'bg-primary/10 dark:bg-primary/20',
    },
    {
      id: 'hybrid',
      name: '하이브리드',
      icon: Settings2,
      recommendedTension: '메인: 26kg, 크로스: 24kg',
      tensionAdjust: -1,
      characteristics: '두 가지 스트링의 장점을 결합합니다. 맞춤형 설정이 가능합니다.',
      pros: ['커스터마이징 가능', '균형 잡힌 성능', '비용 효율적', '다양한 조합'],
      cons: ['설정이 복잡', '일관성 떨어질 수 있음'],
      adjustment: '메인을 크로스보다 2kg 높게 설정하세요',
      bestFor: '자신만의 세팅을 원하는 분, 다양한 실험을 좋아하는 분',
      color: 'bg-warning/20 dark:bg-warning/25',
    },
    {
      id: 'natural',
      name: '내추럴 거트',
      icon: Zap,
      recommendedTension: '23-27kg',
      tensionAdjust: -1,
      characteristics: '최고의 느낌과 파워를 제공하는 프리미엄 스트링입니다.',
      pros: ['최상의 타구감', '뛰어난 파워', '텐션 유지력 최고', '팔에 부드러움'],
      cons: ['높은 가격', '습기에 약함', '관리 필요'],
      adjustment: '표준 텐션보다 1-2kg 낮게 시작하세요',
      bestFor: '최고의 퍼포먼스를 원하는 분, 프로 선수',
      color: 'bg-primary/10 dark:bg-primary/20',
    },
  ];

  const environmentFactors = [
    {
      factor: '날씨 - 더운 날',
      icon: Sun,
      adjustment: '+1~2kg',
      reason: '열로 인해 스트링이 늘어나므로 텐션을 높여야 합니다',
      color: 'text-muted-foreground',
    },
    {
      factor: '날씨 - 추운 날',
      icon: Thermometer,
      adjustment: '-1~2kg',
      reason: '추위로 스트링이 딱딱해지므로 텐션을 낮춰야 합니다',
      color: 'text-primary',
    },
    {
      factor: '습한 환경',
      icon: CloudRain,
      adjustment: '+1kg',
      reason: '습기가 스트링에 영향을 미쳐 탄성이 변합니다',
      color: 'text-primary',
    },
    {
      factor: '고도가 높은 곳',
      icon: Wind,
      adjustment: '+1~2kg',
      reason: '공기 저항이 적어 볼 스피드가 빨라집니다',
      color: 'text-muted-foreground',
    },
  ];

  const playStyleOptions = [
    { id: 'baseline', label: '베이스라이너', adjust: 1, desc: '후방에서 랠리 중심 플레이' },
    { id: 'allcourt', label: '올코트', adjust: 0, desc: '다양한 위치에서 균형 잡힌 플레이' },
    { id: 'servevolley', label: '서브&발리', adjust: -1, desc: '네트 플레이 중심' },
  ];

  const swingSpeedOptions = [
    { id: 'slow', label: '느림', adjust: -2, desc: '컴팩트한 스윙' },
    { id: 'medium', label: '보통', adjust: 0, desc: '평균적인 스윙 스피드' },
    { id: 'fast', label: '빠름', adjust: 2, desc: '강력하고 빠른 스윙' },
  ];

  // 추천 텐션 계산
  const calculatedTension = useMemo(() => {
    let baseTension = 25;

    // 스트링 타입에 따른 조정
    const selectedString = stringTypes.find((s) => s.id === stringType);
    if (selectedString) {
      baseTension += selectedString.tensionAdjust;
    }

    // 플레이 스타일에 따른 조정
    const styleOption = playStyleOptions.find((o) => o.id === playStyle);
    if (styleOption) {
      baseTension += styleOption.adjust;
    }

    // 스윙 스피드에 따른 조정
    const speedOption = swingSpeedOptions.find((o) => o.id === swingSpeed);
    if (speedOption) {
      baseTension += speedOption.adjust;
    }

    return Math.max(20, Math.min(32, baseTension));
  }, [stringType, playStyle, swingSpeed]);

  const getTensionFeedback = (value: number) => {
    if (value < 22) return { level: 'low', text: '매우 낮음 - 파워 중심', color: 'text-primary' };
    if (value < 25) return { level: 'medium-low', text: '낮음 - 편안함 & 파워', color: 'text-success' };
    if (value < 27) return { level: 'medium', text: '중간 - 균형 잡힌 세팅', color: 'text-primary' };
    if (value < 29) return { level: 'medium-high', text: '높음 - 컨트롤 중심', color: 'text-primary' };
    return { level: 'high', text: '매우 높음 - 최대 컨트롤', color: 'text-muted-foreground' };
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

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-4 bp-sm:gap-6 bp-md:gap-12 text-center">
              <div className="bg-card dark:bg-muted/80 rounded-xl px-4 py-3 bp-sm:px-6 bp-sm:py-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default">
                <div className="text-2xl bp-sm:text-3xl bp-md:text-4xl font-bold text-foreground">20-32kg</div>
                <div className="text-xs bp-sm:text-sm text-muted-foreground">일반 텐션 범위</div>
              </div>
              <div className="bg-card dark:bg-muted/80 rounded-xl px-4 py-3 bp-sm:px-6 bp-sm:py-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default">
                <div className="text-2xl bp-sm:text-3xl bp-md:text-4xl font-bold text-foreground">25-26kg</div>
                <div className="text-xs bp-sm:text-sm text-muted-foreground">가장 많이 사용</div>
              </div>
              <div className="bg-card dark:bg-muted/80 rounded-xl px-4 py-3 bp-sm:px-6 bp-sm:py-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default">
                <div className="text-2xl bp-sm:text-3xl bp-md:text-4xl font-bold text-foreground">10-15%</div>
                <div className="text-xs bp-sm:text-sm text-muted-foreground">24시간 내 텐션 손실</div>
              </div>
            </div>
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
                    {/* 스트링 타입 선택 */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-3">스트링 타입</label>
                      <div className="grid grid-cols-2 gap-2 bp-sm:gap-3">
                        {stringTypes.map((st) => (
                          <button
                            key={st.id}
                            onClick={() => setStringType(st.id as StringType)}
                            className={`p-3 bp-sm:p-4 rounded-xl transition-all duration-200 text-left ${ stringType === st.id ? 'bg-primary/10 dark:bg-primary/20 ring-2 ring-ring shadow-sm' : 'bg-muted/50 dark:bg-muted/50 hover:bg-muted dark:hover:bg-muted hover:shadow-sm' }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <st.icon className={`h-4 w-4 ${stringType === st.id ? 'text-primary' : 'text-muted-foreground'}`} />
                              <span className={`font-medium text-sm ${stringType === st.id ? 'text-primary' : 'text-foreground'}`}>{st.name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{st.recommendedTension}</span>
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
                            className={`p-2 bp-sm:p-3 rounded-xl transition-all duration-200 ${ playStyle === option.id ? 'bg-primary/10 dark:bg-primary/20 ring-2 ring-ring shadow-sm' : 'bg-muted/50 dark:bg-muted/50 hover:bg-muted dark:hover:bg-muted hover:shadow-sm' }`}
                          >
                            <div className={`font-medium text-xs bp-sm:text-sm ${playStyle === option.id ? 'text-primary' : 'text-foreground'}`}>{option.label}</div>
                            <div className="text-[10px] bp-sm:text-xs text-muted-foreground mt-1 hidden bp-sm:block">{option.desc}</div>
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
                            className={`p-2 bp-sm:p-3 rounded-xl transition-all duration-200 ${ swingSpeed === option.id ? 'bg-primary/10 dark:bg-primary/20 ring-2 ring-ring shadow-sm' : 'bg-muted/50 dark:bg-muted/50 hover:bg-muted dark:hover:bg-muted hover:shadow-sm' }`}
                          >
                            <div className={`font-medium text-xs bp-sm:text-sm ${swingSpeed === option.id ? 'text-primary' : 'text-foreground'}`}>{option.label}</div>
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
                      <div className="text-5xl bp-sm:text-6xl bp-md:text-7xl font-bold text-primary mb-2 animate-in fade-in duration-500">{calculatedTension}kg</div>
                      <div className={`text-base bp-md:text-lg font-medium ${getTensionFeedback(calculatedTension).color}`}>{getTensionFeedback(calculatedTension).text}</div>
                    </div>

                    {/* 텐션 시각화 */}
                    <div className="mb-6 bp-md:mb-8">
                      <div className="flex justify-between text-xs text-muted-foreground mb-2">
                        <span>20kg</span>
                        <span>32kg</span>
                      </div>
                      <div className="relative h-3 bp-sm:h-4 bg-muted/30 rounded-full shadow-inner">
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bp-sm:w-6 bp-sm:h-6 bg-card ring-4 ring-ring rounded-full shadow-lg transition-all duration-500 ease-out"
                          style={{ left: `calc(${((calculatedTension - 20) / 12) * 100}% - 12px)` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs mt-2">
                        <span className="text-primary">파워</span>
                        <span className="text-muted-foreground">컨트롤</span>
                      </div>
                    </div>

                    {/* 추천 범위 */}
                    <div className="bg-card/80 dark:bg-muted/80 backdrop-blur-sm rounded-xl p-4 mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">추천 범위</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {calculatedTension - 1}kg ~ {calculatedTension + 1}kg 범위에서 시작하여 본인의 느낌에 따라 조절하세요.
                      </p>
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
                  <Card
                    key={index}
                    className={`cursor-pointer transition-all duration-300 overflow-hidden border bg-card ${isSelected ? 'ring-2 ring-ring shadow-lg' : 'hover:shadow-md'}`}
                    onClick={() => setSelectedLevel(isSelected ? null : index)}
                  >
                    <CardHeader className="pb-3 bp-md:pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 bp-sm:gap-4">
                          <div className={`w-10 h-10 bp-sm:w-12 bp-sm:h-12 bp-md:w-14 bp-md:h-14 ${player.color} rounded-xl bp-md:rounded-2xl flex items-center justify-center shadow-md`}>
                            <IconComponent className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 bp-md:h-7 bp-md:w-7 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base bp-sm:text-lg bp-md:text-xl mb-1 text-card-foreground">{player.type}</CardTitle>
                            <Badge variant="secondary" className="text-sm bp-md:text-base px-2 bp-md:px-3 py-0.5 bp-md:py-1">
                              {player.tension}
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className={`h-4 w-4 bp-md:h-5 bp-md:w-5 text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm bp-md:text-base text-muted-foreground mb-3 bp-md:mb-4">{player.description}</p>

                      {/* 텐션 범위 시각화 */}
                      <div className="mb-3 bp-md:mb-4">
                        <div className="flex justify-between text-[10px] bp-sm:text-xs text-muted-foreground mb-1">
                          <span>20kg</span>
                          <span>32kg</span>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="absolute h-full bg-primary/60 rounded-full"
                            style={{
                              left: `${((player.tensionRange[0] - 20) / 12) * 100}%`,
                              width: `${((player.tensionRange[1] - player.tensionRange[0]) / 12) * 100}%`,
                            }}
                          />
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
                        <div className="mt-3 bp-md:mt-4 pt-3 bp-md:pt-4 border-t border-border animate-in fade-in slide-in-">
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
                      <Badge variant="outline" className="text-xs bp-sm:text-sm bg-transparent">
                        {string.recommendedTension}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 bp-md:space-y-4">
                    <p className="text-sm text-muted-foreground">{string.characteristics}</p>

                    <div className="grid grid-cols-2 gap-3 bp-md:gap-4">
                      <div>
                        <h4 className="text-xs bp-md:text-sm font-semibold text-primary mb-2 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 bp-md:h-4 bp-md:w-4" /> 장점
                        </h4>
                        <ul className="space-y-1">
                          {string.pros.map((pro, i) => (
                            <li key={i} className="text-[10px] bp-sm:text-xs text-muted-foreground flex items-center gap-1">
                              <div className="w-1 h-1 bg-primary/70 rounded-full flex-shrink-0" />
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs bp-md:text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 bp-md:h-4 bp-md:w-4" /> 단점
                        </h4>
                        <ul className="space-y-1">
                          {string.cons.map((con, i) => (
                            <li key={i} className="text-[10px] bp-sm:text-xs text-muted-foreground flex items-center gap-1">
                              <div className="w-1 h-1 bg-muted-foreground/60 rounded-full flex-shrink-0" />
                              {con}
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
                        <div className="w-10 h-10 bp-md:w-12 bp-md:h-12 bg-primary/15 dark:bg-primary/15 rounded-xl flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 bp-md:h-6 bp-md:w-6 text-primary rotate-180" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm bp-md:text-base text-foreground">낮은 텐션 (20-24kg)</h4>
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
                          <h4 className="font-semibold text-sm bp-md:text-base text-foreground">높은 텐션 (28-32kg)</h4>
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
                      <p className="text-xs bp-md:text-sm text-muted-foreground">반드시 필요하지는 않지만, 일부 선수들은 메인을 크로스보다 1-2kg 높게 설정합니다. 이는 스윗스팟을 확장하고 컨트롤과 파워의 균형을 맞추는 데 도움이 됩니다.</p>
                    </div>
                    <div className="border-b border-border pb-3 bp-md:pb-4">
                      <h4 className="font-semibold text-sm bp-md:text-base text-foreground mb-1.5 bp-md:mb-2">새 라켓에는 어떤 텐션으로 시작해야 하나요?</h4>
                      <p className="text-xs bp-md:text-sm text-muted-foreground">라켓 제조사가 권장하는 텐션 범위의 중간값으로 시작하는 것이 좋습니다. 이후 플레이 느낌에 따라 1-2kg씩 조절해 나가세요.</p>
                    </div>
                    <div className="border-b border-border pb-3 bp-md:pb-4">
                      <h4 className="font-semibold text-sm bp-md:text-base text-foreground mb-1.5 bp-md:mb-2">텐션을 자주 바꿔도 되나요?</h4>
                      <p className="text-xs bp-md:text-sm text-muted-foreground">일관된 텐션을 유지하는 것이 플레이 향상에 도움이 됩니다. 하지만 계절 변화나 코트 조건에 따라 1-2kg 정도 조절하는 것은 권장됩니다.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm bp-md:text-base text-foreground mb-1.5 bp-md:mb-2">프로 선수들은 어떤 텐션을 사용하나요?</h4>
                      <p className="text-xs bp-md:text-sm text-muted-foreground">
                        프로 선수들은 보통 23-27kg 범위를 사용합니다. 일반적인 인식과 달리 매우 높은 텐션을 사용하지 않는 경우가 많습니다. 중요한 것은 자신의 플레이 스타일에 맞는 텐션을 찾는 것입니다.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* CTA 섹션 */}
        <Card className="bg-primary/10 border border-primary/20 dark:bg-primary/20 overflow-hidden">
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
        <Card className="bg-primary/10 border border-primary/20 dark:bg-primary/20 overflow-hidden">
          <CardContent className="p-6 bp-sm:p-8 bp-md:p-10 bp-lg:p-12">
            <div className="flex flex-col bp-md:flex-row items-center justify-between gap-4 bp-md:gap-6">
              <div className="text-center bp-md:text-left">
                <h3 className="text-xl bp-sm:text-2xl bp-md:text-3xl font-bold mb-2 text-foreground">나에게 맞는 라켓을 찾아보세요</h3>
                <p className="text-muted-foreground text-sm bp-md:text-base bp-lg:text-lg">라켓 파인더를 활용해 나의 라켓을 선택해보세요</p>
              </div>
              <Button asChild size="lg" variant="secondary" className="px-6 bp-md:px-8 whitespace-nowrap">
                <Link href="/rackets/finder">
                  라켓 파인더 사용하기
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
