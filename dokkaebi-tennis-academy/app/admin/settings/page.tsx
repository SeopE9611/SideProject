'use client';

import { Globe, User, Mail, CreditCard, Shield } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';
import { useAdminSettings } from './_hooks/useAdminSettings';
import { SiteSettingsTab } from './_components/SiteSettingsTab';
import { UserSettingsTab } from './_components/UserSettingsTab';
import { EmailSettingsTab } from './_components/EmailSettingsTab';
import { PaymentSettingsTab } from './_components/PaymentSettingsTab';

export default function SettingsPage() {
  const vm = useAdminSettings();
  useUnsavedChangesGuard(vm.isDirtyAny && !vm.isSubmittingAny);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-900 dark:via-blue-900/30 dark:to-indigo-900/40">
      <div className="container py-10">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600/10 to-indigo-600/10 px-4 py-1.5 mb-4">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">관리자 설정</span>
            </div>
            <h1 className="text-4xl font-bold">시스템 설정</h1>
          </div>

          <Tabs value={vm.activeTab} onValueChange={vm.handleTabChange} className="space-y-4">
            {vm.isBootstrapping && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">설정값을 불러오는 중입니다...</div>}
            <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2 h-auto">
              <TabsTrigger value="site"><Globe className="h-4 w-4 mr-2" />사이트</TabsTrigger>
              <TabsTrigger value="user"><User className="h-4 w-4 mr-2" />사용자</TabsTrigger>
              <TabsTrigger value="email"><Mail className="h-4 w-4 mr-2" />이메일</TabsTrigger>
              <TabsTrigger value="payment"><CreditCard className="h-4 w-4 mr-2" />결제</TabsTrigger>
            </TabsList>

            <SiteSettingsTab form={vm.siteForm} isBootstrapping={vm.isBootstrapping} onSubmit={vm.onSubmitSiteSettings} error={vm.tabErrors.site} />
            <UserSettingsTab form={vm.userForm} isBootstrapping={vm.isBootstrapping} onSubmit={vm.onSubmitUserSettings} error={vm.tabErrors.user} />
            <EmailSettingsTab form={vm.emailForm} isBootstrapping={vm.isBootstrapping} onSubmit={vm.onSubmitEmailSettings} error={vm.tabErrors.email} hasSmtpPassword={vm.emailMeta.hasSmtpPassword} onSendTest={vm.sendTestEmail} />
            <PaymentSettingsTab form={vm.paymentForm} isBootstrapping={vm.isBootstrapping} onSubmit={vm.onSubmitPaymentSettings} error={vm.tabErrors.payment} paymentMeta={vm.paymentMeta} />
          </Tabs>
        </div>
      </div>
    </div>
  );
}
