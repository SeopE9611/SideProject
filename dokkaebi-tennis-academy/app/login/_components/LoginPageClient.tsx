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

export default function LoginPageClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>('login');

  // 소셜 회원가입(카카오) 모드 판별
  const oauthProvider = params.get('oauth'); // 'kakao'
  const oauthToken = params.get('token'); // pending token
  const isKakaoOauthRegister = activeTab === 'register' && oauthProvider === 'kakao' && !!oauthToken;

  const { setUser } = useAuthStore();

  // 로그인 상태
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

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

  const email = `${emailId}@${emailDomain}`;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailIdRegex = /^[a-z0-9]{4,30}$/;

  // URL 파라미터에 따라 탭 전환
  useEffect(() => {
    const tabParam = params.get('tab');
    if (tabParam === 'login' || tabParam === 'register') {
      setActiveTab(tabParam);
    }
  }, [params]);

  // 카카오 소셜 회원가입: pending 조회 → 이메일/이름 자동 입력(프리필)
  useEffect(() => {
    if (!isKakaoOauthRegister) return;
    setIsEmailAvailable(null);

    (async () => {
      try {
        const res = await fetch(`/api/oauth/pending?token=${encodeURIComponent(oauthToken!)}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await res.json().catch(() => null);

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
  }, [isKakaoOauthRegister, oauthToken, router]);

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
    setLoginLoading(true);
    const email = (document.getElementById('email') as HTMLInputElement)?.value;
    const password = (document.getElementById('password') as HTMLInputElement)?.value;

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await res.json();

      if (!res.ok) {
        showErrorToast(result.error || '로그인에 실패했습니다.');
        return;
      }

      const meRes = await fetch('/api/users/me', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!meRes.ok) {
        showErrorToast('유저 정보를 불러오지 못했습니다.');
        return;
      }
      const user = await meRes.json();
      setUser(user);

      await new Promise((resolve) => setTimeout(resolve, 30));

      if (saveEmail) {
        localStorage.setItem('saved-email', email);
      } else {
        localStorage.removeItem('saved-email');
      }

      localStorage.removeItem('cart-storage');
      const from = new URLSearchParams(window.location.search).get('from');
      router.push(from === 'cart' ? '/cart' : '/');
      router.refresh();
    } catch (error) {
      showErrorToast('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoginLoading(false);
    }
  };

  const checkEmailAvailability = async () => {
    const fullEmail = `${emailId}@${emailDomain}`;

    if (!emailIdRegex.test(emailId)) {
      showErrorToast('아이디는 영문 소문자 또는 숫자 조합으로\n4자 이상 입력해주세요.');
      return;
    }

    if (!emailRegex.test(fullEmail)) {
      showErrorToast('유효한 이메일 형식이 아닙니다.');
      return;
    }

    try {
      setCheckingEmail(true);
      setIsEmailAvailable(null);

      const res = await fetch(`/api/check-email?email=${encodeURIComponent(fullEmail)}`);
      const data = await res.json();

      setIsEmailAvailable(data.isAvailable);
    } catch (error) {
      showErrorToast('이메일 확인 중 오류가 발생했습니다.');
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    //  카카오 OAuth 회원가입이면: password/register API가 아니라 complete로 보냄
    if (isKakaoOauthRegister) {
      if (!name) {
        showErrorToast('이름을 입력해주세요.');
        return;
      }
      if (!phone) {
        showErrorToast('연락처를 입력해주세요.');
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch('/api/oauth/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            token: oauthToken,
            phone,
            postalCode,
            address,
            addressDetail,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          showErrorToast(data?.error || 'SNS 회원가입 완료 처리에 실패했습니다.');
          return;
        }

        // 쿠키 발급된 상태이므로 me 갱신
        const meRes = await fetch('/api/users/me', { credentials: 'include', cache: 'no-store' });
        if (meRes.ok) {
          const me = await meRes.json();
          setUser(me);
        }

        showSuccessToast('SNS 회원가입이 완료되었습니다.');
        router.push(data.redirectTo || '/');
        router.refresh();
        return;
      } catch (err) {
        showErrorToast('SNS 회원가입 처리 중 오류가 발생했습니다.');
        return;
      } finally {
        setSubmitting(false);
      }
    }

    if (!emailIdRegex.test(emailId)) {
      showErrorToast('아이디는 영문 소문자와 숫자 조합으로\n4자 이상 입력해주세요.');
      return;
    }
    if (!email || !password || !confirmPassword || !name) {
      showErrorToast('모든 필드를 입력해주세요.');
      return;
    }
    if (isEmailAvailable === null) {
      showErrorToast('이메일 중복 확인을 해주세요.');
      return;
    }
    if (!isEmailAvailable) {
      showErrorToast('이미 사용 중인 이메일입니다.');
      return;
    }
    if (password !== confirmPassword) {
      showErrorToast('비밀번호가 일치하지 않습니다.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
          phone,
          postalCode,
          address,
          addressDetail,
        }),
      });

      const data = await res.json();
      const from = params.get('from');

      if (res.ok) {
        showSuccessToast('회원가입이 완료되었습니다.');
        router.push(`/login?tab=login${from === 'cart' ? '&from=cart' : ''}`);
      } else {
        showErrorToast(data.message || '회원가입 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error(err);
      showErrorToast('서버 통신 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKakaoOAuth = () => {
    const from = new URLSearchParams(window.location.search).get('from');
    const url = from ? `/api/oauth/kakao?from=${encodeURIComponent(from)}` : '/api/oauth/kakao';
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
              <div className="w-16 h-16 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg"></div>
              <h1 className="text-2xl sm:text-3xl font-black">도깨비 테니스</h1>
              <p className="text-emerald-100 mt-2 font-medium">프리미엄 테니스 스트링 전문점</p>
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
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-medium">
                      이메일
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input id="email" type="email" placeholder="이메일 주소를 입력하세요" className="pl-10 h-12 border-slate-200 dark:border-slate-600 focus:border-emerald-500 focus:ring-emerald-500 dark:focus:border-emerald-400" />
                    </div>
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

                <SocialAuthButtons onKakaoClick={handleKakaoOAuth} />

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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 이메일 */}
                    <div className="lg:col-span-2 space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300 font-medium">이메일 주소</Label>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                        <div className="flex w-full items-center gap-2 min-w-0">
                          <div className="relative flex-1 min-w-0">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <Input
                              placeholder="아이디 입력"
                              value={emailId}
                              disabled={isKakaoOauthRegister}
                              onChange={(e) => {
                                if (isKakaoOauthRegister) return;
                                setEmailId(e.target.value);
                                setIsEmailAvailable(null);
                              }}
                              className="pl-10 h-12 border-slate-200 dark:border-slate-600 focus:border-emerald-500 dark:focus:border-emerald-400"
                            />
                          </div>

                          <span className="shrink-0 text-slate-500 dark:text-slate-400 font-medium">@</span>

                          {isCustomDomain ? (
                            <div className="flex flex-1 items-center gap-2 min-w-0">
                              <Input
                                placeholder="직접 입력"
                                value={emailDomain}
                                disabled={isKakaoOauthRegister}
                                onChange={(e) => {
                                  if (isKakaoOauthRegister) return;
                                  setEmailDomain(e.target.value);
                                  setIsEmailAvailable(null);
                                }}
                                className="flex-1 min-w-0 h-12 border-slate-200 dark:border-slate-600 focus:border-emerald-500 dark:focus:border-emerald-400 sm:flex-none sm:w-40"
                              />

                              {!isKakaoOauthRegister && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-12 px-3 border-slate-200 dark:border-slate-600 bg-transparent shrink-0"
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
                            <Select
                              value={emailDomain}
                              onValueChange={(value: string) => {
                                if (value === 'custom') {
                                  setIsCustomDomain(true);
                                  setEmailDomain('');
                                } else {
                                  setEmailDomain(value);
                                  setIsCustomDomain(false);
                                }
                                setIsEmailAvailable(null);
                              }}
                            >
                              <SelectTrigger className="flex-1 min-w-0 h-12 border-slate-200 dark:border-slate-600 sm:flex-none sm:w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="gmail.com">gmail.com</SelectItem>
                                <SelectItem value="naver.com">naver.com</SelectItem>
                                <SelectItem value="daum.net">daum.net</SelectItem>
                                <SelectItem value="custom">직접 입력</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>

                        {!isKakaoOauthRegister && (
                          <Button type="button" variant="outline" className="h-12 w-full sm:w-auto sm:shrink-0" onClick={checkEmailAvailability} disabled={!emailRegex.test(`${emailId}@${emailDomain}`) || checkingEmail}>
                            {checkingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : '중복 확인'}
                          </Button>
                        )}
                      </div>

                      {isKakaoOauthRegister && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="h-4 w-4" />
                          카카오로 인증된 이메일입니다.
                        </div>
                      )}
                      {!isKakaoOauthRegister && isEmailAvailable !== null && (
                        <div className={`flex items-center gap-2 text-sm mt-2 ${isEmailAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {isEmailAvailable ? (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              사용 가능한 이메일입니다.
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4" />
                              이미 사용 중인 이메일입니다.
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {!isKakaoOauthRegister && (
                      <>
                        {/* 비밀번호 */}
                        <div className="space-y-2">
                          <Label className="text-slate-700 dark:text-slate-300 font-medium">비밀번호</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <Input
                              type={showRegisterPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="비밀번호를 입력하세요"
                              className="pl-10 pr-10 h-12 border-slate-200 dark:border-slate-600 focus:border-emerald-500 dark:focus:border-emerald-400"
                            />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 text-slate-400" onClick={() => setShowRegisterPassword(!showRegisterPassword)}>
                              {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* 비밀번호 확인 */}
                        <div className="space-y-2">
                          <Label className="text-slate-700 dark:text-slate-300 font-medium">비밀번호 확인</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <Input
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
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
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름을 입력하세요" className="pl-10 h-12 border-slate-200 dark:border-slate-600 focus:border-emerald-500 dark:focus:border-emerald-400" />
                      </div>
                    </div>

                    {/* 연락처 */}
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300 font-medium">연락처</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="연락처를 입력하세요 ('-' 제외)"
                          className="pl-10 h-12 border-slate-200 dark:border-slate-600 focus:border-emerald-500 dark:focus:border-emerald-400"
                        />
                      </div>
                    </div>

                    {/* 우편번호 */}
                    <div className="lg:col-span-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-700 dark:text-slate-300 font-medium">우편번호</Label>
                        <Button
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
                      <Input
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="우편번호를 입력하세요"
                        readOnly
                        className="bg-slate-50 dark:bg-slate-700 cursor-not-allowed max-w-xs h-12 border-slate-200 dark:border-slate-600"
                      />
                    </div>

                    {/* 기본 주소 */}
                    <div className="lg:col-span-2 space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300 font-medium">기본 배송지 주소</Label>
                      <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="기본 주소를 입력하세요" readOnly className="bg-slate-50 dark:bg-slate-700 cursor-not-allowed h-12 border-slate-200 dark:border-slate-600" />
                    </div>

                    {/* 상세 주소 */}
                    <div className="lg:col-span-2 space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300 font-medium">상세 주소</Label>
                      <Input
                        value={addressDetail}
                        onChange={(e) => setAddressDetail(e.target.value)}
                        placeholder="상세 주소를 입력하세요"
                        className="h-12 border-slate-200 dark:border-slate-600 focus:border-emerald-500 dark:focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className={
                      isKakaoOauthRegister
                        ? 'w-full h-12 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-semibold shadow-lg'
                        : 'w-full h-12 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold shadow-lg'
                    }
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        가입 중...
                      </>
                    ) : isKakaoOauthRegister ? (
                      <>
                        {/* 카카오 아이콘 */}
                        <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 3C6.477 3 2 6.58 2 11c0 2.783 1.77 5.243 4.5 6.66L5.6 21.5c-.1.4.3.7.7.5l4.3-2.3c.45.06.91.09 1.4.09 5.523 0 10-3.58 10-8s-4.477-8-10-8z" />
                        </svg>
                        카카오로 회원가입 완료
                      </>
                    ) : (
                      '회원가입'
                    )}
                  </Button>
                  {!isKakaoOauthRegister && (
                    <>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-slate-200 dark:border-slate-600" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white dark:bg-slate-800 px-4 text-slate-500 dark:text-slate-400 font-medium">SNS 계정으로 가입</span>
                        </div>
                      </div>

                      <SocialAuthButtons onKakaoClick={handleKakaoOAuth} isRegisterMode={true} />
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
