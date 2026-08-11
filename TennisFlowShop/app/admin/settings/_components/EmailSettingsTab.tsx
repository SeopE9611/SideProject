"use client";
import { Save, Send } from "lucide-react";
import { AdminFormActions, AdminFormField } from "@/components/admin/AdminFormField";
import AdminPageSection from "@/components/admin/AdminPageSection";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import type { UseFormReturn } from "react-hook-form";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EmailSettings, TabErrorState } from "@/types/admin/settings";

export function EmailSettingsTab({
  form,
  isBootstrapping,
  onSubmit,
  error,
  hasSmtpPassword,
  smtpSource,
  isSendingTestEmail,
  onSendTest,
}: {
  form: UseFormReturn<EmailSettings>;
  isBootstrapping: boolean;
  onSubmit: (data: EmailSettings) => void;
  error: TabErrorState;
  hasSmtpPassword: boolean;
  smtpSource: "database" | "environment" | "unconfigured";
  isSendingTestEmail: boolean;
  onSendTest: () => void;
}) {
  const sourceLabel = {
    database: "관리자 저장 설정 사용 중",
    environment: "배포 환경 SMTP 설정 사용 중",
    unconfigured: "SMTP 미설정",
  }[smtpSource];

  return (
    <TabsContent value="email">
      <AdminPageSection title="이메일 설정" description="SMTP 설정을 관리합니다.">
        {error.message && (
          <div
            className={`${adminSurface.cardMuted} px-3 py-2 ${adminTypography.body} text-destructive`}
          >
            {error.message}
          </div>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-5">
            <div className={`${adminSurface.cardMuted} px-3 py-2 ${adminTypography.body}`}>
              현재 상태: {sourceLabel}
            </div>
            <div className="grid grid-cols-3 gap-5">
              <AdminFormField htmlFor="smtpHost" label="SMTP 서버 주소" className="col-span-2">
                <Input id="smtpHost" {...form.register("smtpHost")} />
              </AdminFormField>
              <AdminFormField htmlFor="smtpPort" label="SMTP 포트">
                <Input
                  id="smtpPort"
                  type="number"
                  {...form.register("smtpPort", { valueAsNumber: true })}
                />
              </AdminFormField>
              <AdminFormField
                htmlFor="smtpUsername"
                label="SMTP 사용자 이름"
                className="col-span-2"
              >
                <Input id="smtpUsername" {...form.register("smtpUsername")} />
              </AdminFormField>
              <AdminFormField label="암호화">
                <Select
                  value={form.watch("smtpEncryption")}
                  onValueChange={(v) =>
                    form.setValue("smtpEncryption", v as EmailSettings["smtpEncryption"], {
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">사용 안 함</SelectItem>
                    <SelectItem value="ssl">SSL</SelectItem>
                    <SelectItem value="tls">TLS</SelectItem>
                  </SelectContent>
                </Select>
              </AdminFormField>
              <AdminFormField htmlFor="senderName" label="발신자 이름">
                <Input id="senderName" {...form.register("senderName")} />
              </AdminFormField>
              <AdminFormField htmlFor="senderEmail" label="발신 이메일" className="col-span-2">
                <Input id="senderEmail" type="email" {...form.register("senderEmail")} />
              </AdminFormField>
              <AdminFormField
                htmlFor="smtpPassword"
                label="SMTP 비밀번호"
                description={
                  hasSmtpPassword ? "비워 두면 현재 저장된 비밀번호를 유지합니다." : undefined
                }
                className="col-span-3"
              >
                <Input
                  id="smtpPassword"
                  type="password"
                  placeholder={hasSmtpPassword ? "기존 비밀번호 유지 중" : ""}
                  {...form.register("smtpPassword")}
                />
              </AdminFormField>
            </div>
          </div>
          <AdminFormActions>
            <Button
              type="button"
              variant="outline"
              disabled={isBootstrapping || isSendingTestEmail}
              onClick={onSendTest}
            >
              <Send className="mr-2 h-4 w-4" />
              {isSendingTestEmail ? "전송 중..." : "테스트 이메일"}
            </Button>
            <Button disabled={isBootstrapping || form.formState.isSubmitting} type="submit">
              <Save className="mr-2 h-4 w-4" />
              설정 저장
            </Button>
          </AdminFormActions>
        </form>
      </AdminPageSection>
    </TabsContent>
  );
}
