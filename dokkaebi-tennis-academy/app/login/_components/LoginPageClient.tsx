'use client';

import Link from 'next/link';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/app/store/authStore';
import { Mail, Lock, User, Phone, MapPin, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Shield } from 'lucide-react';
import SocialAuthButtons from '@/app/login/_components/SocialAuthButtons';

// 제출 직전 최종 유효성 가드
const PASSWORD_POLICY_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/; // 8자 이상 + 영문/숫자 조합
const POSTAL_RE = /^\d{5}$/;
const onlyDigits = (v: string) => String(v ?? '').replace(/\D/g, '');

// 연락처 입력 UX: "010 0000 0000" 형태로 자동 포맷팅(표시용) + 제출/검증은 숫자만 기준
const formatKoreanPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (!d) return '';
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
};

// 연락처 정책: 010으로 시작 + 뒤 8자리(총 11자리)만 허용
const isValidKoreanPhone = (v: string) => /^010\d{8}$/.test(onlyDigits(v));

type GuestOrderMode = 'off' | 'legacy' | 'on';

function getGuestOrderModeClient(): GuestOrderMode {
  // 클라이언트 번들에서는 NEXT_PUBLIC_만 안전하게 읽을 수 있음
  // env가 없으면 "legacy"로 기본값(= 비회원 진입점 숨김) 처리해서 실수 노출을 방지.
  const raw = (process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? 'legacy').trim();
  return raw === 'off' || raw === 'legacy' || raw === 'on' ? raw : 'legacy';
}

type LoginField = 'email' | 'password';
type RegisterField = 'emailId' | 'emailDomain' | 'password' | 'confirmPassword' | 'name' | 'phone' | 'postalCode' | 'address' | 'addressDetail';

// fetch 응답이 JSON이 아닐 때(res.json() 파싱 실패 등)도  화면/UX가 깨지지 않도록 안전 파싱
async function readJsonSafe(res: Response): Promise<any | null> {
  try {
    const text = await res.text().catch(() => '');
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

//  첫 오류 필드로 포커스를 이동. (id가 없으면 이동 불가하므로, 필요한 입력에는 id를 최소로 부여)

function focusFirst(ids: string[]) {
  for (const id of ids) {
    const el = document.getElementById(id) as HTMLElement | null;
    if (!el) continue;
    // HTMLElement#focus 존재 여부를 런타임에서 확인
    if (typeof (el as any).focus === 'function') {
      (el as any).focus();
      break;
    }
  }
}

export default function LoginPageClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>('login');

  // 비회원 중지
  const guestOrderMode = getGuestOrderModeClient();
  const showGuestLookup = guestOrderMode === 'on';

  // 소셜 회원가입(카카오/네이버) 모드 판별
  const oauthProvider = params.get('oauth'); // 'kakao' | 'naver'
  const oauthToken = params.get('token'); // pending token
  const isSocialOauthRegister = activeTab === 'register' && (oauthProvider === 'kakao' || oauthProvider === 'naver') && !!oauthToken;
  const socialProviderLabel = oauthProvider === 'naver' ? '네이버' : '카카오';

  const { setUser } = useAuthStore();

  // 로그인 상태
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // 로그인: 필드별/공통 에러 UX
  const [loginFieldErrors, setLoginFieldErrors] = useState<Partial<Record<LoginField, string>>>({});
  const [loginFormError, setLoginFormError] = useState<string>('');

  // 회원가입 상태
  const [emailId, setEmailId] = useState('');
  const [emailDomain, setEmailDomain] = useState('gmail.com');
  const [isCustomDomain, setIsCustomDomain] = useState(false);
  const [isEmailAvailable, setIsEmailAvailable] = useState<boolean | null>(null);
  const [saveEmail, setSaveEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');

  // 회원가입: 필드별/공통 에러 UX
  const [registerFieldErrors, setRegisterFieldErrors] = useState<Partial<Record<RegisterField, string>>>({});
  const [registerFormError, setRegisterFormError] = useState<string>('');

  const email = `${emailId}@${emailDomain}`;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailIdRegex = /^[a-z0-9]{4,30}$/;

  const resetRegisterForm = () => {
    setEmailId('');
    setEmailDomain('gmail.com');
    setIsCustomDomain(false);
    setIsEmailAvailable(null);
    setCheckingEmail(false);
    setPassword('');
    setConfirmPassword('');
    setShowRegisterPassword(false);
    setShowConfirmPassword(false);
    setName('');
    setPhone('');
    setPostalCode('');
    setAddress('');
    setAddressDetail('');
    setRegisterFieldErrors({});
    setRegisterFormError('');
  };

  // URL 파라미터에 따라 탭 전환
  useEffect(() => {
    const tabParam = params.get('tab');
    if (tabParam === 'login' || tabParam === 'register') {
      setActiveTab(tabParam);

      // 회원가입 성공 후 /login?tab=login 으로 이동한 경우,
      // 다시 '회원가입' 탭을 눌렀을 때 이전 입력값이 남지 않도록 폼을 리셋합니다.
      if (tabParam === 'login') {
        resetRegisterForm();
      }
    }
  }, [params]);

  // 탭 전환 시 이전 탭의 에러 메시지가 남아 혼동되지 않도록 초기화
  useEffect(() => {
    setLoginFieldErrors({});
    setLoginFormError('');
    setRegisterFieldErrors({});
    setRegisterFormError('');
  }, [activeTab]);

  // 소셜 회원가입: pending 조회 → 이메일/이름 자동 입력(프리필)
  useEffect(() => {
    if (!isSocialOauthRegister) return;
    setIsEmailAvailable(null);

    (async () => {
      try {
        const res = await fetch(`/api/oauth/pending?token=${encodeURIComponent(oauthToken!)}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await readJsonSafe(res);

        if (!res.ok || !data?.email) {
          showErrorToast('소셜 회원가입 정보가 만료되었어요. 다시 시도해주세요.');
          router.push('/login?tab=login');
          return;
        }

        const fullEmail = String(data.email);
        const [idPart, domainPart] = fullEmail.split('@');

        // 자동 입력
        setEmailId(idPart ?? '');
        setEmailDomain(domainPart ?? 'gmail.com');
        setIsCustomDomain(true);

        // 이름 자동 입력
        setName(String(data.name ?? idPart ?? ''));

        // 중복확인/정규식 검사 스킵하기 위해 '사용가능'으로 고정
        setIsEmailAvailable(null);
      } catch (e) {
        showErrorToast('소셜 회원가입 정보를 불러오지 못했습니다.');
        router.push('/login?tab=login');
      }
    })();
  }, [isSocialOauthRegister, oauthToken, router]);

  // 이메일 저장 로직
  useEffect(() => {
    const savedEmail = localStorage.getItem('saved-email');
    if (savedEmail) {
      const emailInput = document.getElementById('email') as HTMLInputElement | null;
      if (emailInput) emailInput.value = savedEmail;
      setSaveEmail(true);
    }
  }, []);

  const handleLogin = async () => {
    if (loginLoading) return;

    setLoginFormError('');
    setLoginFieldErrors({});

    // 로그인 폼은 기존 UI를 유지하기 위해 uncontrolled input(id 기반) 접근을 사용합니다.
    const emailInput = document.getElementById('email') as HTMLInputElement | null;
    const pwInput = document.getElementById('password') as HTMLInputElement | null;

    const emailVal = (emailInput?.value ?? '').trim();
    const pwVal = pwInput?.value ?? '';

    const nextErrors: Partial<Record<LoginField, string>> = {};
    if (!emailVal) nextErrors.email = '이메일을 입력해주세요.';
    else if (!emailRegex.test(emailVal)) nextErrors.email = '유효한 이메일 형식이 아닙니다.';
    if (!pwVal) nextErrors.password = '비밀번호를 입력해주세요.';

    if (Object.keys(nextErrors).length > 0) {
      const firstMsg = nextErrors.email || nextErrors.password || '입력값을 확인해주세요.';
      setLoginFieldErrors(nextErrors);
      setLoginFormError(firstMsg);
      focusFirst([nextErrors.email ? 'email' : '', nextErrors.password ? 'password' : ''].filter(Boolean));
      return;
    }

    try {
      setLoginLoading(true);

      // 이메일 저장(기존 UX 유지)
      if (saveEmail) localStorage.setItem('saved-email', emailVal);
      else localStorage.removeItem('saved-email');

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal, password: pwVal }),
      });

      const data = await readJsonSafe(response);

      if (!response.ok) {
        // 서버는 { error } 형태로 리턴합니다. (파싱 실패 대비)
        const msg = data?.error || data?.message || '로그인에 실패했습니다.';
        setLoginFormError(msg);
        showErrorToast(msg);
        return;
      }

      // 세션 확인(기존 흐름 유지)
      const meRes = await fetch('/api/users/me', { credentials: 'include' });
      const meData = await readJsonSafe(meRes);

      const meUser = (meData as any)?.user ?? meData;

      if (!meRes.ok || !meUser?.id) {
        const msg = (meData as any)?.error || (meData as any)?.message || '로그인에 실패했습니다.';
        setLoginFormError(msg);
        showErrorToast(msg);
        return;
      }
      // 전역 로그인 상태(zustand)를 즉시 갱신해 헤더 등이 새로고침 없이 반영되게 함
      setUser(meUser);
      showSuccessToast('로그인되었습니다.');

      const redirectTo = params.get('redirectTo') || '/';
      // 로그인 페이지로 "뒤로가기" 했을 때 다시 로그인 폼이 보이지 않도록 replace가 더 안전
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      setLoginFormError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      showErrorToast('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');

      return;
    } finally {
      setLoginLoading(false);
    }
  };

  const checkEmailAvailability = async () => {
    if (checkingEmail || isSocialOauthRegister) return;

    setRegisterFormError('');
    setRegisterFieldErrors((prev) => ({ ...prev, emailId: undefined, emailDomain: undefined }));
    setIsEmailAvailable(null);

    const idTrim = emailId.trim();
    const domainTrim = emailDomain.trim();
    const emailVal = `${idTrim}@${domainTrim}`;

    if (!idTrim || !domainTrim) {
      const msg = '이메일을 입력해주세요.';
      setRegisterFormError(msg);
      setRegisterFieldErrors((prev) => ({
        ...prev,
        emailId: !idTrim ? '이메일 아이디를 입력해주세요.' : undefined,
        emailDomain: !domainTrim ? '이메일 도메인을 선택/입력해주세요.' : undefined,
      }));
      focusFirst([!idTrim ? 'register-email-id' : '', !domainTrim ? 'register-email-domain' : ''].filter(Boolean));
      return;
    }

    if (!emailIdRegex.test(idTrim)) {
      const msg = '아이디는 영문 소문자와 숫자 조합으로 4자 이상 입력해주세요.';
      setRegisterFormError(msg);
      setRegisterFieldErrors((prev) => ({ ...prev, emailId: msg }));
      focusFirst(['register-email-id']);
      return;
    }

    if (!emailRegex.test(emailVal)) {
      const msg = '유효한 이메일 형식이 아닙니다.';
      setRegisterFormError(msg);
      setRegisterFieldErrors((prev) => ({ ...prev, emailDomain: msg }));
      focusFirst(['register-email-domain']);
      return;
    }

    try {
      setCheckingEmail(true);

      // 서버 라우터: /api/check-email -> { isAvailable: boolean }
      const res = await fetch(`/api/check-email?email=${encodeURIComponent(emailVal)}`, { credentials: 'include' });
      const data = await readJsonSafe(res);

      if (!res.ok) {
        const msg = data?.error || data?.message || '중복 확인에 실패했습니다.';
        setRegisterFormError(msg);
        return;
      }

      const available = !!data?.isAvailable;
      setIsEmailAvailable(available);

      // if (!available) {
      //   const msg = '이미 사용 중인 이메일입니다.';
      //   setRegisterFormError(msg);
      //   setRegisterFieldErrors((prev) => ({ ...prev, emailId: msg }));
      //   focusFirst(['register-email-id']);
      //   return;
      // }

      // available === true 인 경우: 하단의 "사용 가능" 인라인 표시로 충분(중복 toast/경고 박스는 생략)
    } catch (err) {
      setRegisterFormError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      return;
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setRegisterFormError('');
    setRegisterFieldErrors({});

    const nameTrim = name.trim();
    const phoneDigits = onlyDigits(phone);
    const postalTrim = postalCode.trim();
    const addressTrim = address.trim();

    // 공통: 이름/연락처/주소는 반드시 입력
    const nextCommonErrors: Partial<Record<RegisterField, string>> = {};
    if (!nameTrim || nameTrim.length < 2) nextCommonErrors.name = '이름을 입력해주세요. (2자 이상)';
    if (!phoneDigits) nextCommonErrors.phone = '연락처를 입력해주세요. (예: 01012345678)';
    else if (!isValidKoreanPhone(phoneDigits)) nextCommonErrors.phone = '올바른 연락처 형식으로 입력해주세요. (010 0000 0000)';
    if (!postalTrim || !addressTrim) nextCommonErrors.postalCode = '우편번호 찾기를 통해 주소를 등록해주세요.';
    else if (!POSTAL_RE.test(postalTrim)) nextCommonErrors.postalCode = '우편번호 형식이 올바르지 않습니다.';
    if (!addressTrim) nextCommonErrors.address = '우편번호 찾기를 통해 주소를 등록해주세요.';

    // 소셜 회원가입(추가정보 입력) 경로: 이메일/비밀번호는 이미 처리됨(서버에서)
    if (isSocialOauthRegister) {
      if (Object.keys(nextCommonErrors).length > 0) {
        const firstMsg = nextCommonErrors.name || nextCommonErrors.phone || nextCommonErrors.postalCode || nextCommonErrors.address || '입력값을 확인해주세요.';
        setRegisterFieldErrors(nextCommonErrors);
        setRegisterFormError(firstMsg);
        focusFirst([nextCommonErrors.name ? 'register-name' : '', nextCommonErrors.phone ? 'register-phone' : '', nextCommonErrors.postalCode || nextCommonErrors.address ? 'register-find-postcode' : ''].filter(Boolean));
        return;
      }

      try {
        setSubmitting(true);
        const res = await fetch('/api/oauth/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            token: oauthToken,
            phone: phoneDigits,
            postalCode: postalTrim,
            address: addressTrim,
            addressDetail,
          }),
        });

        const data = await readJsonSafe(res);

        if (!res.ok) {
          const msg = data?.error || data?.message || '회원가입에 실패했습니다.';
          setRegisterFormError(msg);
          return;
        }

        showSuccessToast('회원가입이 완료되었습니다.');
        resetRegisterForm();
        router.push(data?.redirectTo || '/');
        router.refresh();
      } catch (err) {
        setRegisterFormError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        return;
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // 일반 회원가입 경로: 이메일/비밀번호 검증 포함
    const nextErrors: Partial<Record<RegisterField, string>> = { ...nextCommonErrors };

    const idTrim = emailId.trim();
    const domainTrim = emailDomain.trim();
    const emailVal = `${idTrim}@${domainTrim}`;

    if (!idTrim || !domainTrim) nextErrors.emailId = '이메일을 입력해주세요.';
    else if (!emailIdRegex.test(idTrim)) nextErrors.emailId = '아이디는 영문 소문자와 숫자 조합으로 4자 이상 입력해주세요.';
    else if (!emailRegex.test(emailVal)) nextErrors.emailId = '유효한 이메일 형식이 아닙니다.';
    else if (isEmailAvailable !== true) nextErrors.emailId = '이메일 중복 확인을 진행해주세요.';

    if (!password) nextErrors.password = '비밀번호를 입력해주세요.';
    else if (password.length < 8) nextErrors.password = '비밀번호는 8자 이상이어야 합니다.';
    else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) nextErrors.password = '비밀번호는 영문/숫자를 포함해야 합니다.';

    if (!confirmPassword) nextErrors.confirmPassword = '비밀번호 확인을 입력해주세요.';
    else if (password !== confirmPassword) nextErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';

    if (Object.keys(nextErrors).length > 0) {
      const firstMsg = nextErrors.emailId || nextErrors.password || nextErrors.confirmPassword || nextErrors.name || nextErrors.phone || nextErrors.postalCode || nextErrors.address || '입력값을 확인해주세요.';
      setRegisterFieldErrors(nextErrors);
      setRegisterFormError(firstMsg);

      focusFirst(
        [
          nextErrors.emailId ? 'register-email-id' : '',
          nextErrors.emailDomain ? 'register-email-domain' : '',
          nextErrors.password ? 'register-password' : '',
          nextErrors.confirmPassword ? 'register-confirm-password' : '',
          nextErrors.name ? 'register-name' : '',
          nextErrors.phone ? 'register-phone' : '',
          nextErrors.postalCode || nextErrors.address ? 'register-find-postcode' : '',
        ].filter(Boolean),
      );
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailVal,
          password,
          name: nameTrim,
          phone: phoneDigits,
          postalCode: postalTrim,
          address: addressTrim,
          addressDetail,
        }),
      });

      const data = await readJsonSafe(response);

      if (!response.ok) {
        const msg = data?.error || data?.message || '회원가입에 실패했습니다.';
        setRegisterFormError(msg);

        // 서버가 이메일 중복을 리턴하는 경우: 중복확인 상태도 함께 무효화
        if (typeof msg === 'string' && msg.includes('이미')) {
          setIsEmailAvailable(false);
        }
        return;
      }

      showSuccessToast('회원가입이 완료되었습니다. 로그인 탭으로 이동합니다.');
      resetRegisterForm();
      router.push('/login?tab=login');
      router.refresh();
    } catch (err) {
      setRegisterFormError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      return;
    } finally {
      setSubmitting(false);
    }
  };

  const handleKakaoOAuth = () => {
    const from = new URLSearchParams(window.location.search).get('from');
    const url = from ? `/api/oauth/kakao?from=${encodeURIComponent(from)}` : '/api/oauth/kakao';
    window.location.href = url;
  };

  const handleNaverOAuth = () => {
    const from = new URLSearchParams(window.location.search).get('from');
    const url = from ? `/api/oauth/naver?from=${encodeURIComponent(from)}` : '/api/oauth/naver';
    window.location.href = url;
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
        setRegisterFieldErrors((prev) => ({ ...prev, postalCode: undefined, address: undefined }));
        setRegisterFormError('');
      },
    }).open();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-900/20 flex items-center justify-center p-4">
      <div className="absolute top-10 left-10 w-20 h-20 bg-emerald-400/20 rounded-full blur-2xl animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-green-400/10 rounded-full blur-3xl animate-pulse"></div>

      <div className="relative w-full max-w-6xl">
        <Card className={`mx-auto overflow-hidden backdrop-blur-sm bg-white/95 dark:bg-slate-800/95 border-0 shadow-2xl transition-all duration-700 ease-in-out ${activeTab === 'register' ? 'max-w-4xl' : 'max-w-md'}`}>
          <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 p-6 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative text-center">
              {/* <div className="w-16 h-16 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg"></div> */}
              <h1 className="text-2xl bp-sm:text-3xl font-black">도깨비 테니스</h1>
              <p className="text-emerald-100 mt-2 font-medium">Dokkaebi Tennis Shop</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-700">
              <TabsTrigger value="login" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-md data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 font-semibold">
                로그인
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-md data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 font-semibold">
                회원가입
              </TabsTrigger>
            </TabsList>

            {/* 로그인 탭 */}
            <TabsContent value="login" className="p-6">
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">로그인</h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-2">계정에 로그인하여 쇼핑을 시작하세요</p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLogin();
                  }}
                  className="space-y-4"
                >
                  {/* {loginFormError && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="whitespace-pre-line">{loginFormError}</div>
                    </div>
                  )} */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-medium">
                      이메일
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="이메일 주소를 입력하세요"
                        onChange={() => {
                          setLoginFieldErrors((prev) => ({ ...prev, email: undefined }));
                          setLoginFormError('');
                        }}
                        className="pl-10 h-12 border-slate-200 dark:border-slate-600 focus:border-emerald-500 focus:ring-emerald-500 dark:focus:border-emerald-400"
                      />
                    </div>
                    {loginFieldErrors.email && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                        <AlertCircle className="h-4 w-4" />
                        <span className="whitespace-pre-line">{loginFieldErrors.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-medium">
                      비밀번호
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="비밀번호를 입력하세요"
                        onChange={() => {
                          setLoginFieldErrors((prev) => ({ ...prev, password: undefined }));
                          setLoginFormError('');
                        }}
                        className="pl-10 pr-10 h-12 border-slate-200 dark:border-slate-600 focus:border-emerald-500 focus:ring-emerald-500 dark:focus:border-emerald-400"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {loginFieldErrors.password && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                        <AlertCircle className="h-4 w-4" />
                        <span className="whitespace-pre-line">{loginFieldErrors.password}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <input type="checkbox" checked={saveEmail} onChange={(e) => setSaveEmail(e.target.checked)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                      이메일 저장
                    </label>
                    <Link href="/forgot-password" className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline">
                      비밀번호 찾기
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    disabled={loginLoading}
                  >
                    {loginLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        로그인 중...
                      </>
                    ) : (
                      '로그인'
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200 dark:border-slate-600" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-slate-800 px-4 text-slate-500 dark:text-slate-400 font-medium">SNS 계정으로 로그인</span>
                  </div>
                </div>

                <SocialAuthButtons onKakaoClick={handleKakaoOAuth} onNaverClick={handleNaverOAuth} />

                {showGuestLookup && (
                  <div className="text-center">
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-4 mb-4 border border-emerald-200/50 dark:border-emerald-800/50">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">비회원도 주문하실 수 있습니다</p>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 bg-transparent"
                        onClick={() => router.push('/order-lookup')}
                      >
                        비회원 주문 조회하기
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 회원가입 탭 */}
            <TabsContent value="register" className="p-6">
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">회원가입</h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-2">도깨비 테니스의 회원이 되어보세요</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-6">
                  {/* {registerFormError && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="whitespace-pre-line">{registerFormError}</div>
                    </div>
                  )} */}
                  <div className="grid grid-cols-1 bp-lg:grid-cols-2 gap-6">
                    {/* 이메일 */}
                    <div className="bp-lg:col-span-2 space-y-2">
                      <Label htmlFor="register-email-id" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Mail className="h-4 w-4 text-green-600" />
                        이메일 주소
                      </Label>

                      <div className="space-y-2">
                        <div className="flex flex-col gap-2 bp-sm:flex-row bp-sm:items-start">
                          <div className="flex w-full items-center gap-2 min-w-0">
                            <div className="relative flex-1 min-w-0">
                              <Input
                                id="register-email-id"
                                value={emailId}
                                onChange={(e) => {
                                  setEmailId(e.target.value);
                                  setIsEmailAvailable(null);
                                  setRegisterFieldErrors((prev) => ({ ...prev, emailId: undefined }));
                                }}
                                placeholder="아이디 입력"
                                className={`h-12 pl-10 pr-4 ${registerFieldErrors.emailId ? 'border-red-500 focus:border-red-500' : ''}`}
                                autoComplete="email"
                                disabled={isSocialOauthRegister}
                              />
                              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            </div>

                            <span className="text-gray-500">@</span>

                            {isCustomDomain ? (
                              <div className="flex flex-1 items-center gap-2 min-w-0">
                                <Input
                                  id="register-email-domain"
                                  value={emailDomain}
                                  onChange={(e) => {
                                    setEmailDomain(e.target.value);
                                    setIsEmailAvailable(null);
                                    setRegisterFieldErrors((prev) => ({ ...prev, emailDomain: undefined }));
                                  }}
                                  placeholder="도메인 직접 입력"
                                  className={`h-12 ${registerFieldErrors.emailDomain ? 'border-red-500 focus:border-red-500' : ''}`}
                                  disabled={isSocialOauthRegister}
                                />
                                {!isSocialOauthRegister && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-12 shrink-0"
                                    onClick={() => {
                                      setIsCustomDomain(false);
                                      setEmailDomain('gmail.com');
                                      setIsEmailAvailable(null);
                                    }}
                                  >
                                    선택
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-1 min-w-0">
                                <Select
                                  value={emailDomain}
                                  onValueChange={(v) => {
                                    setEmailDomain(v);
                                    setIsEmailAvailable(null);
                                    setRegisterFieldErrors((prev) => ({ ...prev, emailDomain: undefined }));
                                    if (v === 'custom') {
                                      setIsCustomDomain(true);
                                      setEmailDomain('');
                                    } else {
                                      setIsCustomDomain(false);
                                    }
                                  }}
                                  disabled={isSocialOauthRegister}
                                >
                                  <SelectTrigger id="register-email-domain" className={`h-12 ${registerFieldErrors.emailDomain ? 'border-red-500 focus:border-red-500' : ''}`}>
                                    <SelectValue placeholder="도메인 선택" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="gmail.com">gmail.com</SelectItem>
                                    <SelectItem value="naver.com">naver.com</SelectItem>
                                    <SelectItem value="daum.net">daum.net</SelectItem>
                                    <SelectItem value="kakao.com">kakao.com</SelectItem>
                                    <SelectItem value="custom">직접 입력</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          {!isSocialOauthRegister && (
                            <Button type="button" variant="outline" className="h-12 px-4 shrink-0" onClick={checkEmailAvailability} disabled={!emailRegex.test(`${emailId.trim()}@${emailDomain.trim()}`) || checkingEmail}>
                              {checkingEmail ? (
                                <span className="flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  확인 중
                                </span>
                              ) : (
                                '중복 확인'
                              )}
                            </Button>
                          )}
                        </div>

                        {(registerFieldErrors.emailId || registerFieldErrors.emailDomain) && (
                          <div className="space-y-1">
                            {registerFieldErrors.emailId && (
                              <p className="flex items-center gap-1 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                {registerFieldErrors.emailId}
                              </p>
                            )}
                            {registerFieldErrors.emailDomain && (
                              <p className="flex items-center gap-1 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                {registerFieldErrors.emailDomain}
                              </p>
                            )}
                          </div>
                        )}

                        {isSocialOauthRegister && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            소셜 로그인 이메일이 자동으로 입력되었습니다.
                          </div>
                        )}

                        {!isSocialOauthRegister && isEmailAvailable !== null && (
                          <div className={`flex items-center gap-2 text-sm ${isEmailAvailable ? 'text-green-600' : 'text-red-600'}`}>
                            {isEmailAvailable ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                            {isEmailAvailable ? '사용 가능한 이메일입니다.' : '이미 사용 중인 이메일입니다.'}
                          </div>
                        )}
                      </div>
                    </div>
                    {!isSocialOauthRegister && (
                      <>
                        {/* 비밀번호 */}
                        <div className="space-y-2">
                          <Label className="text-slate-700 dark:text-slate-300 font-medium">비밀번호</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <Input
                              id="register-password"
                              type={showRegisterPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => {
                                setPassword(e.target.value);
                                setRegisterFieldErrors((prev) => ({ ...prev, password: undefined }));
                                setRegisterFormError('');
                              }}
                              placeholder="비밀번호를 입력하세요"
                              className="pl-10 pr-10 h-12 border-slate-200 dark:border-slate-600 focus:border-emerald-500 dark:focus:border-emerald-400"
                            />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 text-slate-400" onClick={() => setShowRegisterPassword(!showRegisterPassword)}>
                              {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                          {registerFieldErrors.password && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                              <AlertCircle className="h-4 w-4" />
                              <span className="whitespace-pre-line">{registerFieldErrors.password}</span>
                            </div>
                          )}
                        </div>

                        {/* 비밀번호 확인 */}
                        <div className="space-y-2">
                          <Label className="text-slate-700 dark:text-slate-300 font-medium">비밀번호 확인</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <Input
                              id="register-confirm-password"
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                setRegisterFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                                setRegisterFormError('');
                              }}
                              placeholder="비밀번호를 다시 입력하세요"
                              className="pl-10 pr-10 h-12 border-slate-200 dark:border-slate-600 focus:border-emerald-500 dark:focus:border-emerald-400"
                            />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 text-slate-400" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                          {password && confirmPassword && password !== confirmPassword && (
                            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                              <AlertCircle className="h-4 w-4" />
                              비밀번호가 일치하지 않습니다.
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    {/* 이름 */}
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300 font-medium">이름</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                          id="register-name"
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            setRegisterFieldErrors((prev) => ({ ...prev, name: undefined }));
                            setRegisterFormError('');
                          }}
                          placeholder="이름을 입력하세요"
                          className="pl-10 h-12 border-slate-200 dark:border-slate-600 focus:border-emerald-500 dark:focus:border-emerald-400"
                        />
                      </div>
                      {registerFieldErrors.name && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                          <AlertCircle className="h-4 w-4" />
                          <span className="whitespace-pre-line">{registerFieldErrors.name}</span>
                        </div>
                      )}
                    </div>

                    {/* 연락처 */}
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300 font-medium">연락처</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                          id="register-phone"
                          value={phone}
                          onChange={(e) => {
                            setPhone(formatKoreanPhone(e.target.value));
                            setRegisterFieldErrors((prev) => ({ ...prev, phone: undefined }));
                            setRegisterFormError('');
                          }}
                          placeholder="연락처를 입력하세요 ('-' 제외)"
                          inputMode="numeric"
                          maxLength={13}
                          className="pl-10 h-12 border-slate-200 dark:border-slate-600 focus:border-emerald-500 dark:focus:border-emerald-400"
                        />
                      </div>
                      {registerFieldErrors.phone && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                          <AlertCircle className="h-4 w-4" />
                          <span className="whitespace-pre-line">{registerFieldErrors.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* 우편번호 */}
                    <div className="bp-lg:col-span-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-700 dark:text-slate-300 font-medium">우편번호</Label>
                        <Button
                          id="register-find-postcode"
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 bg-transparent"
                          onClick={handleFindPostcode}
                        >
                          <MapPin className="mr-2 h-4 w-4" />
                          우편번호 찾기
                        </Button>
                      </div>
                      <Input id="register-postal-code" value={postalCode} placeholder="우편번호를 입력하세요" readOnly className="bg-slate-50 dark:bg-slate-700 cursor-not-allowed max-w-xs h-12 border-slate-200 dark:border-slate-600" />
                      {registerFieldErrors.postalCode && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                          <AlertCircle className="h-4 w-4" />
                          <span className="whitespace-pre-line">{registerFieldErrors.postalCode}</span>
                        </div>
                      )}
                    </div>

                    {/* 기본 주소 */}
                    <div className="bp-lg:col-span-2 space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300 font-medium">기본 배송지 주소</Label>
                      <Input id="register-address" value={address} placeholder="기본 주소를 입력하세요" readOnly className="bg-slate-50 dark:bg-slate-700 cursor-not-allowed h-12 border-slate-200 dark:border-slate-600" />
                      {registerFieldErrors.address && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                          <AlertCircle className="h-4 w-4" />
                          <span className="whitespace-pre-line">{registerFieldErrors.address}</span>
                        </div>
                      )}
                    </div>

                    {/* 상세 주소 */}
                    <div className="bp-lg:col-span-2 space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300 font-medium">상세 주소</Label>
                      <Input
                        id="register-address-detail"
                        value={addressDetail}
                        onChange={(e) => {
                          setAddressDetail(e.target.value);
                          setRegisterFieldErrors((prev) => ({ ...prev, addressDetail: undefined }));
                          setRegisterFormError('');
                        }}
                        placeholder="상세 주소를 입력하세요"
                        className="h-12 border-slate-200 dark:border-slate-600 focus:border-emerald-500 dark:focus:border-emerald-400"
                      />
                    </div>
                  </div>
                  {registerFieldErrors.addressDetail && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                      <AlertCircle className="h-4 w-4" />
                      <span className="whitespace-pre-line">{registerFieldErrors.addressDetail}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className={
                      isSocialOauthRegister
                        ? oauthProvider === 'naver'
                          ? 'w-full h-12 bg-[#03C75A] hover:bg-[#02B350] text-white font-semibold shadow-lg'
                          : 'w-full h-12 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-semibold shadow-lg'
                        : 'w-full h-12 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold shadow-lg'
                    }
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        가입 중...
                      </>
                    ) : isSocialOauthRegister ? (
                      <>
                        {oauthProvider === 'naver' ? (
                          <>
                            {/* 네이버 아이콘 */}
                            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M16.344 12.9 8.72 2H4v20h3.656V11.1L15.28 22H20V2h-3.656v10.9Z" />
                            </svg>
                            네이버로 회원가입 완료
                          </>
                        ) : (
                          <>
                            {/* 카카오 아이콘 */}
                            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 3C6.477 3 2 6.58 2 11c0 2.783 1.77 5.243 4.5 6.66L5.6 21.5c-.1.4.3.7.7.5l4.3-2.3c.45.06.91.09 1.4.09 5.523 0 10-3.58 10-8s-4.477-8-10-8z" />
                            </svg>
                            카카오로 회원가입 완료
                          </>
                        )}
                      </>
                    ) : (
                      '회원가입'
                    )}
                  </Button>
                  {!isSocialOauthRegister && (
                    <>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-slate-200 dark:border-slate-600" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white dark:bg-slate-800 px-4 text-slate-500 dark:text-slate-400 font-medium">SNS 계정으로 가입</span>
                        </div>
                      </div>
                      <SocialAuthButtons onKakaoClick={handleKakaoOAuth} onNaverClick={handleNaverOAuth} isRegisterMode={true} />
                    </>
                  )}
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
