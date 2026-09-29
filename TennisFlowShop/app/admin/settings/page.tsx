"use client";

import { User, Mail, CreditCard, Shield } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";
import { useAdminSettings } from "./_hooks/useAdminSettings";
import { UserSettingsTab } from "./_components/UserSettingsTab";
import { EmailSettingsTab } from "./_components/EmailSettingsTab";
import { PaymentSettingsTab } from "./_components/PaymentSettingsTab";

export default function SettingsPage() {
  const vm = useAdminSettings();
  useUnsavedChangesGuard(vm.isDirtyAny && !vm.isSubmittingAny);

  return (
    <>
      <AdminPageShell variant="narrow" className="space-y-6">
        <AdminPageHeader
          title="시스템 설정"
          description="사용자, 이메일, 결제 설정을 관리합니다."
          icon={Shield}
          scope="범위: 전역 운영 설정"
          helperText="변경 내용은 저장 전까지 적용되지 않으며, 탭 이동 시 확인 절차가 유지됩니다."
          variant="form"
          className="flex-wrap"
        />

        <Tabs value={vm.activeTab} onValueChange={vm.requestTabChange} className="space-y-4">
          {vm.isBootstrapping && (
            <div
              className="rounded-lg border border-border bg-background px-4 py-3"
              aria-label="설정값 로딩 중"
            >
              <Skeleton className="h-4 w-52" />
            </div>
          )}
          <TabsList className="grid h-auto grid-cols-3 gap-2">
            <TabsTrigger value="user" className="min-h-10 flex-wrap">
              <User className="h-4 w-4 mr-2" />
              사용자
              {vm.userForm.formState.isDirty ? (
                <span className="ml-2 text-ui-label text-muted-foreground">변경 있음</span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="email" className="min-h-10 flex-wrap">
              <Mail className="h-4 w-4 mr-2" />
              이메일
              {vm.emailForm.formState.isDirty ? (
                <span className="ml-2 text-ui-label text-muted-foreground">변경 있음</span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="payment" className="min-h-10 flex-wrap">
              <CreditCard className="h-4 w-4 mr-2" />
              결제
              <span className="ml-2 text-ui-label text-muted-foreground">조회 전용</span>
            </TabsTrigger>
          </TabsList>

          <UserSettingsTab
            form={vm.userForm}
            isBootstrapping={vm.isBootstrapping}
            onSubmit={vm.onSubmitUserSettings}
            error={vm.tabErrors.user}
          />
          <EmailSettingsTab
            form={vm.emailForm}
            isBootstrapping={vm.isBootstrapping}
            onSubmit={vm.onSubmitEmailSettings}
            error={vm.tabErrors.email}
            hasSmtpPassword={vm.emailMeta.hasSmtpPassword}
            smtpSource={vm.emailMeta.source}
            isSendingTestEmail={vm.isSendingTestEmail}
            onSendTest={vm.sendTestEmail}
          />
          <PaymentSettingsTab
            error={vm.tabErrors.payment}
            paymentMeta={vm.paymentMeta}
          />
        </Tabs>
      </AdminPageShell>
      <AdminConfirmDialog
        open={vm.pendingTab !== null}
        onOpenChange={(open) => {
          if (!open) vm.cancelTabChange();
        }}
        onConfirm={vm.confirmTabChange}
        onCancel={vm.cancelTabChange}
        title="저장하지 않은 변경사항이 있습니다"
        description="현재 탭의 변경사항은 저장되지 않습니다."
        confirmText="탭 이동"
        eventKey="admin-settings-tab-change"
        eventMeta={{ from: vm.activeTab, to: vm.pendingTab }}
      />
    </>
  );
}
