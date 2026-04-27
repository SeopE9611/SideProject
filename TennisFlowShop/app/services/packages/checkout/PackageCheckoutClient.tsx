"use client";

import TossPaymentWidget from "@/app/checkout/TossPaymentWidget";
import UnifiedPackageCard from "@/app/services/packages/_components/UnifiedPackageCard";
import { normalizePackageCardData, type PackageCardData } from "@/app/services/packages/_lib/packageCard";
import { getPackageVariantByIndex, toPackageVariant } from "@/app/services/packages/_lib/packageVariant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { bankLabelMap } from "@/lib/constants";
import { useBackNavigationGuard } from "@/lib/hooks/useBackNavigationGuard";
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";
import { isNicePaymentsEnabled, isTossPaymentsEnabled } from "@/lib/payments/provider-flags";
import { Building2, Calendar, CheckCircle, CreditCard, Loader2, Mail, MessageSquare, Package, Phone, Shield, Star, UserIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import PackageCheckoutButton from "./PackageCheckoutButton";
import PackageNiceCheckoutButton from "./PackageNiceCheckoutButton";
import PackageTossCheckoutButton from "./PackageTossCheckoutButton";

// 클라이언트 유효성(UX용)
type CheckoutField = "name" | "email" | "phone" | "depositor";
type CheckoutFieldErrors = Partial<Record<CheckoutField, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const onlyDigits = (v: string) => String(v ?? "").replace(/\D/g, "");
const isValidKoreanPhone = (v: string) => /^010\d{8}$/.test(onlyDigits(v));

type UserLite = { id: string; name?: string; email?: string };
type UserPrefill = UserLite & { phone?: string };

type PackageConfigLike = {
  id?: string;
  name?: string;
  sessions?: number;
  price?: number;
  originalPrice?: number;
  isPopular?: boolean;
  description?: string;
  validityDays?: number | string;
  features?: string[];
  variant?: string;
};

const TEMPLATE_PACKAGES: Record<string, PackageCardData> = {
  "10-sessions": normalizePackageCardData({
    id: "10-sessions",
    title: "스타터 패키지",
    sessions: 10,
    price: 100000,
    originalPrice: 120000,
    features: ["10회 스트링 교체", "무료 장력 상담", "기본 스트링 포함"],
    benefits: ["2만원 절약"],
    variant: "primary",
    description: "테니스를 시작하는 분들에게 적합한 기본 패키지",
    validityPeriod: "3개월",
  }),
  "30-sessions": normalizePackageCardData({
    id: "30-sessions",
    title: "레귤러 패키지",
    sessions: 30,
    price: 300000,
    originalPrice: 360000,
    popular: true,
    features: ["30회 스트링 교체", "무료 장력 상담", "프리미엄 스트링 선택", "우선 예약"],
    benefits: ["6만원 절약", "우선 예약 혜택"],
    variant: "accent",
    description: "정기적으로 테니스를 즐기는 분들을 위한 인기 패키지",
    validityPeriod: "6개월",
  }),
  "50-sessions": normalizePackageCardData({
    id: "50-sessions",
    title: "프로 패키지",
    sessions: 50,
    price: 500000,
    originalPrice: 600000,
    features: ["50회 스트링 교체", "무료 장력 상담", "프리미엄 스트링 선택", "우선 예약", "무료 그립 교체 5회"],
    benefits: ["10만원 절약", "그립 교체 혜택"],
    variant: "primary",
    description: "진지한 테니스 플레이어를 위한 프리미엄 패키지",
    validityPeriod: "9개월",
  }),
  "100-sessions": normalizePackageCardData({
    id: "100-sessions",
    title: "챔피언 패키지",
    sessions: 100,
    price: 1000000,
    originalPrice: 1200000,
    features: ["100회 스트링 교체", "무료 장력 상담", "프리미엄 스트링 선택", "우선 예약", "무료 그립 교체 10회"],
    benefits: ["20만원 절약", "전용 서비스"],
    variant: "primary",
    description: "프로 선수와 열정적인 플레이어를 위한 최고급 패키지",
    validityPeriod: "12개월",
  }),
};

function mapSelectedPackageFromConfigs(packageId: string | null, configs: PackageConfigLike[]): PackageCardData | null {
  if (!packageId) return null;

  // DB 설정에서 동일 ID를 찾는다. (checkout 첫 진입에 필요한 핵심 데이터)
  const configIndex = configs.findIndex((pkg) => pkg.id === packageId);
  const config = configIndex >= 0 ? configs[configIndex] : null;

  if (!config) {
    // 옛 URL fallback
    return TEMPLATE_PACKAGES[packageId] ?? null;
  }

  const sessions = Number(config.sessions || 0);
  const price = Number(config.price || 0);
  const originalPrice = Number(config.originalPrice != null ? config.originalPrice : price);

  const templateKey = sessions === 10 ? "10-sessions" : sessions === 30 ? "30-sessions" : sessions === 50 ? "50-sessions" : sessions === 100 ? "100-sessions" : undefined;
  const base = templateKey ? TEMPLATE_PACKAGES[templateKey] : null;
  const variant = toPackageVariant(config.variant, base?.variant ?? (config.isPopular ? "accent" : getPackageVariantByIndex(configIndex)));

  return normalizePackageCardData({
    id: config.id ?? packageId,
    title: config.name || base?.title || "",
    sessions,
    price,
    originalPrice,
    popular: Boolean(config.isPopular ?? base?.popular),
    description: config.description || base?.description || "",
    validityPeriod: config.validityDays,
    variant,
    features: Array.isArray(config.features) && config.features.length > 0 ? config.features : (base?.features ?? []),
    benefits: base?.benefits ?? [],
  });
}

export default function PackageCheckoutClient({
  initialUser,
  initialQuery,
  initialPackageConfigs = [],
  initialOwnershipBlockedMessage = null,
}: {
  initialUser: UserPrefill;
  initialQuery?: { package?: string };
  initialPackageConfigs?: PackageConfigLike[];
  initialOwnershipBlockedMessage?: string | null;
}) {
  const searchParams = useSearchParams();
  const packageId = searchParams.get("package") ?? initialQuery?.package ?? null;

  // 선택된 패키지 정보 (DB 설정 + 템플릿 병합 결과)
  const [selectedPackage, setSelectedPackage] = useState<PackageCardData | null>(() => {
    return mapSelectedPackageFromConfigs(packageId, initialPackageConfigs);
  });

  // 서버 선조회가 있으면 mount 후 추가 fetch 없이 즉시 화면을 안정화할 수 있다.
  const [isPackageLoading, setIsPackageLoading] = useState(packageId ? initialPackageConfigs.length === 0 : false);
  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "nicepay" | "tosspayments">("bank_transfer");
  const nicePaymentsEnabled = isNicePaymentsEnabled();
  const tossPaymentsEnabled = isTossPaymentsEnabled();
  const [selectedBank, setSelectedBank] = useState("shinhan");
  const [name, setName] = useState(initialUser.name ?? "");
  const [phone, setPhone] = useState(initialUser.phone ?? "");
  const [email, setEmail] = useState(initialUser.email ?? "");
  const [serviceRequest, setServiceRequest] = useState("");
  const [depositor, setDepositor] = useState("");

  // 사용자가 "한 번이라도" 입력을 시작한 뒤부터 에러를 보여주기 위한 플래그
  const [hasInteracted, setHasInteracted] = useState(false);
  const touch = () => setHasInteracted(true);

  // 에러가 있는 필드는 테두리를 붉게 표시 (UI 피드백)
  const inputClass = (base: string, field: CheckoutField, errs: CheckoutFieldErrors) => {
    if (!hasInteracted) return base;
    return errs[field] ? `${base} border-destructive focus:border-destructive` : base;
  };

  const [saveInfo, setSaveInfo] = useState(false);
  const isLoggedIn = Boolean(initialUser?.id);
  const [isCheckoutSubmitting, setIsCheckoutSubmitting] = useState(false);
  const [isIntentionalSuccessNavigation, setIsIntentionalSuccessNavigation] = useState(false);
  const [tossWidgetReady, setTossWidgetReady] = useState(false);
  const [tossWidgetLoadError, setTossWidgetLoadError] = useState<string | null>(null);

  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeRefund, setAgreeRefund] = useState(false);
  const bankOptionLabel = (key: "shinhan" | "kookmin" | "woori") => {
    const bank = bankLabelMap[key];
    return `${bank.label} ${bank.account} (예금주: ${bank.holder})`;
  };

  const [prefillDone] = useState(true);
  const [ownershipBlockedMessage] = useState<string | null>(initialOwnershipBlockedMessage);

  const fingerprint = useMemo(
    () =>
      JSON.stringify({
        name,
        phone,
        email,
        serviceRequest,
        depositor,
        selectedBank,
        paymentMethod,
        agreeAll,
        agreeTerms,
        agreePrivacy,
        saveInfo,
      }),
    [name, phone, email, serviceRequest, depositor, selectedBank, paymentMethod, agreeAll, agreeTerms, agreePrivacy, saveInfo],
  );
  const baselineRef = useRef<string | null>(null);
  const isDirty = useMemo(() => baselineRef.current !== null && baselineRef.current !== fingerprint, [fingerprint]);

  useEffect(() => {
    if (!prefillDone) return;
    if (isPackageLoading) return;
    if (baselineRef.current !== null) return;
    baselineRef.current = fingerprint;
  }, [prefillDone, isPackageLoading, fingerprint]);

  const guardEnabled = isDirty && !isIntentionalSuccessNavigation;
  useUnsavedChangesGuard(guardEnabled);
  useBackNavigationGuard(guardEnabled);

  const onLeavePageClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isDirty) return;
    const ok = window.confirm(UNSAVED_CHANGES_MESSAGE);
    if (!ok) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // 패키지 설정 로딩 & 선택된 패키지 매핑
  useEffect(() => {
    // checkout 첫 화면의 체감 지연 원인:
    // - 기존에는 mount 후 /api/packages/settings를 재요청해서 선택 패키지를 확정했다.
    // - 서버 페이지에서 이미 전달한 설정값이 있으면 같은 계산을 즉시 수행하고 네트워크 요청을 생략한다.
    if (!packageId) {
      setSelectedPackage(null);
      setIsPackageLoading(false);
      return;
    }

    if (initialPackageConfigs.length > 0) {
      setSelectedPackage(mapSelectedPackageFromConfigs(packageId, initialPackageConfigs));
      setIsPackageLoading(false);
      return;
    }

    // 안전 fallback: 서버 선조회가 비어있을 때만 API를 호출한다.
    let cancelled = false;
    const fetchPackage = async () => {
      try {
        const res = await fetch("/api/packages/settings", { cache: "no-store" });
        if (!res.ok) throw new Error("패키지 설정 API 응답 오류");
        const data = await res.json();
        const configs: PackageConfigLike[] = Array.isArray(data.packages) ? data.packages : [];
        if (cancelled) return;
        setSelectedPackage(mapSelectedPackageFromConfigs(packageId, configs));
      } catch (error) {
        console.error("패키지 설정 불러오기 실패", error);
        if (cancelled) return;
        setSelectedPackage(TEMPLATE_PACKAGES[packageId] ?? null);
      } finally {
        if (!cancelled) setIsPackageLoading(false);
      }
    };

    fetchPackage();
    return () => {
      cancelled = true;
    };
  }, [packageId, initialPackageConfigs]);

  // 필드별 에러 계산
  const fieldErrors = useMemo<CheckoutFieldErrors>(() => {
    const errs: CheckoutFieldErrors = {};

    const nameTrim = name.trim();
    if (!nameTrim) errs.name = "신청자 이름은 필수입니다.";
    else if (nameTrim.length < 2) errs.name = "신청자 이름은 2자 이상 입력해주세요.";

    const emailTrim = email.trim();
    if (!emailTrim) errs.email = "이메일은 필수입니다.";
    else if (!EMAIL_RE.test(emailTrim)) errs.email = "이메일 형식을 확인해주세요.";

    const phoneDigits = onlyDigits(phone);
    if (!phoneDigits) errs.phone = "연락처는 필수입니다.";
    else if (!isValidKoreanPhone(phoneDigits)) errs.phone = "올바른 연락처 형식(01012345678)으로 입력해주세요.";

    if (paymentMethod === "bank_transfer") {
      const depositorTrim = depositor.trim();
      if (!depositorTrim) errs.depositor = "입금자명은 필수입니다.";
      else if (depositorTrim.length < 2) errs.depositor = "입금자명은 2자 이상 입력해주세요.";
    }

    return errs;
  }, [name, email, phone, depositor, paymentMethod]);

  const isFormValid = Object.keys(fieldErrors).length === 0;
  // 초기 필수 데이터(선택 패키지/기본 입력값)가 준비되면 바로 입력 가능해야 하므로
  // frame loading은 package 계산 상태만 반영한다.
  const isFrameLoading = isPackageLoading;
  const canSubmit = agreeTerms && agreePrivacy && agreeRefund && isFormValid && !ownershipBlockedMessage && !isFrameLoading;
  const tossBlockedByZeroAmount = !Number.isFinite(Number(selectedPackage?.price ?? 0)) || Number(selectedPackage?.price ?? 0) <= 0;

  useEffect(() => {
    if (!nicePaymentsEnabled && !tossPaymentsEnabled) return;
    if (nicePaymentsEnabled && paymentMethod === "tosspayments") {
      setPaymentMethod("bank_transfer");
      return;
    }
    if (tossPaymentsEnabled || paymentMethod !== "tosspayments") return;
    setPaymentMethod("bank_transfer");
  }, [nicePaymentsEnabled, tossPaymentsEnabled, paymentMethod]);

  if (!selectedPackage && !isPackageLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 md:p-8 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-4">패키지를 선택해주세요</h2>
            <p className="text-muted-foreground mb-6">올바른 패키지가 선택되지 않았습니다.</p>
            <Button asChild>
              <Link href="/services/packages">패키지 선택하러 가기</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 할인 존재 여부 (정가 > 판매가 이고, 할인율도 0보다 클 때만 true)
  const hasDiscount = typeof selectedPackage?.originalPrice === "number" && selectedPackage.originalPrice > selectedPackage.price && typeof selectedPackage.discount === "number" && selectedPackage.discount > 0;

  // 안전한 회당 가격 헬퍼
  const perSessionPrice = selectedPackage && selectedPackage.sessions > 0 && selectedPackage.price > 0 ? Math.round(selectedPackage.price / selectedPackage.sessions) : 0;

  // 할인 금액 (없으면 0)
  const discountAmount = hasDiscount && selectedPackage ? selectedPackage.originalPrice! - selectedPackage.price : 0;

  return (
    <div className="min-h-full bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border bg-muted/30 dark:bg-card/40 text-foreground">
        <div className="absolute inset-0 bg-muted/50 dark:bg-card/60"></div>
        <div className="relative container py-10 md:py-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-secondary rounded-full">
              <CreditCard className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">패키지 주문/결제</h1>
              <p className="text-muted-foreground">선택하신 패키지로 프리미엄 서비스를 시작하세요</p>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-foreground" />
              <span>SSL 보안 결제</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>최대 12개월 유효</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              <span>전문가 서비스</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-3">
          {/* 주문 정보 입력 폼 */}
          <div className={`lg:col-span-2 space-y-4 md:space-y-6 ${isCheckoutSubmitting ? "pointer-events-none" : ""}`} aria-busy={isCheckoutSubmitting}>
            {/* 선택된 패키지 정보 */}
            <Card className="bg-card border border-border shadow-sm overflow-hidden">
              <div className="bg-secondary p-4 md:p-6">
                <CardTitle className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-primary" />
                  선택된 패키지
                </CardTitle>
                <CardDescription className="mt-2">구매하실 스트링 교체 패키지 정보입니다.</CardDescription>
              </div>
              <CardContent className="p-4 md:p-6">
                {selectedPackage ? (
                  <UnifiedPackageCard pkg={selectedPackage} className="shadow-none" />
                ) : (
                  <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 신청자 정보 */}
            <Card className="bg-card border border-border shadow-sm overflow-hidden">
              <div className="bg-secondary p-4 md:p-6">
                <CardTitle className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-primary" />
                  신청자 정보
                </CardTitle>
                <CardDescription className="mt-2">패키지를 이용하실 분의 정보를 입력해주세요.</CardDescription>
              </div>
              <CardContent className="p-4 md:p-6">
                <div className="space-y-4 md:space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="applicant-name" className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-primary" />
                        신청자 이름
                      </Label>
                      <Input
                        id="applicant-name"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          touch();
                        }}
                        disabled={isFrameLoading}
                        placeholder="신청자 이름을 입력하세요"
                        className={inputClass("border-2 focus:border-border transition-colors", "name", fieldErrors)}
                      />
                      {hasInteracted && fieldErrors.name && <p className="mt-1 text-xs text-destructive">{fieldErrors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="applicant-email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        이메일
                      </Label>
                      <Input
                        id="applicant-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          touch();
                        }}
                        disabled={isFrameLoading}
                        placeholder="example@naver.com"
                        className={inputClass("border-2 focus:border-border transition-colors", "email", fieldErrors)}
                      />
                      {hasInteracted && fieldErrors.email && <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>}
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="applicant-phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-foreground" />
                        연락처
                      </Label>
                      <Input
                        id="applicant-phone"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          touch();
                        }}
                        disabled={isFrameLoading}
                        placeholder="연락처를 입력하세요 ('-' 제외)"
                        className={inputClass("border-2 focus:border-border transition-colors", "phone", fieldErrors)}
                      />
                      {hasInteracted && fieldErrors.phone && <p className="mt-1 text-xs text-destructive">{fieldErrors.phone}</p>}
                    </div>
                  </div>

                  <div className="bg-secondary p-4 rounded-lg border border-border">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="save-info" checked={saveInfo} onCheckedChange={(checked) => setSaveInfo(!!checked)} disabled={!isLoggedIn || isFrameLoading} />
                      <label htmlFor="save-info" className={`text-sm font-medium ${!isLoggedIn ? "text-muted-foreground" : "text-primary"}`}>
                        이 정보를 저장
                      </label>
                    </div>
                    {!isLoggedIn && <p className="text-xs text-muted-foreground ml-6 mt-1">로그인 후 정보를 저장할 수 있습니다.</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 서비스 이용 안내 */}
            <Card className="bg-card border border-border shadow-sm overflow-hidden">
              <div className="bg-muted/50 dark:bg-muted/40 p-4 md:p-6">
                <CardTitle className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  서비스 이용 안내
                </CardTitle>
                <CardDescription className="mt-2">패키지 주문 전 꼭 확인해주세요.</CardDescription>
              </div>
              <CardContent className="p-4 md:p-6 space-y-4">
                <div className="rounded-lg border border-border bg-secondary p-4 space-y-2 text-sm text-foreground">
                  <p>• 무통장 입금 시 관리자가 확인 후 패키지를 활성화해드려요.</p>
                  <p>• 카드/간편결제시 자동으로 패키지 활성화돼요.</p>
                  <p>• 활성화 완료 후부터 패키지를 사용할 수 있어요.</p>
                  <p>• 교체 서비스 신청이 완료되면 이용 횟수가 1회 차감돼요.</p>
                  <p>• 패키지가 비활성화된 동안에는 서비스를 이용할 수 없어요.</p>
                  <p>• 비활성화 상태에서는 유효기간 카운트가 일시 정지돼요.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service-request" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    서비스 요청사항
                  </Label>
                  <Textarea
                    id="service-request"
                    value={serviceRequest}
                    onChange={(e) => setServiceRequest(e.target.value)}
                    placeholder="서비스 이용 시 요청사항을 입력하세요"
                    className="border-2 focus:border-border transition-colors"
                    disabled={isFrameLoading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 결제 정보 */}
            <Card className="bg-card border border-border shadow-sm overflow-hidden">
              <div className="bg-muted/50 dark:bg-muted/40 p-6">
                <CardTitle className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-primary" />
                  결제 정보
                </CardTitle>
                <CardDescription className="mt-2">결제 방법을 선택하고 필요한 정보를 입력해주세요.</CardDescription>
              </div>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label>결제 방법</Label>
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={(v) =>
                        setPaymentMethod(
                          v === "nicepay" && nicePaymentsEnabled
                            ? "nicepay"
                            : v === "tosspayments" && tossPaymentsEnabled
                              ? "tosspayments"
                              : "bank_transfer",
                        )
                      }
                      className="space-y-3"
                    >
                      <div className="flex items-center space-x-3 p-4 bg-secondary rounded-lg border border-border">
                        <RadioGroupItem value="bank_transfer" id="bank-transfer" disabled={isFrameLoading} />
                        <Label htmlFor="bank-transfer" className="flex-1 cursor-pointer font-medium">
                          무통장입금
                        </Label>
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      {nicePaymentsEnabled && (
                        <div className="flex items-center space-x-3 p-4 bg-muted/40 rounded-lg border-2 border-border">
                          <RadioGroupItem value="nicepay" id="nice-payments" disabled={isFrameLoading || tossBlockedByZeroAmount} />
                          <Label htmlFor="nice-payments" className="flex-1 cursor-pointer font-medium">
                            카드/간편결제
                          </Label>
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      {tossPaymentsEnabled && (
                        <div className="flex items-center space-x-3 p-4 bg-muted/40 rounded-lg border-2 border-border">
                          <RadioGroupItem value="tosspayments" id="toss-payments" disabled={isFrameLoading || tossBlockedByZeroAmount} />
                          <Label htmlFor="toss-payments" className="flex-1 cursor-pointer font-medium">
                            카드/간편결제
                          </Label>
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </RadioGroup>
                  </div>

                  {paymentMethod === "bank_transfer" ? (
                    <>
                      <div className="space-y-3">
                        <Label htmlFor="bank-account">입금 계좌 선택</Label>
                        <Select
                          value={selectedBank}
                          disabled={isFrameLoading}
                          onValueChange={(v) => {
                            setSelectedBank(v);
                            touch();
                          }}
                        >
                          <SelectTrigger className="border-2 focus:border-border">
                            <SelectValue placeholder="입금 계좌를 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="shinhan">{bankOptionLabel("shinhan")}</SelectItem>
                            <SelectItem value="kookmin">{bankOptionLabel("kookmin")}</SelectItem>
                            <SelectItem value="woori">{bankOptionLabel("woori")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="depositor-name">입금자명</Label>
                        <Input
                          id="depositor-name"
                          value={depositor}
                          onChange={(e) => {
                            setDepositor(e.target.value);
                            touch();
                          }}
                          disabled={isFrameLoading}
                          placeholder="입금자명을 입력하세요"
                          className={inputClass("border-2 focus:border-border transition-colors", "depositor", fieldErrors)}
                        />
                        {hasInteracted && fieldErrors.depositor && <p className="mt-1 text-xs text-destructive">{fieldErrors.depositor}</p>}
                      </div>

                      <div className="bg-secondary p-3 md:p-4 rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="h-5 w-5 text-primary" />
                          <p className="font-semibold text-foreground">무통장입금 안내</p>
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            주문 후 24시간 이내에 입금해 주셔야 주문이 정상 처리됩니다.
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            입금 확인 후 패키지가 활성화됩니다.
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            패키지 이용은 입금 확인 후부터 가능합니다.
                          </li>
                        </ul>
                      </div>
                    </>
                  ) : paymentMethod === "tosspayments" && tossPaymentsEnabled ? (
                    <div className="space-y-3">
                      <TossPaymentWidget
                        amount={Number(selectedPackage?.price ?? 0)}
                        customerKey={String(initialUser?.id || email || "guest")}
                        onStatusChange={({ ready, loadError }) => {
                          setTossWidgetReady(ready);
                          setTossWidgetLoadError(loadError);
                        }}
                      />
                    </div>
                  ) : paymentMethod === "nicepay" && nicePaymentsEnabled ? (
                    <div className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">
                      Nice 결제창으로 안전하게 결제를 진행합니다. 결제 버튼을 눌러 계속 진행해주세요.
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {/* 주문자 동의 */}
            <Card className="bg-card border border-border shadow-sm overflow-hidden">
              <div className="bg-muted/50 dark:bg-muted/40 p-6">
                <CardTitle className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  주문자 동의
                </CardTitle>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="bg-secondary p-3 md:p-4 rounded-lg border border-border">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="agree-all"
                        checked={agreeAll}
                        onCheckedChange={(checked) => {
                          const newValue = !!checked;
                          setAgreeAll(newValue);
                          setAgreeTerms(newValue);
                          setAgreePrivacy(newValue);
                          setAgreeRefund(newValue);
                        }}
                        disabled={isFrameLoading}
                      />
                      <label htmlFor="agree-all" className="font-semibold text-lg text-foreground">
                        전체 동의
                      </label>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    {[
                      {
                        id: "agree-terms",
                        label: "이용약관 동의 (필수)",
                        state: agreeTerms,
                        setState: setAgreeTerms,
                        href: "/terms",
                      },
                      {
                        id: "agree-privacy",
                        label: "개인정보 수집 및 이용 동의 (필수)",
                        state: agreePrivacy,
                        setState: setAgreePrivacy,
                        href: "/privacy",
                      },
                      {
                        id: "agree-refund",
                        label: "환불 규정 동의 (필수)",
                        state: agreeRefund,
                        setState: setAgreeRefund,
                        href: "/terms",
                      },
                    ].map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-muted/40 dark:bg-muted/30 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={item.id}
                            checked={item.state}
                            onCheckedChange={(checked) => {
                              const value = !!checked;
                              item.setState(value);
                              if (!value) setAgreeAll(false);
                              else if (agreeTerms && agreePrivacy && agreeRefund) setAgreeAll(true);
                            }}
                            disabled={isFrameLoading}
                          />
                          <label htmlFor={item.id} className="text-sm font-medium text-foreground">
                            {item.label}
                          </label>
                        </div>
                        <Button variant="link" size="sm" className="h-auto p-0 text-primary hover:text-primary" asChild>
                          <Link href={item.href} target="_blank" rel="noopener noreferrer">
                            보기
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 주문 요약 */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-20">
              <Card className="relative bg-card border border-border shadow-md overflow-hidden">
                <div className="bg-muted/60 dark:bg-muted/50 p-4 md:p-6 text-foreground">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-secondary rounded-xl">
                      <Package className="h-5 w-5" />
                    </div>
                    주문 요약
                  </CardTitle>
                </div>
                <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">패키지 금액</span>
                      <span className="font-semibold text-lg">{selectedPackage ? `${selectedPackage.price.toLocaleString()}원` : "-"}</span>
                    </div>

                    {hasDiscount && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">정가</span>
                          <span className="text-muted-foreground line-through">{selectedPackage!.originalPrice!.toLocaleString()}원</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">할인 금액</span>
                          <span className="text-primary font-semibold">-{discountAmount.toLocaleString()}원</span>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div className="flex justify-between items-center text-xl font-bold">
                      <span>총 결제 금액</span>
                      <span className="text-primary">{selectedPackage ? `${selectedPackage.price.toLocaleString()}원` : "-"}</span>
                    </div>
                  </div>

                  <div className="bg-secondary p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-2 text-foreground mb-2">
                      <Star className="h-4 w-4" />
                      <span className="font-semibold">패키지 혜택</span>
                    </div>
                    <div className="text-sm text-foreground space-y-1">
                      <p>• {selectedPackage ? `${selectedPackage.sessions}회 스트링 교체 서비스` : "패키지 정보를 확인 중입니다."}</p>
                      <p>• 유효기간: {selectedPackage?.validityPeriod ?? "-"}</p>
                      <p>• 회당 {perSessionPrice.toLocaleString()}원</p>
                      {selectedPackage?.discount && <p>• {selectedPackage.discount}% 할인 적용</p>}
                    </div>
                  </div>

                  <div className="bg-secondary p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-2 text-foreground mb-2">
                      <Shield className="h-4 w-4" />
                      <span className="font-semibold">패키지 안내</span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>• 입금 확인 후 패키지가 활성화됩니다.</p>
                      <p>• 예약은 전화 또는 온라인으로 가능합니다.</p>
                      <p>• 유효기간 내에 모든 횟수를 이용해주세요.</p>
                    </div>
                  </div>
                </CardContent>
                <div className="flex flex-col gap-3 md:gap-4 p-4 md:p-6">
                  {ownershipBlockedMessage && <p className="text-sm rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">{ownershipBlockedMessage}</p>}
                  {hasInteracted && agreeTerms && agreePrivacy && agreeRefund && !isFormValid && <p className="text-xs text-destructive">필수 입력칸을 확인해주세요. (이름/이메일/연락처/결제수단별 필수값)</p>}
                  {selectedPackage && paymentMethod === "bank_transfer" && (
                    <PackageCheckoutButton
                      disabled={!canSubmit}
                      ownershipBlockedMessage={ownershipBlockedMessage}
                      packageInfo={selectedPackage}
                      name={name}
                      phone={phone}
                      email={email}
                      depositor={depositor}
                      selectedBank={selectedBank}
                      serviceRequest={serviceRequest}
                      saveInfo={saveInfo}
                      isLoggedIn={isLoggedIn}
                      onSubmittingChange={setIsCheckoutSubmitting}
                      onBeforeSuccessNavigation={() => setIsIntentionalSuccessNavigation(true)}
                      onSuccessNavigationAbort={() => setIsIntentionalSuccessNavigation(false)}
                    />
                  )}
                  {selectedPackage && tossPaymentsEnabled && paymentMethod === "tosspayments" && (
                    <PackageTossCheckoutButton
                      disabled={!canSubmit}
                      widgetReady={tossWidgetReady}
                      widgetLoadError={tossWidgetLoadError}
                      payableAmount={Number(selectedPackage.price ?? 0)}
                      packageId={selectedPackage.id}
                      packageName={selectedPackage.title}
                      name={name}
                      phone={phone}
                      email={email}
                      serviceRequest={serviceRequest}
                      onBeforeSuccessNavigation={() => setIsIntentionalSuccessNavigation(true)}
                      onSuccessNavigationAbort={() => setIsIntentionalSuccessNavigation(false)}
                    />
                  )}
                  {selectedPackage && nicePaymentsEnabled && paymentMethod === "nicepay" && (
                    <PackageNiceCheckoutButton
                      disabled={!canSubmit}
                      payableAmount={Number(selectedPackage.price ?? 0)}
                      packageId={selectedPackage.id}
                      packageName={selectedPackage.title}
                      name={name}
                      phone={phone}
                      email={email}
                      serviceRequest={serviceRequest}
                      onBeforeSuccessNavigation={() => setIsIntentionalSuccessNavigation(true)}
                      onSuccessNavigationAbort={() => setIsIntentionalSuccessNavigation(false)}
                    />
                  )}
                  <Button variant="outline" className="w-full border-2" asChild>
                    <Link href="/services/packages" onClick={onLeavePageClick}>
                      패키지 선택으로 돌아가기
                    </Link>
                  </Button>
                </div>
                {isCheckoutSubmitting && (
                  <div className="absolute inset-0 z-10 cursor-wait bg-overlay/10 backdrop-blur-[2px]">
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="flex items-center gap-3 rounded-xl bg-card/90 px-4 py-3 shadow">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">패키지 주문을 처리하고 있어요…</span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
