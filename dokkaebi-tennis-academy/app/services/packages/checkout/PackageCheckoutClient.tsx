'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore, type User } from '@/app/store/authStore';
import { getMyInfo } from '@/lib/auth.client';
import { CreditCard, MapPin, Shield, CheckCircle, UserIcon, Mail, Phone, MessageSquare, Building2, Package, Star, Calendar, Gift, Target, Award } from 'lucide-react';
import PackageCheckoutButton from './PackageCheckoutButton';
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';
import { FullPageSpinner } from '@/components/system/PageLoading';

// 클라이언트 유효성(UX용)
type CheckoutField = 'name' | 'email' | 'phone' | 'depositor' | 'postalCode' | 'address' | 'addressDetail';
type CheckoutFieldErrors = Partial<Record<CheckoutField, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTAL_RE = /^\d{5}$/;
const onlyDigits = (v: string) => String(v ?? '').replace(/\D/g, '');
const isValidKoreanPhone = (v: string) => {
  const d = onlyDigits(v);
  return d.length === 10 || d.length === 11; // 01012345678 / 0212345678 등
};

type UserLite = { id: string; name?: string; email?: string };

declare global {
  interface Window {
    daum: any;
  }
}

interface PackageInfo {
  id: string;
  title: string;
  sessions: number;
  price: number;
  originalPrice?: number;
  discount?: number;
  popular?: boolean;
  features: string[];
  benefits: string[];
  color: string;
  description: string;
  validityPeriod: string;
}

type PackageOption = {
  id: string;
  title: string;
  sessions: number;
  price: number;
  originalPrice?: number;
  discount?: number;
  features: string[];
  benefits: string[];
  validityPeriod: string;
};

const STATIC_PACKAGES: PackageOption[] = [
  // 기존에 쓰던 더미 패키지 4개가 있다면 그대로 옮겨 두세요
  // (서버에서 설정 못 불러올 때만 fallback 용으로 사용)
];

const Trophy = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z"
    />
  </svg>
);

export default function PackageCheckoutClient({ initialUser, initialQuery }: { initialUser: UserLite; initialQuery?: { package?: string } }) {
  const searchParams = useSearchParams();
  const packageId = searchParams.get('package') ?? initialQuery?.package ?? null;

  const TEMPLATE_PACKAGES: Record<string, PackageInfo> = {
    '10-sessions': {
      id: '10-sessions',
      title: '스타터 패키지',
      sessions: 10,
      price: 100000,
      originalPrice: 120000,
      discount: 17,
      features: ['10회 스트링 교체', '무료 장력 상담', '기본 스트링 포함'],
      benefits: ['회당 10,000원', '2만원 절약', '3개월 유효'],
      color: 'blue',
      description: '테니스를 시작하는 분들에게 적합한 기본 패키지',
      validityPeriod: '12개월',
    },
    '30-sessions': {
      id: '30-sessions',
      title: '레귤러 패키지',
      sessions: 30,
      price: 300000,
      originalPrice: 360000,
      discount: 17,
      popular: true,
      features: ['30회 스트링 교체', '무료 장력 상담', '프리미엄 스트링 선택', '우선 예약'],
      benefits: ['회당 10,000원', '6만원 절약', '6개월 유효', '우선 예약 혜택'],
      color: 'indigo',
      description: '정기적으로 테니스를 즐기는 분들을 위한 인기 패키지',
      validityPeriod: '12개월',
    },
    '50-sessions': {
      id: '50-sessions',
      title: '프로 패키지',
      sessions: 50,
      price: 500000,
      originalPrice: 600000,
      discount: 17,
      features: ['50회 스트링 교체', '무료 장력 상담', '프리미엄 스트링 선택', '우선 예약', '무료 그립 교체 5회'],
      benefits: ['회당 10,000원', '10만원 절약', '9개월 유효', '그립 교체 혜택'],
      color: 'purple',
      description: '진지한 테니스 플레이어를 위한 프리미엄 패키지',
      validityPeriod: '12개월',
    },
    '100-sessions': {
      id: '100-sessions',
      title: '챔피언 패키지',
      sessions: 100,
      price: 1000000,
      originalPrice: 1200000,
      discount: 17,
      features: ['100회 스트링 교체', '무료 장력 상담', '프리미엄 스트링 선택', '우선 예약', '무료 그립 교체 10회', '전용 상담사 배정'],
      benefits: ['회당 10,000원', '20만원 절약', '12개월 유효', '전용 서비스'],
      color: 'emerald',
      description: '프로 선수와 열정적인 플레이어를 위한 최고급 패키지',
      validityPeriod: '12개월',
    },
  };

  // 선택된 패키지 정보 (DB 설정 + 템플릿 병합 결과)
  const [selectedPackage, setSelectedPackage] = useState<PackageInfo | null>(() => {
    if (!packageId) return null;
    // 옛날 URL (?package=10-sessions)로 들어올 수도 있으니 일단 템플릿에서 한 번 찾아봄
    return TEMPLATE_PACKAGES[packageId] ?? null;
  });

  // 패키지 설정 로딩 상태
  const [isPackageLoading, setIsPackageLoading] = useState(true);
  const [selectedBank, setSelectedBank] = useState('shinhan');
  const [serviceMethod, setServiceMethod] = useState<'방문이용' | '출장서비스'>('방문이용');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [serviceRequest, setServiceRequest] = useState('');
  const [depositor, setDepositor] = useState('');

  // 사용자가 "한 번이라도" 입력을 시작한 뒤부터 에러를 보여주기 위한 플래그
  const [hasInteracted, setHasInteracted] = useState(false);
  const touch = () => setHasInteracted(true);

  // 에러가 있는 필드는 테두리를 붉게 표시 (UI 피드백)
  const inputClass = (base: string, field: CheckoutField, errs: CheckoutFieldErrors) => {
    if (!hasInteracted) return base;
    return errs[field] ? `${base} border-red-500 focus:border-red-500` : base;
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handleFindPostcode = () => {
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        const fullAddress = data.address;
        const zonecode = data.zonecode;
        setPostalCode(zonecode);
        setAddress(fullAddress);
      },
    }).open();
  };

  const [saveInfo, setSaveInfo] = useState(false);
  const { logout } = useAuthStore();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeRefund, setAgreeRefund] = useState(false);

  const [prefillDone, setPrefillDone] = useState(false);

  const fingerprint = useMemo(
    () =>
      JSON.stringify({
        serviceMethod,
        name,
        phone,
        email,
        postalCode,
        address,
        addressDetail,
        serviceRequest,
        depositor,
        selectedBank,
        agreeAll,
        agreeTerms,
        agreePrivacy,
        saveInfo,
      }),
    [serviceMethod, name, phone, email, postalCode, address, addressDetail, serviceRequest, depositor, selectedBank, agreeAll, agreeTerms, agreePrivacy, saveInfo],
  );
  const baselineRef = useRef<string | null>(null);
  const isDirty = useMemo(() => baselineRef.current !== null && baselineRef.current !== fingerprint, [fingerprint]);

  useEffect(() => {
    if (!prefillDone) return;
    if (isPackageLoading) return;
    if (baselineRef.current !== null) return;
    baselineRef.current = fingerprint;
  }, [prefillDone, isPackageLoading, fingerprint]);

  useUnsavedChangesGuard(isDirty);

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
    const fetchPackage = async () => {
      // 쿼리에 packageId가 없으면 그냥 종료
      if (!packageId) {
        setSelectedPackage(null);
        setIsPackageLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/packages/settings', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('패키지 설정 API 응답 오류');
        }

        const data = await res.json();
        const configs: any[] = Array.isArray(data.packages) ? data.packages : [];

        // DB에 저장된 패키지 설정 중, 현재 선택된 ID와 같은 것 찾기 (예: 'package-10')
        const config = configs.find((pkg) => pkg.id === packageId);

        if (config) {
          const sessions = Number(config.sessions || 0);
          const price = Number(config.price || 0);
          const originalPrice = Number(config.originalPrice != null ? config.originalPrice : price);

          const discount = originalPrice > 0 && price > 0 ? Math.round((1 - price / originalPrice) * 100) : undefined;

          // 유효기간(일) → "X개월 Y일" 문자열로 변환
          const validityDays = Number(config.validityDays || 0);
          const months = Math.floor(validityDays / 30);
          const days = validityDays % 30;
          let validityPeriod = '';
          if (months > 0) validityPeriod += `${months}개월`;
          if (days > 0) validityPeriod += (validityPeriod ? ' ' : '') + `${days}일`;
          if (!validityPeriod) validityPeriod = '유효기간 설정 없음';

          // 세션 수(10/30/50/100)에 따라 기존 템플릿(색상, 아이콘, 기본 문구)을 찾아서 병합
          const templateKey = sessions === 10 ? '10-sessions' : sessions === 30 ? '30-sessions' : sessions === 50 ? '50-sessions' : sessions === 100 ? '100-sessions' : undefined;

          const base = templateKey ? TEMPLATE_PACKAGES[templateKey] : null;

          const merged: PackageInfo = {
            // 색상 / 아이콘 / 레이아웃 등은 템플릿 우선
            ...(base ?? {
              id: config.id,
              title: config.name,
              sessions,
              price,
              originalPrice,
              discount,
              features: [],
              benefits: [],
              color: 'blue',
              description: '',
              validityPeriod,
            }),
            // 숫자·텍스트 정보는 DB 설정으로 덮어쓰기
            id: config.id,
            title: config.name || base?.title || '',
            sessions,
            price,
            originalPrice,
            discount,
            description: config.description || base?.description || '',
            validityPeriod,
            // 특징 리스트는 설정에 있으면 그걸 쓰고, 없으면 템플릿 사용
            features: Array.isArray(config.features) && config.features.length > 0 ? config.features : (base?.features ?? []),
            // 혜택은 "회당 가격 / 할인율"을 앞에 붙이고, 템플릿에서 겹치지 않는 문구만 뒤에 추가
            benefits: (() => {
              const result: string[] = [];
              if (sessions && price) {
                result.push(`회당 ${Math.round(price / sessions).toLocaleString()}원`);
              }
              if (discount) {
                result.push(`${discount}% 할인`);
              }
              const baseBenefits = base?.benefits ?? [];
              for (const b of baseBenefits) {
                if (!result.includes(b)) {
                  result.push(b);
                }
              }
              return result;
            })(),
          };

          setSelectedPackage(merged);
        } else {
          // DB에서 못 찾으면 옛날 방식 (?package=10-sessions 같은)으로 템플릿에서 바로 조회
          setSelectedPackage(TEMPLATE_PACKAGES[packageId] ?? null);
        }
      } catch (error) {
        console.error('패키지 설정 불러오기 실패', error);
        // 에러일 때도 최소한 템플릿으로는 동작하도록
        setSelectedPackage(TEMPLATE_PACKAGES[packageId] ?? null);
      } finally {
        setIsPackageLoading(false);
      }
    };

    fetchPackage();
  }, [packageId]);

  useEffect(() => {
    let cancelled = false;
    getMyInfo({ quiet: true })
      .then(({ user }) => {
        if (!cancelled) setUser(user);
      })
      .catch(() => {
        /* quiet: 401은 정상. 아무 것도 하지 않음 */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (user) return;
    setPrefillDone(true);
  }, [loading, user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setPrefillDone(false);
    const fetchUserInfo = async () => {
      try {
        const res = await fetch('/api/users/me', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setName(data.name || '');
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setPostalCode(data.postalCode || '');
        setAddress(data.address || '');
        setAddressDetail(data.addressDetail || '');
      } finally {
        if (!cancelled) setPrefillDone(true);
      }
    };
    fetchUserInfo();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // 필드별 에러 계산
  const fieldErrors = useMemo<CheckoutFieldErrors>(() => {
    const errs: CheckoutFieldErrors = {};

    const nameTrim = name.trim();
    if (!nameTrim) errs.name = '신청자 이름은 필수입니다.';
    else if (nameTrim.length < 2) errs.name = '신청자 이름은 2자 이상 입력해주세요.';

    const emailTrim = email.trim();
    if (!emailTrim) errs.email = '이메일은 필수입니다.';
    else if (!EMAIL_RE.test(emailTrim)) errs.email = '이메일 형식을 확인해주세요.';

    const phoneDigits = onlyDigits(phone);
    if (!phoneDigits) errs.phone = '연락처는 필수입니다.';
    else if (!isValidKoreanPhone(phoneDigits)) errs.phone = '연락처는 숫자 10~11자리를 입력해주세요.';

    const depositorTrim = depositor.trim();
    if (!depositorTrim) errs.depositor = '입금자명은 필수입니다.';
    else if (depositorTrim.length < 2) errs.depositor = '입금자명은 2자 이상 입력해주세요.';

    // 현재는 출장서비스 비활성화지만, 향후 활성화될 때를 대비해 검증을 같이 둠
    if (serviceMethod === '출장서비스') {
      const postalTrim = postalCode.trim();
      if (!postalTrim) errs.postalCode = '우편번호는 필수입니다.';
      else if (!POSTAL_RE.test(postalTrim)) errs.postalCode = '우편번호(5자리)를 확인해주세요.';
      if (!address.trim()) errs.address = '기본 주소는 필수입니다.';
      if (!addressDetail.trim()) errs.addressDetail = '상세 주소는 필수입니다.';
    }

    return errs;
  }, [name, email, phone, depositor, serviceMethod, postalCode, address, addressDetail]);

  const isFormValid = Object.keys(fieldErrors).length === 0;
  const canSubmit = agreeTerms && agreePrivacy && agreeRefund && isFormValid;

  if (loading || isPackageLoading) {
   return <FullPageSpinner label="패키지 결제 화면 준비 중..." />;
  }

  if (!selectedPackage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold mb-4">패키지를 선택해주세요</h2>
            <p className="text-gray-600 mb-6">올바른 패키지가 선택되지 않았습니다.</p>
            <Button asChild>
              <Link href="/services/packages">패키지 선택하러 가기</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 할인 존재 여부 (정가 > 판매가 이고, 할인율도 0보다 클 때만 true)
  const hasDiscount = typeof selectedPackage.originalPrice === 'number' && selectedPackage.originalPrice > selectedPackage.price && typeof selectedPackage.discount === 'number' && selectedPackage.discount > 0;

  // 안전한 회당 가격 헬퍼
  const perSessionPrice = selectedPackage.sessions > 0 && selectedPackage.price > 0 ? Math.round(selectedPackage.price / selectedPackage.sessions) : 0;

  // 할인 금액 (없으면 0)
  const discountAmount = hasDiscount ? selectedPackage.originalPrice! - selectedPackage.price : 0;

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 bg-[url('/placeholder.svg?height=400&width=800')] opacity-10"></div>
        <div className="relative container py-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
              <CreditCard className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">패키지 주문/결제</h1>
              <p className="text-blue-100">선택하신 패키지로 프리미엄 서비스를 시작하세요</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-400" />
              <span>SSL 보안 결제</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-400" />
              <span>최대 12개월 유효</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400" />
              <span>전문가 서비스</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* 주문 정보 입력 폼 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 선택된 패키지 정보 */}
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-teal-500/10 p-6">
                <CardTitle className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  선택된 패키지
                </CardTitle>
                <CardDescription className="mt-2">구매하실 스트링 교체 패키지 정보입니다.</CardDescription>
              </div>
              <CardContent className="p-6">
                <div
                  className={`p-6 bg-gradient-to-r ${
                    selectedPackage.color === 'blue'
                      ? 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20'
                      : selectedPackage.color === 'indigo'
                        ? 'from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20'
                        : selectedPackage.color === 'purple'
                          ? 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20'
                          : 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20'
                  } rounded-xl border-2 ${
                    selectedPackage.color === 'blue'
                      ? 'border-blue-200 dark:border-blue-800'
                      : selectedPackage.color === 'indigo'
                        ? 'border-indigo-200 dark:border-indigo-800'
                        : selectedPackage.color === 'purple'
                          ? 'border-purple-200 dark:border-purple-800'
                          : 'border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={`w-16 h-16 rounded-full bg-gradient-to-br ${
                        selectedPackage.color === 'blue'
                          ? 'from-blue-500 to-cyan-500'
                          : selectedPackage.color === 'indigo'
                            ? 'from-indigo-500 to-purple-500'
                            : selectedPackage.color === 'purple'
                              ? 'from-purple-500 to-pink-500'
                              : 'from-emerald-500 to-teal-500'
                      } flex items-center justify-center text-white shadow-lg`}
                    >
                      {selectedPackage.color === 'blue' ? (
                        <Target className="h-8 w-8" />
                      ) : selectedPackage.color === 'indigo' ? (
                        <Star className="h-8 w-8" />
                      ) : selectedPackage.color === 'purple' ? (
                        <Award className="h-8 w-8" />
                      ) : (
                        <Trophy className="h-8 w-8" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-2xl font-bold">{selectedPackage.title}</h3>
                        {selectedPackage.popular && <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">인기</Badge>}
                      </div>
                      <p className="text-gray-600 dark:text-gray-300">{selectedPackage.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{selectedPackage.sessions}회</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">스트링 교체</div>
                    </div>
                    <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                      <div className="text-2xl font-bold text-indigo-600">{selectedPackage.validityPeriod}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">유효기간</div>
                    </div>
                    <div className="text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{perSessionPrice.toLocaleString()}원</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">회당 가격</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                        포함 서비스
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {selectedPackage.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start text-sm">
                            <div
                              className={`w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0 bg-gradient-to-r ${
                                selectedPackage.color === 'blue'
                                  ? 'from-blue-500 to-cyan-500'
                                  : selectedPackage.color === 'indigo'
                                    ? 'from-indigo-500 to-purple-500'
                                    : selectedPackage.color === 'purple'
                                      ? 'from-purple-500 to-pink-500'
                                      : 'from-emerald-500 to-teal-500'
                              }`}
                            ></div>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 flex items-center">
                        <Gift className="w-4 h-4 mr-2 text-orange-500" />
                        혜택
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {selectedPackage.benefits.map((benefit, idx) => (
                          <div key={idx} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            • {benefit}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 신청자 정보 */}
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 p-6">
                <CardTitle className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-green-600" />
                  신청자 정보
                </CardTitle>
                <CardDescription className="mt-2">패키지를 이용하실 분의 정보를 입력해주세요.</CardDescription>
              </div>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="applicant-name" className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-blue-600" />
                        신청자 이름
                      </Label>
                      <Input
                        id="applicant-name"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          touch();
                        }}
                        placeholder="신청자 이름을 입력하세요"
                        className={inputClass('border-2 focus:border-blue-500 transition-colors', 'name', fieldErrors)}
                      />
                      {hasInteracted && fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="applicant-email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-purple-600" />
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
                        placeholder="example@naver.com"
                        className={inputClass('border-2 focus:border-purple-500 transition-colors', 'email', fieldErrors)}
                      />
                      {hasInteracted && fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="applicant-phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-teal-600" />
                        연락처
                      </Label>
                      <Input
                        id="applicant-phone"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          touch();
                        }}
                        placeholder="연락처를 입력하세요 ('-' 제외)"
                        className={inputClass('border-2 focus:border-teal-500 transition-colors', 'phone', fieldErrors)}
                      />
                      {hasInteracted && fieldErrors.phone && <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>}
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="save-info" checked={saveInfo} onCheckedChange={(checked) => setSaveInfo(!!checked)} disabled={!user} />
                      <label htmlFor="save-info" className={`text-sm font-medium ${!user ? 'text-gray-400' : 'text-blue-700 dark:text-blue-400'}`}>
                        이 정보를 저장
                      </label>
                    </div>
                    {!user && <p className="text-xs text-slate-500 dark:text-slate-400 ml-6 mt-1">로그인 후 정보를 저장할 수 있습니다.</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 서비스 이용 방식 */}
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-red-500/10 p-6">
                <CardTitle className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-purple-600" />
                  서비스 이용 방식
                </CardTitle>
                <CardDescription className="mt-2">스트링 교체 서비스를 어떻게 이용하실지 선택해주세요.</CardDescription>
              </div>
              <CardContent className="p-6 space-y-4">
                <RadioGroup
                  value={serviceMethod}
                  onValueChange={(value) => {
                    if (value === '출장서비스') return; // 클릭 무시
                    setServiceMethod(value as '방문이용' | '출장서비스');
                    touch();
                  }}
                >
                  {/* 매장 방문 */}
                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <RadioGroupItem value="방문이용" id="방문이용" />
                    <Label htmlFor="방문이용" className="flex-1 cursor-pointer font-medium">
                      매장 방문 (도깨비 테니스 아카데미 방문)
                    </Label>
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>

                  {/* 출장 서비스 – 비활성화 */}
                  <div
                    className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800 opacity-50 cursor-not-allowed"
                    aria-disabled="true"
                    onClick={(e) => e.preventDefault()}
                  >
                    <RadioGroupItem value="출장서비스" id="출장서비스" disabled />
                    <Label htmlFor="출장서비스" className="flex-1 font-medium">
                      출장 서비스 (지정 장소로 방문)
                      <span className="ml-1 text-red-700">— 현재 이용하실 수 없습니다</span>
                    </Label>
                    <MapPin className="h-5 w-5 text-purple-600" />
                  </div>
                </RadioGroup>

                {serviceMethod === '출장서비스' && (
                  <div className="space-y-4 mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="service-postal" className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-orange-600" />
                          우편번호
                        </Label>
                        <Button variant="outline" size="sm" onClick={handleFindPostcode} className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 hover:from-blue-600 hover:to-purple-600">
                          우편번호 찾기
                        </Button>
                      </div>
                      <Input id="service-postal" readOnly value={postalCode} placeholder="우편번호" className="bg-slate-100 dark:bg-slate-700 cursor-not-allowed max-w-[200px] border-2" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="service-address">서비스 주소</Label>
                      <Input id="service-address" readOnly value={address} placeholder="기본 주소" className="bg-slate-100 dark:bg-slate-700 cursor-not-allowed border-2" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="service-address-detail">상세 주소</Label>
                      <Input id="service-address-detail" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} placeholder="상세 주소를 입력하세요" className="border-2 focus:border-blue-500 transition-colors" />
                    </div>

                    <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                      <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">출장 서비스는 서울/경기 지역에 한해 제공되며, 별도의 출장비가 발생할 수 있습니다.</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="service-request" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    서비스 요청사항
                  </Label>
                  <Textarea id="service-request" value={serviceRequest} onChange={(e) => setServiceRequest(e.target.value)} placeholder="서비스 이용 시 요청사항을 입력하세요" className="border-2 focus:border-green-500 transition-colors" />
                </div>
              </CardContent>
            </Card>

            {/* 결제 정보 */}
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-6">
                <CardTitle className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                  결제 정보
                </CardTitle>
                <CardDescription className="mt-2">결제 방법을 선택하고 필요한 정보를 입력해주세요.</CardDescription>
              </div>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label>결제 방법</Label>
                    <RadioGroup defaultValue="bank-transfer" className="space-y-3">
                      <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border-2 border-green-200 dark:border-green-800">
                        <RadioGroupItem value="bank-transfer" id="bank-transfer" />
                        <Label htmlFor="bank-transfer" className="flex-1 cursor-pointer font-medium">
                          무통장입금
                        </Label>
                        <Building2 className="h-5 w-5 text-green-600" />
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="bank-account">입금 계좌 선택</Label>
                    <Select
                      value={selectedBank}
                      onValueChange={(v) => {
                        setSelectedBank(v);
                        touch();
                      }}
                    >
                      <SelectTrigger className="border-2 focus:border-emerald-500">
                        <SelectValue placeholder="입금 계좌를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shinhan">신한은행 123-456-789012 (예금주: 도깨비테니스)</SelectItem>
                        <SelectItem value="kookmin">국민은행 123-45-6789-012 (예금주: 도깨비테니스)</SelectItem>
                        <SelectItem value="woori">우리은행 1234-567-890123 (예금주: 도깨비테니스)</SelectItem>
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
                      placeholder="입금자명을 입력하세요"
                      className={inputClass('border-2 focus:border-emerald-500 transition-colors', 'depositor', fieldErrors)}
                    />
                    {hasInteracted && fieldErrors.depositor && <p className="mt-1 text-xs text-red-600">{fieldErrors.depositor}</p>}
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <p className="font-semibold text-blue-700 dark:text-blue-400">무통장입금 안내</p>
                    </div>
                    <ul className="space-y-2 text-sm text-blue-600 dark:text-blue-400">
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
                </div>
              </CardContent>
            </Card>

            {/* 주문자 동의 */}
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-red-500/10 via-pink-500/10 to-rose-500/10 p-6">
                <CardTitle className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-red-600" />
                  주문자 동의
                </CardTitle>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 p-4 rounded-lg">
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
                      />
                      <label htmlFor="agree-all" className="font-semibold text-lg text-slate-800 dark:text-slate-200">
                        전체 동의
                      </label>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    {[
                      { id: 'agree-terms', label: '이용약관 동의 (필수)', state: agreeTerms, setState: setAgreeTerms },
                      {
                        id: 'agree-privacy',
                        label: '개인정보 수집 및 이용 동의 (필수)',
                        state: agreePrivacy,
                        setState: setAgreePrivacy,
                      },
                      {
                        id: 'agree-refund',
                        label: '환불 규정 동의 (필수)',
                        state: agreeRefund,
                        setState: setAgreeRefund,
                      },
                    ].map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50/50 to-blue-50/30 dark:from-slate-700/50 dark:to-slate-600/30 rounded-lg">
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
                          />
                          <label htmlFor={item.id} className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {item.label}
                          </label>
                        </div>
                        <Button variant="link" size="sm" className="h-auto p-0 text-blue-600 hover:text-blue-800">
                          보기
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
              <Card className="backdrop-blur-sm bg-white/90 dark:bg-slate-800/90 border-0 shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 p-6 text-white">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-white/20 rounded-full">
                      <Package className="h-5 w-5" />
                    </div>
                    주문 요약
                  </CardTitle>
                </div>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">패키지 금액</span>
                      <span className="font-semibold text-lg">{selectedPackage.price.toLocaleString()}원</span>
                    </div>

                    {hasDiscount && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400">정가</span>
                          <span className="text-slate-400 line-through">{selectedPackage.originalPrice!.toLocaleString()}원</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400">할인 금액</span>
                          <span className="text-red-600 font-semibold">-{discountAmount.toLocaleString()}원</span>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div className="flex justify-between items-center text-xl font-bold">
                      <span>총 결제 금액</span>
                      <span className="text-blue-600">{selectedPackage.price.toLocaleString()}원</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                      <Star className="h-4 w-4" />
                      <span className="font-semibold">패키지 혜택</span>
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400 space-y-1">
                      <p>• {selectedPackage.sessions}회 스트링 교체 서비스</p>
                      <p>• 유효기간: {selectedPackage.validityPeriod}</p>
                      <p>• 회당 {perSessionPrice.toLocaleString()}원</p>
                      {selectedPackage.discount && <p>• {selectedPackage.discount}% 할인 적용</p>}
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
                      <Shield className="h-4 w-4" />
                      <span className="font-semibold">패키지 안내</span>
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                      <p>• 입금 확인 후 패키지가 활성화됩니다.</p>
                      <p>• 예약은 전화 또는 온라인으로 가능합니다.</p>
                      <p>• 유효기간 내에 모든 횟수를 이용해주세요.</p>
                    </div>
                  </div>
                </CardContent>
                <div className="flex flex-col gap-4 p-6">
                  {hasInteracted && agreeTerms && agreePrivacy && agreeRefund && !isFormValid && <p className="text-xs text-red-600">필수 입력칸을 확인해주세요. (이름/이메일/연락처/입금자명)</p>}
                  <PackageCheckoutButton
                    disabled={!canSubmit}
                    packageInfo={selectedPackage}
                    name={name}
                    phone={phone}
                    email={email}
                    postalCode={postalCode}
                    address={address}
                    addressDetail={addressDetail}
                    depositor={depositor}
                    selectedBank={selectedBank}
                    serviceRequest={serviceRequest}
                    saveInfo={saveInfo}
                    serviceMethod={serviceMethod}
                  />
                  <Button variant="outline" className="w-full border-2 hover:bg-slate-50 dark:hover:bg-slate-700 bg-transparent" asChild>
                    <Link href="/services/packages" onClick={onLeavePageClick}>
                      패키지 선택으로 돌아가기
                    </Link>
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
