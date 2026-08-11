"use client";
import { Save } from "lucide-react";
import { AdminFormActions, AdminFormField } from "@/components/admin/AdminFormField";
import AdminPageSection from "@/components/admin/AdminPageSection";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import type { UseFormReturn } from "react-hook-form";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { UserSettings, TabErrorState } from "@/types/admin/settings";

export function UserSettingsTab({
  form,
  isBootstrapping,
  onSubmit,
  error,
}: {
  form: UseFormReturn<UserSettings>;
  isBootstrapping: boolean;
  onSubmit: (data: UserSettings) => void;
  error: TabErrorState;
}) {
  return (
    <TabsContent value="user">
      <AdminPageSection
        title="사용자 설정"
        description="현재 실제 회원가입 정책에 적용되는 설정만 표시합니다."
      >
        {error.message && (
          <div
            className={`${adminSurface.cardMuted} px-3 py-2 ${adminTypography.body} text-destructive`}
          >
            {error.message}
          </div>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-5">
            <div className={`${adminSurface.fieldPanel} flex items-center justify-between gap-4`}>
              <div>
                <p className={adminTypography.bodyStrong}>회원가입 허용</p>
                <p className={adminTypography.caption}>신규 사용자의 회원가입 가능 여부입니다.</p>
              </div>
              <Switch
                checked={form.watch("allowRegistration")}
                onCheckedChange={(v) =>
                  form.setValue("allowRegistration", v, { shouldDirty: true })
                }
              />
            </div>
            <AdminFormField
              htmlFor="minimumPasswordLength"
              label="최소 비밀번호 길이"
              description="회원가입 시 허용할 비밀번호의 최소 글자 수입니다."
            >
              <Input
                id="minimumPasswordLength"
                type="number"
                {...form.register("minimumPasswordLength", {
                  valueAsNumber: true,
                })}
              />
            </AdminFormField>
          </div>
          <AdminFormActions>
            <Button
              disabled={isBootstrapping || form.formState.isSubmitting}
              type="submit"
            >
              <Save className="mr-2 h-4 w-4" />
              설정 저장
            </Button>
          </AdminFormActions>
        </form>
      </AdminPageSection>
    </TabsContent>
  );
}
