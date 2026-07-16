"use client";

import SiteContainer from "@/components/layout/SiteContainer";
import { PublicSurface } from "@/components/public/PublicSurface";
import { SectionHeader } from "@/components/public/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Gauge,
  Layers,
  Lightbulb,
  Settings2,
  Shield,
  Sun,
  Target,
  Thermometer,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { type ComponentType, useMemo, useState } from "react";

type Gender = "female" | "male";
type PlayStyle = "soft" | "control" | "spinPower";
type SwingSpeed = "slow" | "medium" | "fast";
type StringType = "softPoly" | "controlPoly" | "spinPoly" | "syntheticGut" | "naturalGut";

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
  const [gender, setGender] = useState<Gender>("male");
  const [playStyle, setPlayStyle] = useState<PlayStyle>("control");
  const [swingSpeed, setSwingSpeed] = useState<SwingSpeed>("medium");
  const [stringType, setStringType] = useState<StringType>("softPoly");
  const [activeSection, setActiveSection] = useState<string>("calculator");

  // 수준별 가이드는 남/녀 범위를 분리해서 명확히 보여주도록 데이터 구조를 변경합니다.
  const playerTypes = [
    {
      type: "초급자",
      level: 1,
      icon: Users,
      femaleTension: "42~46LB",
      maleTension: "48~52LB",
      femaleRange: [42, 46],
      maleRange: [48, 52],
      description: "컨트롤과 파워의 균형을 맞춘 텐션",
      characteristics: ["파워 증가", "편안한 느낌", "부상 위험 감소", "넓은 스윗스팟"],
      recommended: "기본 세팅은 여자 44LB / 남자 50LB를 기준으로 시작해 보세요",
      color: "bg-secondary",
    },
    {
      type: "중급자",
      level: 2,
      icon: Target,
      femaleTension: "42~46LB",
      maleTension: "48~52LB",
      femaleRange: [42, 46],
      maleRange: [48, 52],
      description: "컨트롤과 파워의 균형을 맞춘 텐션",
      characteristics: ["균형잡힌 플레이", "적당한 컨트롤", "다양한 샷 구사", "스핀 생성 용이"],
      recommended: "안정적인 경기 운영을 위해 여자 44LB / 남자 50LB를 먼저 테스트해 보세요",
      color: "bg-secondary",
    },
    {
      type: "상급자",
      level: 3,
      icon: Zap,
      femaleTension: "44~48LB",
      maleTension: "50~54LB",
      femaleRange: [44, 48],
      maleRange: [50, 54],
      description: "경기 운영의 정밀도를 높이기 위한 텐션",
      characteristics: ["정밀한 컨트롤", "강한 스핀", "빠른 스윙 활용", "일관된 타구감"],
      recommended: "강한 스윙을 쓰는 경우 여자 46LB / 남자 52LB 전후가 안정적입니다",
      color: "bg-secondary",
    },
    {
      type: "프로/투어",
      level: 4,
      icon: TrendingUp,
      femaleTension: "46~50LB",
      maleTension: "52~56LB",
      femaleRange: [46, 50],
      maleRange: [52, 56],
      description: "투어 레벨의 타점 재현성과 정확도를 위한 텐션",
      characteristics: ["최고 컨트롤", "정확한 플레이스먼트", "프로 수준 스핀", "정교한 터치"],
      recommended: "실전 매치 기준으로 여자 48LB / 남자 54LB 세팅부터 미세 조정해 보세요",
      color: "bg-secondary",
    },
  ];

  const tensionAxis = { min: 42, max: 56 };
  const tensionAxisSpan = tensionAxis.max - tensionAxis.min;

  // 스트링 타입은 요청사항에 맞춰 5개로 재구성하고, 성별별 추천 범위/기준점을 함께 보관합니다.
  const stringTypes: StringGuide[] = [
    {
      id: "softPoly",
      name: "소프트(폴리)",
      icon: Sun,
      characteristics:
        "부드러운 타구감과 편안함을 우선하면서도 폴리 특유의 안정감을 원하는 세팅입니다.",
      pros: [
        {
          title: "부상 방지 및 편안함",
          description: "팔과 손목에 전달되는 충격을 줄여 엘보 이슈가 있는 플레이어에게 유리합니다.",
        },
        {
          title: "파워와 반발력 보강",
          description:
            "스트링 베드가 공을 깊게 받아주어, 동일한 스윙에서도 볼이 더 쉽게 뻗어 나갑니다.",
        },
        {
          title: "부드러운 타구감",
          description:
            "타구 시 이질감이 덜하고 손에 전해지는 느낌이 편안해 장시간 플레이에도 부담이 적습니다.",
        },
        {
          title: "우수한 컨트롤",
          description:
            "부드러운 폴리 스트링의 둥근 구조는 공에 힘을 싣기 좋고, 코트 침투력을 높여주는 컨트롤에 유리합니다.",
        },
      ],
      adjustment: "팔 부담을 줄이고 싶다면 기준점에서 시작해 1~2LB씩 올려보세요.",
      bestFor: "엘보 이슈가 있거나 편안한 타구감을 중요하게 보는 플레이어",
      helperText: "폴리에스터 공통 권장 범위: 여자 42~48LB / 남자 48~54LB",
      ranges: {
        female: { min: 42, max: 48, base: 42 },
        male: { min: 48, max: 54, base: 48 },
      },
      color: "bg-secondary",
    },
    {
      id: "controlPoly",
      name: "컨트롤(폴리)",
      icon: Shield,
      characteristics: "강한 스윙에서도 볼을 안정적으로 잡아 주는 컨트롤 중심 폴리 세팅입니다.",
      pros: [
        {
          title: "높은 정밀도",
          description:
            "타구 방향과 깊이를 일정하게 유지하기 쉬워 랠리 안정성과 코스 공략에 강점을 보입니다.",
        },
        {
          title: "볼 홀딩(Holding) 능력",
          description: "임팩트 순간 공을 안정적으로 잡아줘 런치각 제어와 타점 재현성이 좋아집니다.",
        },
        {
          title: "강한 스윙 대응력",
          description:
            "스윙이 커져도 탄도가 과하게 뜨지 않아, 공격적인 템포에서도 컨트롤이 무너지지 않습니다.",
        },
      ],
      adjustment: "공이 짧아지면 1~2LB 낮추고, 런치각이 높으면 1~2LB 높여 보세요.",
      bestFor: "강한 스트로크에서 궤적 안정성과 정확도를 우선하는 플레이어",
      helperText: "폴리에스터 공통 권장 범위: 여자 42~48LB / 남자 48~54LB",
      ranges: {
        female: { min: 42, max: 48, base: 48 },
        male: { min: 48, max: 54, base: 54 },
      },
      color: "bg-muted/40",
    },
    {
      id: "spinPoly",
      name: "스핀(폴리)",
      icon: Zap,
      characteristics:
        "각진 단면과 빠른 스냅백을 활용해 회전량과 탄도 제어를 강화한 폴리 타입입니다.",
      pros: [
        {
          title: "최상급 스핀 성능",
          description:
            "스트링의 형상과 마찰 특성으로 회전량을 높여, 바운드 이후 궤적 변화를 크게 만들 수 있습니다.",
        },
        {
          title: "컨트롤과 홀딩력 강화",
          description:
            "회전뿐 아니라 볼을 잡아주는 느낌이 좋아 공격과 수비 전환 시 탄도 제어가 안정적입니다.",
        },
        {
          title: "스냅백 기반 구질 압박",
          description:
            "빠른 복원력으로 탑스핀·슬라이스 구질을 더 날카롭게 만들어 상대 타점을 흔들기 좋습니다.",
        },
      ],
      adjustment: "회전량은 충분한데 비거리가 부족하면 1LB씩 낮춰 탄성을 확보하세요.",
      bestFor: "탑스핀/슬라이스 활용이 많고 볼의 궤적 제어가 중요한 플레이어",
      helperText: "폴리에스터 공통 권장 범위: 여자 42~48LB / 남자 48~54LB",
      ranges: {
        female: { min: 42, max: 48, base: 46 },
        male: { min: 48, max: 54, base: 52 },
      },
      color: "bg-secondary",
    },
    {
      id: "syntheticGut",
      name: "인조쉽",
      icon: Layers,
      characteristics: "부담 없이 쓰기 좋은 만능형 세팅으로, 반발력과 컨트롤의 균형이 좋습니다.",
      pros: [
        "가성비가 좋고 세팅이 쉬움",
        "초중급자에게 무난한 타구감",
        "적당한 파워와 안정적인 구질",
      ],
      adjustment: "기준점에서 시작한 뒤 볼이 뜨면 +1LB, 짧으면 -1LB로 미세 조정하세요.",
      bestFor: "연습량이 많고 관리가 쉬운 범용 세팅을 원하는 플레이어",
      ranges: {
        female: { min: 42, max: 46, base: 44 },
        male: { min: 48, max: 52, base: 50 },
      },
      color: "bg-muted/40",
    },
    {
      id: "naturalGut",
      name: "내추럴 거트",
      icon: Zap,
      characteristics:
        "풍부한 반발력과 깊은 포켓팅으로 프리미엄 타구감을 제공하는 고급 세팅입니다.",
      pros: [
        "우수한 탄성과 편안함",
        "긴장 유지력이 좋아 안정적인 타구감",
        "섬세한 터치 플레이에 유리",
      ],
      adjustment: "비·습기에 민감하므로 보관 상태를 관리하고 범위 내에서 1LB 단위 조정하세요.",
      bestFor: "손맛과 반발력, 텐션 유지력을 모두 챙기고 싶은 플레이어",
      ranges: {
        female: { min: 46, max: 50, base: 48 },
        male: { min: 50, max: 55, base: 53 },
      },
      color: "bg-secondary",
    },
  ];

  const environmentFactors = [
    {
      factor: "날씨 - 더운 날",
      icon: Sun,
      adjustment: "+2~4LB",
      reason: "열로 인해 스트링이 늘어나므로 텐션을 높여야 합니다",
      color: "text-muted-foreground",
    },
    {
      factor: "날씨 - 추운 날",
      icon: Thermometer,
      adjustment: "-2~4LB",
      reason: "추위로 스트링이 딱딱해지므로 텐션을 낮춰야 합니다",
      color: "text-primary",
    },
  ];

  const playStyleOptions = [
    {
      id: "soft",
      label: "소프트",
      adjust: -2,
      desc: "편안함과 파워를 우선하는 플레이",
    },
    {
      id: "control",
      label: "컨트롤",
      adjust: 0,
      desc: "안정적인 탄도와 밸런스 중심",
    },
    {
      id: "spinPower",
      label: "스핀 파워",
      adjust: 2,
      desc: "회전과 구질 압박을 강화하는 플레이",
    },
  ];

  const swingSpeedOptions = [
    { id: "slow", label: "느림", adjust: -2, desc: "컴팩트한 스윙" },
    { id: "medium", label: "보통", adjust: 0, desc: "평균적인 스윙 스피드" },
    { id: "fast", label: "빠름", adjust: 2, desc: "강력하고 빠른 스윙" },
  ];

  const selectedString = stringTypes.find((st) => st.id === stringType) ?? stringTypes[0];

  const selectedRange: TensionRange = selectedString.ranges[gender];
  const oppositeGender: Gender = gender === "female" ? "male" : "female";
  const oppositeRange: TensionRange = selectedString.ranges[oppositeGender];
  const styleAdjust = playStyleOptions.find((option) => option.id === playStyle)?.adjust ?? 0;
  const speedAdjust = swingSpeedOptions.find((option) => option.id === swingSpeed)?.adjust ?? 0;
  const rawTensionValue = selectedRange.base + styleAdjust + speedAdjust;

  const clampReason = useMemo(() => {
    if (rawTensionValue < selectedRange.min) {
      return { label: "추천 범위 하한 적용", value: selectedRange.min };
    }

    if (rawTensionValue > selectedRange.max) {
      return { label: "추천 범위 상한 적용", value: selectedRange.max };
    }

    return { label: "범위 내 계산값", value: rawTensionValue };
  }, [rawTensionValue, selectedRange.max, selectedRange.min]);

  // 계산 공식: (성별 + 스트링 기준점) + 플레이 스타일 보정 + 스윙 스피드 보정 후, 선택 범위 내로 clamp
  // 중간 계산값과 범위 제한 결과를 분리해서 보여줘야 사용자가 최종값 산출 과정을 이해할 수 있다.
  const calculatedTension = useMemo(() => {
    return Math.max(selectedRange.min, Math.min(selectedRange.max, rawTensionValue));
  }, [rawTensionValue, selectedRange]);

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
      return { text: "편안함과 파워 중심 세팅", color: "text-primary" };
    }

    if (relativePosition <= 2 / 3) {
      return {
        text: "컨트롤과 파워의 균형 세팅",
        color: "text-muted-foreground",
      };
    }

    return { text: "컨트롤 중심 세팅", color: "text-foreground" };
  };

  const basisRows = [
    { label: "기준점", value: `${selectedRange.base}LB` },
    { label: "플레이 스타일 보정", value: `${styleAdjust > 0 ? `+${styleAdjust}` : styleAdjust}LB` },
    { label: "스윙 스피드 보정", value: `${speedAdjust > 0 ? `+${speedAdjust}` : speedAdjust}LB` },
    { label: "중간 계산값", value: `${rawTensionValue}LB` },
    { label: clampReason.label, value: `${clampReason.value}LB` },
    { label: "최종 추천", value: `${calculatedTension}LB`, emphasis: true },
  ];

  const choiceClass = (selected: boolean, align: "left" | "center" = "left", reserveIconSpace = false) =>
    `relative rounded-xl border p-3 ${reserveIconSpace ? "pr-7" : ""} ${
      align === "center" ? "text-center" : "text-left"
    } transition-[background-color,color,border-color,box-shadow,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
      selected
        ? "border-brand-highlight-ink/40 bg-brand-highlight-muted text-foreground shadow-sm"
        : "border-border bg-card text-foreground hover:bg-muted/40"
    }`;

  const renderPros = (pros: StringPro[]) =>
    pros.map((pro, index) => (
      <li key={index} className="flex gap-2 text-ui-body-sm leading-relaxed text-muted-foreground">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-highlight-ink" aria-hidden />
        {typeof pro === "string" ? (
          <span>{pro}</span>
        ) : (
          <span>
            <strong className="font-semibold text-foreground">{pro.title}</strong> — {pro.description}
          </span>
        )}
      </li>
    ));

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border bg-muted/30">
        <SiteContainer className="grid gap-8 py-10 bp-lg:grid-cols-[minmax(0,1fr)_24rem] bp-lg:items-center bp-lg:py-14">
          <div className="space-y-6">
            <Badge variant="outline" className="w-fit gap-2 border-brand-highlight-ink/30 bg-brand-highlight-muted text-brand-highlight-ink">
              <Gauge className="h-3.5 w-3.5" aria-hidden />
              TENSION LAB
            </Badge>
            <div className="max-w-3xl space-y-4">
              <h1 className="font-brand-heading text-ui-page-title font-semibold tracking-[-0.02em] text-foreground bp-md:text-ui-page-title-lg">
                감이 아닌 플레이 조건으로 적정 장력을 좁혀보세요.
              </h1>
              <p className="text-ui-body leading-relaxed text-muted-foreground bp-md:text-ui-body-lg">
                성별, 스윙 스피드, 스트링 타입과 플레이 스타일을 기준으로 시작 장력을 확인하고 실제 타구감에 맞춰 1LB 단위로 조정해 보세요.
              </p>
            </div>
            <div className="flex flex-col gap-3 bp-sm:flex-row">
              <Button asChild variant="highlight" size="lg" className="w-full bp-sm:w-auto">
                <Link href="#tension-guide-workspace">텐션 계산 시작하기</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full bp-sm:w-auto">
                <Link href="/services">교체서비스 보기</Link>
              </Button>
            </div>
          </div>
          <PublicSurface variant="feature" className="space-y-4">
            <p className="text-ui-label font-semibold uppercase tracking-[0.14em] text-muted-foreground">이용 흐름</p>
            {[
              "플레이 조건 선택",
              "추천 범위와 계산값 확인",
              "실제 타구감에 따라 1LB 단위 조정",
            ].map((step, index) => (
              <div key={step} className="flex items-center gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-highlight-muted text-ui-label font-semibold text-brand-highlight-ink">{index + 1}</span>
                <span className="text-ui-body-sm font-medium text-foreground">{step}</span>
              </div>
            ))}
          </PublicSurface>
        </SiteContainer>
      </section>

      <SiteContainer className="py-6 bp-md:py-10 bp-lg:pb-16">
        <Tabs id="tension-guide-workspace" value={activeSection} onValueChange={setActiveSection} className="mb-8 scroll-mt-[calc(var(--header-h)+1rem)] bp-md:mb-12">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-muted p-1 bp-sm:grid-cols-4">
            {[
              { value: "calculator", label: "계산기", icon: BarChart3 },
              { value: "levels", label: "수준별", icon: Users },
              { value: "strings", label: "스트링", icon: Layers },
              { value: "tips", label: "전문가 팁", icon: Lightbulb },
            ].map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 rounded-lg border border-transparent py-2.5 text-ui-label text-muted-foreground data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm bp-sm:text-ui-body-sm">
                <tab.icon className="h-3.5 w-3.5" aria-hidden />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="calculator" className="mt-8 space-y-6">
            <SectionHeader eyebrow="Calculator" title="조건을 입력하고 추천 장력을 확인하세요" description="입력과 결과를 한 화면에서 비교하며 스트링 기준점, 보정값, 범위 제한 과정을 함께 확인할 수 있습니다." />
            <PublicSurface variant="feature" padding="none" className="overflow-hidden">
              <div className="grid bp-lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.9fr)]">
                <div className="space-y-7 p-4 bp-sm:p-6 bp-lg:p-8">
                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 text-ui-card-title font-semibold text-foreground"><Settings2 className="h-4 w-4 text-muted-foreground" aria-hidden />플레이 조건 입력</h3>
                    <p className="text-ui-body-sm text-muted-foreground">모든 선택지는 계산값에 즉시 반영됩니다.</p>
                  </div>
                  <div className="space-y-5">
                    <div className="space-y-2"><p className="text-ui-body-sm font-semibold text-foreground">성별</p><div className="grid grid-cols-2 gap-2">{[{id:"female",label:"여자",desc:"여성 추천 범위"},{id:"male",label:"남자",desc:"남성 추천 범위"}].map((option)=>(<button key={option.id} type="button" aria-pressed={gender===option.id} onClick={()=>setGender(option.id as Gender)} className={choiceClass(gender===option.id)}><span className="flex items-center justify-between gap-2 text-ui-body-sm font-semibold">{option.label}{gender===option.id&&<CheckCircle2 className="h-4 w-4 text-brand-highlight-ink" aria-hidden />}</span><span className="mt-1 block text-ui-label text-muted-foreground">{option.desc}</span></button>))}</div></div>
                    <div className="space-y-2"><p className="text-ui-body-sm font-semibold text-foreground">스윙 스피드</p><div className="grid grid-cols-3 gap-2">{swingSpeedOptions.map((option)=>(<button key={option.id} type="button" aria-pressed={swingSpeed===option.id} onClick={()=>setSwingSpeed(option.id as SwingSpeed)} className={choiceClass(swingSpeed===option.id,"center",true)}><span className="block text-ui-label font-semibold bp-sm:text-ui-body-sm">{option.label}</span><span className="mt-1 hidden text-ui-label text-muted-foreground bp-sm:block">{option.desc}</span>{swingSpeed===option.id&&<CheckCircle2 className="absolute right-2 top-2 h-3.5 w-3.5 text-brand-highlight-ink" aria-hidden />}</button>))}</div></div>
                    <div className="space-y-2"><p className="text-ui-body-sm font-semibold text-foreground">스트링 타입</p><div className="grid grid-cols-2 gap-2">{stringTypes.map((st)=>(<button key={st.id} type="button" aria-pressed={stringType===st.id} onClick={()=>setStringType(st.id)} className={choiceClass(stringType===st.id,"left",true)}><span className="flex items-center gap-2 text-ui-body-sm font-semibold"><st.icon className="h-4 w-4 text-muted-foreground" aria-hidden />{st.name}</span><span className="mt-1 block text-ui-label text-muted-foreground tabular-nums">여 {st.ranges.female.min}~{st.ranges.female.max} · 남 {st.ranges.male.min}~{st.ranges.male.max}LB</span>{stringType===st.id&&<CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-brand-highlight-ink" aria-hidden />}</button>))}</div></div>
                    <div className="space-y-2"><p className="text-ui-body-sm font-semibold text-foreground">플레이 스타일</p><div className="grid grid-cols-3 gap-2">{playStyleOptions.map((option)=>(<button key={option.id} type="button" aria-pressed={playStyle===option.id} onClick={()=>setPlayStyle(option.id as PlayStyle)} className={choiceClass(playStyle===option.id,"center",true)}><span className="block text-ui-label font-semibold bp-sm:text-ui-body-sm">{option.label}</span><span className="mt-1 hidden text-ui-label text-muted-foreground bp-sm:block">{option.desc}</span>{playStyle===option.id&&<CheckCircle2 className="absolute right-2 top-2 h-3.5 w-3.5 text-brand-highlight-ink" aria-hidden />}</button>))}</div></div>
                  </div>
                </div>
                <div className="bg-surface-inverse p-4 text-surface-inverse-foreground bp-sm:p-6 bp-lg:p-8" aria-live="polite">
                  <div className="space-y-6">
                    <div><p className="text-ui-label font-medium uppercase tracking-[0.14em] text-surface-inverse-muted">추천 텐션</p><div className="mt-3 flex items-end gap-2"><span className="text-ui-page-title-lg font-semibold tabular-nums text-brand-highlight">{calculatedTension}</span><span className="pb-2 text-ui-card-title font-semibold text-brand-highlight">LB</span></div><p className="mt-2 text-ui-body text-surface-inverse-muted">{getTensionFeedback().text}</p></div>
                    <div role="meter" aria-valuemin={42} aria-valuemax={56} aria-valuenow={calculatedTension} aria-label={`추천 텐션 ${calculatedTension}LB, 전체 축 42LB에서 56LB 사이`} className="space-y-2"><div className="flex justify-between text-ui-label text-surface-inverse-muted"><span>42LB</span><span>56LB</span></div><div className="relative h-3 rounded-full bg-surface-inverse-foreground/15"><div className="absolute top-1/2 h-5 w-5 -translate-x-[10px] -translate-y-1/2 rounded-full border-2 border-brand-highlight bg-surface-inverse transition-[left] duration-500" style={{ left: `${gaugePosition}%` }} /></div><div className="flex justify-between text-ui-label text-surface-inverse-muted"><span>파워</span><span>컨트롤</span></div></div>
                    <div className="grid gap-3 border-y border-surface-inverse-foreground/15 py-4 bp-sm:grid-cols-2"><div><p className="text-ui-label text-surface-inverse-muted">선택 성별 추천 범위</p><p className="mt-1 text-ui-body font-semibold tabular-nums">{gender === "female" ? "여자" : "남자"} {selectedRange.min}~{selectedRange.max}LB</p></div><div><p className="text-ui-label text-surface-inverse-muted">반대 성별 참고 범위</p><p className="mt-1 text-ui-body font-semibold tabular-nums">{oppositeGender === "female" ? "여자" : "남자"} {oppositeRange.min}~{oppositeRange.max}LB</p></div></div>
                    <div><h3 className="text-ui-body-sm font-semibold text-surface-inverse-foreground">계산 근거</h3><ul className="mt-2 divide-y divide-surface-inverse-foreground/15">{basisRows.map((row)=>(<li key={row.label} className="flex items-center justify-between gap-4 py-2 text-ui-body-sm"><span className={row.emphasis ? "font-semibold text-surface-inverse-foreground" : "text-surface-inverse-muted"}>{row.label}</span><span className={row.emphasis ? "font-semibold tabular-nums text-brand-highlight" : "font-medium tabular-nums text-surface-inverse-foreground"}>{row.value}</span></li>))}</ul></div>
                  </div>
                </div>
              </div>
            </PublicSurface>
            <PublicSurface className="space-y-4"><SectionHeader eyebrow="Environment" title="환경에 따른 조정" description="기온 변화는 스트링 탄성과 타구감에 영향을 주므로 같은 장력도 다르게 느껴질 수 있습니다." /> <div className="grid bp-sm:grid-cols-2">{environmentFactors.map((factor,index)=>(<div key={factor.factor} className="flex gap-3 border-t border-border pt-4 bp-sm:border-l bp-sm:border-t-0 bp-sm:pl-5 bp-sm:pt-0 bp-sm:first:border-l-0 bp-sm:first:pl-0"><factor.icon className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden /><div><p className="text-ui-body-sm font-semibold text-foreground">{factor.factor}</p><p className="mt-1 text-ui-card-title font-semibold tabular-nums text-foreground">{factor.adjustment}</p><p className="mt-1 text-ui-body-sm text-muted-foreground">{factor.reason}</p></div></div>))}</div></PublicSurface>
          </TabsContent>

          <TabsContent value="levels" className="mt-8 space-y-6"><SectionHeader eyebrow="Level Guide" title="수준별 남녀 추천 장력 비교" description="모든 범위는 42~56LB 공통 축 위에서 비교됩니다." /><PublicSurface padding="none" className="overflow-hidden">{playerTypes.map((player,index)=>{const IconComponent=player.icon; const isSelected=selectedLevel===index; return <div key={player.type} className="border-t border-border first:border-t-0"><button type="button" aria-expanded={isSelected} onClick={()=>setSelectedLevel(isSelected ? null : index)} className="flex w-full flex-col gap-4 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bp-md:p-6"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/30 text-muted-foreground"><IconComponent className="h-5 w-5" aria-hidden /></span><div><h3 className="text-ui-card-title font-semibold text-foreground">{player.type}</h3><p className="mt-1 text-ui-body-sm text-muted-foreground">{player.description}</p></div></div><ChevronRight className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${isSelected ? "rotate-90" : ""}`} aria-hidden /></div><div className="grid gap-4 bp-md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><div className="grid grid-cols-2 gap-2 text-ui-body-sm"><Badge variant="secondary" className="justify-center tabular-nums">여자 {player.femaleTension}</Badge><Badge variant="outline" className="justify-center tabular-nums">남자 {player.maleTension}</Badge></div><div className="space-y-3"><div className="space-y-1"><div className="flex items-center justify-between gap-2 text-ui-label text-muted-foreground"><span className="font-medium text-foreground">여자 · {player.femaleTension}</span><span>{tensionAxis.min}~{tensionAxis.max}LB 축</span></div><div className="relative h-2 rounded-full bg-muted"><div className="absolute h-full rounded-full bg-brand-highlight-muted ring-1 ring-brand-highlight-ink/30" style={getRangeBarStyle(player.femaleRange[0], player.femaleRange[1])}/></div></div><div className="space-y-1"><div className="flex items-center justify-between gap-2 text-ui-label text-muted-foreground"><span className="font-medium text-foreground">남자 · {player.maleTension}</span><span>{tensionAxis.min}~{tensionAxis.max}LB 축</span></div><div className="relative h-2 rounded-full bg-muted"><div className="absolute h-full rounded-full bg-muted-foreground/35" style={getRangeBarStyle(player.maleRange[0], player.maleRange[1])}/></div></div></div></div><div className="flex flex-wrap gap-2">{player.characteristics.map((char)=><span key={char} className="rounded-full bg-muted/50 px-2.5 py-1 text-ui-label text-muted-foreground">{char}</span>)}</div></button>{isSelected&&<div className="border-t border-border bg-muted/30 p-4 bp-md:px-6"><p className="flex gap-2 text-ui-body-sm text-foreground"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />{player.recommended}</p></div>}</div>})}</PublicSurface></TabsContent>

          <TabsContent value="strings" className="mt-8 space-y-6"><SectionHeader eyebrow="String Type" title="스트링 타입별 특성과 조정 팁" description="상단에서 선택한 스트링 타입은 계산기 추천값에도 그대로 반영됩니다." /><div className="grid grid-cols-2 gap-2 bp-lg:grid-cols-5">{stringTypes.map((st)=><button key={st.id} type="button" aria-pressed={stringType===st.id} onClick={()=>setStringType(st.id)} className={choiceClass(stringType===st.id,"center",true)}><st.icon className="mx-auto mb-2 h-4 w-4 text-muted-foreground" aria-hidden /><span className="text-ui-label font-semibold bp-sm:text-ui-body-sm">{st.name}</span>{stringType===st.id&&<CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-brand-highlight-ink" aria-hidden />}</button>)}</div><PublicSurface className="space-y-6"><div className="flex flex-col gap-3 bp-md:flex-row bp-md:items-start bp-md:justify-between"><div><h3 className="text-ui-section-title font-semibold text-foreground">{selectedString.name}</h3><p className="mt-2 text-ui-body-sm leading-relaxed text-muted-foreground">{selectedString.characteristics}</p></div><div className="flex flex-wrap gap-2"><Badge variant="secondary" className="tabular-nums">여자 {selectedString.ranges.female.min}~{selectedString.ranges.female.max}LB</Badge><Badge variant="outline" className="tabular-nums">남자 {selectedString.ranges.male.min}~{selectedString.ranges.male.max}LB</Badge></div></div>{selectedString.helperText&&<p className="rounded-xl bg-muted/30 p-3 text-ui-body-sm text-muted-foreground">{selectedString.helperText}</p>}<div className="grid gap-6 bp-lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]"><div><h4 className="text-ui-body-sm font-semibold text-foreground">장점</h4><ul className="mt-3 space-y-2">{renderPros(selectedString.pros)}</ul></div><div className="space-y-4 border-t border-border pt-5 bp-lg:border-l bp-lg:border-t-0 bp-lg:pl-6 bp-lg:pt-0"><div><p className="text-ui-body-sm font-semibold text-foreground">텐션 조정 팁</p><p className="mt-1 text-ui-body-sm leading-relaxed text-muted-foreground">{selectedString.adjustment}</p></div><div><p className="text-ui-body-sm font-semibold text-foreground">추천 대상</p><p className="mt-1 text-ui-body-sm leading-relaxed text-muted-foreground">{selectedString.bestFor}</p></div></div></div></PublicSurface></TabsContent>

          <TabsContent value="tips" className="mt-8 space-y-6"><SectionHeader eyebrow="Expert Tips" title="텐션 관리와 자주 묻는 질문" description="장력의 높고 낮음이 만드는 차이와 교체 판단 기준을 한 번에 확인하세요." /><PublicSurface padding="none" className="overflow-hidden"><div className="grid bp-md:grid-cols-2">{[{title:"낮은 텐션",desc:"파워와 편안함 중심",icon:<TrendingUp className="h-5 w-5 rotate-180" aria-hidden />,items:["스트링 베드가 더 많이 휘어져 볼에 더 많은 에너지를 전달합니다","스윗스팟이 넓어져 미스히트 시에도 괜찮은 샷이 나옵니다","팔과 어깨에 가해지는 충격이 줄어들어 부상 위험이 감소합니다"],caution:"정밀한 컨트롤이 어려울 수 있습니다"},{title:"높은 텐션",desc:"컨트롤과 정밀함 중심",icon:<TrendingUp className="h-5 w-5" aria-hidden />,items:["스트링 베드가 단단해져 정밀한 샷 컨트롤이 가능합니다","스핀 생성이 용이하고 볼의 궤적을 예측하기 쉽습니다","강한 스윙 스피드를 가진 선수에게 적합합니다"],caution:"팔에 무리가 갈 수 있으며 파워가 줄어들 수 있습니다"}].map((tip)=><div key={tip.title} className="space-y-4 border-t border-border p-4 first:border-t-0 bp-md:border-l bp-md:border-t-0 bp-md:p-6 bp-md:first:border-l-0"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/30 text-muted-foreground">{tip.icon}</span><div><h3 className="text-ui-card-title font-semibold text-foreground">{tip.title}</h3><p className="text-ui-body-sm text-muted-foreground">{tip.desc}</p></div></div><ul className="space-y-2">{tip.items.map((item)=><li key={item} className="flex gap-2 text-ui-body-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />{item}</li>)}<li className="flex gap-2 text-ui-body-sm text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />{tip.caution}</li></ul></div>)}</div></PublicSurface><PublicSurface padding="none" className="overflow-hidden"><div className="grid bp-lg:grid-cols-3">{[{title:"텐션 손실 이해하기",icon:Gauge,body:"스트링은 장착 후 지속적으로 텐션이 감소합니다.",items:["첫 24시간: 10-15% 손실","첫 주: 추가 5-10% 손실","이후: 점진적 안정화"]},{title:"스트링 보관 팁",icon:Shield,body:"올바른 보관은 스트링 수명과 텐션 유지에 중요합니다.",items:["직사광선 피하기","극단적 온도 피하기","라켓 커버 사용"]},{title:"교체 시기 판단",icon:Target,body:"다음 신호가 나타나면 교체를 고려하세요.",items:["탄력 감소 느낌","노칭(홈) 발생","변색 또는 보풀"]}].map((tip)=><div key={tip.title} className="border-t border-border p-4 first:border-t-0 bp-lg:border-l bp-lg:border-t-0 bp-lg:p-6 bp-lg:first:border-l-0"><div className="flex items-center gap-2"><tip.icon className="h-4 w-4 text-muted-foreground" aria-hidden /><h3 className="text-ui-body-sm font-semibold text-foreground">{tip.title}</h3></div><p className="mt-3 text-ui-body-sm text-muted-foreground">{tip.body}</p><ul className="mt-3 space-y-2">{tip.items.map((item)=><li key={item} className="flex gap-2 text-ui-body-sm text-muted-foreground"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden />{item}</li>)}</ul></div>)}</div></PublicSurface><PublicSurface><SectionHeader eyebrow="FAQ" title="자주 묻는 질문" /><Accordion type="single" className="mt-2"><AccordionItem value="main-cross"><AccordionTrigger value="main-cross" className="gap-3 text-foreground"><span className="min-w-0">메인과 크로스 텐션을 다르게 해야 하나요?</span></AccordionTrigger><AccordionContent value="main-cross" className="pb-4 text-ui-body-sm leading-relaxed text-muted-foreground">반드시 필요하지는 않지만, 일부 선수들은 메인을 크로스보다 2-4LB 높게 설정합니다. 이는 스윗스팟을 확장하고 컨트롤과 파워의 균형을 맞추는 데 도움이 됩니다.</AccordionContent></AccordionItem><AccordionItem value="new-racket"><AccordionTrigger value="new-racket" className="gap-3 text-foreground"><span className="min-w-0">새 라켓에는 어떤 텐션으로 시작해야 하나요?</span></AccordionTrigger><AccordionContent value="new-racket" className="pb-4 text-ui-body-sm leading-relaxed text-muted-foreground">라켓 제조사가 권장하는 텐션 범위의 중간값으로 시작하는 것이 좋습니다. 이후 플레이 느낌에 따라 2-4LB씩 조절해 나가세요.</AccordionContent></AccordionItem><AccordionItem value="change-often"><AccordionTrigger value="change-often" className="gap-3 text-foreground"><span className="min-w-0">텐션을 자주 바꿔도 되나요?</span></AccordionTrigger><AccordionContent value="change-often" className="pb-4 text-ui-body-sm leading-relaxed text-muted-foreground">일관된 텐션을 유지하는 것이 플레이 향상에 도움이 됩니다. 하지만 계절 변화나 코트 조건에 따라 2-4LB 정도 조절하는 것은 권장됩니다.</AccordionContent></AccordionItem><AccordionItem value="pro"><AccordionTrigger value="pro" className="gap-3 text-foreground"><span className="min-w-0">프로 선수들은 어떤 텐션을 사용하나요?</span></AccordionTrigger><AccordionContent value="pro" className="pb-4 text-ui-body-sm leading-relaxed text-muted-foreground">프로 선수들은 보통 51-60LB 범위를 사용합니다. 일반적인 인식과 달리 매우 높은 텐션을 사용하지 않는 경우가 많습니다. 중요한 것은 자신의 플레이 스타일에 맞는 텐션을 찾는 것입니다.</AccordionContent></AccordionItem></Accordion></PublicSurface></TabsContent>
        </Tabs>

        <PublicSurface className="flex flex-col gap-5 bg-muted/30 bp-lg:flex-row bp-lg:items-center bp-lg:justify-between">
          <div className="space-y-2"><h2 className="text-ui-section-title font-semibold text-foreground">추천 장력을 실제 세팅으로 이어가세요</h2><p className="text-ui-body-sm text-muted-foreground">계산값을 기준으로 스트링 서비스를 신청하거나, 라켓 검색으로 나에게 맞는 라켓을 함께 확인할 수 있습니다.</p></div>
          <div className="flex w-full flex-col gap-3 bp-sm:flex-row bp-lg:w-auto"><Button asChild variant="highlight" size="lg" className="w-full bp-sm:w-auto"><Link href="/services/apply">스트링 신청하기<ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Link></Button><Button asChild variant="outline" size="lg" className="w-full bp-sm:w-auto"><Link href="/rackets/finder">라켓 검색 사용하기<ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Link></Button></div>
        </PublicSurface>
      </SiteContainer>
    </div>
  );
}
