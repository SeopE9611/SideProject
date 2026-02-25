'use client';

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  defaultEmailSettings,
  defaultPaymentSettings,
  defaultSiteSettings,
  defaultUserSettings,
  emailSettingsSchema,
  paymentSettingsSchema,
  siteSettingsSchema,
  userSettingsSchema,
} from '@/lib/admin-settings';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { UNSAVED_CHANGES_MESSAGE } from '@/lib/hooks/useUnsavedChangesGuard';
import type {
  EmailSettings,
  PaymentSettings,
  SettingsApiResponse,
  SettingsTab,
  SiteSettings,
  TabErrorState,
  UserSettings,
} from '@/types/admin/settings';

const AUTH_ERROR_MESSAGES = {
  unauthorized: '로그인이 만료되었습니다. 다시 로그인 후 시도해주세요.',
  forbidden: '관리자 권한이 없어 이 설정을 변경할 수 없습니다.',
} as const;

export function useAdminSettings() {
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
  const [pendingTab, setPendingTab] = useState<SettingsTab | null>(null);

  const siteForm = useForm<SiteSettings>({ resolver: zodResolver(siteSettingsSchema), defaultValues: defaultSiteSettings });
  const userForm = useForm<UserSettings>({ resolver: zodResolver(userSettingsSchema), defaultValues: defaultUserSettings });
  const emailForm = useForm<EmailSettings>({ resolver: zodResolver(emailSettingsSchema), defaultValues: defaultEmailSettings });
  const paymentForm = useForm<PaymentSettings>({ resolver: zodResolver(paymentSettingsSchema), defaultValues: defaultPaymentSettings });

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

  const parseTabError = async (res: Response): Promise<TabErrorState> => {
    const payload = await res.json().catch(() => ({}));
    const message = payload?.message || '요청 처리에 실패했습니다.';
    if (res.status === 401) return { type: 'unauthorized', message: AUTH_ERROR_MESSAGES.unauthorized };
    if (res.status === 403) return { type: 'forbidden', message: AUTH_ERROR_MESSAGES.forbidden };
    return { type: null, message };
  };

  const setTabError = (tab: SettingsTab, next: TabErrorState) => setTabErrors((prev) => ({ ...prev, [tab]: next }));
  const clearTabError = (tab: SettingsTab) => setTabError(tab, { type: null, message: '' });

  const loadTab = async <T,>(tab: SettingsTab, endpoint: string, onSuccess: (json: SettingsApiResponse<T>) => void) => {
    const res = await fetch(endpoint, { method: 'GET', credentials: 'include', cache: 'no-store' });
    if (!res.ok) {
      const nextError = await parseTabError(res);
      setTabError(tab, nextError);
      throw new Error(nextError.message);
    }
    clearTabError(tab);
    onSuccess((await res.json()) as SettingsApiResponse<T>);
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
            setPaymentMeta({ hasPaypalSecret: Boolean(json?.meta?.hasPaypalSecret), hasStripeSecretKey: Boolean(json?.meta?.hasStripeSecretKey) });
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

  const saveTab = async (tab: SettingsTab, endpoint: string, payload: unknown) => {
    const res = await fetch(endpoint, {
      method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
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
      siteForm.reset(json.data ?? data);
      showSuccessToast('사이트 설정이 저장되었습니다.');
    } catch (error: unknown) {
      showErrorToast(error instanceof Error ? error.message : '사이트 설정 저장에 실패했습니다.');
    }
  };

  const onSubmitUserSettings = async (data: UserSettings) => {
    try {
      const json = await saveTab('user', '/api/admin/settings/user', data);
      userForm.reset(json.data ?? data);
      showSuccessToast('사용자 설정이 저장되었습니다.');
    } catch (error: unknown) {
      showErrorToast(error instanceof Error ? error.message : '사용자 설정 저장에 실패했습니다.');
    }
  };

  const onSubmitEmailSettings = async (data: EmailSettings) => {
    try {
      const json = await saveTab('email', '/api/admin/settings/email', data);
      emailForm.reset(json.data ?? data);
      setEmailMeta({ hasSmtpPassword: Boolean(json?.meta?.hasSmtpPassword) });
      showSuccessToast('이메일 설정이 저장되었습니다.');
    } catch (error: unknown) {
      showErrorToast(error instanceof Error ? error.message : '이메일 설정 저장에 실패했습니다.');
    }
  };

  const onSubmitPaymentSettings = async (data: PaymentSettings) => {
    try {
      const json = await saveTab('payment', '/api/admin/settings/payment', data);
      paymentForm.reset(json.data ?? data);
      setPaymentMeta({ hasPaypalSecret: Boolean(json?.meta?.hasPaypalSecret), hasStripeSecretKey: Boolean(json?.meta?.hasStripeSecretKey) });
      showSuccessToast('결제 설정이 저장되었습니다.');
    } catch (error: unknown) {
      showErrorToast(error instanceof Error ? error.message : '결제 설정 저장에 실패했습니다.');
    }
  };

  const sendTestEmail = () => {
    if (!emailMeta.hasSmtpPassword && !emailForm.watch('smtpPassword')) return showErrorToast('SMTP 비밀번호를 먼저 등록해주세요.');
    showSuccessToast('테스트 이메일이 발송되었습니다.');
  };

  const requestTabChange = (nextTab: string) => {
    if (!['site', 'user', 'email', 'payment'].includes(nextTab) || nextTab === activeTab) return;
    const currentDirty = (dirtyByTab as Record<string, boolean>)[activeTab] ?? false;
    if (currentDirty) {
      setPendingTab(nextTab as SettingsTab);
      return;
    }
    setActiveTab(nextTab as SettingsTab);
  };

  const confirmTabChange = () => {
    if (!pendingTab) return;
    setActiveTab(pendingTab);
    setPendingTab(null);
  };

  const cancelTabChange = () => {
    setPendingTab(null);
  };

  return {
    activeTab,
    pendingTab,
    requestTabChange,
    confirmTabChange,
    cancelTabChange,
    isBootstrapping,
    tabErrors,
    isDirtyAny,
    isSubmittingAny,
    siteForm,
    userForm,
    emailForm,
    paymentForm,
    emailMeta,
    paymentMeta,
    onSubmitSiteSettings,
    onSubmitUserSettings,
    onSubmitEmailSettings,
    onSubmitPaymentSettings,
    sendTestEmail,
  };
}

export { UNSAVED_CHANGES_MESSAGE };
