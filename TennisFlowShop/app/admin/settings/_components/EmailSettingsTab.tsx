"use client";
import { Save, Send } from "lucide-react";
import AdminPageSection from "@/components/admin/AdminPageSection";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import type { UseFormReturn } from "react-hook-form";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          <div className="space-y-3">
            <div className={`${adminSurface.cardMuted} px-3 py-2 ${adminTypography.body}`}>
              현재 상태: {sourceLabel}
            </div>
            <div>
              <Label htmlFor="smtpHost">SMTP 서버 주소</Label>
              <Input id="smtpHost" {...form.register("smtpHost")} />
            </div>
            <div>
              <Label htmlFor="smtpUsername">SMTP 사용자 이름</Label>
              <Input id="smtpUsername" {...form.register("smtpUsername")} />
            </div>
            <div>
              <Label htmlFor="smtpPort">SMTP 포트</Label>
              <Input
                id="smtpPort"
                type="number"
                {...form.register("smtpPort", { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="senderName">발신자 이름</Label>
              <Input id="senderName" {...form.register("senderName")} />
            </div>
            <div>
              <Label htmlFor="senderEmail">발신 이메일</Label>
              <Input id="senderEmail" type="email" {...form.register("senderEmail")} />
            </div>
            <div>
              <Label htmlFor="smtpPassword">SMTP 비밀번호</Label>
              <Input
                id="smtpPassword"
                type="password"
                placeholder={hasSmtpPassword ? "기존 비밀번호 유지 중" : ""}
                {...form.register("smtpPassword")}
              />
            </div>
            <div>
              <Label>암호화</Label>
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
            </div>
          </div>
          <div className="mt-5 flex justify-between">
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
          </div>
        </form>
      </AdminPageSection>
    </TabsContent>
  );
}
