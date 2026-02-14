'use client';

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Save, Send, Globe, User, Mail, CreditCard, Bell, Shield, Share2, Languages, Database } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';
import {
  defaultEmailSettings,
  defaultPaymentSettings,
  defaultSiteSettings,
  defaultUserSettings,
  emailSettingsSchema,
  paymentSettingsSchema,
  siteSettingsSchema,
  type EmailSettings,
  type PaymentSettings,
  type SiteSettings,
  type UserSettings,
  userSettingsSchema,
} from '@/lib/admin-settings';

type SettingsTab = 'site' | 'user' | 'email' | 'payment';
type AuthErrorType = 'unauthorized' | 'forbidden' | null;

type TabErrorState = {
  type: AuthErrorType;
  message: string;
};

const AUTH_ERROR_MESSAGES: Record<Exclude<AuthErrorType, null>, string> = {
  unauthorized: '로그인이 만료되었습니다. 다시 로그인 후 시도해주세요.',
  forbidden: '관리자 권한이 없어 이 설정을 변경할 수 없습니다.',
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('site');
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [tabErrors, setTabErrors] = useState<Record<SettingsTab, TabErrorState>>({
    site: { type: null, message: '' },
    user: { type: null, message: '' },
    email: { type: null, message: '' },
    payment: { type: null, message: '' },
  });
  const [emailMeta, setEmailMeta] = useState({ hasSmtpPassword: false });
  const [paymentMeta, setPaymentMeta] = useState({ hasPaypalSecret: false, hasStripeSecretKey: false });

  const siteForm = useForm<SiteSettings>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: defaultSiteSettings,
  });

  const userForm = useForm<UserSettings>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: defaultUserSettings,
  });

  const emailForm = useForm<EmailSettings>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: defaultEmailSettings,
  });

  const paymentForm = useForm<PaymentSettings>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: defaultPaymentSettings,
  });

  const parseTabError = async (res: Response) => {
    const payload = await res.json().catch(() => ({}));
    const message = payload?.message || '요청 처리에 실패했습니다.';

    if (res.status === 401) return { type: 'unauthorized' as const, message: AUTH_ERROR_MESSAGES.unauthorized };
    if (res.status === 403) return { type: 'forbidden' as const, message: AUTH_ERROR_MESSAGES.forbidden };
    return { type: null, message };
  };

  const setTabError = (tab: SettingsTab, next: TabErrorState) => {
    setTabErrors((prev) => ({ ...prev, [tab]: next }));
  };

  const clearTabError = (tab: SettingsTab) => {
    setTabError(tab, { type: null, message: '' });
  };

  const loadTab = async (tab: SettingsTab, endpoint: string, onSuccess: (json: any) => void) => {
    const res = await fetch(endpoint, { method: 'GET', credentials: 'include', cache: 'no-store' });
    if (!res.ok) {
      const nextError = await parseTabError(res);
      setTabError(tab, nextError);
      throw new Error(nextError.message);
    }
    clearTabError(tab);
    const json = await res.json();
    onSuccess(json);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsBootstrapping(true);
      try {
        await Promise.all([
          loadTab('site', '/api/admin/settings/site', (json) => !cancelled && siteForm.reset(json.data ?? defaultSiteSettings)),
          loadTab('user', '/api/admin/settings/user', (json) => !cancelled && userForm.reset(json.data ?? defaultUserSettings)),
          loadTab('email', '/api/admin/settings/email', (json) => {
            if (cancelled) return;
            emailForm.reset(json.data ?? defaultEmailSettings);
            setEmailMeta({ hasSmtpPassword: Boolean(json?.meta?.hasSmtpPassword) });
          }),
          loadTab('payment', '/api/admin/settings/payment', (json) => {
            if (cancelled) return;
            paymentForm.reset(json.data ?? defaultPaymentSettings);
            setPaymentMeta({
              hasPaypalSecret: Boolean(json?.meta?.hasPaypalSecret),
              hasStripeSecretKey: Boolean(json?.meta?.hasStripeSecretKey),
            });
          }),
        ]);
      } catch {
        showErrorToast('일부 설정을 불러오지 못했습니다. 권한 또는 서버 상태를 확인해주세요.');
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const renderTabError = (tab: SettingsTab) => {
    const state = tabErrors[tab];
    if (!state?.message) return null;

    const tone = state.type ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-red-300 bg-red-50 text-red-700';
    return <div className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${tone}`}>{state.message}</div>;
  };

  /**
   * -----------------------------
   * Unsaved changes guard
   * - 페이지 이탈(뒤로/새로고침/탭닫기)은 hook
   * - Tabs 전환(내부 UI 이동)은 onValueChange에서 confirm
   * -----------------------------
   */
  const dirtyByTab = useMemo(
    () => ({
      site: siteForm.formState.isDirty,
      user: userForm.formState.isDirty,
      email: emailForm.formState.isDirty,
      payment: paymentForm.formState.isDirty,
    }),
    [siteForm.formState.isDirty, userForm.formState.isDirty, emailForm.formState.isDirty, paymentForm.formState.isDirty],
  );

  const isDirtyAny = Object.values(dirtyByTab).some(Boolean);
  const isSubmittingAny = siteForm.formState.isSubmitting || userForm.formState.isSubmitting || emailForm.formState.isSubmitting || paymentForm.formState.isSubmitting;

  // 페이지 이탈(뒤로/새로고침/탭닫기)
  useUnsavedChangesGuard(isDirtyAny && !isSubmittingAny);

  // 탭 전환(내부 UI 이동) - 현재 탭이 dirty면 confirm
  const handleTabChange = (nextTab: string) => {
    if (!['site', 'user', 'email', 'payment'].includes(nextTab)) return;
    if (nextTab === activeTab) return;

    const currentDirty = (dirtyByTab as Record<string, boolean>)[activeTab] ?? false;
    if (currentDirty && !window.confirm(UNSAVED_CHANGES_MESSAGE)) return;

    setActiveTab(nextTab as SettingsTab);
  };

  const saveTab = async (tab: SettingsTab, endpoint: string, payload: unknown) => {
    const res = await fetch(endpoint, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const nextError = await parseTabError(res);
      setTabError(tab, nextError);
      throw new Error(nextError.message);
    }

    clearTabError(tab);
    return res.json();
  };

  const onSubmitSiteSettings = async (data: SiteSettings) => {
    try {
      const json = await saveTab('site', '/api/admin/settings/site', data);
      const nextData = json.data ?? data;
      siteForm.reset(nextData);
      showSuccessToast('사이트 설정이 저장되었습니다.');
    } catch (error: any) {
      showErrorToast(error?.message || '사이트 설정 저장에 실패했습니다.');
    }
  };

  const onSubmitUserSettings = async (data: UserSettings) => {
    try {
      const json = await saveTab('user', '/api/admin/settings/user', data);
      const nextData = json.data ?? data;
      userForm.reset(nextData);
      showSuccessToast('사용자 설정이 저장되었습니다.');
    } catch (error: any) {
      showErrorToast(error?.message || '사용자 설정 저장에 실패했습니다.');
    }
  };

  const onSubmitEmailSettings = async (data: EmailSettings) => {
    try {
      const json = await saveTab('email', '/api/admin/settings/email', data);
      const nextData = json.data ?? data;
      emailForm.reset(nextData);
      setEmailMeta({ hasSmtpPassword: Boolean(json?.meta?.hasSmtpPassword) });
      showSuccessToast('이메일 설정이 저장되었습니다.');
    } catch (error: any) {
      showErrorToast(error?.message || '이메일 설정 저장에 실패했습니다.');
    }
  };

  const onSubmitPaymentSettings = async (data: PaymentSettings) => {
    try {
      const json = await saveTab('payment', '/api/admin/settings/payment', data);
      const nextData = json.data ?? data;
      paymentForm.reset(nextData);
      setPaymentMeta({
        hasPaypalSecret: Boolean(json?.meta?.hasPaypalSecret),
        hasStripeSecretKey: Boolean(json?.meta?.hasStripeSecretKey),
      });
      showSuccessToast('결제 설정이 저장되었습니다.');
    } catch (error: any) {
      showErrorToast(error?.message || '결제 설정 저장에 실패했습니다.');
    }
  };

  // 테스트 이메일 발송
  const sendTestEmail = () => {
    if (!emailMeta.hasSmtpPassword && !emailForm.watch('smtpPassword')) {
      showErrorToast('SMTP 비밀번호를 먼저 등록해주세요.');
      return;
    }
    showSuccessToast('테스트 이메일이 발송되었습니다.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-900 dark:via-blue-900/30 dark:to-indigo-900/40">
      <div className="container py-10">
        <div className="mx-auto max-w-6xl">
          {/* 페이지 제목 */}
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600/10 to-indigo-600/10 px-4 py-1.5 mb-4">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">관리자 설정</span>
            </div>
            <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent dark:from-white dark:via-slate-200 dark:to-slate-300 mb-3">시스템 설정</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">도깨비 테니스 아카데미 웹사이트의 모든 설정을 한 곳에서 관리하세요.</p>
          </div>

          {/* 설정 탭 */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            {isBootstrapping && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">설정값을 불러오는 중입니다...</div>}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 dark:border-slate-700/60 p-2">
              <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-1 bg-transparent h-auto p-0">
                <TabsTrigger
                  value="site"
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-xl py-3 transition-all duration-200"
                >
                  <Globe className="h-4 w-4" />
                  <span className="hidden md:inline font-medium">사이트</span>
                </TabsTrigger>
                <TabsTrigger
                  value="user"
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-xl py-3 transition-all duration-200"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline font-medium">사용자</span>
                </TabsTrigger>
                <TabsTrigger
                  value="email"
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-xl py-3 transition-all duration-200"
                >
                  <Mail className="h-4 w-4" />
                  <span className="hidden md:inline font-medium">이메일</span>
                </TabsTrigger>
                <TabsTrigger
                  value="payment"
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-xl py-3 transition-all duration-200"
                >
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden md:inline font-medium">결제</span>
                </TabsTrigger>
                <TabsTrigger
                  value="notification"
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-xl py-3 transition-all duration-200"
                >
                  <Bell className="h-4 w-4" />
                  <span className="hidden md:inline font-medium">알림</span>
                </TabsTrigger>
                <TabsTrigger
                  value="security"
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-xl py-3 transition-all duration-200"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden md:inline font-medium">보안</span>
                </TabsTrigger>
                <TabsTrigger
                  value="integration"
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-xl py-3 transition-all duration-200"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden md:inline font-medium">통합</span>
                </TabsTrigger>
                <TabsTrigger
                  value="localization"
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-xl py-3 transition-all duration-200"
                >
                  <Languages className="h-4 w-4" />
                  <span className="hidden md:inline font-medium">지역화</span>
                </TabsTrigger>
                <TabsTrigger
                  value="backup"
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-xl py-3 transition-all duration-200"
                >
                  <Database className="h-4 w-4" />
                  <span className="hidden md:inline font-medium">백업</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* 사이트 설정 */}
            <TabsContent value="site">
              <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
                  <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">사이트 설정</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">웹사이트의 기본 정보와 외관을 설정합니다.</CardDescription>
                </CardHeader>
                {renderTabError('site')}
                <form onSubmit={siteForm.handleSubmit(onSubmitSiteSettings)}>
                  <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="siteName" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          사이트 이름
                        </Label>
                        <Input
                          id="siteName"
                          {...siteForm.register('siteName')}
                          className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                        />
                        {siteForm.formState.errors.siteName && <p className="text-sm text-red-600 font-medium">{siteForm.formState.errors.siteName.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactEmail" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          연락처 이메일
                        </Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          {...siteForm.register('contactEmail')}
                          className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                        />
                        {siteForm.formState.errors.contactEmail && <p className="text-sm text-red-600 font-medium">{siteForm.formState.errors.contactEmail.message}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="siteDescription" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        사이트 설명
                      </Label>
                      <Textarea
                        id="siteDescription"
                        {...siteForm.register('siteDescription')}
                        className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20 min-h-[100px]"
                      />
                      {siteForm.formState.errors.siteDescription && <p className="text-sm text-red-600 font-medium">{siteForm.formState.errors.siteDescription.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="contactPhone" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          연락처 전화번호
                        </Label>
                        <Input
                          id="contactPhone"
                          {...siteForm.register('contactPhone')}
                          className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                        />
                        {siteForm.formState.errors.contactPhone && <p className="text-sm text-red-600 font-medium">{siteForm.formState.errors.contactPhone.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          주소
                        </Label>
                        <Input id="address" {...siteForm.register('address')} className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20" />
                        {siteForm.formState.errors.address && <p className="text-sm text-red-600 font-medium">{siteForm.formState.errors.address.message}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="logoUrl" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          로고 URL
                        </Label>
                        <Input id="logoUrl" {...siteForm.register('logoUrl')} className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20" />
                        {siteForm.formState.errors.logoUrl && <p className="text-sm text-red-600 font-medium">{siteForm.formState.errors.logoUrl.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="faviconUrl" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          파비콘 URL
                        </Label>
                        <Input
                          id="faviconUrl"
                          {...siteForm.register('faviconUrl')}
                          className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                        />
                        {siteForm.formState.errors.faviconUrl && <p className="text-sm text-red-600 font-medium">{siteForm.formState.errors.faviconUrl.message}</p>}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50/50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700">
                    <Button disabled={isBootstrapping || siteForm.formState.isSubmitting} type="submit" className="ml-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all duration-200">
                      <Save className="mr-2 h-4 w-4" />
                      설정 저장
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            {/* 사용자 설정 */}
            <TabsContent value="user">
              <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
                  <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">사용자 설정</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">사용자 계정 및 인증 관련 설정을 관리합니다.</CardDescription>
                </CardHeader>
                {renderTabError('user')}
                <form onSubmit={userForm.handleSubmit(onSubmitUserSettings)}>
                  <CardContent className="space-y-6 pt-6">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/60 dark:from-slate-700 dark:to-blue-700/30 dark:border-slate-600">
                      <div className="space-y-1">
                        <Label htmlFor="allowRegistration" className="text-sm font-semibold text-slate-900 dark:text-slate-300">
                          회원가입 허용
                        </Label>
                        <p className="text-sm text-slate-600 dark:text-slate-400">새로운 사용자의 회원가입을 허용합니다.</p>
                      </div>
                      <Switch
                        id="allowRegistration"
                        checked={userForm.watch('allowRegistration')}
                        onCheckedChange={(checked) => userForm.setValue('allowRegistration', checked, { shouldDirty: true })}
                        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-600"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/60 dark:from-slate-700 dark:to-blue-700/30 dark:border-slate-600">
                      <div className="space-y-1">
                        <Label htmlFor="requireEmailVerification" className="text-sm font-semibold text-slate-900 dark:text-slate-300">
                          이메일 인증 필수
                        </Label>
                        <p className="text-sm text-slate-600 dark:text-slate-400">회원가입 시 이메일 인증을 필수로 요구합니다.</p>
                      </div>
                      <Switch
                        id="requireEmailVerification"
                        checked={userForm.watch('requireEmailVerification')}
                        onCheckedChange={(checked) => userForm.setValue('requireEmailVerification', checked, { shouldDirty: true })}
                        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-600"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="defaultUserRole" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        기본 사용자 역할
                      </Label>
                      <Select value={userForm.watch('defaultUserRole')} onValueChange={(value) => userForm.setValue('defaultUserRole', value as UserSettings['defaultUserRole'], { shouldDirty: true })}>
                        <SelectTrigger id="defaultUserRole" className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20">
                          <SelectValue placeholder="역할 선택" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                          <SelectItem value="member">일반 회원</SelectItem>
                          <SelectItem value="premium">프리미엄 회원</SelectItem>
                          <SelectItem value="instructor">강사</SelectItem>
                          <SelectItem value="admin">관리자</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="minimumPasswordLength" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        최소 비밀번호 길이
                      </Label>
                      <Input
                        id="minimumPasswordLength"
                        type="number"
                        min="8"
                        max="32"
                        {...userForm.register('minimumPasswordLength', { valueAsNumber: true })}
                        className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/60 dark:from-slate-700 dark:to-blue-700/30 dark:border-slate-600">
                      <div className="space-y-1">
                        <Label htmlFor="allowSocialLogin" className="text-sm font-semibold text-slate-900 dark:text-slate-300">
                          소셜 로그인 허용
                        </Label>
                        <p className="text-sm text-slate-600 dark:text-slate-400">소셜 미디어를 통한 로그인을 허용합니다.</p>
                      </div>
                      <Switch
                        id="allowSocialLogin"
                        checked={userForm.watch('allowSocialLogin')}
                        onCheckedChange={(checked) => userForm.setValue('allowSocialLogin', checked, { shouldDirty: true })}
                        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-600"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sessionTimeout" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        세션 타임아웃 (분)
                      </Label>
                      <Input
                        id="sessionTimeout"
                        type="number"
                        min="15"
                        max="1440"
                        {...userForm.register('sessionTimeout', { valueAsNumber: true })}
                        className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50/50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700">
                    <Button disabled={isBootstrapping || userForm.formState.isSubmitting} type="submit" className="ml-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all duration-200">
                      <Save className="mr-2 h-4 w-4" />
                      설정 저장
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            {/* 이메일 설정 */}
            <TabsContent value="email">
              <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
                  <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">이메일 설정</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">이메일 발송을 위한 SMTP 설정을 관리합니다.</CardDescription>
                </CardHeader>
                {renderTabError('email')}
                <form onSubmit={emailForm.handleSubmit(onSubmitEmailSettings)}>
                  <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="smtpHost" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          SMTP 호스트
                        </Label>
                        <Input
                          id="smtpHost"
                          {...emailForm.register('smtpHost')}
                          className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                        />
                        {emailForm.formState.errors.smtpHost && <p className="text-sm text-red-600 font-medium">{emailForm.formState.errors.smtpHost.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtpPort" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          SMTP 포트
                        </Label>
                        <Input
                          id="smtpPort"
                          type="number"
                          {...emailForm.register('smtpPort', { valueAsNumber: true })}
                          className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                        />
                        {emailForm.formState.errors.smtpPort && <p className="text-sm text-red-600 font-medium">{emailForm.formState.errors.smtpPort.message}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="smtpUsername" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          SMTP 사용자 이름
                        </Label>
                        <Input
                          id="smtpUsername"
                          {...emailForm.register('smtpUsername')}
                          className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                        />
                        {emailForm.formState.errors.smtpUsername && <p className="text-sm text-red-600 font-medium">{emailForm.formState.errors.smtpUsername.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtpPassword" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          SMTP 비밀번호
                        </Label>
                        <Input
                          id="smtpPassword"
                          type="password"
                          placeholder={emailMeta.hasSmtpPassword ? '기존 비밀번호 유지 중 (변경 시에만 입력)' : 'SMTP 비밀번호 입력'}
                          {...emailForm.register('smtpPassword')}
                          className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                        />
                        {emailForm.formState.errors.smtpPassword && <p className="text-sm text-red-600 font-medium">{emailForm.formState.errors.smtpPassword.message}</p>}
                        {emailMeta.hasSmtpPassword && !emailForm.watch('smtpPassword') && <p className="text-xs text-slate-500">비워두면 기존 SMTP 비밀번호를 유지합니다.</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtpEncryption" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        SMTP 암호화
                      </Label>
                      <Select value={emailForm.watch('smtpEncryption')} onValueChange={(value) => emailForm.setValue('smtpEncryption', value as EmailSettings['smtpEncryption'], { shouldDirty: true })}>
                        <SelectTrigger id="smtpEncryption" className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20">
                          <SelectValue placeholder="암호화 방식 선택" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                          <SelectItem value="none">없음</SelectItem>
                          <SelectItem value="ssl">SSL</SelectItem>
                          <SelectItem value="tls">TLS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="senderName" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          발신자 이름
                        </Label>
                        <Input
                          id="senderName"
                          {...emailForm.register('senderName')}
                          className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                        />
                        {emailForm.formState.errors.senderName && <p className="text-sm text-red-600 font-medium">{emailForm.formState.errors.senderName.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="senderEmail" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          발신자 이메일
                        </Label>
                        <Input
                          id="senderEmail"
                          type="email"
                          {...emailForm.register('senderEmail')}
                          className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                        />
                        {emailForm.formState.errors.senderEmail && <p className="text-sm text-red-600 font-medium">{emailForm.formState.errors.senderEmail.message}</p>}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between bg-slate-50/50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={sendTestEmail}
                      className="border-slate-300 hover:bg-slate-100 hover:border-slate-400 transition-all duration-200 bg-transparent dark:bg-transparent dark:border-slate-600 dark:hover:bg-slate-700 dark:text-white"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      테스트 이메일 발송
                    </Button>
                    <Button disabled={isBootstrapping || emailForm.formState.isSubmitting} type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all duration-200">
                      <Save className="mr-2 h-4 w-4" />
                      설정 저장
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            {/* 결제 설정 */}
            <TabsContent value="payment">
              <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
                  <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">결제 설정</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">결제 방식 및 통화, 세금 설정을 관리합니다.</CardDescription>
                </CardHeader>
                {renderTabError('payment')}
                <form onSubmit={paymentForm.handleSubmit(onSubmitPaymentSettings)}>
                  <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="currency" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          통화
                        </Label>

                        <Select value={paymentForm.watch('currency')} onValueChange={(value) => paymentForm.setValue('currency', value as PaymentSettings['currency'], { shouldDirty: true })}>
                          <SelectTrigger id="currency" className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20">
                            <SelectValue placeholder="통화 선택" />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                            <SelectItem value="KRW">한국 원화 (₩)</SelectItem>
                            <SelectItem value="USD">미국 달러 ($)</SelectItem>
                            <SelectItem value="EUR">유로 (€)</SelectItem>
                            <SelectItem value="JPY">일본 엔 (¥)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="taxRate" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          세금율 (%)
                        </Label>
                        <Input
                          id="taxRate"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          {...paymentForm.register('taxRate', { valueAsNumber: true })}
                          className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">결제 방식</h3>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/60 dark:from-slate-700 dark:to-blue-700/30 dark:border-slate-600">
                        <div className="space-y-1">
                          <Label htmlFor="enablePaypal" className="text-sm font-semibold text-slate-900 dark:text-slate-300">
                            PayPal
                          </Label>
                          <p className="text-sm text-slate-600 dark:text-slate-400">PayPal을 통한 결제를 허용합니다.</p>
                        </div>
                        <Switch
                          id="enablePaypal"
                          checked={paymentForm.watch('enablePaypal')}
                          onCheckedChange={(checked) => paymentForm.setValue('enablePaypal', checked, { shouldDirty: true })}
                          className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-600"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/60 dark:from-slate-700 dark:to-blue-700/30 dark:border-slate-600">
                        <div className="space-y-1">
                          <Label htmlFor="enableCreditCard" className="text-sm font-semibold text-slate-900 dark:text-slate-300">
                            신용카드
                          </Label>
                          <p className="text-sm text-slate-600 dark:text-slate-400">신용카드를 통한 결제를 허용합니다.</p>
                        </div>
                        <Switch
                          id="enableCreditCard"
                          checked={paymentForm.watch('enableCreditCard')}
                          onCheckedChange={(checked) => paymentForm.setValue('enableCreditCard', checked, { shouldDirty: true })}
                          className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-600"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/60 dark:from-slate-700 dark:to-blue-700/30 dark:border-slate-600">
                        <div className="space-y-1">
                          <Label htmlFor="enableBankTransfer" className="text-sm font-semibold text-slate-900 dark:text-slate-300">
                            계좌이체
                          </Label>
                          <p className="text-sm text-slate-600 dark:text-slate-400">계좌이체를 통한 결제를 허용합니다.</p>
                        </div>
                        <Switch
                          id="enableBankTransfer"
                          checked={paymentForm.watch('enableBankTransfer')}
                          onCheckedChange={(checked) => paymentForm.setValue('enableBankTransfer', checked, { shouldDirty: true })}
                          className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-600"
                        />
                      </div>
                    </div>

                    {paymentForm.watch('enablePaypal') && (
                      <div className="space-y-4 rounded-xl border-2 border-blue-200/60 dark:border-blue-700/60 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 p-5 dark:from-blue-700/50 dark:to-indigo-700/30">
                        <h4 className="font-bold text-slate-900 dark:text-white">PayPal 설정</h4>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="paypalClientId" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                              PayPal 클라이언트 ID
                            </Label>
                            <Input
                              id="paypalClientId"
                              {...paymentForm.register('paypalClientId')}
                              className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="paypalSecret" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                              PayPal 시크릿
                            </Label>
                            <Input
                              id="paypalSecret"
                              type="password"
                              placeholder={paymentMeta.hasPaypalSecret ? '기존 시크릿 유지 중 (변경 시에만 입력)' : 'PayPal 시크릿 입력'}
                              {...paymentForm.register('paypalSecret')}
                              className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentForm.watch('enableCreditCard') && (
                      <div className="space-y-4 rounded-xl border-2 border-indigo-200/60 dark:border-indigo-700/60 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 p-5 dark:from-indigo-700/50 dark:to-purple-700/30">
                        <h4 className="font-bold text-slate-900 dark:text-white">Stripe 설정</h4>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="stripePublishableKey" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                              Stripe 공개 키
                            </Label>
                            <Input
                              id="stripePublishableKey"
                              {...paymentForm.register('stripePublishableKey')}
                              className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="stripeSecretKey" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                              Stripe 시크릿 키
                            </Label>
                            <Input
                              id="stripeSecretKey"
                              type="password"
                              placeholder={paymentMeta.hasStripeSecretKey ? '기존 시크릿 유지 중 (변경 시에만 입력)' : 'Stripe 시크릿 키 입력'}
                              {...paymentForm.register('stripeSecretKey')}
                              className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="bg-slate-50/50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700">
                    <Button disabled={isBootstrapping || paymentForm.formState.isSubmitting} type="submit" className="ml-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all duration-200">
                      <Save className="mr-2 h-4 w-4" />
                      설정 저장
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            {/* 알림 설정 */}
            <TabsContent value="notification">
              <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
                  <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">알림 설정</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">이메일 및 SMS 알림 설정을 관리합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">이메일 알림</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/60 dark:from-slate-700 dark:to-blue-700/30 dark:border-slate-600">
                        <div className="space-y-1">
                          <Label className="text-sm font-semibold text-slate-900 dark:text-slate-300">회원가입 알림</Label>
                          <p className="text-sm text-slate-600 dark:text-slate-400">새로운 회원 가입 시 관리자에게 알림</p>
                        </div>
                        <Switch defaultChecked className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-600" />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/60 dark:from-slate-700 dark:to-blue-700/30 dark:border-slate-600">
                        <div className="space-y-1">
                          <Label className="text-sm font-semibold text-slate-900 dark:text-slate-300">주문 알림</Label>
                          <p className="text-sm text-slate-600 dark:text-slate-400">새로운 주문 발생 시 관리자에게 알림</p>
                        </div>
                        <Switch defaultChecked className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-600" />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/60 dark:from-slate-700 dark:to-blue-700/30 dark:border-slate-600">
                        <div className="space-y-1">
                          <Label className="text-sm font-semibold text-slate-900 dark:text-slate-300">문의 알림</Label>
                          <p className="text-sm text-slate-600 dark:text-slate-400">새로운 문의 등록 시 관리자에게 알림</p>
                        </div>
                        <Switch defaultChecked className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-600" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">SMS 알림</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/60 dark:from-slate-700 dark:to-blue-700/30 dark:border-slate-600">
                        <div className="space-y-1">
                          <Label className="text-sm font-semibold text-slate-900 dark:text-slate-300">SMS 알림 활성화</Label>
                          <p className="text-sm text-slate-600 dark:text-slate-400">SMS를 통한 알림 발송 활성화</p>
                        </div>
                        <Switch className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-600" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smsProvider" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          SMS 제공업체
                        </Label>
                        <Select defaultValue="none">
                          <SelectTrigger id="smsProvider" className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20">
                            <SelectValue placeholder="제공업체 선택" />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                            <SelectItem value="none">선택 안함</SelectItem>
                            <SelectItem value="twilio">Twilio</SelectItem>
                            <SelectItem value="nhn">NHN Cloud</SelectItem>
                            <SelectItem value="naver">네이버 클라우드</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700">
                  <Button className="ml-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all duration-200">
                    <Save className="mr-2 h-4 w-4" />
                    설정 저장
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* 보안 설정 */}
            <TabsContent value="security">
              <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
                  <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">보안 설정</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">웹사이트의 보안 관련 설정을 관리합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">로그인 보안</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/60 dark:from-slate-700 dark:to-blue-700/30 dark:border-slate-600">
                        <div className="space-y-1">
                          <Label className="text-sm font-semibold text-slate-900 dark:text-slate-300">2단계 인증</Label>
                          <p className="text-sm text-slate-600 dark:text-slate-400">사용자에게 2단계 인증 옵션 제공</p>
                        </div>
                        <Switch defaultChecked className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-600" />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/60 dark:from-slate-700 dark:to-blue-700/30 dark:border-slate-600">
                        <div className="space-y-1">
                          <Label className="text-sm font-semibold text-slate-900 dark:text-slate-300">로그인 시도 제한</Label>
                          <p className="text-sm text-slate-600 dark:text-slate-400">로그인 실패 시 계정 잠금 활성화</p>
                        </div>
                        <Switch defaultChecked className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-600" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxLoginAttempts" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          최대 로그인 시도 횟수
                        </Label>
                        <Input
                          id="maxLoginAttempts"
                          type="number"
                          defaultValue="5"
                          min="1"
                          max="10"
                          className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">데이터 보안</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/60 dark:from-slate-700 dark:to-blue-700/30 dark:border-slate-600">
                        <div className="space-y-1">
                          <Label className="text-sm font-semibold text-slate-900 dark:text-slate-300">HTTPS 강제 적용</Label>
                          <p className="text-sm text-slate-600 dark:text-slate-400">모든 연결에 HTTPS 사용 강제</p>
                        </div>
                        <Switch defaultChecked className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-600" />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/60 dark:from-slate-700 dark:to-blue-700/30 dark:border-slate-600">
                        <div className="space-y-1">
                          <Label className="text-sm font-semibold text-slate-900 dark:text-slate-300">CSRF 보호</Label>
                          <p className="text-sm text-slate-600 dark:text-slate-400">크로스 사이트 요청 위조 방지</p>
                        </div>
                        <Switch defaultChecked className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-600" />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700">
                  <Button className="ml-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all duration-200">
                    <Save className="mr-2 h-4 w-4" />
                    설정 저장
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* 통합 설정 */}
            <TabsContent value="integration">
              <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
                  <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">통합 설정</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">외부 서비스 및 API 통합 설정을 관리합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">소셜 미디어</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="facebookUrl" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Facebook URL
                        </Label>
                        <Input
                          id="facebookUrl"
                          placeholder="https://facebook.com/..."
                          className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="instagramUrl" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Instagram URL
                        </Label>
                        <Input
                          id="instagramUrl"
                          placeholder="https://instagram.com/..."
                          className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="youtubeUrl" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          YouTube URL
                        </Label>
                        <Input
                          id="youtubeUrl"
                          placeholder="https://youtube.com/..."
                          className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="naverBlogUrl" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          네이버 블로그 URL
                        </Label>
                        <Input
                          id="naverBlogUrl"
                          placeholder="https://blog.naver.com/..."
                          className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">분석 도구</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="googleAnalyticsId" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Google Analytics ID
                        </Label>
                        <Input
                          id="googleAnalyticsId"
                          placeholder="G-XXXXXXXXXX"
                          className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="naverAnalyticsId" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          네이버 애널리틱스 ID
                        </Label>
                        <Input id="naverAnalyticsId" placeholder="XXXXXXXXXX" className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">지도 API</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="kakaoMapApiKey" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          카카오맵 API 키
                        </Label>
                        <Input id="kakaoMapApiKey" type="password" className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="naverMapApiKey" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          네이버맵 API 키
                        </Label>
                        <Input id="naverMapApiKey" type="password" className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20" />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700">
                  <Button className="ml-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all duration-200">
                    <Save className="mr-2 h-4 w-4" />
                    설정 저장
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* 지역화 설정 */}
            <TabsContent value="localization">
              <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
                  <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">지역화 설정</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">언어, 시간대, 날짜 형식 등의 지역화 설정을 관리합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="defaultLanguage" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      기본 언어
                    </Label>
                    <Select defaultValue="ko">
                      <SelectTrigger id="defaultLanguage" className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20">
                        <SelectValue placeholder="언어 선택" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                        <SelectItem value="ko">한국어</SelectItem>
                        <SelectItem value="en">영어</SelectItem>
                        <SelectItem value="ja">일본어</SelectItem>
                        <SelectItem value="zh">중국어</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      시간대
                    </Label>
                    <Select defaultValue="Asia/Seoul">
                      <SelectTrigger id="timezone" className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20">
                        <SelectValue placeholder="시간대 선택" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                        <SelectItem value="Asia/Seoul">서울 (GMT+9)</SelectItem>
                        <SelectItem value="America/New_York">뉴욕 (GMT-5)</SelectItem>
                        <SelectItem value="Europe/London">런던 (GMT+0)</SelectItem>
                        <SelectItem value="Asia/Tokyo">도쿄 (GMT+9)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateFormat" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      날짜 형식
                    </Label>
                    <Select defaultValue="YYYY-MM-DD">
                      <SelectTrigger id="dateFormat" className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20">
                        <SelectValue placeholder="날짜 형식 선택" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY년 MM월 DD일">YYYY년 MM월 DD일</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timeFormat" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      시간 형식
                    </Label>
                    <Select defaultValue="24">
                      <SelectTrigger id="timeFormat" className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20">
                        <SelectValue placeholder="시간 형식 선택" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                        <SelectItem value="12">12시간 (AM/PM)</SelectItem>
                        <SelectItem value="24">24시간</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/60 dark:from-slate-700 dark:to-blue-700/30 dark:border-slate-600">
                    <div className="space-y-1">
                      <Label className="text-sm font-semibold text-slate-900 dark:text-slate-300">다국어 지원</Label>
                      <p className="text-sm text-slate-600 dark:text-slate-400">다국어 지원 활성화</p>
                    </div>
                    <Switch defaultChecked className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-600" />
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700">
                  <Button className="ml-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all duration-200">
                    <Save className="mr-2 h-4 w-4" />
                    설정 저장
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* 백업 설정 */}
            <TabsContent value="backup">
              <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700">
                  <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">백업 및 유지보수</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">데이터 백업 및 시스템 유지보수 설정을 관리합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">자동 백업</h3>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/60 dark:from-slate-700 dark:to-blue-700/30 dark:border-slate-600">
                      <div className="space-y-1">
                        <Label className="text-sm font-semibold text-slate-900 dark:text-slate-300">자동 백업 활성화</Label>
                        <p className="text-sm text-slate-600 dark:text-slate-400">정기적인 데이터 자동 백업</p>
                      </div>
                      <Switch defaultChecked className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-600" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="backupFrequency" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        백업 주기
                      </Label>
                      <Select defaultValue="daily">
                        <SelectTrigger id="backupFrequency" className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20">
                          <SelectValue placeholder="백업 주기 선택" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                          <SelectItem value="hourly">매시간</SelectItem>
                          <SelectItem value="daily">매일</SelectItem>
                          <SelectItem value="weekly">매주</SelectItem>
                          <SelectItem value="monthly">매월</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="backupRetention" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        백업 보관 기간 (일)
                      </Label>
                      <Input
                        id="backupRetention"
                        type="number"
                        defaultValue="30"
                        min="1"
                        max="365"
                        className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="backupStorage" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        백업 저장소
                      </Label>
                      <Select defaultValue="local">
                        <SelectTrigger id="backupStorage" className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20">
                          <SelectValue placeholder="저장소 선택" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                          <SelectItem value="local">로컬 서버</SelectItem>
                          <SelectItem value="s3">Amazon S3</SelectItem>
                          <SelectItem value="gcs">Google Cloud Storage</SelectItem>
                          <SelectItem value="azure">Azure Blob Storage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">유지보수 모드</h3>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/60 dark:from-slate-700 dark:to-blue-700/30 dark:border-slate-600">
                      <div className="space-y-1">
                        <Label className="text-sm font-semibold text-slate-900 dark:text-slate-300">유지보수 모드 활성화</Label>
                        <p className="text-sm text-slate-600 dark:text-slate-400">사이트를 유지보수 모드로 전환</p>
                      </div>
                      <Switch className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-600" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maintenanceMessage" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        유지보수 메시지
                      </Label>
                      <Textarea
                        id="maintenanceMessage"
                        placeholder="현재 사이트가 유지보수 중입니다. 잠시 후 다시 시도해주세요."
                        rows={3}
                        className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">데이터베이스 최적화</h3>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/60 dark:from-slate-700 dark:to-blue-700/30 dark:border-slate-600">
                      <div className="space-y-1">
                        <Label className="text-sm font-semibold text-slate-900 dark:text-slate-300">자동 최적화 활성화</Label>
                        <p className="text-sm text-slate-600 dark:text-slate-400">정기적인 데이터베이스 최적화</p>
                      </div>
                      <Switch defaultChecked className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-600" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="optimizationFrequency" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        최적화 주기
                      </Label>
                      <Select defaultValue="weekly">
                        <SelectTrigger id="optimizationFrequency" className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700 dark:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/20">
                          <SelectValue placeholder="최적화 주기 선택" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                          <SelectItem value="daily">매일</SelectItem>
                          <SelectItem value="weekly">매주</SelectItem>
                          <SelectItem value="monthly">매월</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between bg-slate-50/50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700">
                  <Button variant="outline" className="border-slate-300 hover:bg-slate-100 hover:border-slate-400 transition-all duration-200 bg-transparent dark:bg-transparent dark:border-slate-600 dark:hover:bg-slate-700 dark:text-white">
                    지금 백업하기
                  </Button>
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all duration-200">
                    <Save className="mr-2 h-4 w-4" />
                    설정 저장
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
